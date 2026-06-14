const mongoose = require("mongoose");

const customerOrderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Item quantity is required"],
      min: [1, "Item quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Item unit price is required"],
      min: [0, "Item unit price cannot be negative"],
    },
  },
  {
    _id: false,
  }
);

const customerOrderSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
    },
    customerEmail: {
      type: String,
      required: [true, "Customer email is required"],
      lowercase: true,
      trim: true,
    },
    items: {
      type: [customerOrderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "At least one customer order item is required",
      },
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Confirmed", "Packed", "Shipped", "Delivered", "Cancelled"],
      default: "Pending",
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

customerOrderSchema.pre("validate", function () {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + item.quantity * item.unitPrice;
  }, 0);

  
});

module.exports = mongoose.model("CustomerOrder", customerOrderSchema);
