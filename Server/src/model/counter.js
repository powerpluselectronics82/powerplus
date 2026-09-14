
const mongoose = require("mongoose");

const CounterSchema = new mongoose.Schema({
  companyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Company",
    required: true,
  },
  branchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Branch",
    required: true,
  },

  date: {
    type: String,
    required: true,
  },

  sequence: {
    type: Number,
    default: 0,
  },
});

CounterSchema.index(
  {
    companyId: 1,
    branchId: 1,
    date: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("Counter", CounterSchema);