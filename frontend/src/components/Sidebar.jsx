import { NavLink } from "react-router-dom";

const navItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Products", path: "/products" },
  { label: "Warehouses", path: "/warehouses" },
  { label: "Vendors", path: "/vendors" },
  { label: "Purchase Orders", path: "/purchase-orders" },
  { label: "Customer Orders", path: "/customer-orders" },
  { label: "Deliveries", path: "/deliveries" },
  { label: "Demand Forecasting", path: "/forecast" },
];

function Sidebar() {
  return (
    <aside className="sidebar">
      <nav className="sidebar__nav">
        <ul>
          {navItems.map((item) => (
            <li key={item.path}>
              <NavLink to={item.path}>{item.label}</NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
}

export default Sidebar;
