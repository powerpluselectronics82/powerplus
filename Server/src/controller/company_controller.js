const Company = require("../model/company");
const redis = require("../config/redis");

const addCompany = async (req, res) => {
  try {
    const {
      companyId,
      name,
      gstin,
      pan,
      email,
      phone,
      address,
    } = req.body;

    // Required fields
    if (!companyId || !name || !gstin || !pan || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    // Check duplicate in MongoDB
    const exists = await Company.findOne({
      $or: [{ companyId }, { gstin }],
    });

    if (exists) {
      return res.status(409).json({
        success: false,
        message: "Company ID or GSTIN already exists",
      });
    }

    // Create company in MongoDB
    const company = await Company.create({
      companyId,
      name,
      gstin,
      pan,
      email,
      phone,
      address: typeof address === "string" ? address.trim() : "",
    });

    // Cache company in Redis
    try {
      await redis.set(
        `company:${companyId}`,
        JSON.stringify(company)
      );
    } catch (redisError) {
      console.error("Redis cache error:", redisError.message);
    }

    return res.status(201).json({
      success: true,
      message: "Company created successfully",
      data: company,
    });

  } catch (error) {
    console.error("Company creation error:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  addCompany,
};