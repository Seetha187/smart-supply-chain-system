const mongoose = require("mongoose");
const Vendor = require("../models/Vendor");

const formatValidationError = (error) => {
  return Object.values(error.errors)
    .map((item) => item.message)
    .join(", ");
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getVendorOr404 = async (id, res) => {
  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid vendor ID",
    });
    return null;
  }

  const vendor = await Vendor.findById(id);

  if (!vendor) {
    res.status(404).json({
      success: false,
      message: "Vendor not found",
    });
    return null;
  }

  return vendor;
};

const createVendor = async (req, res) => {
  try {
    const { vendorName, email, phone, address, rating } = req.body;

    if (!vendorName || !email || !phone || !address) {
      return res.status(400).json({
        success: false,
        message: "Vendor name, email, phone, and address are required",
      });
    }

    const existingVendor = await Vendor.findOne({ email });

    if (existingVendor) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this email already exists",
      });
    }

    const vendor = await Vendor.create({
      vendorName,
      email,
      phone,
      address,
      rating,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Vendor created successfully",
      vendor,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this email already exists",
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
      message: "Server error while creating vendor",
    });
  }
};

const getAllVendors = async (req, res) => {
  try {
    const vendors = await Vendor.find().sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: vendors.length,
      vendors,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching vendors",
    });
  }
};

const getVendorById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid vendor ID",
      });
    }

    const vendor = await Vendor.findById(req.params.id);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
      });
    }

    return res.status(200).json({
      success: true,
      vendor,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching vendor",
    });
  }
};

const updateVendor = async (req, res) => {
  try {
    const vendor = await getVendorOr404(req.params.id, res);

    if (!vendor) {
      return null;
    }

    const allowedFields = ["vendorName", "email", "phone", "address", "rating"];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        vendor[field] = req.body[field];
      }
    });

    const updatedVendor = await vendor.save();

    return res.status(200).json({
      success: true,
      message: "Vendor updated successfully",
      vendor: updatedVendor,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: "Vendor with this email already exists",
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
      message: "Server error while updating vendor",
    });
  }
};

const deleteVendor = async (req, res) => {
  try {
    const vendor = await getVendorOr404(req.params.id, res);

    if (!vendor) {
      return null;
    }

    await vendor.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Vendor deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting vendor",
    });
  }
};

module.exports = {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
};
