
const Product = require("../model/product");
const redis = require("../config/redis");
const { createAuditLog } = require("../utils/auditLogger");




// Helper cache key generators
const getProductsListKey = (companyId) => `products:company:${companyId}`;
const getProductCacheKey = (companyId, productId) => `product:${companyId}:${productId}`;
const getProductBarcodeKey = (companyId, barcode) => `product:barcode:${companyId}:${barcode}`;
const getProductModelNumberKey = (companyId, modelNumber) => `product:modelNumber:${companyId}:${modelNumber}`;

const addProduct = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const {
      barcode,
      modelNumber,
      hsnCode,
      name,
      description,
      category,
      categoryId,
      brand,
      brandId,
      isSerialized,
      cgstRate,
      sgstRate,
      igstRate,
      minStockLevel,
      specifications = {},
    } = req.body;

    const {
      color,
      warranty,
      tollFreeNumber,
      dimensions,
      weight,
      powerConsumption,
      voltage,
      connectivity,
      displaySize,
      resolution,
      ram,
      storage,
      batteryCapacity,
      processor,
      operatingSystem,
      camera,
      speaker,
      features,
      other,
    } = specifications;

    if (!barcode || !name || cgstRate === undefined || sgstRate === undefined) {
      return res.status(400).json({
        success: false,
        message: "barcode, name, cgstRate, and sgstRate are required",
      });
    }

    const existingProduct = await Product.findOne({ companyId, barcode });
    if (existingProduct) {
      return res.status(409).json({ success: false, message: "Product with this barcode already exists" });
    }

    const product = await Product.create({
      companyId,
      barcode,
      modelNumber,
      hsnCode,
      name,
      description,
      category,
      categoryId,
      brand,
      brandId,
      isSerialized,
      cgstRate,
      sgstRate,
      igstRate,
      minStockLevel,
      specifications: {
        color,
        warranty,
        tollFreeNumber: tollFreeNumber || "",
        dimensions,
        weight,
        powerConsumption,
        voltage,
        connectivity,
        displaySize,
        resolution,
        ram,
        storage,
        batteryCapacity,
        processor,
        operatingSystem,
        camera,
        speaker,
        features,
        other,
      },
    });

    await createAuditLog(req, {
      companyId,
      action: "PRODUCT_CREATE",
      resource: "Product",
      resourceId: product._id,
      details: { barcode: product.barcode, name: product.name, specifications: product.specifications },
    });

    // Invalidate product catalog cache so newly created product is immediately visible
    try {
      await redis.del(getProductsListKey(companyId));
    } catch (redisErr) {
      console.error("Redis cache invalidate error:", redisErr.message);
    }

    return res.status(201).json({ success: true, message: "Product created successfully", data: product });
  } catch (error) {
    console.error("Add product error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Product with this barcode already exists" });
    }
    return res.status(500).json({ success: false, message: "Unable to add product" });
  }
};


const getAllproduct = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const cacheKey = getProductsListKey(companyId);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
    } catch (redisErr) {
      console.error("Redis get error:", redisErr.message);
    }

    const products = await Product.find({ companyId }).lean();

    try {
      await redis.set(cacheKey, JSON.stringify(products), "EX", 300);
    } catch (redisErr) {
      console.error("Redis set error:", redisErr.message);
    }

    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    console.error("Get all products error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch products" });
  }
};



const getProductById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    if (!id) return res.status(400).json({ success: false, message: "product id is required" });

    const cacheKey = getProductCacheKey(companyId, id);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
    } catch (redisErr) {
      console.error("Redis get error:", redisErr.message);
    }

    const product = await Product.findOne({ _id: id, companyId }).lean();

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    try {
      await redis.set(cacheKey, JSON.stringify(product), "EX", 300);
    } catch (redisErr) {
      console.error("Redis set error:", redisErr.message);
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("Get product by id error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch product" });
  }
};

const getProductByBarcode = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { barcode } = req.params;

    if (!barcode) return res.status(400).json({ success: false, message: "barcode is required" });

    const cacheKey = getProductBarcodeKey(companyId, barcode);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
    } catch (redisErr) {
      console.error("Redis get error:", redisErr.message);
    }

    const product = await Product.findOne({ companyId, barcode }).lean();

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    try {
      await redis.set(cacheKey, JSON.stringify(product), "EX", 300);
    } catch (redisErr) {
      console.error("Redis set error:", redisErr.message);
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("Get product by barcode error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch product" });
  }
};

const getProductByModelNumber = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { modelNumber } = req.params;

    if (!modelNumber) return res.status(400).json({ success: false, message: "modelNumber is required" });

    const cacheKey = getProductModelNumberKey(companyId, modelNumber);

    try {
      const cached = await redis.get(cacheKey);
      if (cached) return res.status(200).json({ success: true, data: JSON.parse(cached) });
    } catch (redisErr) {
      console.error("Redis get error:", redisErr.message);
    }

    const product = await Product.findOne({ companyId, modelNumber }).lean();

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    try {
      await redis.set(cacheKey, JSON.stringify(product), "EX", 300);
    } catch (redisErr) {
      console.error("Redis set error:", redisErr.message);
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    console.error("Get product by model number error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch product" });
  }
};

const updateProductStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    if (!id) return res.status(400).json({ success: false, message: "product id is required" });

    let product = await Product.findOne({ _id: id, companyId });
    if (!product) {
      product = await Product.findById(id);
    }

    if (!product) return res.status(404).json({ success: false, message: "Product not found" });

    product.status = product.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";
    await product.save();

    await createAuditLog(req, {
      companyId: product.companyId || companyId,
      action: "PRODUCT_STATUS_UPDATE",
      resource: "Product",
      resourceId: product._id,
      details: { barcode: product.barcode, status: product.status },
    });

    // Invalidate product & branch inventory caches
    try {
      const keys = await redis.keys(`*${companyId}*`);
      if (keys && keys.length) await redis.del(...keys);
    } catch (redisErr) {
      console.error("Redis cache invalidate error:", redisErr.message);
    }

    return res.status(200).json({ success: true, message: "Product status updated", data: product });
  } catch (error) {
    console.error("Update product status error:", error);
    return res.status(500).json({ success: false, message: "Unable to update product status" });
  }
};

module.exports = {
  addProduct,
  getAllproduct,
  getProductById,
  getProductByBarcode,
  getProductByModelNumber,
  updateProductStatus,
};