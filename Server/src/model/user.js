const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
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
      default: null,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      index: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
    },

    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    adharNumber: {
      type: String,
    },
    Pic: {
      type: String,
    },

    dob:{
      type: Date
    },
    address: {
      type: mongoose.Schema.Types.Mixed,
      default: "",
    },
    // doc proofs in future we can add doc proofs for user verification
    role: {
      type: String,
      enum: [
        "OWNER",
        "BRANCH_MANAGER",
        "CASHIER",
        "INVENTORY_STAFF",
      ],
      required: true,
    },

    emailVerified: {
      type: Boolean,
      default: false,
    },

    phoneVerified: {
      type: Boolean,
      default: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ companyId: 1, role: 1 });
userSchema.index({ companyId: 1, branchId: 1 });

module.exports = mongoose.model("User", userSchema);