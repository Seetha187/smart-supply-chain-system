import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "../components/ResourceManager.css";

const statuses = [
  "Pending",
  "Packed",
  "Shipped",
  "In Transit",
  "Out For Delivery",
  "Delivered",
];

const getId = (record) => record?._id || record?.id;

const formatCurrency = (value) => {
  const numberValue = Number(value || 0);
  return `$${numberValue.toFixed(2)}`;
};

const formatDate = (value) => {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
};

const toDateInputValue = (value) => {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
};

const getOrderLabel = (order) => {
  if (!order) {
    return "Customer order";
  }

  return `${order.customerName || "Customer"} - ${formatCurrency(order.totalAmount)}`;
};

function Deliveries() {
  const [deliveries, setDeliveries] = useState([]);
  const [customerOrders, setCustomerOrders] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [locationTarget, setLocationTarget] = useState(null);
  const [nextLocation, setNextLocation] = useState("");
  const [draft, setDraft] = useState({
    trackingNumber: "",
    customerOrderId: "",
    deliveryAgent: "",
    currentLocation: "",
    estimatedDeliveryDate: "",
    status: "Pending",
  });

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const [deliveriesResponse, customerOrdersResponse] = await Promise.all([
        API.get("/deliveries"),
        API.get("/customer-orders"),
      ]);

      setDeliveries(deliveriesResponse.data.deliveries || []);
      setCustomerOrders(customerOrdersResponse.data.customerOrders || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Unable to load delivery records."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const filteredDeliveries = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return deliveries;
    }

    return deliveries.filter((delivery) => {
      const searchable = [
        delivery.trackingNumber,
        delivery.deliveryAgent,
        delivery.currentLocation,
        delivery.status,
        delivery.customerOrderId?.customerName,
        delivery.customerOrderId?.customerEmail,
      ];

      return searchable.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });
  }, [deliveries, searchTerm]);

  const openCreateModal = () => {
    setActionError("");
    setSelectedDelivery(null);
    setDraft({
      trackingNumber: "",
      customerOrderId: "",
      deliveryAgent: "",
      currentLocation: "",
      estimatedDeliveryDate: "",
      status: "Pending",
    });
    setModalMode("create");
  };

  const openEditModal = (delivery) => {
    setActionError("");
    setSelectedDelivery(delivery);
    setDraft({
      trackingNumber: delivery.trackingNumber || "",
      customerOrderId: getId(delivery.customerOrderId) || "",
      deliveryAgent: delivery.deliveryAgent || "",
      currentLocation: delivery.currentLocation || "",
      estimatedDeliveryDate: toDateInputValue(delivery.estimatedDeliveryDate),
      status: delivery.status || "Pending",
    });
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedDelivery(null);
    setActionError("");
  };

  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setActionError("");

    try {
      if (modalMode === "edit") {
        await API.put(`/deliveries/${getId(selectedDelivery)}`, draft);
      } else {
        await API.post("/deliveries", draft);
      }

      closeModal();
      await loadData();
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message || "Unable to save delivery."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (delivery, status) => {
    setIsSaving(true);
    setActionError("");

    try {
      await API.patch(`/deliveries/${getId(delivery)}/status`, { status });
      await loadData();
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          "Unable to update delivery status."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const openLocationModal = (delivery) => {
    setActionError("");
    setLocationTarget(delivery);
    setNextLocation(delivery.currentLocation || "");
  };

  const handleLocationUpdate = async (event) => {
    event.preventDefault();

    if (!locationTarget) {
      return;
    }

    setIsSaving(true);
    setActionError("");

    try {
      await API.put(`/deliveries/${getId(locationTarget)}`, {
        currentLocation: nextLocation,
      });
      setLocationTarget(null);
      setNextLocation("");
      await loadData();
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          "Unable to update delivery location."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setIsSaving(true);
    setActionError("");

    try {
      await API.delete(`/deliveries/${getId(deleteTarget)}`);
      setDeleteTarget(null);
      await loadData();
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message || "Unable to delete delivery."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderTimeline = (status) => {
    const currentIndex = statuses.indexOf(status);

    return (
      <div className="delivery-timeline" aria-label={`Delivery timeline ${status}`}>
        {statuses.map((step, index) => (
          <span
            className={`delivery-timeline__step ${
              index <= currentIndex ? "delivery-timeline__step--active" : ""
            }`}
            key={step}
            title={step}
          />
        ))}
      </div>
    );
  };

  return (
    <section className="resource-page">
      <div className="resource-page__header">
        <div>
          <p className="resource-page__eyebrow">Logistics</p>
          <h2>Deliveries</h2>
          <p>
            Create delivery assignments, track shipment status, update current
            location, and monitor fulfillment progress.
          </p>
        </div>
        <button className="button button--primary" type="button" onClick={openCreateModal}>
          Create Delivery
        </button>
      </div>

      <div className="resource-toolbar">
        <label className="resource-search">
          <span>Search</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search deliveries"
          />
        </label>
        <p>
          Showing {filteredDeliveries.length} of {deliveries.length}
        </p>
      </div>

      {error && <div className="resource-alert" role="alert">{error}</div>}
      {actionError && <div className="resource-alert" role="alert">{actionError}</div>}

      <div className="resource-table-card">
        {isLoading ? (
          <div className="resource-state">Loading deliveries...</div>
        ) : filteredDeliveries.length === 0 ? (
          <div className="resource-state">No deliveries match the current filters.</div>
        ) : (
          <div className="resource-table-wrap">
            <table className="resource-table deliveries-table">
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th>Customer Order</th>
                  <th>Agent</th>
                  <th>Location</th>
                  <th>ETA</th>
                  <th>Status</th>
                  <th>Timeline</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((delivery) => (
                  <tr key={getId(delivery)}>
                    <td data-label="Tracking">{delivery.trackingNumber}</td>
                    <td data-label="Customer Order">
                      {getOrderLabel(delivery.customerOrderId)}
                    </td>
                    <td data-label="Agent">{delivery.deliveryAgent}</td>
                    <td data-label="Location">{delivery.currentLocation}</td>
                    <td data-label="ETA">{formatDate(delivery.estimatedDeliveryDate)}</td>
                    <td data-label="Status">
                      <select
                        className="status-select"
                        value={delivery.status}
                        onChange={(event) => handleStatusChange(delivery, event.target.value)}
                        disabled={isSaving}
                        aria-label="Update delivery status"
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Timeline">{renderTimeline(delivery.status)}</td>
                    <td data-label="Actions">
                      <div className="resource-actions">
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => openLocationModal(delivery)}
                        >
                          Location
                        </button>
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => openEditModal(delivery)}
                        >
                          Edit
                        </button>
                        <button
                          className="button button--danger"
                          type="button"
                          onClick={() => setDeleteTarget(delivery)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalMode && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="delivery-modal-title">
            <div className="modal-panel__header">
              <h3 id="delivery-modal-title">
                {modalMode === "edit" ? "Edit Delivery" : "Create Delivery"}
              </h3>
              <button className="icon-button" type="button" onClick={closeModal} aria-label="Close modal">
                X
              </button>
            </div>

            <form className="resource-form" onSubmit={handleSubmit}>
              <label className="resource-field">
                <span>Tracking Number *</span>
                <input
                  value={draft.trackingNumber}
                  onChange={(event) => updateDraft("trackingNumber", event.target.value)}
                  placeholder="TRK-1001"
                  required
                />
              </label>
              <label className="resource-field">
                <span>Status</span>
                <select
                  value={draft.status}
                  onChange={(event) => updateDraft("status", event.target.value)}
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="resource-field">
                <span>Customer Order *</span>
                <select
                  value={draft.customerOrderId}
                  onChange={(event) => updateDraft("customerOrderId", event.target.value)}
                  required
                >
                  <option value="">Select customer order</option>
                  {customerOrders.map((order) => (
                    <option key={getId(order)} value={getId(order)}>
                      {getOrderLabel(order)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="resource-field">
                <span>Delivery Agent *</span>
                <input
                  value={draft.deliveryAgent}
                  onChange={(event) => updateDraft("deliveryAgent", event.target.value)}
                  placeholder="Dispatch partner"
                  required
                />
              </label>
              <label className="resource-field">
                <span>Current Location *</span>
                <input
                  value={draft.currentLocation}
                  onChange={(event) => updateDraft("currentLocation", event.target.value)}
                  placeholder="Sorting center"
                  required
                />
              </label>
              <label className="resource-field">
                <span>Estimated Delivery Date *</span>
                <input
                  type="date"
                  value={draft.estimatedDeliveryDate}
                  onChange={(event) => updateDraft("estimatedDeliveryDate", event.target.value)}
                  required
                />
              </label>

              <div className="modal-panel__actions">
                <button className="button button--ghost" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button className="button button--primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {locationTarget && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel modal-panel--confirm" role="dialog" aria-modal="true" aria-labelledby="location-modal-title">
            <div className="modal-panel__header">
              <h3 id="location-modal-title">Update Location</h3>
              <button className="icon-button" type="button" onClick={() => setLocationTarget(null)} aria-label="Close dialog">
                X
              </button>
            </div>
            <form className="location-form" onSubmit={handleLocationUpdate}>
              <label className="resource-field">
                <span>Current Location *</span>
                <input
                  value={nextLocation}
                  onChange={(event) => setNextLocation(event.target.value)}
                  required
                />
              </label>
              <div className="modal-panel__actions">
                <button className="button button--ghost" type="button" onClick={() => setLocationTarget(null)}>
                  Cancel
                </button>
                <button className="button button--primary" type="submit" disabled={isSaving}>
                  {isSaving ? "Updating..." : "Update"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel modal-panel--confirm" role="dialog" aria-modal="true" aria-labelledby="delete-delivery-title">
            <div className="modal-panel__header">
              <h3 id="delete-delivery-title">Delete Delivery</h3>
              <button className="icon-button" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close dialog">
                X
              </button>
            </div>
            <p>This action will permanently remove this delivery.</p>
            <div className="modal-panel__actions">
              <button className="button button--ghost" type="button" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button className="button button--danger" type="button" onClick={handleDelete} disabled={isSaving}>
                {isSaving ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default Deliveries;
