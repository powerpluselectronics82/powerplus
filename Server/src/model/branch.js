const mongoose = require("mongoose");

const branchSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    // Auto generated unique code for the branch within the company with format: BR-001, BR-002, etc.
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    address: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    // updated phone and email fields to be single string instead of array of objects
    phone: [
      {
        number: {
          type: String,
          required: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ["PRIMARY", "SECONDARY", "WHATSAPP"],
          default: "SECONDARY",
        },
      },
    ],

    email: [
      {
        address: {
          type: String,
          required: true,
          lowercase: true,
          trim: true,
        },
        type: {
          type: String,
          enum: ["PRIMARY", "SECONDARY", "SUPPORT", "SALES"],
          default: "SECONDARY",
        },
      },
    ],

    gstin: {
      type: String,
      uppercase: true,
      trim: true,
    },
    openingTime: {
      type: String,
      trim: true,
    },
    closingTime: {
      type: String,
      trim: true,
    },
    openDays: {
      type: [String],
      enum: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ],
      default: [
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
        "Sunday"
      ]
    },
    establishmentDate: {
      type: Date,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    managerName: {
      type: String,
      trim: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

// Branch code must be unique inside one company
branchSchema.index(
  { companyId: 1, code: 1 },
  { unique: true }
);

// Branch names must be unique within a company, regardless of letter case.
branchSchema.index(
  { companyId: 1, name: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

const Branch = mongoose.model("Branch", branchSchema);

module.exports = Branch;


