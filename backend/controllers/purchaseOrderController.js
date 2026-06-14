const mongoose = require("mongoose");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");
const Warehouse = require("../models/Warehouse");
const PurchaseOrder = require("../models/PurchaseOrder");

const validStatuses = ["Pending", "Approved", "Shipped", "Delivered", "Cancelled"];

const formatValidationError = (error) => {
  return Object.values(error.errors)
    .map((item) => item.message)
    .join(", ");
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const populatePurchaseOrder = (query) => {
  return query
    .populate("vendorId", "vendorName email phone")
    .populate("warehouseId", "warehouseName location")
    .populate("items.productId", "productName sku quantity unitPrice")
    .populate("createdBy", "name email role");
};

const getPurchaseOrderOr404 = async (id, res) => {
  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid purchase order ID",
    });
    return null;
  }

  const purchaseOrder = await PurchaseOrder.findById(id);

  if (!purchaseOrder) {
    res.status(404).json({
      success: false,
      message: "Purchase order not found",
    });
    return null;
  }

  return purchaseOrder;
};

const validateReferences = async ({ vendorId, warehouseId, items }) => {
  if (!isValidObjectId(vendorId)) {
    return "Invalid vendor ID";
  }

  if (!isValidObjectId(warehouseId)) {
    return "Invalid warehouse ID";
  }

  const vendor = await Vendor.findById(vendorId);

  if (!vendor) {
    return "Vendor not found";
  }

  const warehouse = await Warehouse.findById(warehouseId);

  if (!warehouse) {
    return "Warehouse not found";
  }

  if (!Array.isArray(items) || items.length === 0) {
    return "At least one purchase order item is required";
  }

  for (const item of items) {
    if (!item.productId || item.quantity === undefined || item.unitPrice === undefined) {
      return "Product, quantity, and unit price are required for each item";
    }

    if (!isValidObjectId(item.productId)) {
      return "Invalid product ID in items";
    }

    const product = await Product.findById(item.productId);

    if (!product) {
      return "Product not found in items";
    }
  }

  return null;
};

const increaseProductStock = async (items) => {
  for (const item of items) {
    await Product.findByIdAndUpdate(item.productId, {
      $inc: { quantity: item.quantity },
    });
  }
};

const createPurchaseOrder = async (req, res) => {
  try {
    const {
      purchaseOrderNumber,
      vendorId,
      warehouseId,
      items,
      status,
    } = req.body;

    if (!purchaseOrderNumber || !vendorId || !warehouseId) {
      return res.status(400).json({
        success: false,
        message: "Purchase order number, vendor, and warehouse are required",
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase order status",
      });
    }

    const referenceError = await validateReferences({ vendorId, warehouseId, items });

    if (referenceError) {
      return res.status(400).json({
        success: false,
        message: referenceError,
      });
    }

    const existingPurchaseOrder = await PurchaseOrder.findOne({
      purchaseOrderNumber,
    });

    if (existingPurchaseOrder) {
      return res.status(400).json({
        success: false,
        message: "Purchase order with this number already exists",
      });
    }
    console.log("REQ BODY:", req.body);
console.log("USER:", req.user);
    const purchaseOrder = await PurchaseOrder.create({
      purchaseOrderNumber,
      vendorId,
      warehouseId,
      items,
      status,
      createdBy: req.user._id,
    });

    if (purchaseOrder.status === "Delivered") {
      await increaseProductStock(purchaseOrder.items);
    }

    return res.status(201).json({
      success: true,
      message: "Purchase order created successfully",
      purchaseOrder,
    });
  } catch (error) {
    console.error(error);
    console.error("PURCHASE ORDER ERROR:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Purchase order with this number already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: formatValidationError(error),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while creating purchase order",
    });
  }
};

const getAllPurchaseOrders = async (req, res) => {
  try {
    const purchaseOrders = await populatePurchaseOrder(
      PurchaseOrder.find().sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: purchaseOrders.length,
      purchaseOrders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching purchase orders",
    });
  }
};

const getPurchaseOrderById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid purchase order ID",
      });
    }

    const purchaseOrder = await populatePurchaseOrder(
      PurchaseOrder.findById(req.params.id)
    );

    if (!purchaseOrder) {
      return res.status(404).json({
        success: false,
        message: "Purchase order not found",
      });
    }

    return res.status(200).json({
      success: true,
      purchaseOrder,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching purchase order",
    });
  }
};
const updatePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await getPurchaseOrderOr404(req.params.id, res);

    if (!purchaseOrder) {
      return null;
    }

    const previousStatus = purchaseOrder.status;

    const nextVendorId = req.body.vendorId || purchaseOrder.vendorId;
    const nextWarehouseId = req.body.warehouseId || purchaseOrder.warehouseId;
    const nextItems = req.body.items || purchaseOrder.items;

    const referenceError = await validateReferences({
      vendorId: nextVendorId,
      warehouseId: nextWarehouseId,
      items: nextItems,
    });

    if (referenceError) {
      return res.status(400).json({
        success: false,
        message: referenceError,
      });
    }

    const allowedFields = [
      "purchaseOrderNumber",
      "vendorId",
      "warehouseId",
      "items",
      "status",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        purchaseOrder[field] = req.body[field];
      }
    });

    const updatedPurchaseOrder = await purchaseOrder.save();

    if (
      previousStatus !== "Delivered" &&
      updatedPurchaseOrder.status === "Delivered"
    ) {
      await increaseProductStock(updatedPurchaseOrder.items);
    }

    return res.status(200).json({
      success: true,
      message: "Purchase order updated successfully",
      purchaseOrder: updatedPurchaseOrder,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Purchase order with this number already exists",
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: formatValidationError(error),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating purchase order",
    });
  }
};

const deletePurchaseOrder = async (req, res) => {
  try {
    const purchaseOrder = await getPurchaseOrderOr404(req.params.id, res);

    if (!purchaseOrder) {
      return null;
    }

    await purchaseOrder.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Purchase order deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting purchase order",
    });
  }
};

const updatePurchaseOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required",
      });
    }

    const purchaseOrder = await getPurchaseOrderOr404(req.params.id, res);

    if (!purchaseOrder) {
      return null;
    }

    const previousStatus = purchaseOrder.status;
    purchaseOrder.status = status;

    const updatedPurchaseOrder = await purchaseOrder.save();

    if (previousStatus !== "Delivered" && status === "Delivered") {
      await increaseProductStock(updatedPurchaseOrder.items);
    }

    return res.status(200).json({
      success: true,
      message: "Purchase order status updated successfully",
      purchaseOrder: updatedPurchaseOrder,
    });
  } catch (error) {
    if (error.name === "ValidationError") {
      return res.status(400).json({
        success: false,
        message: formatValidationError(error),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating purchase order status",
    });
  }
};

module.exports = {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  updatePurchaseOrderStatus,
};
