const Delivery = require("../models/Delivery");
const Product = require("../models/Product");
const Vendor = require("../models/Vendor");

const LOW_STOCK_SORT = { quantity: 1, productName: 1 };

const getLowStockProducts = () => {
  return Product.find({
    $expr: {
      $lte: ["$quantity", "$minimumStock"],
    },
  }).sort(LOW_STOCK_SORT);
};

const getSuggestedVendor = async () => {
  return Vendor.findOne().sort({ rating: -1, vendorName: 1 });
};

const buildRestockRecommendations = async () => {
  const [products, suggestedVendor] = await Promise.all([
    getLowStockProducts(),
    getSuggestedVendor(),
  ]);

  return products.map((product) => {
    const currentStock = Number(product.quantity || 0);
    const minimumStock = Number(product.minimumStock || 0);
    const targetStock = minimumStock > 0 ? minimumStock * 2 : 1;
    const recommendedRestockQuantity = Math.max(targetStock - currentStock, 1);

    return {
      productId: product._id,
      productName: product.productName,
      sku: product.sku,
      currentStock,
      minimumStock,
      recommendedRestockQuantity,
      suggestedVendor: suggestedVendor
        ? {
            _id: suggestedVendor._id,
            vendorName: suggestedVendor.vendorName,
            email: suggestedVendor.email,
            phone: suggestedVendor.phone,
            rating: suggestedVendor.rating,
          }
        : null,
    };
  });
};

const generateTrackingNumber = async () => {
  let trackingNumber;
  let existingDelivery;

  do {
    const suffix = Math.random().toString(36).slice(2, 7).toUpperCase();
    trackingNumber = `TRK-${Date.now()}-${suffix}`;
    existingDelivery = await Delivery.findOne({ trackingNumber });
  } while (existingDelivery);

  return trackingNumber;
};

const buildDefaultEstimatedDeliveryDate = () => {
  const estimatedDeliveryDate = new Date();
  estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 7);
  return estimatedDeliveryDate;
};

const createDeliveryForConfirmedOrder = async (customerOrder, userId) => {
  const existingDelivery = await Delivery.findOne({
    customerOrderId: customerOrder._id,
  });

  if (existingDelivery) {
    return existingDelivery;
  }

  const trackingNumber = await generateTrackingNumber();

  return Delivery.create({
    trackingNumber,
    customerOrderId: customerOrder._id,
    deliveryAgent: "Unassigned",
    currentLocation: "Warehouse",
    estimatedDeliveryDate: buildDefaultEstimatedDeliveryDate(),
    status: "Pending",
    autoCreated: true,
    createdBy: userId || customerOrder.createdBy,
  });
};

module.exports = {
  buildRestockRecommendations,
  createDeliveryForConfirmedOrder,
  getLowStockProducts,
};
