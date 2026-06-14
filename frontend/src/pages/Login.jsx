import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import API from "../services/api";
import { useAuth } from "../context/authContext";
import "./Login.css";

function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await API.post("/auth/login", {
        email,
        password,
      });

      login(response.data.token, response.data.user);
      navigate("/dashboard", { replace: true });
    } catch (error) {
      setError(
        error.response?.data?.message || "Unable to sign in. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <main className="login-page">
      <section className="login-hero" aria-label="Platform overview">
        <div className="login-hero__content">
          <div className="login-brand-mark" aria-hidden="true">
            <span className="login-brand-mark__node login-brand-mark__node--green" />
            <span className="login-brand-mark__node login-brand-mark__node--yellow" />
            <span className="login-brand-mark__node login-brand-mark__node--red" />
          </div>

          <div>
            <p className="login-eyebrow">Enterprise Operations Suite</p>
            <h1>Smart Supply Chain Management System</h1>
            <p className="login-subtitle">
              AI Powered Inventory, Warehouse and Logistics Platform
            </p>
          </div>

          <div className="logistics-graphic" aria-hidden="true">
            <div className="route-map">
              <span className="route-dot route-dot--warehouse" />
              <span className="route-dot route-dot--hub" />
              <span className="route-dot route-dot--delivery" />
              <span className="route-line route-line--one" />
              <span className="route-line route-line--two" />
            </div>
            <div className="warehouse-icon">
              <span />
              <span />
              <span />
            </div>
            <div className="truck-icon">
              <span className="truck-cab" />
              <span className="truck-body" />
              <span className="truck-wheel truck-wheel--one" />
              <span className="truck-wheel truck-wheel--two" />
            </div>
            <div className="inventory-stack">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Login form">
        <div className="login-card">
          <div className="login-card__header">
            <p className="login-card__eyebrow">Secure Access</p>
            <h2>Sign in to your workspace</h2>
            <p>Use your authorized supply chain account credentials.</p>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-field">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Enter your password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            <div className="login-error" role="alert" aria-live="polite">
              {error}
            </div>

            <button className="login-button" type="submit" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default Login;
