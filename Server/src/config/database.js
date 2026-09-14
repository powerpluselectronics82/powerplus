const mongoose = require("mongoose");
const BranchInventory = require("../model/BranchInventory");

const connectDB = async () => {
  try {
    const connection = await mongoose.connect(
      process.env.MONGO_URI
    );

    const indexes = await BranchInventory.collection.indexes();
    const legacyIndex = indexes.find((index) => index.name === "companyId_1_branchId_1_productId_1");
    if (legacyIndex) {
      await BranchInventory.collection.dropIndex(legacyIndex.name);
    }
    await BranchInventory.syncIndexes();

    console.log(
      "connected database"
    );
  } catch (error) {
    console.error("MongoDB connection failed:");
    console.error(error.message);

    process.exit(1);
  }
};

module.exports = connectDB;