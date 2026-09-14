const express = require("express");
const router = express.Router();

const { auth, ownerOrBranchManager, allowed } = require("../middleware");
const { apiLimiter } = require("../middleware/rateLimiter");

const {
  createPurchase,
  getAllPurchases,
  getBranchPurchases,
  getPurchaseById,
} = require("../controller/purchases_controller");

router.post("/purchases/create", auth, ownerOrBranchManager, apiLimiter, createPurchase);
router.get("/purchasesAll", auth, allowed(["OWNER"]), apiLimiter, getAllPurchases);
router.get("/purchasesBranch/:branchId", auth, allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF"]), apiLimiter, getBranchPurchases);
router.get("/purchases/:id", auth, allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF"]), apiLimiter, getPurchaseById);

module.exports = router;
