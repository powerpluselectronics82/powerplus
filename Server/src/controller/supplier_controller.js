const Supplier = require("../model/Supplier");
const redis = require("../config/redis");
const { createAuditLog } = require("../utils/auditLogger");

const getSuppliersListKey = (companyId) => `suppliers:company:${companyId}`;

const addSupplier = async (req, res) => {
  try {
    const companyId = req.user?.companyId;
    const { name, brand, gstin, phoneNumbers, email, address } = req.body || {};

    if (!companyId) {
      return res.status(401).json({
        success: false,
        message: "Company information is required.",
      });
    }

    const supplierName = typeof name === "string" ? name.trim() : "";
    if (!supplierName) {
      return res.status(400).json({
        success: false,
        message: "Supplier name is required.",
      });
    }

    const phoneList = Array.isArray(phoneNumbers)
      ? [...new Set(
        phoneNumbers
          .filter((phone) => phone !== null && phone !== undefined)
          .map((phone) => String(phone).trim())
          .filter(Boolean)
      )]
      : [];

    if (phoneList.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one phone number is required.",
      });
    }

    const normalizedGstin = typeof gstin === "string"
      ? gstin.trim().toUpperCase()
      : "";

    const existingPhone = await Supplier.findOne({
      companyId,
      phoneNumbers: { $in: phoneList },
    }).lean();

    if (existingPhone) {
      return res.status(409).json({
        success: false,
        message: "One or more phone numbers are already registered with another supplier.",
      });
    }

    if (normalizedGstin) {
      const existingGstin = await Supplier.findOne({
        companyId,
        gstin: normalizedGstin,
      }).lean();

      if (existingGstin) {
        return res.status(409).json({
          success: false,
          message: "GSTIN is already registered with another supplier.",
        });
      }
    }

    const supplierData = {
      companyId,
      name: supplierName,
      brand: typeof brand === "string" ? brand.trim() : "",
      phoneNumbers: phoneList,
      email: typeof email === "string" ? email.trim() : "",
      address: typeof address === "string" ? address.trim() : "",
    };

    if (normalizedGstin) supplierData.gstin = normalizedGstin;

    const supplier = await Supplier.create(supplierData);

    try {
      await redis.del(getSuppliersListKey(companyId));
    } catch (redisErr) {
      console.error("Redis supplier cache invalidation error:", redisErr.message);
    }

    try {
      await createAuditLog(req, {
        companyId,
        action: "SUPPLIER_CREATE",
        resource: "Supplier",
        resourceId: supplier._id,
        details: {
          name: supplier.name,
          phoneNumbers: supplier.phoneNumbers,
        },
      });
    } catch (auditErr) {
      console.error("Supplier audit log error:", auditErr.message);
    }

    return res.status(201).json({
      success: true,
      message: "Supplier added successfully.",
      data: supplier,
    });
  } catch (error) {
    console.error("Add supplier error:", error);

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }

    if (error.code === 11000) {
      const duplicateField = error.keyPattern?.gstin ? "GSTIN" : "phone number";
      return res.status(409).json({
        success: false,
        message: `A supplier with this ${duplicateField} already exists.`,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to add supplier.",
    });
  }
};


const getAllSupplier = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const cacheKey = getSuppliersListKey(companyId);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
    } catch (redisErr) {
      console.error("Redis get error:", redisErr.message);
    }

    const suppliers = await Supplier.find({ companyId }).lean();

    try {
      await redis.set(cacheKey, JSON.stringify(suppliers), "EX", 300);
    } catch (redisErr) {
      console.error("Redis set error:", redisErr.message);
    }

    return res.status(200).json({ success: true, data: suppliers });
  } catch (error) {
    console.error("Get all suppliers error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch suppliers" });
  }
};



module.exports = {
  addSupplier,
  getAllSupplier,
};
