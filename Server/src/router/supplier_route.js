const express = require("express");
const router = express.Router();

const { auth, ownerOrBranchManager, allowed } = require("../middleware");
const { apiLimiter } = require("../middleware/rateLimiter");

const {
  addSupplier,
  getAllSupplier,
} = require("../controller/supplier_controller");

router.post("/addSupplier", auth, ownerOrBranchManager, apiLimiter, addSupplier);
router.get("/allSuppliers", auth, allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF"]), apiLimiter, getAllSupplier);

module.exports = router;