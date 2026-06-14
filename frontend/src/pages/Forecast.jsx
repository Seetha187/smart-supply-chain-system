import { useEffect, useState } from "react";
import API from "../services/api";
import "../components/ResourceManager.css";
import "./Forecast.css";

const initialForecast = {
  demandPrediction: null,
  restockRecommendations: [],
};

function Forecast() {
  const [forecast, setForecast] = useState(initialForecast);
  const [generatedAt, setGeneratedAt] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchForecast = async () => {
      setIsLoading(true);
      setError("");

      try {
        const response = await API.get("/forecast");
        setForecast(response.data.forecast || initialForecast);
        setGeneratedAt(response.data.generatedAt || "");
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Unable to load demand forecast."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchForecast();
  }, []);

  const demandPrediction = forecast.demandPrediction;

  return (
    <section className="resource-page">
      <div className="resource-page__header">
        <div>
          <p className="resource-page__eyebrow">Forecasting</p>
          <h2>Demand Forecasting</h2>
          <p>
            Review mock demand predictions and restock recommendations while
            the forecasting model integration is prepared.
          </p>
        </div>
      </div>

      {error && <div className="resource-alert" role="alert">{error}</div>}

      {isLoading ? (
        <div className="resource-table-card">
          <div className="resource-state">Loading demand forecast...</div>
        </div>
      ) : (
        <div className="forecast-grid">
          <article className="forecast-card">
            <div className="forecast-card__header">
              <div>
                <p>Demand Prediction</p>
                <h3>{demandPrediction?.productName || "No prediction"}</h3>
              </div>
              <span className="forecast-badge">{demandPrediction?.trend || "-"}</span>
            </div>

            <div className="forecast-metric">
              <span>Predicted Demand</span>
              <strong>{demandPrediction?.predictedDemand ?? "-"}</strong>
            </div>

            <dl className="forecast-details">
              <div>
                <dt>SKU</dt>
                <dd>{demandPrediction?.sku || "-"}</dd>
              </div>
              <div>
                <dt>Period</dt>
                <dd>{demandPrediction?.period || "-"}</dd>
              </div>
              <div>
                <dt>Confidence</dt>
                <dd>{demandPrediction?.confidence ?? "-"}%</dd>
              </div>
            </dl>
          </article>

          <article className="forecast-card">
            <div className="forecast-card__header">
              <div>
                <p>Restock Recommendation</p>
                <h3>Priority Replenishment</h3>
              </div>
              <span className="forecast-badge forecast-badge--neutral">
                Mock Data
              </span>
            </div>

            <div className="recommendation-list">
              {forecast.restockRecommendations.map((item) => (
                <div className="recommendation-item" key={item.sku}>
                  <div>
                    <h4>{item.productName}</h4>
                    <p>{item.reason}</p>
                  </div>
                  <div className="recommendation-item__meta">
                    <span>{item.priority}</span>
                    <strong>{item.recommendedOrderQuantity}</strong>
                  </div>
                  <dl>
                    <div>
                      <dt>SKU</dt>
                      <dd>{item.sku}</dd>
                    </div>
                    <div>
                      <dt>Current Stock</dt>
                      <dd>{item.currentStock}</dd>
                    </div>
                  </dl>
                </div>
              ))}
            </div>
          </article>
        </div>
      )}

      {generatedAt && (
        <p className="forecast-updated">
          Last generated {new Date(generatedAt).toLocaleString()}
        </p>
      )}
    </section>
  );
}

export default Forecast;
