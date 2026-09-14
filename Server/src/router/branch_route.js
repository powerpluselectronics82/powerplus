const express = require("express");
const router = express.Router();

const {
  addBranch,
  getAllBranches,
  getBranchById,
  updateBranchManager,
  updateBranchStatus,
} = require("../controller/branch_controller");
const { auth, isOwner, ownerOrBranchManager } = require("../middleware");

const { apiLimiter } = require("../middleware/rateLimiter");

// Create a branch (owner or branch manager may create depending on your policy)
router.post("/addBranch", auth, isOwner, apiLimiter, addBranch);

// Get all branches for the user's company
router.get("/branches", auth, isOwner, apiLimiter, getAllBranches);

// Get a single branch by ID
router.get("/branches/:branchId", auth, ownerOrBranchManager, apiLimiter, getBranchById);

// Update branch manager assignment
router.patch("/brancheUpdate/:branchId", auth, isOwner, apiLimiter, updateBranchManager);

// Only OWNER may update branch status
router.patch("/brancheStatus/:branchId", auth, isOwner, apiLimiter, updateBranchStatus);

module.exports = router;
