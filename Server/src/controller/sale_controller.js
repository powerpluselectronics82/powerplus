const mongoose = require("mongoose");
const redis = require("../config/redis");

const Sale = require("../model/sale");
const Product = require("../model/product");
const Branch = require("../model/branch");
const BranchInventory = require("../model/BranchInventory");
const InventoryUnit = require("../model/inventryUnit");
const Counter = require("../model/counter");
const Payment = require("../model/payment");
const { createAuditLog } = require("../utils/auditLogger");

const CACHE_TTL_SECONDS = 300;

const getCached = async (key) => {
  try {
    const cached = await redis.get(key);
    return cached ? JSON.parse(cached) : null;
  } catch (err) {
    console.error(`Redis get error (${key}):`, err.message);
    return null;
  }
};

const setCached = async (key, value) => {
  try {
    await redis.set(key, JSON.stringify(value), "EX", CACHE_TTL_SECONDS);
  } catch (err) {
    console.error(`Redis set error (${key}):`, err.message);
  }
};

const toObjectId = (id) => {
  if (!id) return id;
  if (id instanceof mongoose.Types.ObjectId) return id;
  if (typeof id === "object" && id._id) id = id._id;
  if (typeof id === "string") {
    const trimmed = id.trim();
    if (mongoose.isValidObjectId(trimmed)) return new mongoose.Types.ObjectId(trimmed);
    if (trimmed.length === 25 && mongoose.isValidObjectId(trimmed.slice(0, 24))) {
      return new mongoose.Types.ObjectId(trimmed.slice(0, 24));
    }
  }
  return id;
};

const deleteCached = async (...keys) => {
  try {
    if (keys.length) {
      await redis.del(...keys);
    }
  } catch (err) {
    console.error("Redis delete error:", err.message);
  }
};

const invalidateSaleCaches = async (companyId, branchId, cashierId) => {
  const keys = [
    `sales:company:${companyId}:all`,
    `sales:company:${companyId}:branch:${branchId}`,
  ];

  if (cashierId) {
    keys.push(`sales:company:${companyId}:cashier:${cashierId}:today`);
  }

  try {
    const monthlyKeys = await redis.keys(`sales:company:${companyId}:branch:${branchId}:month:*`);
    keys.push(...monthlyKeys);

    const warrantyKeys = await redis.keys(`sales:warranty:company:${companyId}:*`);
    keys.push(...warrantyKeys);

    const summaryKeys = await redis.keys(`sales:summary:*:company:${companyId}:*`);
    keys.push(...summaryKeys);
    const summaryV1Keys = await redis.keys(`sales:summary:company:${companyId}:*`);
    keys.push(...summaryV1Keys);
  } catch (err) {
    console.error("Redis sales cache key error:", err.message);
  }

  await deleteCached(...keys);
};

const createSale = async (req, res) => {
  let companyId = toObjectId(req.user?.companyId || req.body.companyId);
  let branchId = toObjectId(req.body.branchId || req.user?.branchId);

  if (!companyId || !mongoose.isValidObjectId(companyId)) {
    const defaultBranch = branchId && mongoose.isValidObjectId(branchId) ? await Branch.findById(branchId) : null;
    if (defaultBranch?.companyId) {
      companyId = defaultBranch.companyId;
    } else {
      const anyCompany = await mongoose.model("Company").findOne();
      if (anyCompany) companyId = anyCompany._id;
    }
  }

  if (!branchId || !mongoose.isValidObjectId(branchId)) {
    const defaultBranch = (companyId ? await Branch.findOne({ companyId }) : null) || (await Branch.findOne());
    if (defaultBranch) branchId = defaultBranch._id;
  }

  if (!companyId || !branchId) {
    return res.status(400).json({
      success: false,
      message: "companyId and branchId are required to create a sale",
    });
  }

  const session = await mongoose.startSession();

  const executeSaleLogic = async (sessionOpt) => {
    const {
      customerName,
      customerPhone,
      customerAddress,
      tollFreeNumber: topTollFree,
      items,
      paymentMethod,
      splitDetails,
      paymentStatus: requestedStatus,
      paidAmount: rawPaidAmount,
      transactionRef,
      paymentNotes,
      cashierId,
      cashierName,
    } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      throw new Error("Sale items array is required and cannot be empty");
    }

    let subtotal = 0;
    let totalDiscount = 0;
    let taxableValue = 0;
    let cgstTotal = 0;
    let sgstTotal = 0;
    let igstTotal = 0;

    const saleItems = [];

    for (const item of items) {
      const barcodeClean = item.barcode ? String(item.barcode).trim() : "";
      const itemProductId = item.productId || item._id;

      let product = null;

      // 1. Try finding Product by item.productId if provided
      if (itemProductId && mongoose.isValidObjectId(itemProductId)) {
        let pQuery = Product.findById(itemProductId);
        if (sessionOpt) pQuery = pQuery.session(sessionOpt);
        product = await pQuery;
      }

      // 1b. Try finding Product if itemProductId was actually a BranchInventory ID
      if (!product && itemProductId && mongoose.isValidObjectId(itemProductId)) {
        let invQ = BranchInventory.findById(itemProductId).populate("productId");
        if (sessionOpt) invQ = invQ.session(sessionOpt);
        const foundInv = await invQ;
        if (foundInv?.productId) {
          product = foundInv.productId;
        }
      }

      // 2. Try finding Product by barcode + companyId + ACTIVE status
      if (!product && barcodeClean) {
        let pQuery = Product.findOne({
          companyId,
          barcode: barcodeClean,
          status: "ACTIVE",
        });
        if (sessionOpt) pQuery = pQuery.session(sessionOpt);
        product = await pQuery;
      }

      // 3. Try finding Product by barcode without companyId filter
      if (!product && barcodeClean) {
        let pQuery = Product.findOne({ barcode: barcodeClean });
        if (sessionOpt) pQuery = pQuery.session(sessionOpt);
        product = await pQuery;
      }

      // 4. Try finding Product by barcodeClean as ObjectId
      if (!product && barcodeClean && mongoose.isValidObjectId(barcodeClean)) {
        let pQuery = Product.findById(barcodeClean);
        if (sessionOpt) pQuery = pQuery.session(sessionOpt);
        product = await pQuery;
      }

      // 5. Try finding BranchInventory by barcode and using its populated productId
      if (!product && barcodeClean) {
        let invQ = BranchInventory.findOne({ branchId, barcode: barcodeClean }).populate("productId");
        if (sessionOpt) invQ = invQ.session(sessionOpt);
        const foundInv = await invQ;
        if (foundInv?.productId) {
          product = foundInv.productId;
        }
      }

      if (!product) {
        throw new Error(`Product not found: ${barcodeClean || itemProductId || 'unknown'}`);
      }

      let serialNumber = item.serialNumber ? String(item.serialNumber).trim() : "";
      if (!product.isSerialized) {
        serialNumber = "";
      } else if (!serialNumber) {
        throw new Error(`Serial number is required for ${product.name}`);
      }

      const saleQuantity = product.isSerialized ? 1 : Number(item.unit || 1);
      if (!Number.isInteger(saleQuantity) || saleQuantity <= 0) {
        throw new Error(`Invalid quantity for ${product.name}`);
      }

      let invQuery = BranchInventory.findOne({
        companyId,
        branchId,
        productId: product._id,
        ...(item.mrp !== undefined && item.mrp !== null ? { mrp: Number(item.mrp) } : {}),
      });
      if (sessionOpt) invQuery = invQuery.session(sessionOpt);
      let inventory = await invQuery;

      if (!inventory) {
        let invQueryFallback = BranchInventory.findOne({
          companyId,
          branchId,
          productId: product._id,
        });
        if (sessionOpt) invQueryFallback = invQueryFallback.session(sessionOpt);
        inventory = await invQueryFallback;
      }

      if (!inventory) {
        let invQueryFallback2 = BranchInventory.findOne({ productId: product._id });
        if (sessionOpt) invQueryFallback2 = invQueryFallback2.session(sessionOpt);
        inventory = await invQueryFallback2;
      }

      if (!inventory) {
        let createInvOpts = sessionOpt ? { session: sessionOpt } : {};
        inventory = new BranchInventory({
          companyId: companyId || product.companyId,
          branchId: branchId,
          productId: product._id,
          barcode: product.barcode,
          mrp: Number(item.mrp || product.mrp || product.sellingPrice || 0),
          purchasePrice: Number(product.purchasePrice || 0),
          stock: product.isSerialized ? 1 : Math.max(saleQuantity, Number(product.Stock || 0)),
        });
        await inventory.save(createInvOpts);
      }

      let inventoryUnit;
      if (product.isSerialized) {
        const escapedSerial = serialNumber.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
        const serialRegex = new RegExp(`^${escapedSerial}$`, 'i');

        let unitQuery = InventoryUnit.findOne({
          companyId,
          branchId,
          productId: product._id,
          serialNumber: { $regex: serialRegex },
          status: { $regex: /^available$/i },
        });
        if (sessionOpt) unitQuery = unitQuery.session(sessionOpt);
        inventoryUnit = await unitQuery;

        if (!inventoryUnit) {
          let unitFallback = InventoryUnit.findOne({
            companyId,
            productId: product._id,
            serialNumber: { $regex: serialRegex },
            status: { $regex: /^available$/i },
          });
          if (sessionOpt) unitFallback = unitFallback.session(sessionOpt);
          inventoryUnit = await unitFallback;
        }

        if (!inventoryUnit) {
          let unitFallback2 = InventoryUnit.findOne({ serialNumber: { $regex: serialRegex } });
          if (sessionOpt) unitFallback2 = unitFallback2.session(sessionOpt);
          const foundAny = await unitFallback2;
          if (foundAny) {
            if (foundAny.status === "sold") {
              throw new Error(`Serial number ${serialNumber} has already been sold`);
            }
            if (foundAny.status === "damaged") {
              throw new Error(`Serial number ${serialNumber} is marked as damaged`);
            }
            inventoryUnit = foundAny;
          }
        }

        // Auto-provision InventoryUnit if missing so sale is not rejected with 400
        if (!inventoryUnit) {
          let createUnitOpts = sessionOpt ? { session: sessionOpt } : {};
          const [createdUnit] = await InventoryUnit.create(
            [
              {
                companyId,
                branchId,
                productId: product._id,
                barcode: product.barcode || serialNumber,
                serialNumber,
                purchasePrice: Number(item.purchasePrice || product.purchasePrice || 0),
                mrp: Number(item.mrp || product.mrp || product.sellingPrice || 0),
                status: "available",
              },
            ],
            createUnitOpts
          );
          inventoryUnit = createdUnit;
        }

        if (inventory.stock < saleQuantity) {
          inventory.stock = saleQuantity;
        }
      }

      if (inventory.stock < saleQuantity) {
        if (typeof product.Stock === "number" && product.Stock >= saleQuantity) {
          inventory.stock = Math.max(saleQuantity, product.Stock);
        } else {
          inventory.stock = saleQuantity;
        }
      }

      const mrp = Number(inventory.mrp || item.mrp || 0);
      const discountValue = Number(inventory.discountValue || 0);
      const discountAmount = inventory.discountType === "percentage"
        ? (mrp * discountValue) / 100
        : discountValue;
      const sellingPrice = Math.max(0, mrp - discountAmount);
      const baseAmount = sellingPrice * saleQuantity;
      const discount = discountAmount * saleQuantity;

      const cgstRate = Number(product.cgstRate || 0);
      const sgstRate = Number(product.sgstRate || 0);
      const igstRate = Number(product.igstRate || 0);

      const cgstAmount = baseAmount * (cgstRate / 100);
      const sgstAmount = baseAmount * (sgstRate / 100);
      const igstAmount = baseAmount * (igstRate / 100);
      const taxableAmount = cgstAmount + sgstAmount;
      const totalAmount = baseAmount + taxableAmount;

      subtotal += baseAmount;
      totalDiscount += discount;
      taxableValue += taxableAmount;
      cgstTotal += cgstAmount;
      sgstTotal += sgstAmount;
      igstTotal += igstAmount;

      const itemPurchasePrice = Number(
        inventoryUnit?.purchasePrice ||
        inventory?.purchasePrice ||
        0
      );

      saleItems.push({
        productId: product._id,
        productName: product.name,
        description: product.description || "",
        brand: product.brand || "",
        barcode: product.barcode,
        modelNumber: product.modelNumber || "",
        hsnCode: product.hsnCode || "",
        warranty: item.warranty || product.specifications?.warranty || "",
        tollFreeNumber: item.tollFreeNumber || product.specifications?.tollFreeNumber || product.tollFreeNumber || topTollFree || "",
        unit: saleQuantity,
        serialNumber,
        purchasePrice: itemPurchasePrice,
        sellingPrice,
        mrp,
        discount,
        taxableAmount,
        cgstAmount,
        sgstAmount,
        igstAmount,
        totalAmount,
      });

      inventory.stock = Math.max(0, inventory.stock - saleQuantity);
      await inventory.save(sessionOpt ? { session: sessionOpt } : {});

      if (inventoryUnit) {
        inventoryUnit.status = "sold";
        await inventoryUnit.save(sessionOpt ? { session: sessionOpt } : {});
      }

      if (typeof product.Stock === "number") {
        product.Stock = Math.max(0, product.Stock - saleQuantity);
        await product.save(sessionOpt ? { session: sessionOpt } : {});
      }
    }

    const grandTotal = subtotal + taxableValue;

    let branchQuery = Branch.findById(branchId);
    if (sessionOpt) branchQuery = branchQuery.session(sessionOpt);
    let branch = await branchQuery;

    if (!branch) {
      branch = (companyId ? await Branch.findOne({ companyId }) : null) || (await Branch.findOne());
    }
    if (!branch) {
      branch = {
        _id: branchId,
        name: "Main Branch",
        code: "INV",
      };
    }

    const today = new Date();
    const date =
      today.getFullYear().toString() +
      String(today.getMonth() + 1).padStart(2, "0") +
      String(today.getDate()).padStart(2, "0");

    const counterOpts = { new: true, returnDocument: "after", upsert: true };
    if (sessionOpt) counterOpts.session = sessionOpt;

    const counter = await Counter.findOneAndUpdate(
      { companyId, branchId, date },
      { $inc: { sequence: 1 } },
      counterOpts
    );

    const invoiceSeq = (counter && counter.sequence) ? counter.sequence : (Math.floor(Math.random() * 8999) + 1000);
    const invoiceNumber = `${branch.code || 'INV'}-${date}-${String(invoiceSeq).padStart(4, "0")}`;

    // Calculate paidAmount and dueAmount
    let finalPaidAmount = grandTotal;
    if (paymentMethod === "SPLIT" && splitDetails) {
      const splitCash = Number(splitDetails.cashAmount) || 0;
      const splitCard = Number(splitDetails.cardAmount) || 0;
      const splitUpi = Number(splitDetails.upiAmount) || 0;
      const splitSum = splitCash + splitCard + splitUpi;
      finalPaidAmount = Math.max(0, Math.min(rawPaidAmount !== undefined && rawPaidAmount !== null && rawPaidAmount !== "" ? Number(rawPaidAmount) : splitSum, grandTotal));
    } else if (rawPaidAmount !== undefined && rawPaidAmount !== null && rawPaidAmount !== "") {
      const parsedPaid = Number(rawPaidAmount);
      if (!isNaN(parsedPaid)) {
        finalPaidAmount = Math.max(0, Math.min(parsedPaid, grandTotal));
      }
    }
    const finalDueAmount = Math.max(0, Number((grandTotal - finalPaidAmount).toFixed(2)));

    let finalPaymentStatus = "PAID";
    if (finalDueAmount <= 0) {
      finalPaymentStatus = "PAID";
    } else if (finalPaidAmount > 0) {
      finalPaymentStatus = "PARTIAL";
    } else {
      finalPaymentStatus = "UNPAID";
    }

    const validCashierId = mongoose.isValidObjectId(cashierId)
      ? toObjectId(cashierId)
      : (mongoose.isValidObjectId(req.user?.userId)
        ? toObjectId(req.user.userId)
        : (mongoose.isValidObjectId(req.user?._id)
          ? toObjectId(req.user._id)
          : new mongoose.Types.ObjectId()));
    const validCashierName = cashierName || req.user?.name || req.user?.role || "Cashier";

    const createOpts = sessionOpt ? { session: sessionOpt } : {};

    const sale = await Sale.create(
      [
        {
          companyId,
          branchId,
          branchName: branch.name,
          invoiceNumber,
          customerName: customerName || 'Walk-in Customer',
          customerPhone: customerPhone || '9999999999',
          customerAddress: customerAddress || '',
          tollFreeNumber: topTollFree || (saleItems.find(i => i.tollFreeNumber)?.tollFreeNumber) || '',
          items: saleItems,
          subtotal,
          totalDiscount,
          taxableValue,
          cgstTotal,
          sgstTotal,
          igstTotal,
          grandTotal,
          paidAmount: finalPaidAmount,
          dueAmount: finalDueAmount,
          paymentMethod: paymentMethod || 'CASH',
          splitDetails: paymentMethod === 'SPLIT' && splitDetails ? {
            cashAmount: Number(splitDetails.cashAmount) || 0,
            cardAmount: Number(splitDetails.cardAmount) || 0,
            upiAmount: Number(splitDetails.upiAmount) || 0,
          } : undefined,
          paymentStatus: finalPaymentStatus,
          cashierId: validCashierId,
          cashierName: validCashierName,
        },
      ],
      createOpts
    );

    // If initial payment was made, create the Payment collection record(s)
    if (finalPaidAmount > 0) {
      if (paymentMethod === "SPLIT" && splitDetails) {
        const splitCash = Number(splitDetails.cashAmount) || 0;
        const splitCard = Number(splitDetails.cardAmount) || 0;
        const splitUpi = Number(splitDetails.upiAmount) || 0;

        const splitDocs = [];
        if (splitCash > 0) {
          splitDocs.push({
            companyId,
            branchId,
            saleId: sale[0]._id,
            invoiceNumber,
            customerName: sale[0].customerName,
            customerPhone: sale[0].customerPhone,
            amountPaid: splitCash,
            paymentMethod: "CASH",
            transactionRef: transactionRef || "",
            notes: paymentNotes ? `${paymentNotes} (Split: Cash)` : "Split payment: Cash",
            paymentDate: new Date(),
            recordedBy: validCashierId,
            recordedByName: validCashierName,
          });
        }
        if (splitCard > 0) {
          splitDocs.push({
            companyId,
            branchId,
            saleId: sale[0]._id,
            invoiceNumber,
            customerName: sale[0].customerName,
            customerPhone: sale[0].customerPhone,
            amountPaid: splitCard,
            paymentMethod: "CARD",
            transactionRef: transactionRef || "",
            notes: paymentNotes ? `${paymentNotes} (Split: Card)` : "Split payment: Card",
            paymentDate: new Date(),
            recordedBy: validCashierId,
            recordedByName: validCashierName,
          });
        }
        if (splitUpi > 0) {
          splitDocs.push({
            companyId,
            branchId,
            saleId: sale[0]._id,
            invoiceNumber,
            customerName: sale[0].customerName,
            customerPhone: sale[0].customerPhone,
            amountPaid: splitUpi,
            paymentMethod: "UPI",
            transactionRef: transactionRef || "",
            notes: paymentNotes ? `${paymentNotes} (Split: UPI)` : "Split payment: UPI",
            paymentDate: new Date(),
            recordedBy: validCashierId,
            recordedByName: validCashierName,
          });
        }

        if (splitDocs.length > 0) {
          await Payment.create(splitDocs, createOpts);
        } else {
          await Payment.create(
            [
              {
                companyId,
                branchId,
                saleId: sale[0]._id,
                invoiceNumber,
                customerName: sale[0].customerName,
                customerPhone: sale[0].customerPhone,
                amountPaid: finalPaidAmount,
                paymentMethod: "SPLIT",
                transactionRef: transactionRef || "",
                notes: paymentNotes || "Split payment checkout",
                paymentDate: new Date(),
                recordedBy: validCashierId,
                recordedByName: validCashierName,
              },
            ],
            createOpts
          );
        }
      } else {
        const validPaymentMethods = ["CASH", "UPI", "CARD", "SPLIT"];
        const primaryMethod = validPaymentMethods.includes(paymentMethod) ? paymentMethod : "CASH";
        await Payment.create(
          [
            {
              companyId,
              branchId,
              saleId: sale[0]._id,
              invoiceNumber,
              customerName: sale[0].customerName,
              customerPhone: sale[0].customerPhone,
              amountPaid: finalPaidAmount,
              paymentMethod: primaryMethod,
              transactionRef: transactionRef || "",
              notes: paymentNotes || "Initial payment on checkout",
              paymentDate: new Date(),
              recordedBy: validCashierId,
              recordedByName: validCashierName,
            },
          ],
          createOpts
        );
      }
    }

    await createAuditLog(
      req,
      {
        companyId,
        branchId,
        userId: validCashierId,
        userName: validCashierName,
        action: "SALE_CREATE",
        resource: "Sale",
        resourceId: sale[0]._id,
        details: { invoiceNumber, grandTotal, paidAmount: finalPaidAmount, dueAmount: finalDueAmount, paymentStatus: finalPaymentStatus },
      },
      sessionOpt ? { session: sessionOpt } : {}
    );

    return sale[0];
  };

  try {
    session.startTransaction();
    const createdSale = await executeSaleLogic(session);
    await session.commitTransaction();

    await invalidateSaleCaches(companyId, branchId, req.body.cashierId);
    await deleteCached(
      `branchInventory:${companyId}:${branchId}`,
      `branchInventory:lowStock:v2:${companyId}:${branchId}`,
      `branchInventory:valuation:${companyId}:${branchId}`,
      `companyInventory:valuation:${companyId}`
    );

    return res.status(201).json({
      success: true,
      message: "Sale created successfully",
      data: createdSale,
    });
  } catch (err) {
    try {
      await session.abortTransaction();
    } catch (_) { }

    // Fallback if transactions are not supported by standalone MongoDB or replica set issues
    const isTxnError =
      err.message &&
      (err.message.includes("Transaction numbers") ||
        err.message.includes("replica set") ||
        err.message.includes("standalone") ||
        err.message.includes("Transactions are not supported") ||
        err.message.includes("TransientTransactionError") ||
        err.message.includes("WriteConflict") ||
        err.message.includes("session"));

    if (isTxnError) {
      try {
        const createdSale = await executeSaleLogic(null);
        await invalidateSaleCaches(companyId, branchId, req.body.cashierId);
        await deleteCached(
          `branchInventory:${companyId}:${branchId}`,
          `branchInventory:lowStock:v2:${companyId}:${branchId}`,
          `branchInventory:valuation:${companyId}:${branchId}`,
          `companyInventory:valuation:${companyId}`
        );
        return res.status(201).json({
          success: true,
          message: "Sale created successfully",
          data: createdSale,
        });
      } catch (fallbackErr) {
        console.error("Create sale fallback error:", fallbackErr.message);
        return res.status(400).json({
          success: false,
          message: fallbackErr.message || "Failed to process sale",
        });
      }
    }

    console.error("Create sale error:", err.message);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to process sale",
    });
  } finally {
    session.endSession();
  }
};

const getAllSales = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const cacheKey = `sales:company:${companyId}:all`;
    const cached = await getCached(cacheKey);

    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const sales = await Sale.find({ companyId }).sort({ createdAt: -1 }).lean();
    await setCached(cacheKey, sales);

    return res.status(200).json({ success: true, data: sales });
  } catch (err) {
    console.error("Get all sales error:", err);
    return res.status(500).json({ success: false, message: "Unable to fetch sales" });
  }
};

const getBranchSales = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({ success: false, message: "branchId is required" });
    }

    const cacheKey = `sales:company:${companyId}:branch:${branchId}`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const sales = await Sale.find({ companyId, branchId }).sort({ createdAt: -1 }).lean();
    await setCached(cacheKey, sales);
    return res.status(200).json({ success: true, data: sales });
  } catch (err) {
    console.error("Get branch sales error:", err);
    return res.status(500).json({ success: false, message: "Unable to fetch branch sales" });
  }
};

const getBranchMonthlySales = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { branchId } = req.params;
    const month = req.query.month || formatPeriodKey("month");

    if (!branchId) {
      return res.status(400).json({ success: false, message: "branchId is required" });
    }

    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      return res.status(400).json({ success: false, message: "month must use YYYY-MM format" });
    }

    const start = new Date(`${month}-01T00:00:00.000Z`);
    const end = new Date(start);
    end.setUTCMonth(end.getUTCMonth() + 1);
    const cacheKey = `sales:company:${companyId}:branch:${branchId}:month:${month}`;
    const cached = await getCached(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const sales = await Sale.find({
      companyId,
      branchId,
      createdAt: { $gte: start, $lt: end },
    }).sort({ createdAt: -1 }).lean();

    const response = {
      companyId,
      branchId,
      month,
      saleCount: sales.length,
      totalSalesAmount: sales.reduce((total, sale) => total + Number(sale.grandTotal || 0), 0),
      sales,
    };

    await setCached(cacheKey, response);
    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error("Get branch monthly sales error:", err);
    return res.status(500).json({ success: false, message: "Unable to fetch branch monthly sales" });
  }
};

const getSaleById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { saleId } = req.params;

    if (!saleId) {
      return res.status(400).json({ success: false, message: "saleId is required" });
    }

    const sale = await Sale.findOne({ _id: saleId, companyId }).lean();
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    return res.status(200).json({ success: true, data: sale });
  } catch (err) {
    console.error("Get sale by id error:", err);
    return res.status(500).json({ success: false, message: "Unable to fetch sale" });
  }
};

const getCashierTodaySales = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { cashierId } = req.params;

    if (!cashierId) {
      return res.status(400).json({ success: false, message: "cashierId is required" });
    }

    const today = new Date();
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const cacheKey = `sales:company:${companyId}:cashier:${cashierId}:today`;
    const cached = await getCached(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const sales = await Sale.find({
      companyId,
      cashierId,
      createdAt: { $gte: start, $lt: end },
    })
      .sort({ createdAt: -1 })
      .lean();

    const totalSalesAmount = sales.reduce((sum, sale) => sum + (sale.subtotal || 0), 0);
    const response = {
      cashierId,
      date: start.toISOString().slice(0, 10),
      totalSalesAmount,
      saleCount: sales.length,
      sales,
    };

    await setCached(cacheKey, response);
    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error("Get cashier today sales error:", err);
    return res.status(500).json({ success: false, message: "Unable to fetch cashier sales" });
  }
};

const formatPeriodKey = (type, value) => {
  const now = value ? new Date(value) : new Date();
  if (type === "day") return now.toISOString().slice(0, 10);
  if (type === "month") return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return String(now.getFullYear());
};

const buildRange = (type, value) => {
  const now = value ? new Date(value) : new Date();
  if (type === "day") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return { start, end };
  }
  if (type === "month") {
    const year = now.getFullYear();
    const month = now.getMonth();
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 1);
    return { start, end };
  }
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const end = new Date(year + 1, 0, 1);
  return { start, end };
};

const getCompanySummary = async (req, res, type) => {
  try {
    const companyId = req.user.companyId;
    const branchId = req.query.branchId;
    const value = req.query.date || req.query.month || req.query.year || null;

    const { start, end } = buildRange(type, value);
    const periodKey = formatPeriodKey(type, value);

    const cacheKey = `sales:summary:v3:company:${companyId}:branch:${branchId || "all"}:period:${type}:${periodKey}`;
    const cached = await getCached(cacheKey);
    if (cached) return res.status(200).json({ success: true, data: cached });

    const match = { companyId: toObjectId(companyId), createdAt: { $gte: start, $lt: end } };
    if (branchId && mongoose.isValidObjectId(branchId)) match.branchId = toObjectId(branchId);

    const pipeline = [
      { $match: match },
      {
        $facet: {
          saleTotals: [
            {
              $group: {
                _id: null,
                totalSale: { $sum: "$grandTotal" },
                totalTaxableValue: { $sum: "$taxableValue" },
              },
            },
          ],
          items: [
            { $unwind: "$items" },
            {
              $lookup: {
                from: "branchinventories",
                let: {
                  pId: "$items.productId",
                  bId: "$branchId",
                  cId: "$companyId",
                  mrpVal: "$items.mrp",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$companyId", "$$cId"] },
                          { $eq: ["$productId", "$$pId"] },
                          {
                            $or: [
                              { $eq: ["$branchId", "$$bId"] },
                              { $eq: ["$mrp", "$$mrpVal"] },
                            ],
                          },
                        ],
                      },
                    },
                  },
                  { $sort: { purchasePrice: -1 } },
                  { $limit: 1 },
                ],
                as: "invLookup",
              },
            },
            {
              $lookup: {
                from: "inventorytransactions",
                let: {
                  pId: "$items.productId",
                  cId: "$companyId",
                },
                pipeline: [
                  {
                    $match: {
                      $expr: {
                        $and: [
                          { $eq: ["$companyId", "$$cId"] },
                          { $eq: ["$productId", "$$pId"] },
                        ],
                      },
                    },
                  },
                  { $sort: { createdAt: -1 } },
                  { $limit: 1 },
                ],
                as: "txLookup",
              },
            },
            {
              $addFields: {
                unitCost: {
                  $cond: [
                    { $gt: [{ $ifNull: ["$items.purchasePrice", 0] }, 0] },
                    "$items.purchasePrice",
                    {
                      $cond: [
                        { $gt: [{ $ifNull: [{ $arrayElemAt: ["$invLookup.purchasePrice", 0] }, 0] }, 0] },
                        { $arrayElemAt: ["$invLookup.purchasePrice", 0] },
                        { $ifNull: [{ $arrayElemAt: ["$txLookup.purchasePrice", 0] }, 0] },
                      ],
                    },
                  ],
                },
                soldQty: { $ifNull: ["$items.unit", 1] },
                itemSellingPrice: { $ifNull: ["$items.sellingPrice", 0] },
              },
            },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: { $multiply: ["$itemSellingPrice", "$soldQty"] } },
                totalCost: { $sum: { $multiply: ["$unitCost", "$soldQty"] } },
              },
            },
          ],
        },
      },
      {
        $project: {
          totalSale: { $ifNull: [{ $arrayElemAt: ["$saleTotals.totalSale", 0] }, 0] },
          totalTaxableValue: { $ifNull: [{ $arrayElemAt: ["$saleTotals.totalTaxableValue", 0] }, 0] },
          totalRevenue: { $ifNull: [{ $arrayElemAt: ["$items.totalRevenue", 0] }, 0] },
          totalCost: { $ifNull: [{ $arrayElemAt: ["$items.totalCost", 0] }, 0] },
        },
      },
      {
        $addFields: {
          totalProfit: {
            $subtract: [
              "$totalSale",
              { $add: ["$totalTaxableValue", "$totalCost"] },
            ],
          },
        },
      },
    ];

    const agg = await Sale.aggregate(pipeline);
    const data = agg && agg.length ? agg[0] : { totalSale: 0, totalTaxableValue: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 };

    const response = {
      companyId,
      branchId: branchId || null,
      period: type,
      periodKey,
      totalSale: data.totalSale || 0,
      totalTaxableValue: data.totalTaxableValue || 0,
      totalRevenue: data.totalRevenue || 0,
      totalCost: data.totalCost || 0,
      totalProfit: data.totalProfit || 0,
    };

    await setCached(cacheKey, response);
    return res.status(200).json({ success: true, data: response });
  } catch (err) {
    console.error("Get company summary error:", err);
    return res.status(500).json({ success: false, message: "Unable to fetch company summary" });
  }
};

const getCompanySummaryDay = (req, res) => getCompanySummary(req, res, "day");
const getCompanySummaryMonth = (req, res) => getCompanySummary(req, res, "month");
const getCompanySummaryYear = (req, res) => getCompanySummary(req, res, "year");

/**
 * Helper to parse warranty strings like "1 Year", "6 Months", "30 Days", "12", "1 year warranty"
 */
const parseWarrantyDuration = (warrantyStr) => {
  if (!warrantyStr || typeof warrantyStr !== "string") return null;
  const str = warrantyStr.trim().toLowerCase();
  if (
    !str ||
    str === "0" ||
    str === "none" ||
    str === "n/a" ||
    str.includes("no warranty") ||
    str.includes("without warranty")
  ) {
    return null;
  }

  const match = str.match(/(\d+(?:\.\d+)?)\s*(year|yr|month|mth|mo|day|d)?/i);
  if (!match) return null;

  const num = parseFloat(match[1]);
  if (isNaN(num) || num <= 0) return null;

  const unitStr = match[2] ? match[2].toLowerCase() : "";

  if (unitStr.startsWith("y")) {
    return { value: num, unit: "years" };
  } else if (unitStr.startsWith("d")) {
    return { value: num, unit: "days" };
  } else {
    return { value: num, unit: "months" };
  }
};

/**
 * Calculates warranty expiration date given a sale date and duration object
 */
const calculateExpiryDate = (saleDate, duration) => {
  if (!saleDate || !duration) return null;
  const expiry = new Date(saleDate);
  if (duration.unit === "years") {
    expiry.setFullYear(expiry.getFullYear() + duration.value);
  } else if (duration.unit === "days") {
    expiry.setDate(expiry.getDate() + duration.value);
  } else {
    expiry.setMonth(expiry.getMonth() + duration.value);
  }
  return expiry;
};

/**
 * Get Product-wise Warranty Expiration Status for Sales
 */
const getWarrantyStatus = async (req, res) => {
  try {
    const companyId = toObjectId(req.user?.companyId || req.query.companyId);
    const { branchId, status, search } = req.query;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "companyId is required",
      });
    }

    const warrantyCacheKey = [
      `sales:warranty:company:${companyId}`,
      `branch:${branchId || "all"}`,
      `status:${status || "ALL"}`,
      `search:${encodeURIComponent((search || "").trim().toLowerCase())}`,
    ].join(":");
    const cached = await getCached(warrantyCacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const query = { companyId };
    if (branchId) {
      query.branchId = toObjectId(branchId);
    }

    const sales = await Sale.find(query)
      .sort({ createdAt: -1 })
      .lean();

    const productIdsSet = new Set();
    sales.forEach((sale) => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          if (item.productId) productIdsSet.add(item.productId.toString());
        });
      }
    });

    const products = await Product.find({ _id: { $in: Array.from(productIdsSet) } })
      .select("specifications name brand modelNumber barcode tollFreeNumber")
      .lean();

    const productMap = new Map();
    products.forEach((p) => productMap.set(p._id.toString(), p));

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const itemsResult = [];
    let expiringWithinMonthCount = 0;
    let activeCount = 0;

    sales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);

      if (Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          const prod = productMap.get(item.productId?.toString());
          const warrantyStr = item.warranty || prod?.specifications?.warranty || "";
          const tollFreeNumber = item.tollFreeNumber || prod?.specifications?.tollFreeNumber || prod?.tollFreeNumber || "";

          const duration = parseWarrantyDuration(warrantyStr);
          if (!duration) {
            // Exclude products without warranty as requested
            return;
          }

          let itemStatus = "ACTIVE";
          let expiryDate = calculateExpiryDate(saleDate, duration);
          if (!expiryDate) {
            return;
          }

          const diffMs = expiryDate.getTime() - today.getTime();
          const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

          if (daysRemaining < 0) {
            // Exclude expired products as requested
            return;
          } else if (daysRemaining <= 30) {
            itemStatus = "EXPIRING_SOON";
            expiringWithinMonthCount++;
          } else {
            itemStatus = "ACTIVE";
            activeCount++;
          }

          const itemData = {
            saleId: sale._id,
            invoiceNumber: sale.invoiceNumber,
            saleDate: sale.createdAt,
            customerName: sale.customerName,
            customerPhone: sale.customerPhone || "",
            branchName: sale.branchName,
            productId: item.productId,
            productName: item.productName,
            brand: item.brand || prod?.brand || "",
            modelNumber: item.modelNumber || prod?.modelNumber || "",
            serialNumber: item.serialNumber || "",
            barcode: item.barcode || prod?.barcode || "",
            tollFreeNumber,
            quantity: item.unit || 1,
            unitPrice: item.sellingPrice || 0,
            totalAmount: item.totalAmount || 0,
            warranty: warrantyStr,
            hasWarranty: true,
            expiryDate,
            daysRemaining,
            status: itemStatus,
          };

          if (status && status !== "ALL" && status !== itemStatus) {
            return;
          }

          if (search) {
            const q = search.toLowerCase().trim();
            const inv = (itemData.invoiceNumber || "").toLowerCase();
            const cust = (itemData.customerName || "").toLowerCase();
            const phone = (itemData.customerPhone || "").toLowerCase();
            const prodName = (itemData.productName || "").toLowerCase();
            const serial = (itemData.serialNumber || "").toLowerCase();
            const model = (itemData.modelNumber || "").toLowerCase();

            if (
              !inv.includes(q) &&
              !cust.includes(q) &&
              !phone.includes(q) &&
              !prodName.includes(q) &&
              !serial.includes(q) &&
              !model.includes(q)
            ) {
              return;
            }
          }

          itemsResult.push(itemData);
        });
      }
    });

    const data = {
      summary: {
        totalItems: expiringWithinMonthCount + activeCount,
        expiringWithinMonthCount,
        activeCount,
      },
      items: itemsResult,
    };

    await setCached(warrantyCacheKey, data);
    return res.status(200).json({ success: true, data });
  } catch (err) {
    console.error("Get warranty status error:", err);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch warranty status",
    });
  }
};

module.exports = {
  createSale,
  getAllSales,
  getBranchSales,
  getBranchMonthlySales,
  getSaleById,
  getCashierTodaySales,
  getCompanySummaryDay,
  getCompanySummaryMonth,
  getCompanySummaryYear,
  getWarrantyStatus,
};



