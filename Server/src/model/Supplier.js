const mongoose = require("mongoose");

const SupplierSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    brand: {
      type: String,
      trim: true,
      default: "",
    },

    gstin: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },

    phoneNumbers: [
      {
        type: String,
        trim: true,
      },
    ],

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    address: {
      type: String,
      trim: true,
      default: "",
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes
SupplierSchema.index(
  {
    companyId: 1,
    phoneNumbers: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

SupplierSchema.index(
  {
    companyId: 1,
    gstin: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

SupplierSchema.index({
  name: "text",
  brand: "text",
});

module.exports = mongoose.model("Supplier", SupplierSchema);