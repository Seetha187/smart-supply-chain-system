const mongoose = require("mongoose");

const deliverySchema = new mongoose.Schema(
  {
    trackingNumber: {
      type: String,
      required: [true, "Tracking number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    customerOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CustomerOrder",
      required: [true, "Customer order is required"],
    },
    deliveryAgent: {
      type: String,
      required: [true, "Delivery agent is required"],
      trim: true,
    },
    currentLocation: {
      type: String,
      required: [true, "Current location is required"],
      trim: true,
    },
    estimatedDeliveryDate: {
      type: Date,
      required: [true, "Estimated delivery date is required"],
    },
    status: {
      type: String,
      enum: [
        "Pending",
        "Packed",
        "Shipped",
        "In Transit",
        "Out For Delivery",
        "Delivered",
      ],
      default: "Pending",
    },
    autoCreated: {
      type: Boolean,
      default: false,
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

module.exports = mongoose.model("Delivery", deliverySchema);
