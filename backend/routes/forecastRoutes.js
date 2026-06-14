const express = require("express");
const { getDemandForecast } = require("../controllers/forecastController");
const { protect, authorize } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(protect);
router.use(authorize("admin", "warehouse_manager"));

router.get("/", getDemandForecast);

module.exports = router;
