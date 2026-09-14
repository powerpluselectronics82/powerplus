const express = require("express");
const api = express.Router();
const {
  register,
  verifyPhone,
  resendPhoneOtp,
  login,
  getAllUsers,
  getBranchUsers,
  toggleUserStatus,
} = require("../controller/user_controller");
const {
  auth,
  isOwner,
  ownerOrBranchManager,
} = require("../middleware");

const { loginLimiter, apiLimiter } = require("../middleware/rateLimiter");

// Public authentication routes
api.post("/register", auth,isOwner, loginLimiter, register);
api.post("/login", loginLimiter, login);
api.post("/resend-phone-otp", loginLimiter, resendPhoneOtp);
api.post("/verify-phone", loginLimiter, verifyPhone);

// Protected user listing routes
// Owner can see all users. Branch manager or owner can see branch users.
api.get("/users", auth, isOwner, apiLimiter, getAllUsers);
api.get("/users/branch/:branchId", auth, ownerOrBranchManager, apiLimiter, getBranchUsers);
// Toggle user status (OWNER only)
api.patch("/users/toggleStatus/:userId", auth, isOwner, apiLimiter, toggleUserStatus);

module.exports = api;