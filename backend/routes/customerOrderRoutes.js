const express = require("express");
const {
  createCustomerOrder,
  getAllCustomerOrders,
  getCustomerOrderById,
  updateCustomerOrder,
  deleteCustomerOrder,
  updateCustomerOrderStatus,
} = require("../controllers/customerOrderController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorize("admin", "warehouse_manager"));

router
  .route("/")
  .post(createCustomerOrder)
  .get(getAllCustomerOrders);

router.patch("/:id/status", updateCustomerOrderStatus);

router
  .route("/:id")
  .get(getCustomerOrderById)
  .put(updateCustomerOrder)
  .delete(deleteCustomerOrder);

module.exports = router;
