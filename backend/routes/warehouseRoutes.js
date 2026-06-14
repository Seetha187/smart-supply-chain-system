const express = require("express");
const {
  createWarehouse,
  getAllWarehouses,
  getWarehouseById,
  updateWarehouse,
  deleteWarehouse,
} = require("../controllers/warehouseController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);

router
  .route("/")
  .post(authorize("admin", "warehouse_manager"), createWarehouse)
  .get(getAllWarehouses);

router
  .route("/:id")
  .get(getWarehouseById)
  .put(authorize("admin", "warehouse_manager"), updateWarehouse)
  .delete(authorize("admin", "warehouse_manager"), deleteWarehouse);

module.exports = router;
