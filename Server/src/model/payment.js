const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
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
    saleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Sale",
      required: true,
      index: true,
    },
    invoiceNumber: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      default: "Walk-in Customer",
      trim: true,
    },
    customerPhone: {
      type: String,
      default: "",
      trim: true,
    },
    amountPaid: {
      type: Number,
      required: true,
      min: [0.01, "Amount paid must be greater than 0"],
    },
    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD"],
      required: true,
      default: "CASH",
    },
    transactionRef: {
      type: String,
      default: "",
      trim: true,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
    paymentDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    recordedByName: {
      type: String,
      required: true,
      default: "Cashier",
    },
  },
  {
    timestamps: true,
  }
);

paymentSchema.index({ companyId: 1, branchId: 1, paymentDate: -1 });
paymentSchema.index({ saleId: 1, paymentDate: -1 });

module.exports = mongoose.model("Payment", paymentSchema);
