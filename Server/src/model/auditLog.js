const mongoose = require("mongoose");

const AuditLogSchema = new mongoose.Schema(
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
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      required: true, // e.g., "PRODUCT_ADD", "STOCK_ADJUSTMENT", "PRICE_UPDATE", "USER_STATUS_CHANGE"
      index: true,
    },
    resource: {
      type: String,
      required: true, // e.g., "Product", "BranchInventory", "User"
    },
    resourceId: {
      type: String,
      default: "",
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ companyId: 1, createdAt: -1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
