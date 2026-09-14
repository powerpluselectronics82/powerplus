const express = require("express");
const router = express.Router();
const { auth, allowed } = require("../middleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  addBranchInventory,
  getBranchInventoryProducts,
  getLowStockBranchProducts,
  getBranchStockValuation,
  getCompanyStockValuation,
  getProductBySerialNumber,
  getMonthlyInventoryReport,
} = require("../controller/branchInventry_controller");

router.get(
  "/branchInventory/report/monthly",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF", "CASHIER"]),
  apiLimiter,
  getMonthlyInventoryReport
);

router.get(
  "/branchInventory/:branchId/serial/:serialNumber",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF", "CASHIER"]),
  apiLimiter,
  getProductBySerialNumber,
);

router.get(
  "/branchInventory/valuation",
  auth,
  allowed(["OWNER"]),
  apiLimiter,
  getCompanyStockValuation,
);

router.get(
  "/branchInventory/valuation/:branchId",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER"]),
  apiLimiter,
  getBranchStockValuation
);

router.get(
  "/branchInventory/lowStock",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF"]),
  apiLimiter,
  getLowStockBranchProducts,
);

router.get(
  "/branchInventory/lowStock/:branchId",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF"]),
  apiLimiter,
  getLowStockBranchProducts,
);

router.get(
  "/branchInventory/:branchId",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF", "CASHIER"]),
  apiLimiter,
  getBranchInventoryProducts,
);

router.post(
  "/addBranchInventory",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF"]),
  apiLimiter,
  addBranchInventory,
);

module.exports = router;