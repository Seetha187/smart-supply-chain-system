const mongoose = require("mongoose");

const warehouseSchema = new mongoose.Schema(
  {
    warehouseName: {
      type: String,
      required: [true, "Warehouse name is required"],
      trim: true,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      trim: true,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: [0, "Capacity cannot be negative"],
    },
    managerName: {
      type: String,
      trim: true,
    },
    contactNumber: {
      type: String,
      trim: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Warehouse", warehouseSchema);
