import { useEffect, useMemo, useState } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { useNavigate } from "react-router-dom";
import DashboardCard from "../components/DashboardCard";
import { useAuth } from "../context/authContext";
import API from "../services/api";
import "./Dashboard.css";

ChartJS.register(
  ArcElement,
  BarElement,
  CategoryScale,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip
);

const initialSummary = {
  products: 0,
  warehouses: 0,
  vendors: 0,
  purchaseOrders: 0,
  customerOrders: 0,
  lowStock: 0,
};

const themeColors = {
  green: "#16a34a",
  yellow: "#facc15",
  red: "#ef4444",
  slate: "#64748b",
  gray: "#e2e8f0",
};

const statusColors = {
  Pending: themeColors.yellow,
  Approved: themeColors.green,
  Confirmed: themeColors.green,
  Packed: themeColors.yellow,
  Shipped: "#22c55e",
  Delivered: themeColors.green,
  Cancelled: themeColors.red,
};

const Icon = ({ name }) => {
  const paths = {
    product: (
      <>
        <path d="M5 7.4 12 3l7 4.4-7 4.4-7-4.4Z" />
        <path d="M5 7.4v8.1l7 4.5 7-4.5V7.4" />
        <path d="M12 11.8V20" />
      </>
    ),
    warehouse: (
      <>
        <path d="M4 10.2 12 4l8 6.2" />
        <path d="M6 9v10h12V9" />
        <path d="M9 19v-5h6v5" />
        <path d="M8.5 11.5h7" />
      </>
    ),
    vendor: (
      <>
        <path d="M7 19v-2.2A4.8 4.8 0 0 1 11.8 12h.4A4.8 4.8 0 0 1 17 16.8V19" />
        <path d="M8.8 7.4a3.2 3.2 0 1 0 6.4 0 3.2 3.2 0 0 0-6.4 0Z" />
        <path d="M17 10h3" />
        <path d="M18.5 8.5v3" />
      </>
    ),
    order: (
      <>
        <path d="M7 4h10v16H7z" />
        <path d="M10 8h4" />
        <path d="M10 12h4" />
        <path d="M10 16h3" />
        <path d="M5 7h2" />
        <path d="M5 17h2" />
      </>
    ),
    cart: (
      <>
        <path d="M5 5h2l1.4 8h8.7l1.2-5.6H8" />
        <path d="M10 18a1 1 0 1 0 0 .1" />
        <path d="M17 18a1 1 0 1 0 0 .1" />
      </>
    ),
    delivery: (
      <>
        <path d="M4 6h10v9H4z" />
        <path d="M14 9h3l3 3v3h-6" />
        <path d="M7 18a1.6 1.6 0 1 0 0 .1" />
        <path d="M17 18a1.6 1.6 0 1 0 0 .1" />
      </>
    ),
    alert: (
      <>
        <path d="M12 4 3.5 19h17L12 4Z" />
        <path d="M12 9v4" />
        <path d="M12 16h.01" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden="true"
      className="dashboard-icon"
      fill="none"
      viewBox="0 0 24 24"
    >
      <g
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      >
        {paths[name]}
      </g>
    </svg>
  );
};

const getRecords = (response, collectionKey) => response.data[collectionKey] || [];

const getCount = (response, collectionKey) => {
  return response.data.count ?? getRecords(response, collectionKey).length;
};

const formatDateTime = (date) =>
  new Intl.DateTimeFormat("en", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

const getRecentMonthLabels = () => {
  const formatter = new Intl.DateTimeFormat("en", {
    month: "short",
    year: "numeric",
  });

  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date();
    date.setDate(1);
    date.setMonth(date.getMonth() - (5 - index));

    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: formatter.format(date),
    };
  });
};

function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState(initialSummary);
  const [products, setProducts] = useState([]);
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [autoCreatedDeliveries, setAutoCreatedDeliveries] = useState([]);
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const fetchDashboardData = async () => {
      setIsLoading(true);
      setError("");

      try {
        const [
          productsResponse,
          warehousesResponse,
          vendorsResponse,
          purchaseOrdersResponse,
          customerOrdersResponse,
          lowStockResponse,
          recommendationsResponse,
          deliveriesResponse,
        ] = await Promise.all([
          API.get("/products"),
          API.get("/warehouses"),
          API.get("/vendors"),
          API.get("/purchase-orders"),
          API.get("/customer-orders"),
          API.get("/products/low-stock"),
          API.get("/products/recommendations"),
          API.get("/deliveries"),
        ]);

        const lowStockRecords = lowStockResponse.data.products || [];
        const deliveries = getRecords(deliveriesResponse, "deliveries");

        setSummary({
          products: getCount(productsResponse, "products"),
          warehouses: getCount(warehousesResponse, "warehouses"),
          vendors: getCount(vendorsResponse, "vendors"),
          purchaseOrders: getCount(purchaseOrdersResponse, "purchaseOrders"),
          customerOrders: getCount(customerOrdersResponse, "customerOrders"),
          lowStock: getCount(lowStockResponse, "products"),
        });

        setProducts(getRecords(productsResponse, "products"));
        setPurchaseOrders(getRecords(purchaseOrdersResponse, "purchaseOrders"));
        setCustomerOrders(getRecords(customerOrdersResponse, "customerOrders"));
        setLowStockProducts(lowStockRecords);
        setRecommendations(recommendationsResponse.data.recommendations || []);
        setAutoCreatedDeliveries(
          deliveries.filter((delivery) => delivery.autoCreated).slice(0, 5)
        );
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load dashboard data. Please try again."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const totalOrders = summary.purchaseOrders + summary.customerOrders;
  const userName = user?.name || user?.email?.split("@")[0] || "Team";

  const dashboardCards = [
    {
      icon: <Icon name="product" />,
      status: "Inventory tracked",
      title: "Total Products",
      value: summary.products,
    },
    {
      icon: <Icon name="warehouse" />,
      status: "Storage network",
      title: "Total Warehouses",
      value: summary.warehouses,
    },
    {
      icon: <Icon name="vendor" />,
      status: "Supply partners",
      title: "Total Vendors",
      value: summary.vendors,
    },
    {
      icon: <Icon name="order" />,
      status: `${summary.purchaseOrders} PO / ${summary.customerOrders} CO`,
      title: "Total Orders",
      value: totalOrders,
    },
    {
      icon: <Icon name="alert" />,
      status: "Needs restock",
      title: "Low Stock Items",
      value: summary.lowStock,
    },
  ];

  const categoryChartData = useMemo(() => {
    const categoryTotals = products.reduce((totals, product) => {
      const category = product.category || "General";
      totals[category] = (totals[category] || 0) + Number(product.quantity || 0);
      return totals;
    }, {});

    const entries = Object.entries(categoryTotals);

    return {
      labels: entries.length ? entries.map(([category]) => category) : ["No inventory"],
      datasets: [
        {
          label: "Units in stock",
          data: entries.length ? entries.map(([, quantity]) => quantity) : [0],
          backgroundColor: [
            themeColors.green,
            themeColors.yellow,
            themeColors.red,
            "#86efac",
            "#fde68a",
            "#fca5a5",
          ],
          borderRadius: 6,
          borderSkipped: false,
        },
      ],
    };
  }, [products]);

  const orderStatusChartData = useMemo(() => {
    const statusTotals = [...purchaseOrders, ...customerOrders].reduce(
      (totals, order) => {
        const status = order.status || "Pending";
        totals[status] = (totals[status] || 0) + 1;
        return totals;
      },
      {}
    );

    const entries = Object.entries(statusTotals);

    return {
      labels: entries.length ? entries.map(([status]) => status) : ["No orders"],
      datasets: [
        {
          data: entries.length ? entries.map(([, count]) => count) : [1],
          backgroundColor: entries.length
            ? entries.map(([status]) => statusColors[status] || themeColors.slate)
            : [themeColors.gray],
          borderColor: "#ffffff",
          borderWidth: 3,
          hoverOffset: 8,
        },
      ],
    };
  }, [customerOrders, purchaseOrders]);

  const monthlyOrdersChartData = useMemo(() => {
    const months = getRecentMonthLabels();
    const totalsByMonth = months.reduce((totals, month) => {
      totals[month.key] = 0;
      return totals;
    }, {});

    [...purchaseOrders, ...customerOrders].forEach((order) => {
      if (!order.createdAt) {
        return;
      }

      const orderDate = new Date(order.createdAt);
      const key = `${orderDate.getFullYear()}-${String(
        orderDate.getMonth() + 1
      ).padStart(2, "0")}`;

      if (key in totalsByMonth) {
        totalsByMonth[key] += 1;
      }
    });

    return {
      labels: months.map((month) => month.label),
      datasets: [
        {
          label: "Orders",
          data: months.map((month) => totalsByMonth[month.key]),
          borderColor: themeColors.green,
          backgroundColor: "rgba(22, 163, 74, 0.14)",
          pointBackgroundColor: themeColors.green,
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 4,
          tension: 0.35,
          fill: true,
        },
      ],
    };
  }, [customerOrders, purchaseOrders]);

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#64748b",
        },
      },
      y: {
        beginAtZero: true,
        grid: {
          color: "#e2e8f0",
        },
        ticks: {
          color: "#64748b",
          precision: 0,
        },
      },
    },
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "68%",
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          color: "#334155",
          font: {
            weight: 700,
          },
        },
      },
    },
  };

  const lineChartOptions = {
    ...barChartOptions,
    scales: {
      ...barChartOptions.scales,
      x: {
        ...barChartOptions.scales.x,
        grid: {
          display: false,
        },
      },
    },
  };

  const quickActions = [
    { icon: "product", label: "Add Product", path: "/products" },
    { icon: "cart", label: "Create Purchase Order", path: "/purchase-orders" },
    { icon: "order", label: "Create Customer Order", path: "/customer-orders" },
    { icon: "delivery", label: "Create Delivery", path: "/deliveries" },
  ];

  const getAlertSeverity = (product) => {
    const currentStock = Number(product.quantity || 0);
    const minimumStock = Number(product.minimumStock || 0);

    if (currentStock === 0 || currentStock <= minimumStock * 0.5) {
      return "critical";
    }

    return "warning";
  };

  return (
    <section className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <p className="dashboard-header__eyebrow">ERP Command Center</p>
          <h2>Welcome back, {userName}</h2>
          <p>
            Monitor inventory, orders, suppliers, and fulfillment from one
            operational workspace.
          </p>
        </div>
        <div className="dashboard-header__time" aria-label="Current date and time">
          <span>Current Date and Time</span>
          <strong>{formatDateTime(currentTime)}</strong>
        </div>
      </div>

      {isLoading && (
        <div className="dashboard-state">Loading dashboard data...</div>
      )}
      {error && (
        <div className="resource-alert" role="alert">
          {error}
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="dashboard-kpis">
            {dashboardCards.map((card) => (
              <DashboardCard
                icon={card.icon}
                key={card.title}
                status={card.status}
                title={card.title}
                value={card.value}
              />
            ))}
          </div>

          <div className="dashboard-grid dashboard-grid--analytics">
            <section className="dashboard-panel">
              <div className="dashboard-panel__header">
                <div>
                  <p>Analytics</p>
                  <h3>Inventory by Category</h3>
                </div>
                <span className="dashboard-panel__badge">Units</span>
              </div>
              <div className="dashboard-chart">
                <Bar data={categoryChartData} options={barChartOptions} />
              </div>
            </section>

            <section className="dashboard-panel">
              <div className="dashboard-panel__header">
                <div>
                  <p>Orders</p>
                  <h3>Order Status Chart</h3>
                </div>
                <span className="dashboard-panel__badge dashboard-panel__badge--yellow">
                  Live
                </span>
              </div>
              <div className="dashboard-chart dashboard-chart--doughnut">
                <Doughnut
                  data={orderStatusChartData}
                  options={doughnutChartOptions}
                />
              </div>
            </section>
          </div>

          <div className="dashboard-grid dashboard-grid--insights">
            <section className="dashboard-panel">
              <div className="dashboard-panel__header">
                <div>
                  <p>Business Insights</p>
                  <h3>Monthly Orders Trend</h3>
                </div>
                <span className="dashboard-panel__badge">6 Months</span>
              </div>
              <div className="dashboard-chart">
                <Line data={monthlyOrdersChartData} options={lineChartOptions} />
              </div>
            </section>

            <section className="dashboard-panel dashboard-panel--alerts">
              <div className="dashboard-panel__header">
                <div>
                  <p>Business Insights</p>
                  <h3>Low Stock Alerts</h3>
                </div>
                <span className="dashboard-panel__badge dashboard-panel__badge--red">
                  {lowStockProducts.length} Alerts
                </span>
              </div>

              {lowStockProducts.length === 0 ? (
                <div className="dashboard-empty">
                  All products are above minimum stock.
                </div>
              ) : (
                <div className="dashboard-alert-list">
                  {lowStockProducts.map((product) => {
                    const severity = getAlertSeverity(product);

                    return (
                      <article className="stock-alert" key={product._id}>
                        <div>
                          <h4>{product.productName}</h4>
                          <p>{product.sku || product.category || "Inventory item"}</p>
                        </div>
                        <div className="stock-alert__numbers">
                          <span>
                            Current Stock
                            <strong>{product.quantity}</strong>
                          </span>
                          <span>
                            Minimum Stock
                            <strong>{product.minimumStock}</strong>
                          </span>
                        </div>
                        <span
                          className={`stock-alert__badge stock-alert__badge--${severity}`}
                        >
                          {severity === "critical" ? "Critical" : "Reorder"}
                        </span>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          <div className="dashboard-grid dashboard-grid--operations">
            <section className="dashboard-panel dashboard-panel--recommendations">
              <div className="dashboard-panel__header">
                <div>
                  <p>Automation</p>
                  <h3>Purchase Order Recommendations</h3>
                </div>
                <span className="dashboard-panel__badge">
                  {recommendations.length} Items
                </span>
              </div>

              {recommendations.length === 0 ? (
                <div className="dashboard-empty">
                  No restock recommendations right now.
                </div>
              ) : (
                <div className="recommendation-list">
                  {recommendations.map((recommendation) => (
                    <article
                      className="recommendation-item"
                      key={recommendation.productId}
                    >
                      <div>
                        <h4>{recommendation.productName}</h4>
                        <p>{recommendation.sku || "Inventory item"}</p>
                      </div>
                      <dl>
                        <div>
                          <dt>Current</dt>
                          <dd>{recommendation.currentStock}</dd>
                        </div>
                        <div>
                          <dt>Minimum</dt>
                          <dd>{recommendation.minimumStock}</dd>
                        </div>
                        <div>
                          <dt>Restock</dt>
                          <dd>{recommendation.recommendedRestockQuantity}</dd>
                        </div>
                      </dl>
                      <span className="recommendation-item__vendor">
                        {recommendation.suggestedVendor?.vendorName ||
                          "No vendor available"}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="dashboard-panel dashboard-panel--deliveries">
              <div className="dashboard-panel__header">
                <div>
                  <p>Automation</p>
                  <h3>Auto-Created Deliveries</h3>
                </div>
                <span className="dashboard-panel__badge dashboard-panel__badge--yellow">
                  {autoCreatedDeliveries.length} Recent
                </span>
              </div>

              {autoCreatedDeliveries.length === 0 ? (
                <div className="dashboard-empty">
                  No automated deliveries have been created yet.
                </div>
              ) : (
                <div className="auto-delivery-list">
                  {autoCreatedDeliveries.map((delivery) => (
                    <article className="auto-delivery" key={delivery._id}>
                      <div>
                        <h4>{delivery.trackingNumber}</h4>
                        <p>
                          {delivery.customerOrderId?.customerName ||
                            "Customer order"}
                        </p>
                      </div>
                      <span>{delivery.status}</span>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>

          <section className="quick-actions">
            <div>
              <p className="quick-actions__eyebrow">Quick Actions</p>
              <h3>Start common workflows</h3>
            </div>
            <div className="quick-actions__buttons">
              {quickActions.map((action) => (
                <button
                  className="quick-action"
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  type="button"
                >
                  <Icon name={action.icon} />
                  <span>{action.label}</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

export default Dashboard;
