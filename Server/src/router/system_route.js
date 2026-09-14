const express = require("express");
const router = express.Router();
const { auth, isOwner } = require("../middleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  getDatabaseHealth,
  getAuditLogs,
  exportAuditLogs,
  clearAuditLogs,
} = require("../controller/system_controller");

router.get("/health/db", apiLimiter, getDatabaseHealth);
router.get("/audit-logs", auth, isOwner, apiLimiter, getAuditLogs);
router.get("/audit-logs/export", auth, isOwner, apiLimiter, exportAuditLogs);
router.delete("/audit-logs/clear", auth, isOwner, apiLimiter, clearAuditLogs);

module.exports = router;
