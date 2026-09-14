const mongoose = require("mongoose");

const companySchema = new mongoose.Schema(
  {
    companyId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
    },
    establishmentDate: {
      type: Date,
    },

    gstin: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    pan: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
    },

    phone: {
      type: String,
      required: true,
    },

    address: {
      street: {
        type: String,
      },
      city: {
        type: String,
      },
      state: {
        type: String,
      },
      zipCode: {
        type: String,
      },
      country: {
        type: String,
      },
    },

    invoicePrefix: {
      type: String,
    },

    invoiceNextNumber: {
      type: Number,
    },

    taxConfig: {
      defaultCgstRate: {
        type: Number,
      },
      defaultSgstRate: {
        type: Number,
      },
      defaultIgstRate: {
        type: Number,
      },
    },
  },
  {
    timestamps: true,
  }
);

const Company = mongoose.model("Company", companySchema);

module.exports = Company;