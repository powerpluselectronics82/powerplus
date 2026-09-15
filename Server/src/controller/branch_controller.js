const Branch = require("../model/branch");
const Company = require("../model/company");
const user = require("../model/user");
const redis = require("../config/redis");
const { createAuditLog } = require("../utils/auditLogger");

const getBranchCacheKey = (companyId, branchId) => `branch:${companyId}:${branchId}`;
const getBranchesListKey = (companyId) => `branches:company:${companyId}`;

const addBranch = async (req, res) => {
  try {
    const {
      companyId,
      name,
      address,
      phone,
      email,
      gstin,
      openingTime,
      closingTime,
      openDays,
      establishmentDate,
      managerId,
      managerName,
    } = req.body;

    // --------------------------------------------------
    // 1. Validate required fields
    // --------------------------------------------------

    if (!companyId || !name) {
      return res.status(400).json({
        success: false,
        message: "companyId and name are required",
      });
    }

    // --------------------------------------------------
    // 2. Check company exists
    // --------------------------------------------------

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    const existingBranch = await Branch.findOne({ companyId, name })
      .collation({ locale: "en", strength: 2 })
      .lean();

    if (existingBranch) {
      return res.status(409).json({
        success: false,
        message: "Branch name already exists for this company",
      });
    }

    // --------------------------------------------------
    // 3. Normalize & Validate phone array
    // --------------------------------------------------
    let normalizedPhone = [];
    if (phone !== undefined && phone !== null) {
      if (typeof phone === "string") {
        normalizedPhone = phone
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean)
          .map((n, i) => ({
            number: n,
            type: i === 0 ? "PRIMARY" : "SECONDARY",
          }));
      } else if (Array.isArray(phone)) {
        const allowedPhoneTypes = ["PRIMARY", "SECONDARY", "WHATSAPP"];
        normalizedPhone = phone
          .map((item, i) => {
            if (typeof item === "string") {
              return { number: item.trim(), type: i === 0 ? "PRIMARY" : "SECONDARY" };
            }
            const rawType = item.type ? String(item.type).toUpperCase() : "";
            return {
              number: String(item.number || "").trim(),
              type: allowedPhoneTypes.includes(rawType)
                ? rawType
                : i === 0
                ? "PRIMARY"
                : "SECONDARY",
            };
          })
          .filter((item) => Boolean(item.number));
      } else {
        return res.status(400).json({
          success: false,
          message: "phone must be an array or string",
        });
      }
    }

    // --------------------------------------------------
    // 4. Normalize & Validate email array
    // --------------------------------------------------
    let normalizedEmail = [];
    if (email !== undefined && email !== null) {
      if (typeof email === "string") {
        normalizedEmail = email
          .split(",")
          .map((e) => e.trim().toLowerCase())
          .filter(Boolean)
          .map((e, i) => ({
            address: e,
            type: i === 0 ? "PRIMARY" : "SECONDARY",
          }));
      } else if (Array.isArray(email)) {
        const allowedEmailTypes = ["PRIMARY", "SECONDARY", "SUPPORT", "SALES"];
        normalizedEmail = email
          .map((item, i) => {
            if (typeof item === "string") {
              return { address: item.trim().toLowerCase(), type: i === 0 ? "PRIMARY" : "SECONDARY" };
            }
            const rawType = item.type ? String(item.type).toUpperCase() : "";
            return {
              address: String(item.address || "").trim().toLowerCase(),
              type: allowedEmailTypes.includes(rawType)
                ? rawType
                : i === 0
                ? "PRIMARY"
                : "SECONDARY",
            };
          })
          .filter((item) => Boolean(item.address));
      } else {
        return res.status(400).json({
          success: false,
          message: "email must be an array or string",
        });
      }
    }

    // --------------------------------------------------
    // 5. Code & OpenDays setup
    // --------------------------------------------------
    let code = req.body.code ? String(req.body.code).trim().toUpperCase() : '';
    if (code) {
      const existingCode = await Branch.findOne({ companyId, code }).lean();
      if (existingCode) {
        return res.status(409).json({
          success: false,
          message: "Branch code already exists for this company",
        });
      }
    } else {
      const prefix = (name.replace(/[^a-zA-Z0-9]/g, "") + "BR").substring(0, 3).toUpperCase();
      let exists = true;
      while (exists) {
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        code = `${prefix}-${randomPart}`;
        exists = await Branch.exists({ companyId, code });
      }
    }

    const dayMap = {
      MON: "Monday", TUE: "Tuesday", WED: "Wednesday", THU: "Thursday",
      FRI: "Friday", SAT: "Saturday", SUN: "Sunday",
      MONDAY: "Monday", TUESDAY: "Tuesday", WEDNESDAY: "Wednesday", THURSDAY: "Thursday",
      FRIDAY: "Friday", SATURDAY: "Saturday", SUNDAY: "Sunday",
    };
    let normalizedOpenDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    if (Array.isArray(openDays) && openDays.length > 0) {
      const mapped = openDays
        .map((d) => dayMap[String(d).trim().toUpperCase()])
        .filter(Boolean);
      if (mapped.length > 0) {
        normalizedOpenDays = mapped;
      }
    }

    // --------------------------------------------------
    // 7. Create branch
    // --------------------------------------------------

    const branch = await Branch.create({
      companyId,
      code,
      name,

      address,

      phone: normalizedPhone,
      email: normalizedEmail,

      gstin,

      openingTime,
      closingTime,
      openDays: normalizedOpenDays,

      establishmentDate,

      managerId,
      managerName,

      status: "ACTIVE",
    });

    // --------------------------------------------------
    // 8. Create audit log
    // --------------------------------------------------

    await createAuditLog(req, {
      companyId,
      action: "BRANCH_CREATE",
      resource: "Branch",
      resourceId: branch._id,

      details: {
        code: branch.code,
        name: branch.name,
      },
    });

    // --------------------------------------------------
    // 9. Clear branch list cache
    // --------------------------------------------------

    try {
      await redis.del(
        getBranchesListKey(companyId)
      );
    } catch (redisError) {
      console.error(
        "Redis cache error:",
        redisError.message
      );
    }

    // --------------------------------------------------
    // 10. Response
    // --------------------------------------------------

    return res.status(201).json({
      success: true,
      message: "Branch created successfully",
      data: branch,
    });

  } catch (error) {
    console.error("Add branch error:", error);

    // Duplicate key
    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: error.keyPattern?.name
          ? "Branch name already exists for this company"
          : "Branch code already exists for this company",
      });
    }

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const getAllBranches = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const cacheKey = getBranchesListKey(companyId);

    try {
      const cachedBranches = await redis.get(cacheKey);
      if (cachedBranches) {
        return res.status(200).json({ success: true, data: JSON.parse(cachedBranches) });
      }
    } catch (redisError) {
      console.error("Redis get error:", redisError.message);
    }

    const branches = await Branch.find({ companyId }).lean();

    try {
      await redis.set(cacheKey, JSON.stringify(branches), "EX", 300);
    } catch (redisError) {
      console.error("Redis cache error:", redisError.message);
    }

    return res.status(200).json({ success: true, data: branches });
  } catch (error) {
    console.error("Get all branches error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch branches" });
  }
};

const getBranchById = async (req, res) => {
  try {
    const { branchId } = req.params;
    const companyId = req.user.companyId;

    if (!branchId) {
      return res.status(400).json({ success: false, message: "branchId is required" });
    }

    const cacheKey = getBranchCacheKey(companyId, branchId);

    try {
      const cachedBranch = await redis.get(cacheKey);
      if (cachedBranch) {
        return res.status(200).json({ success: true, data: JSON.parse(cachedBranch) });
      }
    } catch (redisError) {
      console.error("Redis get error:", redisError.message);
    }

    const branch = await Branch.findOne({ _id: branchId, companyId }).lean();

    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    try {
      await redis.set(cacheKey, JSON.stringify(branch), "EX", 300);
    } catch (redisError) {
      console.error("Redis cache error:", redisError.message);
    }

    return res.status(200).json({ success: true, data: branch });
  } catch (error) {
    console.error("Get branch by id error:", error);
    return res.status(500).json({ success: false, message: "Unable to fetch branch" });
  }
};

const updateBranchManager = async (req, res) => {
  try {
    const { branchId } = req.params;
    const { managerId, managerName } = req.body;

    if (!branchId) {
      return res.status(400).json({ success: false, message: "branchId is required" });
    }

    if (!managerId && !managerName) {
      return res.status(400).json({ success: false, message: "managerId or managerName is required" });
    }

    const branch = await Branch.findOne({ _id: branchId, companyId: req.user.companyId });

    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    const userToUpdate = await user.findOne({
      _id: managerId,
      companyId: req.user.companyId,
    });

    if (!userToUpdate) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    userToUpdate.branchId = branch._id;
    await userToUpdate.save();

    branch.managerId = managerId;
    branch.managerName = managerName;

    await branch.save();

    await createAuditLog(req, {
      companyId: branch.companyId,
      branchId: branch._id,
      action: "BRANCH_MANAGER_UPDATE",
      resource: "Branch",
      resourceId: branch._id,
      details: { managerId: userToUpdate._id, managerName },
    });

    try {
      const branchData = branch.toObject ? branch.toObject() : branch;
      await redis.set(
        getBranchCacheKey(branch.companyId?.toString() || branch.companyId, branch._id.toString()),
        JSON.stringify(branchData),
        "EX",
        300
      );
      await redis.del(getBranchesListKey(branch.companyId?.toString() || branch.companyId));
    } catch (redisError) {
      console.error("Redis cache error:", redisError.message);
    }

    return res.status(200).json({ success: true, message: "Branch manager updated", data: branch });
  } catch (error) {
    console.error("Update branch manager error:", error);
    return res.status(500).json({ success: false, message: "Unable to update branch manager" });
  }
};

const updateBranchStatus = async (req, res) => {
  try {
    const { branchId } = req.params;

    if (!branchId) {
      return res.status(400).json({ success: false, message: "branchId is required" });
    }


    const branch = await Branch.findOne({ _id: branchId, companyId: req.user.companyId });

    if (!branch) {
      return res.status(404).json({ success: false, message: "Branch not found" });
    }

    if (branch.status === "ACTIVE") branch.status = "INACTIVE";
    else branch.status = "ACTIVE";

    await branch.save();

    await createAuditLog(req, {
      companyId: branch.companyId,
      branchId: branch._id,
      action: "BRANCH_STATUS_UPDATE",
      resource: "Branch",
      resourceId: branch._id,
      details: { status: branch.status },
    });

    try {
      const branchData = branch.toObject ? branch.toObject() : branch;
      await redis.set(
        getBranchCacheKey(branch.companyId?.toString() || branch.companyId, branch._id.toString()),
        JSON.stringify(branchData),
        "EX",
        300
      );
      await redis.del(getBranchesListKey(branch.companyId?.toString() || branch.companyId));
    } catch (redisError) {
      console.error("Redis cache error:", redisError.message);
    }

    return res.status(200).json({ success: true, message: "Branch status updated", data: branch });
  } catch (error) {
    console.error("Update branch status error:", error);
    return res.status(500).json({ success: false, message: "Unable to update branch status" });
  }
};

module.exports = {
  addBranch,
  getAllBranches,
  getBranchById,
  updateBranchManager,
  updateBranchStatus,
};