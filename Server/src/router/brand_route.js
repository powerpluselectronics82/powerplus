const express = require("express");
const router = express.Router();
const { auth, ownerOrBranchManager, isOwner } = require("../middleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  addBrand,
  getBrands,
  updateBrand,
  deleteBrand,
} = require("../controller/brand_controller");

router.post("/addBrand", auth, ownerOrBranchManager, apiLimiter, addBrand);
router.get("/brand", auth, apiLimiter, getBrands);
router.put("/brand/:id", auth, ownerOrBranchManager, apiLimiter, updateBrand);
router.delete("/brand/:id", auth, isOwner, apiLimiter, deleteBrand);

module.exports = router;
  