const mongoose = require("mongoose");

const ProductSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },

    barcode: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    modelNumber: {
      type: String,
      trim: true,
      default: "",
    },
    hsnCode: {
      type: String,
      trim: true, 
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
      trim: true,
    },

    category: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      index: true,
    },

    brand: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      index: true,
    },

     isSerialized: {
      type: Boolean,
      default: false,
    },

    // mrp: {
    //   type: Number,
    //   required: true,
    //   min: 0,
    // },

    cgstRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    sgstRate: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    igstRate: {
      type: Number,
      min: 0,
      max: 100,
    },

    minStockLevel: {
      type: Number,
      default: 2,
      min: 0,
    },
    specifications: {
      // General

      color: {
        type: String,
        trim: true,
        default: "",
      },

      warranty: {
        type: String,
        trim: true,
        default: "",
      },

      tollFreeNumber: {
        type: String,
        trim: true,
        default: "",
      },

      // Physical
      dimensions: {
        type: String,
        trim: true,
        default: "",
      },

      weight: {
        type: String,
        trim: true,
        default: "",
      },

      // Power
      powerConsumption: {
        type: String,
        trim: true,
        default: "",
      },

      voltage: {
        type: String,
        trim: true,
        default: "",
      },

      // Connectivity
      connectivity: {
        type: [String],
        default: [],
      },

      // Display
      displaySize: {
        type: String,
        trim: true,
        default: "",
      },

      resolution: {
        type: String,
        trim: true,
        default: "",
      },

      // Storage / Memory
      ram: {
        type: String,
        trim: true,
        default: "",
      },

      storage: {
        type: String,
        trim: true,
        default: "",
      },

      // Battery
      batteryCapacity: {
        type: String,
        trim: true,
        default: "",
      },

      // Processor
      processor: {
        type: String,
        trim: true,
        default: "",
      },

      operatingSystem: {
        type: String,
        trim: true,
        default: "",
      },

      // Camera
      camera: {
        type: String,
        trim: true,
        default: "",
      },

      // Audio
      speaker: {
        type: String,
        trim: true,
        default: "",
      },

      // Other
      features: {
        type: [String],
        default: [],
      },

      other: {
        type: Map,
        of: String,
        default: {},
      },
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
  },
);

// Compound Indexes
ProductSchema.index({ companyId: 1, barcode: 1 }, { unique: true });

// Text Search Index
ProductSchema.index({
  name: "text",
  sku: "text",
  barcode: "text",
});

module.exports = mongoose.model("Product", ProductSchema);
