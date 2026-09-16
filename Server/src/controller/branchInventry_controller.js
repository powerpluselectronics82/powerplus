const mongoose = require("mongoose");
const Branch = require("../model/branch");
const Product = require("../model/product");
const BranchInventory = require("../model/BranchInventory");
const InventoryUnit = require("../model/inventryUnit");
const InventoryTransaction = require("../model/InventoryTransaction");
const redis = require("../config/redis");
const { createAuditLog } = require("../utils/auditLogger");

const getBranchInventoryCacheKey = (companyId, branchId) => `branchInventory:${companyId}:${branchId}`;
const getLowStockCacheKey = (companyId, branchId) => `branchInventory:lowStock:v2:${companyId}:${branchId}`;
const getBranchValuationCacheKey = (companyId, branchId) => `branchInventory:valuation:${companyId}:${branchId}`;
const getCompanyValuationCacheKey = (companyId) => `companyInventory:valuation:${companyId}`;

const invalidateBranchInventoryCache = async (companyId, branchId) => {
	try {
		await redis.del(
			getBranchInventoryCacheKey(companyId, branchId),
			getLowStockCacheKey(companyId, branchId),
			getBranchValuationCacheKey(companyId, branchId),
			getCompanyValuationCacheKey(companyId),
		);
	} catch (redisError) {
		console.error("Redis branch inventory cache error:", redisError.message);
	}
};

const getProductBySerialNumber = async (req, res) => {
	try {
		const companyId = req.user.companyId;
		const { branchId, serialNumber } = req.params;

		if (!branchId || !serialNumber) {
			return res.status(400).json({ success: false, message: "branchId and serialNumber are required" });
		}

		const cleanSerial = String(serialNumber).trim();
		const escapedSerial = cleanSerial.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const serialRegex = new RegExp(`^${escapedSerial}$`, 'i');

		// 1. Try finding by companyId + branchId + serialNumber (case-insensitive)
		let inventoryUnit = await InventoryUnit.findOne({
			companyId,
			branchId,
			serialNumber: serialRegex,
		}).populate("productId").lean();

		// 2. Fallback: try finding by companyId + serialNumber (case-insensitive)
		if (!inventoryUnit) {
			inventoryUnit = await InventoryUnit.findOne({
				companyId,
				serialNumber: serialRegex,
			}).populate("productId").lean();
		}

		// 3. Fallback: try finding by serialNumber globally
		if (!inventoryUnit) {
			inventoryUnit = await InventoryUnit.findOne({
				serialNumber: serialRegex,
			}).populate("productId").lean();
		}

		if (!inventoryUnit || !inventoryUnit.productId) {
			return res.status(404).json({ success: false, message: "Product not found for serial number" });
		}

		return res.status(200).json({
			success: true,
			data: {
				...inventoryUnit.productId,
				serialNumber: inventoryUnit.serialNumber,
				inventoryStatus: inventoryUnit.status,
				branchId: inventoryUnit.branchId,
				mrp: inventoryUnit.mrp !== undefined && inventoryUnit.mrp !== null ? inventoryUnit.mrp : inventoryUnit.productId?.mrp,
				discountType: inventoryUnit.discountType || inventoryUnit.productId?.discountType,
				discountValue: inventoryUnit.discountValue !== undefined && inventoryUnit.discountValue !== null ? inventoryUnit.discountValue : inventoryUnit.productId?.discountValue,
				sellingPrice: inventoryUnit.sellingPrice !== undefined && inventoryUnit.sellingPrice !== null ? inventoryUnit.sellingPrice : inventoryUnit.productId?.sellingPrice,
			},
		});
	} catch (error) {
		console.error("Get branch product by serial number error:", error);
		return res.status(500).json({ success: false, message: "Unable to fetch product by serial number" });
	}
};

const getCompanyStockValuation = async (req, res) => {
	try {
		const companyId = req.user.companyId;
		const cacheKey = getCompanyValuationCacheKey(companyId);

		try {
			const cached = await redis.get(cacheKey);
			if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
		} catch (redisError) {
			console.error("Redis company valuation cache read error:", redisError.message);
		}

		const inventory = await BranchInventory.find({ companyId })
			.populate("productId", "name barcode")
			.populate("branchId", "name code")
			.sort({ branchId: 1, barcode: 1, mrp: 1 })
			.lean();

		const products = inventory.map((item) => {
			const stock = Number(item.stock || 0);
			const purchasePrice = Number(item.purchasePrice || 0);
			return {
				branchId: item.branchId?._id,
				branchName: item.branchId?.name,
				productId: item.productId?._id,
				name: item.productId?.name,
				barcode: item.barcode,
				mrp: item.mrp,
				purchasePrice,
				stock,
				totalValue: purchasePrice * stock,
			};
		});

		const response = {
			companyId,
			totalValue: products.reduce((total, item) => total + item.totalValue, 0),
		};

		try {
			await redis.set(cacheKey, JSON.stringify(response), "EX", 300);
		} catch (redisError) {
			console.error("Redis company valuation cache write error:", redisError.message);
		}

		return res.status(200).json({ success: true, data: response });
	} catch (error) {
		console.error("Get company stock valuation error:", error);
		return res.status(500).json({ success: false, message: "Unable to fetch company stock valuation" });
	}
};

const getBranchStockValuation = async (req, res) => {
	try {
		const companyId = req.user.companyId;
		const branchId = req.params.branchId || req.user.branchId;

		if (!branchId) {
			return res.status(400).json({ success: false, message: "branchId is required" });
		}

		const branch = await Branch.findOne({ _id: branchId, companyId, status: "ACTIVE" }).lean();
		if (!branch) {
			return res.status(404).json({ success: false, message: "Branch not found" });
		}

		const cacheKey = getBranchValuationCacheKey(companyId, branchId);
		try {
			const cached = await redis.get(cacheKey);
			if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
		} catch (redisError) {
			console.error("Redis branch valuation cache read error:", redisError.message);
		}

		const inventory = await BranchInventory.find({ companyId, branchId })
			.populate("productId", "name barcode")
			.sort({ barcode: 1, mrp: 1 })
			.lean();

		const products = inventory.map((item) => {
			const stock = Number(item.stock || 0);
			const purchasePrice = Number(item.purchasePrice || 0);
			return {
				productId: item.productId?._id,
				name: item.productId?.name,
				barcode: item.barcode,
				mrp: item.mrp,
				purchasePrice,
				stock,
				totalValue: purchasePrice * stock,
			};
		});

		const response = {
			branchId,
			totalValue: products.reduce((total, item) => total + item.totalValue, 0),
		};

		try {
			await redis.set(cacheKey, JSON.stringify(response), "EX", 300);
		} catch (redisError) {
			console.error("Redis branch valuation cache write error:", redisError.message);
		}

		return res.status(200).json({ success: true, data: response });
	} catch (error) {
		console.error("Get branch stock valuation error:", error);
		return res.status(500).json({ success: false, message: "Unable to fetch branch stock valuation" });
	}
};

const getLowStockBranchProducts = async (req, res) => {
	try {
		const companyId = req.user.companyId;
		const branchId = req.params.branchId || req.user.branchId || null;

		const cacheKey = getLowStockCacheKey(companyId, branchId || "all");
		try {
			const cached = await redis.get(cacheKey);
			if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
		} catch (redisError) {
			console.error("Redis low stock cache read error:", redisError.message);
		}

		const query = { companyId };
		if (branchId) {
			query.branchId = branchId;
		}

		const inventory = await BranchInventory.find(query)
			.populate("productId")
			.lean();
		const productsByBarcode = new Map();

		for (const item of inventory) {
			if (!item.productId) continue;

			const product = item.productId;
			const existing = productsByBarcode.get(product.barcode);
			if (existing) {
				existing.stock += Number(item.stock || 0);
			} else {
				productsByBarcode.set(product.barcode, {
					product,
					stock: Number(item.stock || 0),
				});
			}
		}

		const products = [...productsByBarcode.values()]
			.filter((item) => Number(item.product.minStockLevel || 0) >= item.stock)
			.map((item) => ({
				...item.product,
				stock: item.stock,
				availableStock: item.stock,
				Stock: item.stock,
			}));

		try {
			await redis.set(cacheKey, JSON.stringify(products), "EX", 300);
		} catch (redisError) {
			console.error("Redis low stock cache write error:", redisError.message);
		}

		return res.status(200).json({ success: true, data: products });
	} catch (error) {
		console.error("Get low stock branch products error:", error);
		return res.status(500).json({ success: false, message: "Unable to fetch low stock products" });
	}
};

const getBranchInventoryProducts = async (req, res) => {
	try {
		const companyId = req.user?.companyId;
		const branchId = req.params.branchId || req.user?.branchId;

		if (!branchId || !mongoose.isValidObjectId(branchId)) {
			return res.status(400).json({ success: false, message: "Valid branchId is required" });
		}

		let branch = await Branch.findOne({ _id: branchId, companyId, status: "ACTIVE" }).lean();
		if (!branch) {
			branch = await Branch.findOne({ _id: branchId, companyId }).lean();
		}
		if (!branch) {
			branch = await Branch.findById(branchId).lean();
		}

		if (!branch) {
			return res.status(404).json({ success: false, message: "Branch not found" });
		}

		const cacheKey = getBranchInventoryCacheKey(companyId || branch.companyId, branchId);
		try {
			const cached = await redis.get(cacheKey);
			if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
		} catch (redisError) {
			console.error("Redis branch inventory cache read error:", redisError.message);
		}

		const inventory = await BranchInventory.find({ branchId })
			.populate("productId")
			.sort({ productId: 1, mrp: 1 })
			.lean();

		const validInventory = inventory.filter((item) => item.productId && item.productId._id);

		const productIds = validInventory
			.filter((item) => item.productId.isSerialized)
			.map((item) => item.productId._id);
		const units = productIds.length
			? await InventoryUnit.find({ branchId, productId: { $in: productIds }, status: "available" }).lean()
			: [];

		const products = validInventory.map((item) => ({
			...item.productId,
			branchInventoryId: item._id,
			branchId: item.branchId,
			mrp: item.mrp,
			purchasePrice: item.purchasePrice,
			discountType: item.discountType,
			discountValue: item.discountValue,
			stock: item.stock,
			manufacturingDate: item.manufacturingDate,
			expiryDate: item.expiryDate,
			inventoryUnits: item.productId && item.productId.isSerialized
				? units.filter((unit) => unit.productId && unit.productId.toString() === item.productId._id.toString())
				: [],
		}));

		try {
			await redis.set(cacheKey, JSON.stringify(products), "EX", 300);
		} catch (redisError) {
			console.error("Redis branch inventory cache write error:", redisError.message);
		}

		return res.status(200).json({ success: true, data: products });
	} catch (error) {
		console.error("Get branch inventory products error:", error);
		return res.status(500).json({ success: false, message: "Unable to fetch branch inventory products" });
	}
};

const addBranchInventory = async (req, res) => {
	try {
		const companyId = req.user.companyId;
		const {
			branchId: requestedBranchId,
			barcode,
			quantity,
			mrp,
			discountType,
			discountValue = 0,
			manufacturingDate,
			expiryDate,
			purchasePrice = 0,
			serialNumbers = [],
		} = req.body;
		const branchId = requestedBranchId || req.user.branchId;
		const serials = Array.isArray(serialNumbers)
			? serialNumbers.map((serialNumber) => String(serialNumber).trim()).filter(Boolean)
			: null;

		if (!branchId || !barcode) {
			return res.status(400).json({ success: false, message: "branchId and barcode are required" });
		}

		if (serials === null) {
			return res.status(400).json({ success: false, message: "serialNumbers must be an array" });
		}

		if (new Set(serials).size !== serials.length) {
			return res.status(409).json({ success: false, message: "Duplicate serial numbers were provided" });
		}

		const [branch, product] = await Promise.all([
			Branch.findOne({ _id: branchId, companyId, status: "ACTIVE" }),
			Product.findOne({ barcode, companyId }),
		]);

		if (!branch) {
			return res.status(404).json({ success: false, message: "Branch not found" });
		}

		if (!product) {
			return res.status(404).json({ success: false, message: "Product not found" });
		}

		const inventoryMrp = Number(mrp);
		if (!Number.isFinite(inventoryMrp) || inventoryMrp < 0) {
			return res.status(400).json({ success: false, message: "mrp must be a valid non-negative number" });
		}

		const discountVal = Number(discountValue || 0);
		const discountAmount = discountType === "percentage"
			? (inventoryMrp * discountVal) / 100
			: discountVal;
		const sellingPrice = Math.max(0, inventoryMrp - discountAmount);

		const productId = product._id;
		const isSerialized = product.isSerialized === true;
		const requestedQuantity = Number(quantity ?? stock ?? (isSerialized ? serials.length : 0));

		if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
			return res.status(400).json({ success: false, message: "quantity must be a positive integer" });
		}

		if (isSerialized && serials.length !== requestedQuantity) {
			return res.status(400).json({ success: false, message: "For serialized products, quantity must match serialNumbers length" });
		}

		if (!isSerialized && serials.length > 0) {
			return res.status(400).json({ success: false, message: "Non-serialized products cannot have serial numbers" });
		}

		if (isSerialized && serials.length > 0) {
			const existingUnit = await InventoryUnit.findOne({ companyId, serialNumber: { $in: serials } });
			if (existingUnit) {
				return res.status(409).json({ success: false, message: `Serial number ${existingUnit.serialNumber} already exists` });
			}
		}

		let inventory = await BranchInventory.findOne({ companyId, branchId, productId, mrp: inventoryMrp });
		if (inventory) {
			inventory.stock += requestedQuantity;
			inventory.purchasePrice = purchasePrice;
			inventory.discountType = discountType;
			inventory.discountValue = discountValue;
			if (manufacturingDate !== undefined) inventory.manufacturingDate = manufacturingDate;
			if (expiryDate !== undefined) inventory.expiryDate = expiryDate;
			await inventory.save();
		} else {
			inventory = await BranchInventory.create({
				companyId,
				branchId,
				productId,
				mrp: inventoryMrp,
				purchasePrice,
				discountType,
				discountValue,
				manufacturingDate,
				expiryDate,
				barcode: product.barcode,
				stock: requestedQuantity,
			});
		}

		const inventoryTransaction = await InventoryTransaction.create({
			companyId,
			branchId,
			productId,
			quantity: requestedQuantity,
			mrp: inventoryMrp,
			purchasePrice,
			discountType,
			discountValue,
			barcode: product.barcode,
			sellingPrice,
			serialNumbers: isSerialized ? serials : [],
		});

		let units = [];
		if (isSerialized) {
			units = await InventoryUnit.create(serials.map((serialNumber) => ({
				companyId,
				branchId,
				productId,
				serialNumber,
				barcode: product.barcode,
				mrp: inventoryMrp,
				purchasePrice,
				discountType: discountType || "fixed",
				discountValue: discountVal,
				sellingPrice,
				status: "available",
			})));
		}

		await createAuditLog(req, {
			companyId,
			branchId,
			action: "BRANCH_INVENTORY_CREATE",
			resource: "BranchInventory",
			resourceId: inventory._id,
			details: { productId, quantity: requestedQuantity, serialNumbers: serials },
		});

		await invalidateBranchInventoryCache(companyId, branchId);

		const result = { inventory, inventoryTransaction, units };

		return res.status(201).json({
			success: true,
			message: "Branch inventory added successfully",
			data: result,
		});
	} catch (error) {
		console.error("Add branch inventory error:", error);
		return res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({
			success: false,
			message: error.code === 11000 ? "Inventory or serial number already exists" : error.message || "Unable to add branch inventory",
		});
	}
};

const getMonthlyInventoryReport = async (req, res) => {
	try {
		const companyId = req.user?.companyId;
		const { branchId } = req.query;
		const month = req.query.month || new Date().toISOString().slice(0, 7); // YYYY-MM

		if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
			return res.status(400).json({ success: false, message: "month must use YYYY-MM format" });
		}

		// Buffer of 1 day on each side to safely account for timezone offsets (e.g. IST UTC+5:30)
		const [yearStr, monthStr] = month.split("-");
		const year = parseInt(yearStr, 10);
		const monthNum = parseInt(monthStr, 10);

		const queryStart = new Date(Date.UTC(year, monthNum - 1, 1, 0, 0, 0, 0) - 24 * 60 * 60 * 1000);
		const queryEnd = new Date(Date.UTC(year, monthNum, 1, 0, 0, 0, 0) + 24 * 60 * 60 * 1000);

		const isDateInSelectedMonth = (d) => {
			if (!d) return false;
			const dt = new Date(d);
			const utcMonth = dt.toISOString().slice(0, 7);
			// IST offset (+5:30)
			const istDate = new Date(dt.getTime() + 5.5 * 60 * 60 * 1000);
			const istMonth = istDate.toISOString().slice(0, 7);
			return utcMonth === month || istMonth === month;
		};

		// 1. Fetch InventoryTransactions
		const transactionQuery = { createdAt: { $gte: queryStart, $lt: queryEnd } };
		if (companyId) transactionQuery.companyId = companyId;
		if (branchId && mongoose.isValidObjectId(branchId)) transactionQuery.branchId = branchId;

		const inventoryTransactions = await InventoryTransaction.find(transactionQuery)
			.populate("productId")
			.populate("branchId", "name code")
			.sort({ createdAt: -1 })
			.lean();

		const validTransactions = inventoryTransactions.filter((t) => isDateInSelectedMonth(t.createdAt));

		// 2. Fetch InventoryUnits created in this period
		const unitsQuery = { createdAt: { $gte: queryStart, $lt: queryEnd } };
		if (companyId) unitsQuery.companyId = companyId;
		if (branchId && mongoose.isValidObjectId(branchId)) unitsQuery.branchId = branchId;

		const monthUnits = await InventoryUnit.find(unitsQuery)
			.populate("productId")
			.populate("branchId", "name code")
			.sort({ createdAt: -1 })
			.lean();

		const validUnits = monthUnits.filter((u) => isDateInSelectedMonth(u.createdAt));

		// Index units by product + branch for linking
		const unitsByProductBranch = new Map();
		for (const u of validUnits) {
			const pId = String(u.productId?._id || u.productId || "");
			const bId = String(u.branchId?._id || u.branchId || "");
			const key = `${pId}_${bId}`;
			if (!unitsByProductBranch.has(key)) {
				unitsByProductBranch.set(key, []);
			}
			unitsByProductBranch.get(key).push(u);
		}

		const items = [];
		const usedUnitIds = new Set();

		// Each inventory transaction is a distinct intake batch!
		for (const tx of validTransactions) {
			if (!tx.productId || !tx.productId._id) continue;

			const prod = tx.productId;
			const branchObj = tx.branchId || {};
			const mrp = Number(tx.mrp !== undefined && tx.mrp !== null ? tx.mrp : prod.mrp || 0);
			const discountVal = Number(tx.discountValue || 0);
			const discountAmount = tx.discountType === "percentage" ? (mrp * discountVal) / 100 : discountVal;
			const sellingPrice = Number(
				tx.sellingPrice !== undefined && tx.sellingPrice !== null
					? tx.sellingPrice
					: Math.max(0, mrp - discountAmount)
			);
			const purchasePrice = Number(tx.purchasePrice || 0);
			const quantity = Number(tx.quantity || 0);
			const isSerialized = Boolean(prod.isSerialized);

			let serialNumbers = [];

			if (Array.isArray(tx.serialNumbers) && tx.serialNumbers.length > 0) {
				serialNumbers = tx.serialNumbers.map((s) => ({
					serialNumber: s,
					addedAt: tx.createdAt,
					status: "available",
				}));
			} else if (isSerialized) {
				const pbKey = `${String(prod._id)}_${String(branchObj._id || "")}`;
				const candidateUnits = unitsByProductBranch.get(pbKey) || [];
				const txTime = new Date(tx.createdAt).getTime();

				// Try to match units created around the transaction time (+/- 15 mins)
				const matched = candidateUnits.filter((u) => {
					if (usedUnitIds.has(String(u._id))) return false;
					const uTime = new Date(u.createdAt).getTime();
					return Math.abs(uTime - txTime) <= 15 * 60 * 1000;
				});

				const unitsToUse = matched.length > 0
					? matched
					: candidateUnits.filter((u) => !usedUnitIds.has(String(u._id))).slice(0, quantity);

				for (const u of unitsToUse) {
					usedUnitIds.add(String(u._id));
					serialNumbers.push({
						unitId: u._id,
						serialNumber: u.serialNumber,
						addedAt: u.createdAt,
						status: u.status,
					});
				}
			}

			const stockAdded = isSerialized && serialNumbers.length > 0
				? Math.max(quantity, serialNumbers.length)
				: quantity;

			items.push({
				inventoryId: tx._id,
				transactionId: tx._id,
				createdAt: tx.createdAt,
				updatedAt: tx.updatedAt || tx.createdAt,
				branchId: branchObj._id,
				branchName: branchObj.name || "Main Branch",
				branchCode: branchObj.code || "BR01",
				productId: prod._id,
				name: prod.name,
				barcode: tx.barcode || prod.barcode,
				category: prod.category || "General",
				brand: prod.brand || "",
				modelNumber: prod.modelNumber || "",
				hsnCode: prod.hsnCode || "",
				isSerialized,
				mrp,
				discountType: tx.discountType || "fixed",
				discountValue: discountVal,
				purchasePrice,
				sellingPrice,
				stockAdded,
				totalPurchaseValue: purchasePrice * stockAdded,
				totalSellingValue: sellingPrice * stockAdded,
				serialNumbers,
			});
		}

		// 3. Check for any orphaned InventoryUnits not attached to a transaction
		const orphanedUnits = validUnits.filter((u) => !usedUnitIds.has(String(u._id)));
		if (orphanedUnits.length > 0) {
			const orphanedMap = new Map();
			for (const u of orphanedUnits) {
				if (!u.productId || !u.productId._id) continue;
				const prod = u.productId;
				const branchObj = u.branchId || {};
				const dateStr = new Date(u.createdAt).toISOString().slice(0, 10);
				const key = `ORPHAN_${prod._id}_${branchObj._id || "default"}_${u.mrp || 0}_${dateStr}`;

				if (!orphanedMap.has(key)) {
					const mrp = Number(u.mrp || prod.mrp || 0);
					const discountVal = Number(u.discountValue || 0);
					const discountAmount = u.discountType === "percentage" ? (mrp * discountVal) / 100 : discountVal;
					const sellingPrice = Number(u.sellingPrice || Math.max(0, mrp - discountAmount));
					const purchasePrice = Number(u.purchasePrice || prod.purchasePrice || 0);

					orphanedMap.set(key, {
						inventoryId: u._id,
						transactionId: u._id,
						createdAt: u.createdAt,
						updatedAt: u.createdAt,
						branchId: branchObj._id,
						branchName: branchObj.name || "Main Branch",
						branchCode: branchObj.code || "BR01",
						productId: prod._id,
						name: prod.name,
						barcode: u.barcode || prod.barcode,
						category: prod.category || "General",
						brand: prod.brand || "",
						modelNumber: prod.modelNumber || "",
						hsnCode: prod.hsnCode || "",
						isSerialized: true,
						mrp,
						discountType: u.discountType || "fixed",
						discountValue: discountVal,
						purchasePrice,
						sellingPrice,
						stockAdded: 0,
						totalPurchaseValue: 0,
						totalSellingValue: 0,
						serialNumbers: [],
					});
				}

				const rec = orphanedMap.get(key);
				rec.stockAdded += 1;
				rec.totalPurchaseValue = rec.purchasePrice * rec.stockAdded;
				rec.totalSellingValue = rec.sellingPrice * rec.stockAdded;
				rec.serialNumbers.push({
					unitId: u._id,
					serialNumber: u.serialNumber,
					addedAt: u.createdAt,
					status: u.status,
				});
			}

			items.push(...orphanedMap.values());
		}

		// 4. Check for any BranchInventory records created in this month without a transaction or unit
		const branchInvQuery = { createdAt: { $gte: queryStart, $lt: queryEnd } };
		if (companyId) branchInvQuery.companyId = companyId;
		if (branchId && mongoose.isValidObjectId(branchId)) branchInvQuery.branchId = branchId;

		const createdBranchInventories = await BranchInventory.find(branchInvQuery)
			.populate("productId")
			.populate("branchId", "name code")
			.lean();

		for (const bi of createdBranchInventories) {
			if (!bi.productId || !bi.productId._id) continue;
			if (!isDateInSelectedMonth(bi.createdAt)) continue;

			// Check if already represented by an InventoryTransaction
			const alreadyHasTx = validTransactions.some(
				(tx) =>
					String(tx.productId?._id || tx.productId) === String(bi.productId._id) &&
					String(tx.branchId?._id || tx.branchId) === String(bi.branchId?._id || bi.branchId)
			);
			if (alreadyHasTx) continue;

			const prod = bi.productId;
			const branchObj = bi.branchId || {};
			const mrp = Number(bi.mrp || prod.mrp || 0);
			const discountVal = Number(bi.discountValue || 0);
			const discountAmount = bi.discountType === "percentage" ? (mrp * discountVal) / 100 : discountVal;
			const sellingPrice = Math.max(0, mrp - discountAmount);
			const purchasePrice = Number(bi.purchasePrice || 0);
			const stockAdded = Number(bi.stock || 0);

			if (stockAdded <= 0) continue;

			items.push({
				inventoryId: bi._id,
				transactionId: bi._id,
				createdAt: bi.createdAt,
				updatedAt: bi.updatedAt || bi.createdAt,
				branchId: branchObj._id,
				branchName: branchObj.name || "Main Branch",
				branchCode: branchObj.code || "BR01",
				productId: prod._id,
				name: prod.name,
				barcode: bi.barcode || prod.barcode,
				category: prod.category || "General",
				brand: prod.brand || "",
				modelNumber: prod.modelNumber || "",
				hsnCode: prod.hsnCode || "",
				isSerialized: Boolean(prod.isSerialized),
				mrp,
				discountType: bi.discountType || "fixed",
				discountValue: discountVal,
				purchasePrice,
				sellingPrice,
				stockAdded,
				totalPurchaseValue: purchasePrice * stockAdded,
				totalSellingValue: sellingPrice * stockAdded,
				serialNumbers: [],
			});
		}

		// Sort newest first
		items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

		const totalBatches = items.length;
		const totalUnitsAdded = items.reduce((sum, i) => sum + i.stockAdded, 0);
		const totalIntakeCost = items.reduce((sum, i) => sum + i.totalPurchaseValue, 0);
		const totalSellingValue = items.reduce((sum, i) => sum + i.totalSellingValue, 0);

		return res.status(200).json({
			success: true,
			data: {
				month,
				totalBatches,
				totalUnitsAdded,
				totalIntakeCost,
				totalSellingValue,
				items,
			},
		});
	} catch (error) {
		console.error("Get monthly inventory report error:", error);
		return res.status(500).json({ success: false, message: "Unable to fetch monthly inventory report" });
	}
};

module.exports = {
	addBranchInventory,
	getBranchInventoryProducts,
	getLowStockBranchProducts,
	getBranchStockValuation,
	getCompanyStockValuation,
	getProductBySerialNumber,
	getMonthlyInventoryReport,
};
