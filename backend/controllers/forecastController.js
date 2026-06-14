const getDemandForecast = async (req, res) => {
  return res.status(200).json({
    success: true,
    generatedAt: new Date().toISOString(),
    forecast: {
      demandPrediction: {
        productName: "Industrial Sensor Kit",
        sku: "SENSOR-100",
        predictedDemand: 420,
        period: "Next 30 days",
        confidence: 86,
        trend: "Increasing",
      },
      restockRecommendations: [
        {
          productName: "Industrial Sensor Kit",
          sku: "SENSOR-100",
          currentStock: 96,
          recommendedOrderQuantity: 350,
          priority: "High",
          reason: "Projected demand exceeds available safety stock.",
        },
        {
          productName: "RFID Pallet Tag",
          sku: "RFID-240",
          currentStock: 140,
          recommendedOrderQuantity: 180,
          priority: "Medium",
          reason: "Expected demand is trending above the reorder point.",
        },
      ],
    },
  });
};

module.exports = {
  getDemandForecast,
};
