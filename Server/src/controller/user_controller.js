const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../model/user");
const Company = require("../model/company");
const Branch = require("../model/branch");
const redis = require("../config/redis");
const { createAuditLog } = require("../utils/auditLogger");

const {
  sendPhoneOtp,
  verifyPhoneOtp,
} = require("../config/sendOtp");

// Register function

const register = async (req, res) => {
  try {
    const {
      companyId,
      branchId,
      name,
      email,
      phone,
      password,
      adharNumber,
      dob,
      address,
      role,
    } = req.body;

    // -------------------------
    // 1. Validate request
    // -------------------------

    if (
      !companyId ||
      !name ||
      !email ||
      !phone ||
      !password ||
      !role
    ) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    // -------------------------
    // 2. Check company
    // -------------------------

    const company = await Company.findById(companyId);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: "Company not found",
      });
    }

    // -------------------------
    // 3. Check duplicate user
    // -------------------------

    const existingUser = await User.findOne({
      $or: [
        { email: email.toLowerCase() },
        { phone },
      ],
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email or phone already registered",
      });
    }

    // -------------------------
    // 4. Validate branch
    // -------------------------

    let branch = null;

    if (role !== "OWNER" && role !== "BRANCH_MANAGER") {

      if (!branchId) {
        return res.status(400).json({
          success: false,
          message: "Branch is required for this role",
        });
      }

      branch = await Branch.findOne({
        _id: branchId,
        companyId: company._id,
      });

      if (!branch) {
        return res.status(404).json({
          success: false,
          message: "Branch not found in this company",
        });
      }
    }

    // -------------------------
    // 5. Hash password
    // -------------------------

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    // -------------------------
    // 6. Create pending user
    // -------------------------

    const user = await User.create({
      companyId: company._id,
      branchId: branch ? branch._id : null,

      name,
      email: email.toLowerCase(),
      phone,

      passwordHash,
      adharNumber,
      dob,
      address,
      role,

      phoneVerified: true,
      status: "ACTIVE",
    });

    await createAuditLog(req, {
      companyId: user.companyId,
      branchId: user.branchId,
      action: "USER_CREATE",
      resource: "User",
      resourceId: user._id,
      details: { name: user.name, email: user.email, role: user.role },
    });

    // -------------------------
    // 7. Send Twilio OTP
    // -------------------------

    // try {
    //   await sendPhoneOtp(user.phone);
    // } catch (otpError) {

    //   // Remove incomplete registration
    //   await User.findByIdAndDelete(user._id);

    //   console.error(
    //     "OTP sending error:",
    //     otpError.message
    //   );

    //   return res.status(502).json({
    //     success: false,
    //     message: "Unable to send verification OTP",
    //   });
    // }

    // Invalidate users cache so newly registered staff appears immediately
    try {
      await redis.del(`users:company:${user.companyId?.toString() || user.companyId}`);
      if (user.branchId) {
        await redis.del(`users:branch:${user.companyId?.toString() || user.companyId}:${user.branchId.toString()}`);
      }
    } catch (redisError) {
      console.error("Redis cache error on user registration:", redisError.message);
    }

    // -------------------------
    // 8. Response
    // -------------------------

    return res.status(201).json({
      success: true,
      message: "Registration successful. OTP sent to phone.",
      data: {
        _id: user._id,
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        adharNumber: user.adharNumber,
        dob: user.dob,
        address: user.address,
        role: user.role,
        companyId: user.companyId,
        branchId: user.branchId,
        status: user.status,
      },
    });

  } catch (error) {

    console.error("Register Error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or phone already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Registration failed",
    });
  }
};

// Verify phone OTP function

const verifyPhone = async (req, res) => {
  try {
    const {
      userId,
      otp,
    } = req.body;

    if (!userId || !otp) {
      return res.status(400).json({
        success: false,
        message: "userId and OTP are required",
      });
    }

    // Find user
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Phone already verified",
      });
    }

    // Check OTP with Twilio
    const verification = await verifyPhoneOtp(
      user.phone,
      otp
    );

    if (verification.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP",
      });
    }

    // Activate account
    user.phoneVerified = true;
    user.status = "ACTIVE";

    await user.save();

    await createAuditLog(req, {
      companyId: user.companyId,
      branchId: user.branchId,
      userId: user._id,
      userName: user.name,
      action: "USER_PHONE_VERIFY",
      resource: "User",
      resourceId: user._id,
      details: { phoneVerified: user.phoneVerified, status: user.status },
    });

    // Invalidate users cache so phone verified / active status reflects immediately
    try {
      await redis.del(`users:company:${user.companyId?.toString() || user.companyId}`);
      if (user.branchId) {
        await redis.del(`users:branch:${user.companyId?.toString() || user.companyId}:${user.branchId.toString()}`);
      }
    } catch (redisError) {
      console.error("Redis cache error on user verifyPhone:", redisError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Phone verified successfully",
    });

  } catch (error) {

    console.error(
      "Phone verification error:",
      error.message
    );

    return res.status(400).json({
      success: false,
      message: "Invalid or expired OTP",
    });
  }
};


//resend phone otp function

const resendPhoneOtp = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "userId is required",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.phoneVerified) {
      return res.status(400).json({
        success: false,
        message: "Phone already verified",
      });
    }

    await sendPhoneOtp(user.phone);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully",
    });

  } catch (error) {

    console.error(
      "Resend OTP error:",
      error.message
    );

    return res.status(500).json({
      success: false,
      message: "Unable to send OTP",
    });
  }
};

// login function

const login = async (req, res) => {
  try {
    const {
      email,
      password,
    } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({
      email: email.toLowerCase(),
    }).select("+passwordHash");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const passwordMatch = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!user.phoneVerified || user.status === "PENDING") {
      user.phoneVerified = true;
      user.status = "ACTIVE";
      await user.save();
    }

    if (user.status === "INACTIVE") {
      return res.status(403).json({
        success: false,
        message: "Account is inactive",
      });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        companyId: user.companyId,
        branchId: user.branchId,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn:
          process.env.JWT_EXPIRES_IN || "7d",
      }
    );

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      data: {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        companyId: user.companyId,
        branchId: user.branchId,
        token,
      },
    });

  } catch (error) {

    console.error("Login Error:", error);

    return res.status(500).json({
      success: false,
      message: "Login failed",
    });
  }
};

const getAllUsers = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const cacheKey = `users:company:${companyId}`;

    try {
      const cachedUsers = await redis.get(cacheKey);
      if (cachedUsers) {
        return res.status(200).json({ success: true, data: JSON.parse(cachedUsers) });
      }
    } catch (redisError) {
      console.error("Redis get error:", redisError.message);
    }

    const users = await User.find({ companyId })
      .select("name email phone adharNumber Pic dob address role branchId status phoneVerified")
      .lean();

    try {
      await redis.set(cacheKey, JSON.stringify(users), "EX", 300);
    } catch (redisError) {
      console.error("Redis cache error:", redisError.message);
    }

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get all users error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch users",
    });
  }
};

const getBranchUsers = async (req, res) => {
  try {
    const { branchId } = req.params;
    const companyId = req.user.companyId;

    if (!branchId) {
      return res.status(400).json({
        success: false,
        message: "branchId is required",
      });
    }

    if (
      req.user.role === "BRANCH_MANAGER" &&
      req.user.branchId?.toString() !== branchId
    ) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: branch managers may only view their own branch users",
      });
    }

    const branch = await Branch.findOne({
      _id: branchId,
      companyId,
    });

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const cacheKey = `users:branch:${companyId}:${branchId}`;

    try {
      const cachedUsers = await redis.get(cacheKey);
      if (cachedUsers) {
        return res.status(200).json({ success: true, data: JSON.parse(cachedUsers) });
      }
    } catch (redisError) {
      console.error("Redis get error:", redisError.message);
    }

    const users = await User.find({
      companyId,
      branchId,
    })
      .select("name email phone adharNumber Pic dob address role branchId status phoneVerified")
      .lean();

    try {
      await redis.set(cacheKey, JSON.stringify(users), "EX", 300);
    } catch (redisError) {
      console.error("Redis cache error:", redisError.message);
    }

    return res.status(200).json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Get branch users error:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch branch users",
    });
  }
};

// Toggle user active/inactive status
const toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "userId is required" });
    }

    // const actingUser = req.user; // from auth middleware

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // // Only OWNER may toggle user status
    // if (actingUser.role !== "OWNER") {
    //   return res.status(403).json({ success: false, message: "Forbidden: only OWNER may modify user status" });
    // }

    // // User must belong to the same company
    // if (user.companyId.toString() !== actingUser.companyId.toString()) {
    //   return res.status(403).json({ success: false, message: "Forbidden: different company" });
    // }

    // Toggle status
    if (user.status === "ACTIVE") user.status = "INACTIVE";
    else user.status = "ACTIVE";

    await user.save();

    await createAuditLog(req, {
      companyId: user.companyId,
      branchId: user.branchId,
      action: "USER_STATUS_UPDATE",
      resource: "User",
      resourceId: user._id,
      details: { status: user.status },
    });

    try {
      const userData = user.toObject ? user.toObject() : user;
      await redis.set(`user:${user._id.toString()}`, JSON.stringify(userData), "EX", 300);
      await redis.del(`users:company:${user.companyId?.toString() || user.companyId}`);
      if (user.branchId) {
        await redis.del(`users:branch:${user.companyId?.toString() || user.companyId}:${user.branchId.toString()}`);
      }
    } catch (redisError) {
      console.error("Redis cache error:", redisError.message);
    }

    return res.status(200).json({ success: true, data: { userId: user._id, status: user.status } });
  } catch (error) {
    console.error("Toggle user status error:", error);
    return res.status(500).json({ success: false, message: "Unable to toggle user status" });
  }
};

module.exports = {
  register,
  verifyPhone,
  resendPhoneOtp,
  login,
  getAllUsers,
  getBranchUsers,
  toggleUserStatus,
};



