const express = require("express");
const router = express.Router();

const { auth, ownerOrBranchManager, allowed,isOwner } = require("../middleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
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
} = require("../controller/sale_controller");

router.post("/create", auth, allowed(["OWNER", "BRANCH_MANAGER", "CASHIER"]), apiLimiter, createSale);
router.get("/allSales", auth, isOwner, apiLimiter, getAllSales);
router.get("/branchSales/:branchId", auth, ownerOrBranchManager, apiLimiter, getBranchSales);
router.get("/branchSales/:branchId/month", auth, ownerOrBranchManager, apiLimiter, getBranchMonthlySales);
router.get("/detail/:saleId", auth, apiLimiter, getSaleById);
router.get("/warrantyStatus", auth, ownerOrBranchManager, apiLimiter, getWarrantyStatus);
router.get(
  "/cashierToday/:cashierId",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "CASHIER"]),
  apiLimiter,
  getCashierTodaySales
);
///http://localhost:3000/api/summary/year?year=2026&branchId=6a69ca529a87e246bb9eebd2
router.get(
  "/summary/day",
  auth,
  ownerOrBranchManager,
  apiLimiter,
  getCompanySummaryDay
);

router.get(
  "/summary/month",
  auth,
  ownerOrBranchManager,
  apiLimiter,
  getCompanySummaryMonth
);

router.get(
  "/summary/year",
  auth,
  ownerOrBranchManager,
  apiLimiter,
  getCompanySummaryYear
);

module.exports = router;