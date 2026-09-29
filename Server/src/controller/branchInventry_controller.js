const mongoose = require("mongoose");
const Branch = require("../model/branch");
const Product = require("../model/product");
const BranchInventory = require("../model/BranchInventory");
const InventoryUnit = require("../model/inventryUnit");
const InventoryTransaction = require("../model/InventoryTransaction");
const Sale = require("../model/sale");
const redis = require("../config/redis");
const { createAuditLog } = require("../utils/auditLogger");

const getBranchInventoryCacheKey = (companyId, branchId) => `branchInventory:${companyId}:${branchId}`;
const getLowStockCacheKey = (companyId, branchId) => `branchInventory:lowStock:v2:${companyId}:${branchId}`;
const getBranchValuationCacheKey = (companyId, branchId) => `branchInventory:valuation:${companyId}:${branchId}`;
const getCompanyValuationCacheKey = (companyId) => `companyInventory:valuation:${companyId}`;
const getProductsListKey = (companyId) => `products:company:${companyId}`;
const getProductCacheKey = (companyId, productId) => `product:${companyId}:${productId}`;
const getProductBarcodeKey = (companyId, barcode) => `product:barcode:${companyId}:${barcode}`;

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
				purchasePrice: inventoryUnit.purchasePrice !== undefined && inventoryUnit.purchasePrice !== null ? inventoryUnit.purchasePrice : inventoryUnit.productId?.purchasePrice,
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
			.sort({ branchId: 1, barcode: 1, purchasePrice: 1 })
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

		const cacheKey = getBranchValuationCacheKey(companyId, branchId);
		try {
			const cached = await redis.get(cacheKey);
			if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
		} catch (redisError) {
			console.error("Redis branch valuation cache read error:", redisError.message);
		}

		const inventory = await BranchInventory.find({ companyId, branchId })
			.populate("productId", "name barcode")
			.sort({ barcode: 1, purchasePrice: 1 })
			.lean();

		const products = inventory.map((item) => {
			const stock = Number(item.stock || 0);
			const purchasePrice = Number(item.purchasePrice || 0);
			return {
				productId: item.productId?._id,
				name: item.productId?.name,
				barcode: item.barcode,
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
			.sort({ productId: 1, purchasePrice: 1 })
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
			purchasePrice: item.purchasePrice,
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

		const inventoryPurchasePrice = Number(purchasePrice || 0);
		if (isNaN(inventoryPurchasePrice) || inventoryPurchasePrice < 0) {
			return res.status(400).json({ success: false, message: "purchasePrice must be a valid non-negative number" });
		}

		const productId = product._id;
		const isSerialized = product.isSerialized === true;
		const requestedQuantity = Number(quantity ?? (isSerialized ? serials.length : 0));

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

		// If barcode/productId is same but purchasePrice is different, a new branch inventory is created.
		// If both productId and purchasePrice match, increment existing inventory stock.
		let inventory = await BranchInventory.findOne({
			companyId,
			branchId,
			productId,
			purchasePrice: inventoryPurchasePrice,
		});

		let isNewBranchInventory = false;
		let prevStock = 0;
		if (inventory) {
			prevStock = inventory.stock;
			inventory.stock += requestedQuantity;
			if (manufacturingDate !== undefined) inventory.manufacturingDate = manufacturingDate;
			if (expiryDate !== undefined) inventory.expiryDate = expiryDate;
			await inventory.save();
		} else {
			isNewBranchInventory = true;
			inventory = await BranchInventory.create({
				companyId,
				branchId,
				productId,
				purchasePrice: inventoryPurchasePrice,
				manufacturingDate,
				expiryDate,
				barcode: product.barcode,
				stock: requestedQuantity,
			});
		}

		let inventoryTransaction = null;
		let units = [];
		try {
			inventoryTransaction = await InventoryTransaction.create({
				companyId,
				branchId,
				productId,
				quantity: requestedQuantity,
				purchasePrice: inventoryPurchasePrice,
				barcode: product.barcode,
				sellingPrice: 0,
				serialNumbers: isSerialized ? serials : [],
			});

			if (isSerialized) {
				units = await InventoryUnit.create(serials.map((serialNumber) => ({
					companyId,
					branchId,
					productId,
					serialNumber,
					barcode: product.barcode,
					purchasePrice: inventoryPurchasePrice,
					status: "available",
				})));
			}
		} catch (innerCreateErr) {
			// Rollback to prevent partial data save
			if (units.length > 0) {
				await InventoryUnit.deleteMany({ _id: { $in: units.map((u) => u._id) } }).catch(() => {});
			}
			if (inventoryTransaction && inventoryTransaction._id) {
				await InventoryTransaction.findByIdAndDelete(inventoryTransaction._id).catch(() => {});
			}
			if (isNewBranchInventory && inventory && inventory._id) {
				await BranchInventory.findByIdAndDelete(inventory._id).catch(() => {});
			} else if (!isNewBranchInventory && inventory && inventory._id) {
				inventory.stock = prevStock;
				await inventory.save().catch(() => {});
			}
			throw innerCreateErr;
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

/**
 * ATOMIC: Create Global Catalog Product and Receive Branch Stock Intake in a single operation.
 * If ANY validation fails (e.g. duplicate serial numbers), or ANY database error occurs,
 * NOTHING is saved and all created documents are cleanly rolled back.
 */
const addProductWithIntake = async (req, res) => {
	try {
		const companyId = req.user?.companyId;
		const {
			product: rawProduct,
			intake: rawIntake,
			barcode: flatBarcode,
			name: flatName,
			modelNumber: flatModelNumber,
			hsnCode: flatHsnCode,
			description: flatDescription,
			category: flatCategory,
			categoryId: flatCategoryId,
			brand: flatBrand,
			brandId: flatBrandId,
			isSerialized: flatIsSerialized,
			cgstRate: flatCgstRate,
			sgstRate: flatSgstRate,
			igstRate: flatIgstRate,
			minStockLevel: flatMinStockLevel,
			specifications: flatSpecifications,
			branchId: flatBranchId,
			quantity: flatQuantity,
			purchasePrice: flatPurchasePrice,
			serialNumbers: flatSerialNumbers,
			manufacturingDate: flatManufacturingDate,
			expiryDate: flatExpiryDate,
		} = req.body || {};

		const pData = rawProduct || {
			barcode: flatBarcode,
			name: flatName,
			modelNumber: flatModelNumber,
			hsnCode: flatHsnCode,
			description: flatDescription,
			category: flatCategory,
			categoryId: flatCategoryId,
			brand: flatBrand,
			brandId: flatBrandId,
			isSerialized: flatIsSerialized,
			cgstRate: flatCgstRate,
			sgstRate: flatSgstRate,
			igstRate: flatIgstRate,
			minStockLevel: flatMinStockLevel,
			specifications: flatSpecifications,
		};

		const iData = rawIntake || {
			branchId: flatBranchId,
			quantity: flatQuantity,
			purchasePrice: flatPurchasePrice,
			serialNumbers: flatSerialNumbers,
			manufacturingDate: flatManufacturingDate,
			expiryDate: flatExpiryDate,
		};

		const cleanBarcode = String(pData.barcode || "").trim();
		const productName = String(pData.name || "").trim();
		const targetBranchId = iData.branchId || req.user.branchId;

		// 1. Basic validation
		if (!cleanBarcode) {
			return res.status(400).json({ success: false, message: "Barcode is required" });
		}
		if (!productName) {
			return res.status(400).json({ success: false, message: "Product name is required" });
		}
		if (!targetBranchId) {
			return res.status(400).json({ success: false, message: "branchId is required" });
		}

		// 2. Validate branch exists & active
		const branch = await Branch.findOne({ _id: targetBranchId, companyId, status: "ACTIVE" });
		if (!branch) {
			return res.status(404).json({ success: false, message: "Branch not found or inactive" });
		}

		// 3. Check duplicate product barcode in advance
		const existingProduct = await Product.findOne({ companyId, barcode: cleanBarcode });
		if (existingProduct) {
			return res.status(409).json({ success: false, message: `Product with barcode "${cleanBarcode}" already exists` });
		}

		// 4. Validate quantity & price
		const requestedQuantity = Number(iData.quantity);
		if (!Number.isInteger(requestedQuantity) || requestedQuantity <= 0) {
			return res.status(400).json({ success: false, message: "quantity must be a positive integer" });
		}

		const inventoryPurchasePrice = Number(iData.purchasePrice || 0);
		if (isNaN(inventoryPurchasePrice) || inventoryPurchasePrice < 0) {
			return res.status(400).json({ success: false, message: "purchasePrice must be a valid non-negative number" });
		}

		// 5. Validate serial numbers BEFORE saving anything
		const isSerialized = Boolean(pData.isSerialized);
		const rawSerials = Array.isArray(iData.serialNumbers) ? iData.serialNumbers : [];
		const serials = rawSerials.map((s) => String(s).trim()).filter(Boolean);

		if (isSerialized) {
			if (serials.length !== requestedQuantity) {
				return res.status(400).json({
					success: false,
					message: `For serialized products, quantity (${requestedQuantity}) must match count of serial numbers (${serials.length})`,
				});
			}

			// Duplicate check within payload (case-insensitive)
			const seenLower = new Set();
			const duplicateList = [];
			for (const s of serials) {
				const lower = s.toLowerCase();
				if (seenLower.has(lower)) {
					duplicateList.push(s);
				}
				seenLower.add(lower);
			}

			if (duplicateList.length > 0) {
				return res.status(409).json({
					success: false,
					message: `Duplicate serial numbers provided: "${[...new Set(duplicateList)].join('", "')}". Each serial number must be unique.`,
				});
			}

			// Check if ANY serial number already exists in database
			const existingUnits = await InventoryUnit.find({ companyId, serialNumber: { $in: serials } }).select("serialNumber").lean();
			if (existingUnits.length > 0) {
				const existingSerialNames = existingUnits.map((u) => u.serialNumber).join('", "');
				return res.status(409).json({
					success: false,
					message: `Serial number(s) "${existingSerialNames}" already exist in inventory. Each unit must have a unique serial number.`,
				});
			}
		} else if (serials.length > 0) {
			return res.status(400).json({ success: false, message: "Non-serialized products cannot have serial numbers" });
		}

		// 6. ALL VALIDATIONS PASSED. Now write to database with full rollback protection.
		let createdProduct = null;
		let createdInventory = null;
		let isNewInventory = false;
		let prevStock = 0;
		let createdTransaction = null;
		let createdUnits = [];

		try {
			// A. Create Global Catalog Product
			createdProduct = await Product.create({
				companyId,
				barcode: cleanBarcode,
				name: productName,
				modelNumber: pData.modelNumber ? String(pData.modelNumber).trim() : "",
				hsnCode: pData.hsnCode ? String(pData.hsnCode).trim() : "",
				description: pData.description ? String(pData.description).trim() : "",
				category: pData.category || "General",
				categoryId: pData.categoryId || null,
				brand: pData.brand || "",
				brandId: pData.brandId || null,
				isSerialized,
				cgstRate: Number(pData.cgstRate ?? 9),
				sgstRate: Number(pData.sgstRate ?? 9),
				igstRate: Number(pData.igstRate ?? 0),
				minStockLevel: Number(pData.minStockLevel ?? 2),
				specifications: pData.specifications || {},
			});

			// B. Create / Update Branch Inventory
			createdInventory = await BranchInventory.findOne({
				companyId,
				branchId: targetBranchId,
				productId: createdProduct._id,
				purchasePrice: inventoryPurchasePrice,
			});

			if (createdInventory) {
				prevStock = createdInventory.stock;
				createdInventory.stock += requestedQuantity;
				if (iData.manufacturingDate !== undefined) createdInventory.manufacturingDate = iData.manufacturingDate;
				if (iData.expiryDate !== undefined) createdInventory.expiryDate = iData.expiryDate;
				await createdInventory.save();
			} else {
				isNewInventory = true;
				createdInventory = await BranchInventory.create({
					companyId,
					branchId: targetBranchId,
					productId: createdProduct._id,
					purchasePrice: inventoryPurchasePrice,
					manufacturingDate: iData.manufacturingDate,
					expiryDate: iData.expiryDate,
					barcode: createdProduct.barcode,
					stock: requestedQuantity,
				});
			}

			// C. Create Inventory Transaction
			createdTransaction = await InventoryTransaction.create({
				companyId,
				branchId: targetBranchId,
				productId: createdProduct._id,
				quantity: requestedQuantity,
				purchasePrice: inventoryPurchasePrice,
				barcode: createdProduct.barcode,
				sellingPrice: 0,
				serialNumbers: isSerialized ? serials : [],
			});

			// D. Create Inventory Units
			if (isSerialized && serials.length > 0) {
				createdUnits = await InventoryUnit.create(serials.map((serialNumber) => ({
					companyId,
					branchId: targetBranchId,
					productId: createdProduct._id,
					serialNumber,
					barcode: createdProduct.barcode,
					purchasePrice: inventoryPurchasePrice,
					status: "available",
				})));
			}

			// E. Invalidate Caches & Audit Log
			await invalidateBranchInventoryCache(companyId, targetBranchId);
			try {
				await redis.del(
					getProductsListKey(companyId),
					getProductCacheKey(companyId, createdProduct._id),
					getProductBarcodeKey(companyId, createdProduct.barcode)
				);
			} catch (rErr) {}

			await createAuditLog(req, {
				companyId,
				branchId: targetBranchId,
				action: "PRODUCT_AND_INVENTORY_INTAKE_CREATE",
				resource: "Product",
				resourceId: createdProduct._id,
				details: {
					productId: createdProduct._id,
					barcode: createdProduct.barcode,
					name: createdProduct.name,
					quantity: requestedQuantity,
					purchasePrice: inventoryPurchasePrice,
					serialNumbers: serials,
				},
			});

			return res.status(201).json({
				success: true,
				message: `Product "${createdProduct.name}" created and ${requestedQuantity} unit(s) received into branch stock`,
				data: {
					product: createdProduct,
					inventory: createdInventory,
					transaction: createdTransaction,
					units: createdUnits,
				},
			});
		} catch (innerErr) {
			console.error("Database write error in addProductWithIntake, executing complete rollback:", innerErr);

			// Clean up everything in reverse order so no orphaned data remains
			if (createdUnits.length > 0) {
				await InventoryUnit.deleteMany({ _id: { $in: createdUnits.map((u) => u._id) } }).catch((e) => console.error("Rollback units error:", e));
			}
			if (createdTransaction && createdTransaction._id) {
				await InventoryTransaction.findByIdAndDelete(createdTransaction._id).catch((e) => console.error("Rollback transaction error:", e));
			}
			if (isNewInventory && createdInventory && createdInventory._id) {
				await BranchInventory.findByIdAndDelete(createdInventory._id).catch((e) => console.error("Rollback inventory error:", e));
			} else if (!isNewInventory && createdInventory && createdInventory._id) {
				createdInventory.stock = prevStock;
				await createdInventory.save().catch((e) => console.error("Rollback stock error:", e));
			}
			if (createdProduct && createdProduct._id) {
				await Product.findByIdAndDelete(createdProduct._id).catch((e) => console.error("Rollback product error:", e));
			}

			return res.status(innerErr.code === 11000 ? 409 : 500).json({
				success: false,
				message: innerErr.code === 11000
					? "Serial number or barcode already exists in database. All changes have been rolled back and nothing was saved."
					: innerErr.message || "Failed to save product and receive stock. All changes have been rolled back.",
			});
		}
	} catch (outerErr) {
		console.error("addProductWithIntake error:", outerErr);
		return res.status(500).json({
			success: false,
			message: outerErr.message || "Unable to process product and intake request",
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

		// Collect all unique serial number strings from transactions and units in this month to query real-time status
		const allSerialStrings = new Set();
		for (const tx of validTransactions) {
			if (Array.isArray(tx.serialNumbers)) {
				for (const s of tx.serialNumbers) {
					const clean = String(typeof s === "object" ? s.serialNumber : s || "").trim();
					if (clean) allSerialStrings.add(clean);
				}
			}
		}
		for (const u of validUnits) {
			if (u?.serialNumber) {
				allSerialStrings.add(String(u.serialNumber).trim());
			}
		}

		// Query real-time status from InventoryUnit and Sale
		const unitStatusMap = new Map();
		if (allSerialStrings.size > 0) {
			const serialList = Array.from(allSerialStrings);

			// 1. Check InventoryUnit records for status (available, sold, damaged, etc.)
			const unitDocs = await InventoryUnit.find({
				serialNumber: { $in: serialList },
				...(companyId ? { companyId } : {}),
			})
				.select("serialNumber status branchId productId createdAt updatedAt")
				.lean();

			for (const u of unitDocs) {
				if (u?.serialNumber) {
					unitStatusMap.set(String(u.serialNumber).trim().toLowerCase(), u.status || "available");
				}
			}

			// 2. Cross-reference completed Sales to ensure any sold serial number is marked as sold
			try {
				const Sale = require("../model/sale");
				const soldSales = await Sale.find({
					"items.serialNumber": { $in: serialList },
					...(companyId ? { companyId } : {}),
				})
					.select("items.serialNumber")
					.lean();

				for (const s of soldSales) {
					for (const it of (s.items || [])) {
						if (it?.serialNumber) {
							unitStatusMap.set(String(it.serialNumber).trim().toLowerCase(), "sold");
						}
					}
				}
			} catch (saleLookupErr) {
				console.error("Sale serial lookup error in monthly report:", saleLookupErr.message);
			}
		}

		// Each inventory transaction is a distinct intake batch!
		for (const tx of validTransactions) {
			if (!tx.productId || !tx.productId._id) continue;

			const prod = tx.productId;
			const branchObj = tx.branchId || {};
			const purchasePrice = Number(tx.purchasePrice || 0);
			const quantity = Number(tx.quantity || 0);
			const isSerialized = Boolean(prod.isSerialized);

			let serialNumbers = [];

			if (Array.isArray(tx.serialNumbers) && tx.serialNumbers.length > 0) {
				serialNumbers = tx.serialNumbers.map((s) => {
					const sn = String(typeof s === "object" ? s.serialNumber : s || "").trim();
					const liveStatus = unitStatusMap.get(sn.toLowerCase()) || (typeof s === "object" && s.status ? s.status : "available");
					return {
						serialNumber: sn,
						addedAt: (typeof s === "object" && s.addedAt) || tx.createdAt,
						status: liveStatus,
					};
				});
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
					const sn = String(u.serialNumber || "").trim();
					const liveStatus = unitStatusMap.get(sn.toLowerCase()) || u.status || "available";
					serialNumbers.push({
						unitId: u._id,
						serialNumber: sn,
						addedAt: u.createdAt,
						status: liveStatus,
					});
				}
			}

			const stockAdded = isSerialized && serialNumbers.length > 0
				? Math.max(quantity, serialNumbers.length)
				: quantity;

			const rawSpecs = prod.specifications && typeof prod.specifications === "object" ? prod.specifications : {};
			const parseVal = (...vals) => {
				for (const v of vals) {
					if (v !== undefined && v !== null && String(v).trim().length > 0) {
						return typeof v === "string" ? v.trim() : v;
					}
				}
				return "";
			};

			const consolidatedSpecs = {
				...rawSpecs,
				ram: parseVal(rawSpecs.ram, prod.ram),
				storage: parseVal(rawSpecs.storage, prod.storage),
				color: parseVal(rawSpecs.color, prod.color),
				processor: parseVal(rawSpecs.processor, prod.processor),
				operatingSystem: parseVal(rawSpecs.operatingSystem, prod.operatingSystem),
				warranty: parseVal(rawSpecs.warranty, prod.warranty),
				tollFreeNumber: parseVal(rawSpecs.tollFreeNumber, prod.tollFreeNumber),
				dimensions: parseVal(rawSpecs.dimensions, prod.dimensions),
				weight: parseVal(rawSpecs.weight, prod.weight),
				powerConsumption: parseVal(rawSpecs.powerConsumption, prod.powerConsumption),
				voltage: parseVal(rawSpecs.voltage, prod.voltage),
				connectivity: (rawSpecs.connectivity && rawSpecs.connectivity.length > 0) ? rawSpecs.connectivity : (prod.connectivity || ""),
				displaySize: parseVal(rawSpecs.displaySize, prod.displaySize),
				resolution: parseVal(rawSpecs.resolution, prod.resolution),
				batteryCapacity: parseVal(rawSpecs.batteryCapacity, prod.batteryCapacity),
				camera: parseVal(rawSpecs.camera, prod.camera),
				speaker: parseVal(rawSpecs.speaker, prod.speaker),
				features: (rawSpecs.features && rawSpecs.features.length > 0) ? rawSpecs.features : (prod.features || ""),
			};
			const consolidatedDesc = parseVal(prod.description, rawSpecs.description, prod.desc, rawSpecs.desc);

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
				description: consolidatedDesc,
				specifications: consolidatedSpecs,
				isSerialized,
				purchasePrice,
				stockAdded,
				totalPurchaseValue: purchasePrice * stockAdded,
				serialNumbers,
			});
		}

		// Sort newest first
		items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

		const totalBatches = items.length;
		const totalUnitsAdded = items.reduce((sum, i) => sum + i.stockAdded, 0);
		const totalIntakeCost = items.reduce((sum, i) => sum + i.totalPurchaseValue, 0);
		const totalSellingValue = 0;

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

const updateBranchInventoryIntake = async (req, res) => {
	try {
		const companyId = req.user?.companyId;
		const { id } = req.params;

		if (!mongoose.isValidObjectId(id)) {
			return res.status(400).json({ success: false, message: "Invalid transaction ID format" });
		}

		// 1. Find the inventory transaction
		const transaction = await InventoryTransaction.findById(id);
		if (!transaction) {
			return res.status(404).json({ success: false, message: "Inventory intake transaction not found" });
		}

		if (companyId && String(transaction.companyId) !== String(companyId)) {
			return res.status(403).json({ success: false, message: "Unauthorized: transaction belongs to a different company" });
		}

		// 2. Find the associated Product
		const product = await Product.findById(transaction.productId);
		if (!product) {
			return res.status(404).json({ success: false, message: "Associated product not found" });
		}

		const oldBarcode = String(product.barcode || "").trim();
		const oldPurchasePrice = Number(transaction.purchasePrice || 0);
		const oldQuantity = Number(transaction.quantity || 0);
		const isSerialized = Boolean(product.isSerialized);

		// 3. Process Product details
		const {
			name,
			barcode,
			category,
			brand,
			modelNumber,
			hsnCode,
			description,
			specifications,
			purchasePrice,
			quantity,
			serialNumbers,
		} = req.body;

		// Validate & handle Barcode update
		let newBarcode = oldBarcode;
		if (barcode !== undefined) {
			const cleanBarcode = String(barcode).trim();
			if (!cleanBarcode) {
				return res.status(400).json({ success: false, message: "Barcode cannot be empty" });
			}
			if (cleanBarcode !== oldBarcode) {
				const existingBarcodeProduct = await Product.findOne({
					companyId: transaction.companyId,
					barcode: cleanBarcode,
					_id: { $ne: product._id },
				});
				if (existingBarcodeProduct) {
					return res.status(409).json({
						success: false,
						message: `Barcode "${cleanBarcode}" is already in use by another product: ${existingBarcodeProduct.name}`,
					});
				}
				newBarcode = cleanBarcode;
				product.barcode = newBarcode;
			}
		}

		// Update product attributes
		if (name !== undefined && String(name).trim()) {
			product.name = String(name).trim();
		}
		if (category !== undefined) {
			product.category = String(category).trim();
		}
		if (brand !== undefined) {
			product.brand = String(brand).trim();
		}
		if (modelNumber !== undefined) {
			product.modelNumber = String(modelNumber).trim();
		}
		if (hsnCode !== undefined) {
			product.hsnCode = String(hsnCode).trim();
		}
		if (description !== undefined) {
			product.description = String(description).trim();
			product.markModified("description");
		}
		if (specifications && typeof specifications === "object") {
			const existingSpecs = (product.specifications && typeof product.specifications.toObject === "function")
				? product.specifications.toObject()
				: (product.specifications || {});

			product.specifications = {
				...existingSpecs,
				...specifications,
			};
			product.markModified("specifications");
		}
		await product.save();

		// 4. Validate purchase price
		let newPurchasePrice = oldPurchasePrice;
		if (purchasePrice !== undefined) {
			const parsedPrice = Number(purchasePrice);
			if (isNaN(parsedPrice) || parsedPrice < 0) {
				return res.status(400).json({ success: false, message: "Purchase price must be a non-negative number" });
			}
			newPurchasePrice = parsedPrice;
		}

		// 5. Handle Serial Numbers and InventoryUnits if serialized
		let finalQuantity = oldQuantity;
		let finalSerialNumbers = [];

		if (isSerialized) {
			if (!Array.isArray(serialNumbers)) {
				return res.status(400).json({
					success: false,
					message: "serialNumbers must be an array for serialized products",
				});
			}

			// Clean and normalize incoming serials
			// Can be array of strings or array of { serialNumber, originalSerialNumber, status }
			const normalizedIncoming = [];
			const seenSerials = new Set();

			for (const s of serialNumbers) {
				const sn = String(typeof s === "object" ? s.serialNumber || "" : s || "").trim();
				const orig = String(typeof s === "object" ? (s.originalSerialNumber || s.serialNumber || "") : s || "").trim();
				if (!sn) continue;

				const lower = sn.toLowerCase();
				if (seenSerials.has(lower)) {
					return res.status(400).json({
						success: false,
						message: `Duplicate serial number "${sn}" in submitted serial numbers`,
					});
				}
				seenSerials.add(lower);
				normalizedIncoming.push({
					serialNumber: sn,
					originalSerialNumber: orig,
				});
			}

			if (normalizedIncoming.length === 0) {
				return res.status(400).json({
					success: false,
					message: "At least one serial number is required for serialized products",
				});
			}

			// Current serials recorded on this transaction
			const currentTxSerials = (transaction.serialNumbers || []).map((s) =>
				String(typeof s === "object" ? s.serialNumber || "" : s || "").trim()
			).filter(Boolean);

			// Check live status of current serials
			const existingUnits = await InventoryUnit.find({
				companyId: transaction.companyId,
				serialNumber: { $in: currentTxSerials },
			});

			const soldSerialsSet = new Set();
			for (const u of existingUnits) {
				if (String(u.status).toLowerCase() === "sold") {
					soldSerialsSet.add(u.serialNumber.trim().toLowerCase());
				}
			}

			try {
				const soldSales = await Sale.find({
					companyId: transaction.companyId,
					"items.serialNumber": { $in: currentTxSerials },
				}).select("items.serialNumber").lean();

				for (const s of soldSales) {
					for (const it of s.items || []) {
						if (it?.serialNumber) {
							soldSerialsSet.add(String(it.serialNumber).trim().toLowerCase());
						}
					}
				}
			} catch (saleErr) {
				console.error("Sale status check error in intake edit:", saleErr.message);
			}

			// Guard: Cannot remove or alter sold serial numbers
			for (const origSn of currentTxSerials) {
				if (soldSerialsSet.has(origSn.toLowerCase())) {
					const stillPresent = normalizedIncoming.some(
						(inc) =>
							inc.originalSerialNumber.toLowerCase() === origSn.toLowerCase() ||
							inc.serialNumber.toLowerCase() === origSn.toLowerCase()
					);
					if (!stillPresent) {
						return res.status(400).json({
							success: false,
							message: `Serial number "${origSn}" has already been sold and cannot be deleted or replaced`,
						});
					}
				}
			}

			// Process each incoming serial:
			// 1) Renaming / updating existing unit
			// 2) Adding brand new unit
			for (const inc of normalizedIncoming) {
				const isOrigInTx = currentTxSerials.some(
					(c) => c.toLowerCase() === inc.originalSerialNumber.toLowerCase()
				);

				if (isOrigInTx && inc.originalSerialNumber.toLowerCase() !== inc.serialNumber.toLowerCase()) {
					// User changed serial string for an existing unit
					if (soldSerialsSet.has(inc.originalSerialNumber.toLowerCase())) {
						return res.status(400).json({
							success: false,
							message: `Serial number "${inc.originalSerialNumber}" has been sold and cannot be renamed`,
						});
					}

					// Check if new serial already exists
					const conflict = await InventoryUnit.findOne({
						companyId: transaction.companyId,
						serialNumber: inc.serialNumber,
					});
					if (conflict) {
						return res.status(409).json({
							success: false,
							message: `Serial number "${inc.serialNumber}" already exists in inventory`,
						});
					}

					await InventoryUnit.updateOne(
						{ companyId: transaction.companyId, serialNumber: inc.originalSerialNumber },
						{
							$set: {
								serialNumber: inc.serialNumber,
								barcode: newBarcode,
								purchasePrice: newPurchasePrice,
							},
						}
					);
				} else if (!isOrigInTx) {
					// Brand new serial added
					const conflict = await InventoryUnit.findOne({
						companyId: transaction.companyId,
						serialNumber: inc.serialNumber,
					});
					if (conflict) {
						return res.status(409).json({
							success: false,
							message: `Serial number "${inc.serialNumber}" already exists in inventory`,
						});
					}

					await InventoryUnit.create({
						companyId: transaction.companyId,
						branchId: transaction.branchId,
						productId: product._id,
						serialNumber: inc.serialNumber,
						barcode: newBarcode,
						purchasePrice: newPurchasePrice,
						status: "available",
					});
				} else {
					// Existing unchanged serial -> update barcode & purchasePrice
					await InventoryUnit.updateOne(
						{ companyId: transaction.companyId, serialNumber: inc.serialNumber },
						{
							$set: {
								barcode: newBarcode,
								purchasePrice: newPurchasePrice,
							},
						}
					);
				}
			}

			// Delete removed serials (only if available and not sold)
			const incomingNewSerialsSet = new Set(normalizedIncoming.map((i) => i.serialNumber.toLowerCase()));
			const incomingOrigSerialsSet = new Set(normalizedIncoming.map((i) => i.originalSerialNumber.toLowerCase()));

			const removedSerials = currentTxSerials.filter(
				(orig) => !incomingNewSerialsSet.has(orig.toLowerCase()) && !incomingOrigSerialsSet.has(orig.toLowerCase())
			);

			if (removedSerials.length > 0) {
				await InventoryUnit.deleteMany({
					companyId: transaction.companyId,
					branchId: transaction.branchId,
					productId: product._id,
					serialNumber: { $in: removedSerials },
					status: { $ne: "sold" },
				});
			}

			finalSerialNumbers = normalizedIncoming.map((i) => i.serialNumber);
			finalQuantity = finalSerialNumbers.length;
		} else {
			// Non-serialized product: quantity can be directly updated
			if (quantity !== undefined) {
				const parsedQty = parseInt(quantity, 10);
				if (isNaN(parsedQty) || parsedQty <= 0) {
					return res.status(400).json({ success: false, message: "quantity must be a positive integer" });
				}
				finalQuantity = parsedQty;
			}
			finalSerialNumbers = [];
		}

		// 6. Synchronize BranchInventory stock
		if (newPurchasePrice === oldPurchasePrice) {
			const qtyDiff = finalQuantity - oldQuantity;
			let branchInv = await BranchInventory.findOne({
				companyId: transaction.companyId,
				branchId: transaction.branchId,
				productId: product._id,
				purchasePrice: oldPurchasePrice,
			});

			if (branchInv) {
				branchInv.stock = Math.max(0, branchInv.stock + qtyDiff);
				branchInv.barcode = newBarcode;
				await branchInv.save();
			} else {
				branchInv = await BranchInventory.create({
					companyId: transaction.companyId,
					branchId: transaction.branchId,
					productId: product._id,
					purchasePrice: newPurchasePrice,
					barcode: newBarcode,
					stock: finalQuantity,
				});
			}
		} else {
			// Purchase price changed -> decrement old bucket, increment/create new bucket
			const oldBranchInv = await BranchInventory.findOne({
				companyId: transaction.companyId,
				branchId: transaction.branchId,
				productId: product._id,
				purchasePrice: oldPurchasePrice,
			});
			if (oldBranchInv) {
				oldBranchInv.stock = Math.max(0, oldBranchInv.stock - oldQuantity);
				await oldBranchInv.save();
			}

			let newBranchInv = await BranchInventory.findOne({
				companyId: transaction.companyId,
				branchId: transaction.branchId,
				productId: product._id,
				purchasePrice: newPurchasePrice,
			});
			if (newBranchInv) {
				newBranchInv.stock += finalQuantity;
				newBranchInv.barcode = newBarcode;
				await newBranchInv.save();
			} else {
				newBranchInv = await BranchInventory.create({
					companyId: transaction.companyId,
					branchId: transaction.branchId,
					productId: product._id,
					purchasePrice: newPurchasePrice,
					barcode: newBarcode,
					stock: finalQuantity,
				});
			}
		}

		// Also sync barcode across all inventory documents of this product if barcode changed
		if (newBarcode !== oldBarcode) {
			await BranchInventory.updateMany(
				{ companyId: transaction.companyId, productId: product._id },
				{ $set: { barcode: newBarcode } }
			);
			await InventoryUnit.updateMany(
				{ companyId: transaction.companyId, productId: product._id },
				{ $set: { barcode: newBarcode } }
			);
			await InventoryTransaction.updateMany(
				{ companyId: transaction.companyId, productId: product._id },
				{ $set: { barcode: newBarcode } }
			);
		}

		// 7. Update InventoryTransaction
		transaction.quantity = finalQuantity;
		transaction.purchasePrice = newPurchasePrice;
		transaction.barcode = newBarcode;
		transaction.serialNumbers = finalSerialNumbers;
		await transaction.save();

		// 8. Invalidate Caches
		await invalidateBranchInventoryCache(transaction.companyId, transaction.branchId);

		try {
			await redis.del(
				`products:company:${transaction.companyId}`,
				`product:${transaction.companyId}:${product._id}`,
				`product:barcode:${transaction.companyId}:${oldBarcode}`,
				`product:barcode:${transaction.companyId}:${newBarcode}`
			);
		} catch (redisErr) {
			console.error("Redis product cache invalidation error:", redisErr.message);
		}

		// 9. Audit Log
		await createAuditLog(req, {
			companyId: transaction.companyId,
			branchId: transaction.branchId,
			action: "BRANCH_INVENTORY_INTAKE_UPDATE",
			resource: "InventoryTransaction",
			resourceId: transaction._id,
			details: {
				productId: product._id,
				productName: product.name,
				oldQuantity,
				newQuantity: finalQuantity,
				oldPurchasePrice,
				newPurchasePrice,
				barcode: newBarcode,
				serialNumbersCount: finalSerialNumbers.length,
			},
		});

		return res.status(200).json({
			success: true,
			message: "Inventory intake record updated successfully",
			data: {
				transaction,
				product,
			},
		});
	} catch (error) {
		console.error("Update branch inventory intake error:", error);
		return res.status(error.statusCode || (error.code === 11000 ? 409 : 500)).json({
			success: false,
			message: error.code === 11000 ? "Serial number or barcode already exists" : error.message || "Failed to update inventory intake record",
		});
	}
};

module.exports = {
	addBranchInventory,
	addProductWithIntake,
	getBranchInventoryProducts,
	getLowStockBranchProducts,
	getBranchStockValuation,
	getCompanyStockValuation,
	getProductBySerialNumber,
	getMonthlyInventoryReport,
	updateBranchInventoryIntake,
};
