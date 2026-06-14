const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productName: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "General",
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      default: 0,
      min: [0, "Quantity cannot be negative"],
    },
    minimumStock: {
      type: Number,
      default: 0,
      min: [0, "Minimum stock cannot be negative"],
    },
    unitPrice: {
      type: Number,
      default: 0,
      min: [0, "Unit price cannot be negative"],
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
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

module.exports = mongoose.model("Product", productSchema);
