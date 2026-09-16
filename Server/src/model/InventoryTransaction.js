const mongoose = require("mongoose");

const inventoryTransactionSchema = new mongoose.Schema(
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

    quantity: {
      type: Number,
      required: true,
    },

    mrp: {
      type: Number,
      required: true,
      min: 0,
    },

    purchasePrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    barcode: {
      type: String,
      required: true,
      trim: true,
    },

  },
  {
    timestamps: true,
    versionKey: false,
  }
);

inventoryTransactionSchema.index({
  companyId: 1,
  branchId: 1,
});

inventoryTransactionSchema.index({
  companyId: 1,
  productId: 1,
});

module.exports = mongoose.model(
  "InventoryTransaction",
  inventoryTransactionSchema
);