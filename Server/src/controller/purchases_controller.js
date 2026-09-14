const mongoose = require("mongoose");
const Purchase = require("../model/purches");
const Product = require("../model/product");
const Supplier = require("../model/Supplier");
const { createAuditLog } = require("../utils/auditLogger");

const formatAddressString = (addr) => {
  if (!addr) return "";
  if (typeof addr === "string") return addr;
  if (typeof addr === "object") {
    const parts = [
      addr.street,
      addr.addressLine1,
      addr.addressLine2,
      addr.city,
      addr.state,
      addr.zipCode || addr.pincode || addr.pin,
      addr.country,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : JSON.stringify(addr);
  }
  return String(addr);
};

const createPurchase = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      branchId,
      supplierId,
      supplierName,
      purchaseInvoiceNumber,
      purchaseDate,
      paymentStatus,
      items,
    } = req.body;

    if (!branchId || !supplierId || !purchaseInvoiceNumber || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Branch, Supplier, Purchase Invoice Number, and at least one item are required.",
      });
    }

    if (!mongoose.isValidObjectId(supplierId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Supplier ID format.",
      });
    }

    if (!mongoose.isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Branch ID format.",
      });
    }

    // Fetch supplier to snapshot details
    const supplierObj = await Supplier.findById(supplierId).lean();

    let subtotal = 0;
    let taxTotal = 0;
    const processedItems = [];

    for (const item of items) {
      if (!item.productId || !mongoose.isValidObjectId(item.productId)) {
        return res.status(400).json({
          success: false,
          message: "Valid product ID is required for all line items.",
        });
      }

      if (Number(item.quantity) <= 0 || Number(item.purchasePrice) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Valid quantity (>0) and unit cost (>0) are required for all line items.",
        });
      }

      const qty = Number(item.quantity);
      const cost = Number(item.purchasePrice);
      const base = qty * cost;
      const cgstRate = Number(item.cgstRate || 0);
      const sgstRate = Number(item.sgstRate || 0);
      const taxRate = cgstRate + sgstRate;
      const tax = (base * taxRate) / 100;
      const lineTotal = base + tax;
      const itemMrp = Number(item.mrp || 0);

      let hsn = item.hsnCode || "";
      let modelNo = item.modelNumber || "";
      if ((!hsn || !modelNo) && item.productId) {
        const prod = await Product.findById(item.productId).lean();
        if (prod) {
          if (!hsn) hsn = prod.hsnCode || "";
          if (!modelNo) modelNo = prod.modelNumber || "";
        }
      }

      subtotal += base;
      taxTotal += tax;

      processedItems.push({
        productId: item.productId,
        productName: item.name || item.productName || "Product",
        barcode: item.barcode || "N/A",
        hsnCode: hsn,
        modelNumber: modelNo,
        quantity: qty,
        purchasePrice: cost,
        mrp: itemMrp,
        cgstRate,
        sgstRate,
        taxableAmount: base,
        taxAmount: tax,
        totalAmount: lineTotal,
      });

    }

    const grandTotal = subtotal + taxTotal;

    // Collect all phone numbers from supplierObj
    const rawPhones = (Array.isArray(supplierObj?.phoneNumbers) && supplierObj.phoneNumbers.length > 0)
      ? supplierObj.phoneNumbers.map(p => typeof p === 'object' ? (p.number || String(p)) : String(p))
      : (supplierObj?.phone ? [typeof supplierObj.phone === 'object' ? (supplierObj.phone.number || String(supplierObj.phone)) : String(supplierObj.phone)] : []);

    const uniquePhoneNumbers = [...new Set(rawPhones.map(p => String(p).trim()).filter(Boolean))];

    const purchase = await Purchase.create({
      companyId,
      branchId,
      supplierId,
      supplierName: supplierObj?.name || supplierName || "Vendor Supplier",
      supplierGstin: supplierObj?.gstin || "",
      supplierPhoneNumbers: uniquePhoneNumbers,
      supplierEmail: supplierObj?.email || "",
      supplierAddress: formatAddressString(supplierObj?.address),
      purchaseInvoiceNumber,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
      paymentStatus: paymentStatus || "PAID",
      items: processedItems,
      subtotal,
      taxTotal,
      grandTotal,
    });

    await createAuditLog(req, {
      companyId,
      branchId,
      action: "PURCHASE_CREATE",
      resource: "Purchase",
      resourceId: purchase._id,
      details: { purchaseInvoiceNumber, supplierName: purchase.supplierName, grandTotal },
    });

    return res.status(201).json({
      success: true,
      message: "Purchase invoice created and branch stock updated successfully.",
      data: purchase,
    });

  } catch (error) {
    console.error("Create purchase error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create purchase invoice",
    });
  }
};

const getAllPurchases = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const purchases = await Purchase.find({ companyId })
      .populate("supplierId", "name brand gstin phoneNumbers phone email address")
      .populate("branchId", "name code gstin address phone email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error("Get all purchases error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch purchases log",
    });
  }
};

const getBranchPurchases = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { branchId } = req.params;

    if (!mongoose.isValidObjectId(branchId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Branch ID format.",
      });
    }

    const purchases = await Purchase.find({ companyId, branchId })
      .populate("supplierId", "name brand gstin phoneNumbers phone email address")
      .populate("branchId", "name code gstin address phone email")
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      data: purchases,
    });
  } catch (error) {
    console.error("Get branch purchases error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch branch purchases",
    });
  }
};

const getPurchaseById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid Purchase ID format.",
      });
    }

    const purchase = await Purchase.findOne({ _id: id, companyId })
      .populate("branchId", "name code gstin address phone email")
      .populate("supplierId", "name brand gstin phone phoneNumbers email address")
      .lean();

    if (!purchase) {
      return res.status(404).json({
        success: false,
        message: "Purchase invoice not found",
      });
    }

    return res.status(200).json({
      success: true,
      data: purchase,
    });
  } catch (error) {
    console.error("Get purchase by id error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch purchase invoice details",
    });
  }
};

module.exports = {
  createPurchase,
  getAllPurchases,
  getBranchPurchases,
  getPurchaseById,
};
