const express = require("express");
const multer = require("multer");
const {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getRestockRecommendations,
  importProducts,
} = require("../controllers/productController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
  },
});

router.use(protect);

router
  .route("/")
  .post(authorize("admin", "warehouse_manager"), createProduct)
  .get(getAllProducts);

router.get("/low-stock", getLowStockProducts);
router.get("/recommendations", getRestockRecommendations);
router.post(
  "/import",
  authorize("admin", "warehouse_manager"),
  upload.single("file"),
  importProducts
);

router
  .route("/:id")
  .get(getProductById)
  .put(authorize("admin", "warehouse_manager"), updateProduct)
  .delete(authorize("admin", "warehouse_manager"), deleteProduct);

module.exports = router;
