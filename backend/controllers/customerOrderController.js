const mongoose = require("mongoose");
const Product = require("../models/Product");
const CustomerOrder = require("../models/CustomerOrder");
const {
  createDeliveryForConfirmedOrder,
} = require("../services/automationService");

const validStatuses = [
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

const formatValidationError = (error) => {
  return Object.values(error.errors)
    .map((item) => item.message)
    .join(", ");
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateCustomerOrder = (query) => {
  return query
    .populate("items.productId", "productName sku quantity unitPrice")
    .populate("createdBy", "name email role");
};

const getCustomerOrderOr404 = async (id, res) => {
  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid customer order ID",
    });
    return null;
  }

  const customerOrder = await CustomerOrder.findById(id);

  if (!customerOrder) {
    res.status(404).json({
      success: false,
      message: "Customer order not found",
    });
    return null;
  }

  return customerOrder;
};

const getQuantityMap = (items) => {
  return items.reduce((map, item) => {
    const productId = item.productId.toString();
    map[productId] = (map[productId] || 0) + Number(item.quantity);
    return map;
  }, {});
};

const validateItems = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return "At least one customer order item is required";
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

const validateStockForQuantityChange = async (newItems, previousItems = []) => {
  const newQuantities = getQuantityMap(newItems);
  const previousQuantities = getQuantityMap(previousItems);

  for (const productId of Object.keys(newQuantities)) {
    const requestedChange = newQuantities[productId] - (previousQuantities[productId] || 0);

    if (requestedChange <= 0) {
      continue;
    }

    const product = await Product.findById(productId);

    if (!product || product.quantity < requestedChange) {
      return "Insufficient stock for one or more products";
    }
  }

  return null;
};

const applyStockChange = async (newItems, previousItems = []) => {
  const newQuantities = getQuantityMap(newItems);
  const previousQuantities = getQuantityMap(previousItems);
  const productIds = new Set([
    ...Object.keys(newQuantities),
    ...Object.keys(previousQuantities),
  ]);

  for (const productId of productIds) {
    const quantityChange = (newQuantities[productId] || 0) - (previousQuantities[productId] || 0);

    if (quantityChange !== 0) {
      await Product.findByIdAndUpdate(productId, {
        $inc: { quantity: -quantityChange },
      });
    }
  }
};

const createCustomerOrder = async (req, res) => {
  try {
    const { customerName, customerEmail, items, status } = req.body;

    if (!customerName || !customerEmail) {
      return res.status(400).json({
        success: false,
        message: "Customer name and customer email are required",
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer order status",
      });
    }

    const itemError = await validateItems(items);

    if (itemError) {
      return res.status(400).json({
        success: false,
        message: itemError,
      });
    }

    const stockError = await validateStockForQuantityChange(items);

    if (stockError) {
      return res.status(400).json({
        success: false,
        message: stockError,
      });
    }

    const customerOrder = await CustomerOrder.create({
      customerName,
      customerEmail,
      items,
      status,
      createdBy: req.user._id,
    });

    await applyStockChange(customerOrder.items);

    let autoCreatedDelivery = null;

    if (customerOrder.status === "Confirmed") {
      autoCreatedDelivery = await createDeliveryForConfirmedOrder(
        customerOrder,
        req.user._id
      );
    }

    return res.status(201).json({
      success: true,
      message: "Customer order created successfully",
      customerOrder,
      autoCreatedDelivery,
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
      message: "Server error while creating customer order",
    });
  }
};

const getAllCustomerOrders = async (req, res) => {
  try {
    const customerOrders = await populateCustomerOrder(
      CustomerOrder.find().sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: customerOrders.length,
      customerOrders,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching customer orders",
    });
  }
};

const getCustomerOrderById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer order ID",
      });
    }

    const customerOrder = await populateCustomerOrder(
      CustomerOrder.findById(req.params.id)
    );

    if (!customerOrder) {
      return res.status(404).json({
        success: false,
        message: "Customer order not found",
      });
    }

    return res.status(200).json({
      success: true,
      customerOrder,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching customer order",
    });
  }
};

const updateCustomerOrder = async (req, res) => {
  try {
    const customerOrder = await getCustomerOrderOr404(req.params.id, res);

    if (!customerOrder) {
      return null;
    }

    if (req.body.status && !validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid customer order status",
      });
    }

    const previousStatus = customerOrder.status;
    const previousItems = customerOrder.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    if (req.body.items !== undefined) {
      const itemError = await validateItems(req.body.items);

      if (itemError) {
        return res.status(400).json({
          success: false,
          message: itemError,
        });
      }

      const stockError = await validateStockForQuantityChange(
        req.body.items,
        previousItems
      );

      if (stockError) {
        return res.status(400).json({
          success: false,
          message: stockError,
        });
      }
    }

    const allowedFields = ["customerName", "customerEmail", "items", "status"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        customerOrder[field] = req.body[field];
      }
    });

    const updatedCustomerOrder = await customerOrder.save();

    if (req.body.items !== undefined) {
      await applyStockChange(updatedCustomerOrder.items, previousItems);
    }

    let autoCreatedDelivery = null;

    if (
      previousStatus !== "Confirmed" &&
      updatedCustomerOrder.status === "Confirmed"
    ) {
      autoCreatedDelivery = await createDeliveryForConfirmedOrder(
        updatedCustomerOrder,
        req.user._id
      );
    }

    return res.status(200).json({
      success: true,
      message: "Customer order updated successfully",
      customerOrder: updatedCustomerOrder,
      autoCreatedDelivery,
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
      message: "Server error while updating customer order",
    });
  }
};

const deleteCustomerOrder = async (req, res) => {
  try {
    const customerOrder = await getCustomerOrderOr404(req.params.id, res);

    if (!customerOrder) {
      return null;
    }

    // Restore stock
    for (const item of customerOrder.items) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantity: item.quantity },
      });
    }

    await customerOrder.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Customer order deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting customer order",
    });
  }
};
const updateCustomerOrderStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required",
      });
    }

    const customerOrder = await getCustomerOrderOr404(req.params.id, res);

    if (!customerOrder) {
      return null;
    }

    const previousStatus = customerOrder.status;

    customerOrder.status = status;

    const updatedCustomerOrder = await customerOrder.save();

    // Restore stock if order is cancelled
    if (
      previousStatus !== "Cancelled" &&
      status === "Cancelled"
    ) {
      for (const item of updatedCustomerOrder.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { quantity: item.quantity },
        });
      }
    }

    let autoCreatedDelivery = null;

    if (previousStatus !== "Confirmed" && status === "Confirmed") {
      autoCreatedDelivery = await createDeliveryForConfirmedOrder(
        updatedCustomerOrder,
        req.user._id
      );
    }

    return res.status(200).json({
      success: true,
      message: "Customer order status updated successfully",
      customerOrder: updatedCustomerOrder,
      autoCreatedDelivery,
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
      message: "Server error while updating customer order status",
    });
  }
};

module.exports = {
  createCustomerOrder,
  getAllCustomerOrders,
  getCustomerOrderById,
  updateCustomerOrder,
  deleteCustomerOrder,
  updateCustomerOrderStatus,
};
