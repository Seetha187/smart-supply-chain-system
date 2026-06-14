const mongoose = require("mongoose");

const purchaseOrderItemSchema = new mongoose.Schema(
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

const purchaseOrderSchema = new mongoose.Schema(
  {
    purchaseOrderNumber: {
      type: String,
      required: [true, "Purchase order number is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      required: [true, "Vendor is required"],
    },
    warehouseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Warehouse",
      required: [true, "Warehouse is required"],
    },
    items: {
      type: [purchaseOrderItemSchema],
      validate: {
        validator: (items) => items.length > 0,
        message: "At least one purchase order item is required",
      },
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Shipped", "Delivered", "Cancelled"],
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

purchaseOrderSchema.pre("validate", function () {
  this.totalAmount = this.items.reduce((total, item) => {
    return total + item.quantity * item.unitPrice;
  }, 0);

  //next();
});

module.exports = mongoose.model("PurchaseOrder", purchaseOrderSchema);
