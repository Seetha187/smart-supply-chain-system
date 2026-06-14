import OrderManager from "../components/OrderManager";

const statuses = ["Pending", "Approved", "Shipped", "Delivered", "Cancelled"];

function PurchaseOrders() {
  return (
    <OrderManager
      title="Purchase Orders"
      description="Create supplier purchase orders, select vendors and products, and update receiving status."
      entityLabel="Purchase Order"
      endpoint="/purchase-orders"
      collectionKey="purchaseOrders"
      statuses={statuses}
      type="purchase"
    />
  );
}

export default PurchaseOrders;
