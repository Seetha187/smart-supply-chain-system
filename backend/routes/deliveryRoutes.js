const express = require("express");
const {
  createDelivery,
  getAllDeliveries,
  getDeliveryById,
  updateDelivery,
  deleteDelivery,
  updateDeliveryStatus,
} = require("../controllers/deliveryController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorize("admin", "warehouse_manager"));

router
  .route("/")
  .post(createDelivery)
  .get(getAllDeliveries);

router.patch("/:id/status", updateDeliveryStatus);

router
  .route("/:id")
  .get(getDeliveryById)
  .put(updateDelivery)
  .delete(deleteDelivery);

module.exports = router;
