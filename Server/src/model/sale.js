const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema(
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

    branchName: {
      type: String,
      required: true,
      trim: true,
    },

    invoiceNumber: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      default: "",
    },

    customerAddress: {
      type: String,
      default: "",
    },

    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },

        productName: {
          type: String,
          required: true,
        },
        description: {
          type: String,
          default: "",
          trim: true,
       },
       brand: {
          type: String,
          default: "",
          trim: true,
        },

        barcode: {
          type: String,
          required: true,
        },
        modelNumber: {
          type: String,
          default: "",
        },
        serialNumber: {
          type: String,
          default: "",
        },
        hsnCode: {
          type: String,
          trim: true,
        },
        
        tollFreeNumber: {
          type: String,
          default: "",
          trim: true,
        },

        unit: {
          type: Number,
          required: true,
          min: 1,
        },
        sellingPrice: {
          type: Number,
          required: true,
        },
        purchasePrice: {
          type: Number,
          default: 0,
          min: 0,
        },

        mrp: {
          type: Number,
          required: true,
        },

        discount: {
          type: Number,
          default: 0,
        },

        taxableAmount: {
          type: Number,
          required: true,
        },

        cgstAmount: {
          type: Number,
          default: 0,
        },

        sgstAmount: {
          type: Number,
          default: 0,
        },

        igstAmount: {
          type: Number,
          default: 0,
        },

        totalAmount: {
          type: Number,
          required: true,
        },
      },
    ],

    subtotal: {
      type: Number,
      required: true,
    },

    totalDiscount: {
      type: Number,
      default: 0,
    },

    taxableValue: {
      type: Number,
      required: true,
    },

    cgstTotal: {
      type: Number,
      default: 0,
    },

    sgstTotal: {
      type: Number,
      default: 0,
    },

    igstTotal: {
      type: Number,
      default: 0,
    },

    grandTotal: {
      type: Number,
      required: true,
    },

    paymentMethod: {
      type: String,
      enum: ["CASH", "UPI", "CARD", "SPLIT"],
      required: true,
    },

    splitDetails: {
      cashAmount: {
        type: Number,
        default: 0,
      },
      upiAmount: {
        type: Number,
        default: 0,
      },
      cardAmount: {
        type: Number,
        default: 0,
      },
    },

    paidAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    dueAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ["PAID", "PARTIAL", "UNPAID", "DUE"],
      default: "PAID",
      index: true,
    },

    cashierId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: false,
    },

    cashierName: {
      type: String,
      default: "Cashier",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes
SaleSchema.index({ companyId: 1, invoiceNumber: 1 }, { unique: true });
SaleSchema.index({ companyId: 1, branchId: 1 });
SaleSchema.index({ companyId: 1, branchId: 1, paymentStatus: 1 });
SaleSchema.index({ dueAmount: 1 });
SaleSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Sale", SaleSchema);
