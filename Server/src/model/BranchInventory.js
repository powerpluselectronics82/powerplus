const mongoose = require("mongoose");

const BranchInventorySchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    branchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Branch",
      required: true,
      index: true,
    },

    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },

    purchasePrice: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },

    manufacturingDate: {
      type: Date,
    },

    expiryDate: {
      type: Date,
    },

    barcode: {
      type: String,
      required: true,
      trim: true,
    },
    stock: {
      type: Number,
      required: true, 
      min: 0
    },
    // Totalproductbuy: {
    //   type: Number,
    //   required: true,
    //   min: 0
    // },
  },
  {
    timestamps: true,
  }
);

// One inventory record per product, branch, and purchasePrice
BranchInventorySchema.index(
  { companyId: 1, branchId: 1, productId: 1, purchasePrice: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "BranchInventory",
  BranchInventorySchema
);