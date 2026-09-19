const express = require("express");
const router = express.Router();

const { auth, allowed } = require("../middleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  receivePayment,
  getPaymentHistoryBySale,
  getDueSales,
} = require("../controller/payment_controller");

// Receive due installment payment
router.post(
  "/receive",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "CASHIER"]),
  apiLimiter,
  receivePayment
);

// Get payment history for a specific sale
router.get(
  "/sale/:saleId",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "CASHIER"]),
  apiLimiter,
  getPaymentHistoryBySale
);

// Get sales with outstanding dues
router.get(
  "/due-sales",
  auth,
  allowed(["OWNER", "BRANCH_MANAGER", "CASHIER"]),
  apiLimiter,
  getDueSales
);

module.exports = router;
