const express = require("express");
const router = express.Router();
const { auth, ownerOrBranchManager, isOwner } = require("../middleware");
const { apiLimiter } = require("../middleware/rateLimiter");
const {
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
} = require("../controller/category_controller");

router.post("/addCategory", auth, ownerOrBranchManager, apiLimiter, addCategory);
router.get("/category", auth, apiLimiter, getCategories);
router.put("/category/:id", auth, ownerOrBranchManager, apiLimiter, updateCategory);
router.delete("/category/:id", auth, isOwner, apiLimiter, deleteCategory);

module.exports = router;
