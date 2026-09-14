const Category = require("../model/category");
const { sendResponse } = require("../utils/responseHandler");
const AppError = require("../utils/AppError");
const AuditLog = require("../model/auditLog");

const addCategory = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { name, description } = req.body;

    if (!name) {
      throw new AppError("Category name is required", 400);
    }


    const existing = await Category.findOne({ companyId, name, isDeleted: false });
    if (existing) {
      throw new AppError("Category with this name already exists", 400);
    }

    const category = await Category.create({
      companyId,
      name,
      description,
    });

    await AuditLog.create({
      companyId,
      userId: req.user.userId,
      userName: req.user.name || "User",
      action: "CATEGORY_CREATE",
      resource: "Category",
      resourceId: category._id,
      details: { name },
    });

    return sendResponse(res, 201, "Category created successfully", category);
  } catch (error) {
    next(error);
  }
};

const getCategories = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const categories = await Category.find({ companyId, isDeleted: false }).sort({ name: 1 });
    return sendResponse(res, 200, "Categories fetched successfully", categories);
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { name, description, status } = req.body;

    const category = await Category.findOne({ _id: id, companyId, isDeleted: false });
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    if (name) {
      category.name = name;
      category.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    }
    if (description !== undefined) category.description = description;
    if (status) category.status = status;

    await category.save();

    await AuditLog.create({
      companyId,
      userId: req.user.userId,
      userName: req.user.name || "User",
      action: "CATEGORY_UPDATE",
      resource: "Category",
      resourceId: category._id,
      details: { name, status },
    });

    return sendResponse(res, 200, "Category updated successfully", category);
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const category = await Category.findOne({ _id: id, companyId, isDeleted: false });
    if (!category) {
      throw new AppError("Category not found", 404);
    }

    category.isDeleted = true;
    await category.save();

    await AuditLog.create({
      companyId,
      userId: req.user.userId,
      userName: req.user.name || "User",
      action: "CATEGORY_DELETE",
      resource: "Category",
      resourceId: category._id,
      details: { name: category.name },
    });

    return sendResponse(res, 200, "Category deleted successfully");
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addCategory,
  getCategories,
  updateCategory,
  deleteCategory,
};
