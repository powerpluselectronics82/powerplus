const express = require("express");
const { addCompany } = require("../controller/company_controller");

const router = express.Router();

router.post("/", addCompany);

module.exports = router;