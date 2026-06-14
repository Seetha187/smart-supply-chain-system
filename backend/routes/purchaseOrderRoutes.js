const express = require("express");
const {
  createPurchaseOrder,
  getAllPurchaseOrders,
  getPurchaseOrderById,
  updatePurchaseOrder,
  deletePurchaseOrder,
  updatePurchaseOrderStatus,
} = require("../controllers/purchaseOrderController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorize("admin", "warehouse_manager"));

router
  .route("/")
  .post(createPurchaseOrder)
  .get(getAllPurchaseOrders);

router.patch("/:id/status", updatePurchaseOrderStatus);

router
  .route("/:id")
  .get(getPurchaseOrderById)
  .put(updatePurchaseOrder)
  .delete(deletePurchaseOrder);

module.exports = router;
