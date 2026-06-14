import OrderManager from "../components/OrderManager";

const statuses = [
  "Pending",
  "Confirmed",
  "Packed",
  "Shipped",
  "Delivered",
  "Cancelled",
];

function CustomerOrders() {
  return (
    <OrderManager
      title="Customer Orders"
      description="Create demand orders, validate inventory before fulfillment, and keep customer status current."
      entityLabel="Customer Order"
      endpoint="/customer-orders"
      collectionKey="customerOrders"
      statuses={statuses}
      type="customer"
    />
  );
}

export default CustomerOrders;
