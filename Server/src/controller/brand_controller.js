const Brand = require("../model/brand");
const { sendResponse } = require("../utils/responseHandler");
const AppError = require("../utils/AppError");
const AuditLog = require("../model/auditLog");

const addBrand = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { name,  description } = req.body;

    if (!name) {
      throw new AppError("Brand name is required", 400);
    }

    const existing = await Brand.findOne({ companyId, name, isDeleted: false });
    if (existing) {
      throw new AppError("Brand with this name already exists", 400);
    }

    const brand = await Brand.create({
      companyId,
      name,
      description,
    });

    await AuditLog.create({
      companyId,
      userId: req.user.userId,
      userName: req.user.name || "User",
      action: "BRAND_CREATE",
      resource: "Brand",
      resourceId: brand._id,
      details: { name },
    });

    return sendResponse(res, 201, "Brand created successfully", brand);
  } catch (error) {
    next(error);
  }
};

const getBrands = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const brands = await Brand.find({ companyId, isDeleted: false }).sort({ name: 1 });
    return sendResponse(res, 200, "Brands fetched successfully", brands);
  } catch (error) {
    next(error);
  }
};

const updateBrand = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { name, description, status } = req.body;

    const brand = await Brand.findOne({ _id: id, companyId, isDeleted: false });
    if (!brand) {
      throw new AppError("Brand not found", 404);
    }

    if (name) brand.name = name;
    if (description !== undefined) brand.description = description;
    if (status) brand.status = status;

    await brand.save();

    await AuditLog.create({
      companyId,
      userId: req.user.userId,
      userName: req.user.name || "User",
      action: "BRAND_UPDATE",
      resource: "Brand",
      resourceId: brand._id,
      details: { name, status },
    });

    return sendResponse(res, 200, "Brand updated successfully", brand);
  } catch (error) {
    next(error);
  }
};

const deleteBrand = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const brand = await Brand.findOne({ _id: id, companyId, isDeleted: false });
    if (!brand) {
      throw new AppError("Brand not found", 404);
    }

    brand.isDeleted = true;
    await brand.save();

    await AuditLog.create({
      companyId,
      userId: req.user.userId,
      userName: req.user.name || "User",
      action: "BRAND_DELETE",
      resource: "Brand",
      resourceId: brand._id,
      details: { name: brand.name },
    });

    return sendResponse(res, 200, "Brand deleted successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addBrand,
  getBrands,
  updateBrand,
  deleteBrand,
};
