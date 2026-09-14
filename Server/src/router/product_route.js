const express = require("express");
const router = express.Router();
const { auth, isOwner, allowed, ownerOrBranchManager } = require("../middleware");

const {
	addProduct,
	getAllproduct,
	getProductById,
	getProductByBarcode,
	getProductByModelNumber,
	updateProductStatus,
} = require("../controller/product_controller");

const { apiLimiter } = require("../middleware/rateLimiter");

router.post("/addProduct", auth, allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF"]), apiLimiter, addProduct);
router.get("/allProducts", auth, apiLimiter, getAllproduct);
router.get("/product/:id", auth, apiLimiter, getProductById);
router.get("/barcode/:barcode", auth, apiLimiter, getProductByBarcode);
router.get("/modelNumber/:modelNumber", auth, apiLimiter, getProductByModelNumber);
router.patch("/productStatus/:id", auth, allowed(["OWNER", "BRANCH_MANAGER", "INVENTORY_STAFF"]), apiLimiter, updateProductStatus);

module.exports = router;