const mongoose = require("mongoose");

const PurchaseItemSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  productName: {
    type: String,
    required: true,
    trim: true,
  },
  barcode: {
    type: String,
    required: true,
    trim: true,
  },
  hsnCode: {
    type: String,
    default: "",
    trim: true,
  },
  modelNumber: {
    type: String,
    default: "",
    trim: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  purchasePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  mrp: {
    type: Number,
    default: 0,
  },
  cgstRate: {
    type: Number,
    default: 0,
  },
  sgstRate: {
    type: Number,
    default: 0,
  },
  taxableAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  taxAmount: {
    type: Number,
    required: true,
    default: 0,
  },
  totalAmount: {
    type: Number,
    required: true,
    default: 0,
  },
});

const PurchaseSchema = new mongoose.Schema(
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
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Supplier",
      required: true,
    },
    supplierName: {
      type: String,
      required: true,
      trim: true,
    },
    supplierGstin: {
      type: String,
      default: "",
      trim: true,
    },
    supplierPhoneNumbers: [
      {
        type: String,
        trim: true,
      },
    ],
    supplierEmail: {
      type: String,
      default: "",
      trim: true,
    },
    supplierAddress: {
      type: String,
      default: "",
      trim: true,
    },
    purchaseInvoiceNumber: {
      type: String,
      required: true,
      trim: true,
    },
    purchaseDate: {
      type: Date,
      default: Date.now,
    },
    paymentStatus: {
      type: String,
      enum: ["PAID", "UNPAID", "PARTIAL"],
      default: "PAID",
    },
    items: [PurchaseItemSchema],
    subtotal: {
      type: Number,
      required: true,
      default: 0,
    },
    taxTotal: {
      type: Number,
      required: true,
      default: 0,
    },
    grandTotal: {
      type: Number,
      required: true,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

PurchaseSchema.index({ companyId: 1, purchaseInvoiceNumber: 1 });

module.exports = mongoose.model("Purchase", PurchaseSchema);