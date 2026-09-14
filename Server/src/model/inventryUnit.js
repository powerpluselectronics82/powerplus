const mongoose = require("mongoose");

const inventoryUnitSchema = new mongoose.Schema(
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

    serialNumber: {
      type: String,
      required: true,
      trim: true,
    },

    barcode: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: [
        "available",
        "reserved",
        "sold",
        "damaged",
      ],
      default: "available",
    },

    mrp: {
      type: Number,
      default: 0,
    },

    discountType: {
      type: String,
      enum: ["percentage", "fixed"],
      default: "fixed",
    },

    discountValue: {
      type: Number,
      default: 0,
    },

    sellingPrice: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Serial number must be unique within a company
inventoryUnitSchema.index(
  { companyId: 1, serialNumber: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "InventoryUnit",
  inventoryUnitSchema
);