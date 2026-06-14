const express = require("express");
const {
  createVendor,
  getAllVendors,
  getVendorById,
  updateVendor,
  deleteVendor,
} = require("../controllers/vendorController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .post(authorize("admin"), createVendor)
  .get(getAllVendors);

router
  .route("/:id")
  .get(getVendorById)
  .put(authorize("admin"), updateVendor)
  .delete(authorize("admin"), deleteVendor);

module.exports = router;
