const mongoose = require("mongoose");
const CustomerOrder = require("../models/CustomerOrder");
const Delivery = require("../models/Delivery");

const validStatuses = [
  "Pending",
  "Packed",
  "Shipped",
  "In Transit",
  "Out For Delivery",
  "Delivered",
];

const formatValidationError = (error) => {
  return Object.values(error.errors)
    .map((item) => item.message)
    .join(", ");
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const populateDelivery = (query) => {
  return query
    .populate("customerOrderId", "customerName customerEmail status totalAmount")
    .populate("createdBy", "name email role");
};

const getDeliveryOr404 = async (id, res) => {
  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid delivery ID",
    });
    return null;
  }

  const delivery = await Delivery.findById(id);

  if (!delivery) {
    res.status(404).json({
      success: false,
      message: "Delivery not found",
    });
    return null;
  }

  return delivery;
};

const validateCustomerOrder = async (customerOrderId) => {
  if (!customerOrderId) {
    return "Customer order is required";
  }

  if (!isValidObjectId(customerOrderId)) {
    return "Invalid customer order ID";
  }

  const customerOrder = await CustomerOrder.findById(customerOrderId);

  if (!customerOrder) {
    return "Customer order not found";
  }

  return null;
};

const createDelivery = async (req, res) => {
  try {
    const {
      trackingNumber,
      customerOrderId,
      deliveryAgent,
      currentLocation,
      estimatedDeliveryDate,
      status,
    } = req.body;

    if (
      !trackingNumber ||
      !customerOrderId ||
      !deliveryAgent ||
      !currentLocation ||
      !estimatedDeliveryDate
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tracking number, customer order, delivery agent, current location, and estimated delivery date are required",
      });
    }

    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery status",
      });
    }

    const customerOrderError = await validateCustomerOrder(customerOrderId);

    if (customerOrderError) {
      return res.status(400).json({
        success: false,
        message: customerOrderError,
      });
    }

    const existingDelivery = await Delivery.findOne({ trackingNumber });

    if (existingDelivery) {
      return res.status(400).json({
        success: false,
        message: "Delivery with this tracking number already exists",
      });
    }

    const delivery = await Delivery.create({
      trackingNumber,
      customerOrderId,
      deliveryAgent,
      currentLocation,
      estimatedDeliveryDate,
      status,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Delivery created successfully",
      delivery,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Delivery with this tracking number already exists",
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
      message: "Server error while creating delivery",
    });
  }
};

const getAllDeliveries = async (req, res) => {
  try {
    const deliveries = await populateDelivery(
      Delivery.find().sort({ createdAt: -1 })
    );

    return res.status(200).json({
      success: true,
      count: deliveries.length,
      deliveries,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching deliveries",
    });
  }
};

const getDeliveryById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID",
      });
    }

    const delivery = await populateDelivery(Delivery.findById(req.params.id));

    if (!delivery) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found",
      });
    }

    return res.status(200).json({
      success: true,
      delivery,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching delivery",
    });
  }
};

const updateDelivery = async (req, res) => {
  try {
    const delivery = await getDeliveryOr404(req.params.id, res);

    if (!delivery) {
      return null;
    }

    if (req.body.status && !validStatuses.includes(req.body.status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery status",
      });
    }

    if (req.body.customerOrderId !== undefined) {
      const customerOrderError = await validateCustomerOrder(req.body.customerOrderId);

      if (customerOrderError) {
        return res.status(400).json({
          success: false,
          message: customerOrderError,
        });
      }
    }

    const allowedFields = [
      "trackingNumber",
      "customerOrderId",
      "deliveryAgent",
      "currentLocation",
      "estimatedDeliveryDate",
      "status",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        delivery[field] = req.body[field];
      }
    });

    const updatedDelivery = await delivery.save();

    return res.status(200).json({
      success: true,
      message: "Delivery updated successfully",
      delivery: updatedDelivery,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Delivery with this tracking number already exists",
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
      message: "Server error while updating delivery",
    });
  }
};

const deleteDelivery = async (req, res) => {
  try {
    const delivery = await getDeliveryOr404(req.params.id, res);

    if (!delivery) {
      return null;
    }

    await delivery.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Delivery deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting delivery",
    });
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status is required",
      });
    }

    const delivery = await getDeliveryOr404(req.params.id, res);

    if (!delivery) {
      return null;
    }

    delivery.status = status;
    const updatedDelivery = await delivery.save();

    return res.status(200).json({
      success: true,
      message: "Delivery status updated successfully",
      delivery: updatedDelivery,
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
      message: "Server error while updating delivery status",
    });
  }
};

module.exports = {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDelivery,
  deleteDelivery,
  updateDeliveryStatus,
};
