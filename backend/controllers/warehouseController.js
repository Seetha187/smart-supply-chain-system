const mongoose = require("mongoose");
const Warehouse = require("../models/Warehouse");

const formatValidationError = (error) => {
  return Object.values(error.errors)
    .map((item) => item.message)
    .join(", ");
};

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getWarehouseOr404 = async (id, res) => {
  if (!isValidObjectId(id)) {
    res.status(400).json({
      success: false,
      message: "Invalid warehouse ID",
    });
    return null;
  }

  const warehouse = await Warehouse.findById(id);

  if (!warehouse) {
    res.status(404).json({
      success: false,
      message: "Warehouse not found",
    });
    return null;
  }

  return warehouse;
};

const createWarehouse = async (req, res) => {
  try {
    const {
      warehouseName,
      location,
      capacity,
      managerName,
      contactNumber,
    } = req.body;

    if (!warehouseName || !location || capacity === undefined) {
      return res.status(400).json({
        success: false,
        message: "Warehouse name, location, and capacity are required",
      });
    }

    const warehouse = await Warehouse.create({
      warehouseName,
      location,
      capacity,
      managerName,
      contactNumber,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      success: true,
      message: "Warehouse created successfully",
      warehouse,
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
      message: "Server error while creating warehouse",
    });
  }
};

const getAllWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find()
      
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: warehouses.length,
      warehouses,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching warehouses",
    });
  }
};

const getWarehouseById = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid warehouse ID",
      });
    }

    const warehouse = await Warehouse.findById(req.params.id);

    if (!warehouse) {
      return res.status(404).json({
        success: false,
        message: "Warehouse not found",
      });
    }

    return res.status(200).json({
      success: true,
      warehouse,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while fetching warehouse",
    });
  }
};

const updateWarehouse = async (req, res) => {
  try {
    const warehouse = await getWarehouseOr404(req.params.id, res);

    if (!warehouse) {
      return null;
    }

    const allowedFields = [
      "warehouseName",
      "location",
      "capacity",
      "managerName",
      "contactNumber",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        warehouse[field] = req.body[field];
      }
    });

    const updatedWarehouse = await warehouse.save();

    return res.status(200).json({
      success: true,
      message: "Warehouse updated successfully",
      warehouse: updatedWarehouse,
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
      message: "Server error while updating warehouse",
    });
  }
};

const deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await getWarehouseOr404(req.params.id, res);

    if (!warehouse) {
      return null;
    }

    await warehouse.deleteOne();

    return res.status(200).json({
      success: true,
      message: "Warehouse deleted successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error while deleting warehouse",
    });
  }
};

module.exports = {
  createWarehouse,
  getAllWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
};
