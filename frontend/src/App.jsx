import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar";
import ProtectedRoute from "./components/ProtectedRoute";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Warehouses from "./pages/Warehouses";
import Vendors from "./pages/Vendors";
import PurchaseOrders from "./pages/PurchaseOrders";
import CustomerOrders from "./pages/CustomerOrders";
import Deliveries from "./pages/Deliveries";
import Forecast from "./pages/Forecast";

function AppLayout() {
  return (
    <div className="app-shell">
      <Navbar />
      <div className="app-body">
        <Sidebar />
        <main className="app-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/products" element={<Products />} />
            <Route path="/warehouses" element={<Warehouses />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/customer-orders" element={<CustomerOrders />} />
            <Route path="/deliveries" element={<Deliveries />} />
            <Route path="/forecast" element={<Forecast />} />
          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
