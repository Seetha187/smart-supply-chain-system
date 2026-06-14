import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "./ResourceManager.css";

const getId = (record) => record?._id || record?.id;

const formatCurrency = (value) => {
  const numberValue = Number(value || 0);
  return `$${numberValue.toFixed(2)}`;
};

const getProductId = (item) => {
  return typeof item.productId === "object" ? item.productId?._id : item.productId;
};

const getProductLabel = (item) => {
  if (typeof item.productId === "object") {
    return item.productId?.productName || item.productId?.sku || "Product";
  }

  return "Product";
};

const createEmptyItem = () => ({
  productId: "",
  quantity: 1,
  unitPrice: 0,
});

const normalizeItems = (items) =>
  items.map((item) => ({
    productId: getProductId(item) || "",
    quantity: item.quantity ?? 1,
    unitPrice: item.unitPrice ?? 0,
  }));

function OrderManager({
  title,
  description,
  entityLabel,
  endpoint,
  collectionKey,
  statuses,
  type,
}) {
  const [records, setRecords] = useState([]);
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [draft, setDraft] = useState({});
  const [items, setItems] = useState([createEmptyItem()]);

  const isPurchaseOrder = type === "purchase";

  const productLookup = useMemo(() => {
    return products.reduce((lookup, product) => {
      lookup[getId(product)] = product;
      return lookup;
    }, {});
  }, [products]);

  const vendorOptions = useMemo(
    () => vendors.map((vendor) => ({ value: getId(vendor), label: vendor.vendorName })),
    [vendors]
  );

  const warehouseOptions = useMemo(
    () =>
      warehouses.map((warehouse) => ({
        value: getId(warehouse),
        label: warehouse.warehouseName,
      })),
    [warehouses]
  );

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const requests = [API.get(endpoint), API.get("/products")];

      if (isPurchaseOrder) {
        requests.push(API.get("/vendors"), API.get("/warehouses"));
      }

      const [ordersResponse, productsResponse, vendorsResponse, warehousesResponse] =
        await Promise.all(requests);

      setRecords(ordersResponse.data[collectionKey] || []);
      setProducts(productsResponse.data.products || []);
      setVendors(vendorsResponse?.data?.vendors || []);
      setWarehouses(warehousesResponse?.data?.warehouses || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          `Unable to load ${entityLabel.toLowerCase()} records.`
      );
    } finally {
      setIsLoading(false);
    }
  }, [collectionKey, endpoint, entityLabel, isPurchaseOrder]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return records;
    }

    return records.filter((record) => {
      const searchable = [
        record.purchaseOrderNumber,
        record.customerName,
        record.customerEmail,
        record.vendorId?.vendorName,
        record.warehouseId?.warehouseName,
        record.status,
        ...(record.items || []).map((item) => getProductLabel(item)),
      ];

      return searchable.some((value) =>
        String(value || "").toLowerCase().includes(query)
      );
    });
  }, [records, searchTerm]);

  const previousItemQuantity = useCallback((productId) => {
    if (!selectedRecord || isPurchaseOrder) {
      return 0;
    }

    return (selectedRecord.items || []).reduce((total, item) => {
      return getProductId(item) === productId ? total + Number(item.quantity || 0) : total;
    }, 0);
  }, [isPurchaseOrder, selectedRecord]);

  const inventoryError = useMemo(() => {
    if (isPurchaseOrder) {
      return "";
    }

    const requested = items.reduce((map, item) => {
      if (!item.productId) {
        return map;
      }

      map[item.productId] = (map[item.productId] || 0) + Number(item.quantity || 0);
      return map;
    }, {});

    for (const [productId, quantity] of Object.entries(requested)) {
      const product = productLookup[productId];
      const availableQuantity = Number(product?.quantity || 0) + previousItemQuantity(productId);

      if (quantity > availableQuantity) {
        return `Insufficient stock for ${product?.productName || "selected product"}. Available: ${availableQuantity}.`;
      }
    }

    return "";
  }, [isPurchaseOrder, items, previousItemQuantity, productLookup]);

  const openCreateModal = () => {
    setActionError("");
    setSelectedRecord(null);
    setDraft(
      isPurchaseOrder
        ? {
            purchaseOrderNumber: "",
            vendorId: "",
            warehouseId: "",
            status: "Pending",
          }
        : {
            customerName: "",
            customerEmail: "",
            status: "Pending",
          }
    );
    setItems([createEmptyItem()]);
    setModalMode("create");
  };

  const openEditModal = (record) => {
    setActionError("");
    setSelectedRecord(record);
    setDraft(
      isPurchaseOrder
        ? {
            purchaseOrderNumber: record.purchaseOrderNumber || "",
            vendorId: getId(record.vendorId) || "",
            warehouseId: getId(record.warehouseId) || "",
            status: record.status || "Pending",
          }
        : {
            customerName: record.customerName || "",
            customerEmail: record.customerEmail || "",
            status: record.status || "Pending",
          }
    );
    setItems(normalizeItems(record.items || [createEmptyItem()]));
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedRecord(null);
    setDraft({});
    setItems([createEmptyItem()]);
    setActionError("");
  };

  const updateDraft = (field, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [field]: value,
    }));
  };

  const updateItem = (index, field, value) => {
    setItems((currentItems) =>
      currentItems.map((item, itemIndex) => {
        if (itemIndex !== index) {
          return item;
        }

        if (field === "productId") {
          return {
            ...item,
            productId: value,
            unitPrice: productLookup[value]?.unitPrice ?? item.unitPrice,
          };
        }

        return {
          ...item,
          [field]: field === "quantity" || field === "unitPrice" ? Number(value) : value,
        };
      })
    );
  };

  const addItem = () => {
    setItems((currentItems) => [...currentItems, createEmptyItem()]);
  };

  const removeItem = (index) => {
    setItems((currentItems) =>
      currentItems.length === 1
        ? currentItems
        : currentItems.filter((_, itemIndex) => itemIndex !== index)
    );
  };

  const buildPayload = () => ({
    ...draft,
    items: items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  });

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (inventoryError) {
      setActionError(inventoryError);
      return;
    }

    setIsSaving(true);
    setActionError("");

    try {
      const payload = buildPayload();

      if (modalMode === "edit") {
        await API.put(`${endpoint}/${getId(selectedRecord)}`, payload);
      } else {
        await API.post(endpoint, payload);
      }

      closeModal();
      await loadData();
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Unable to save ${entityLabel.toLowerCase()}.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusChange = async (record, status) => {
    setIsSaving(true);
    setActionError("");

    try {
      await API.patch(`${endpoint}/${getId(record)}/status`, { status });
      await loadData();
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Unable to update ${entityLabel.toLowerCase()} status.`
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
      await API.delete(`${endpoint}/${getId(deleteTarget)}`);
      setDeleteTarget(null);
      await loadData();
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Unable to delete ${entityLabel.toLowerCase()}.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const renderItems = (orderItems = []) => {
    if (orderItems.length === 0) {
      return "-";
    }

    return orderItems
      .map((item) => `${getProductLabel(item)} x ${item.quantity}`)
      .join(", ");
  };

  const totalAmount = items.reduce((total, item) => {
    return total + Number(item.quantity || 0) * Number(item.unitPrice || 0);
  }, 0);

  return (
    <section className="resource-page">
      <div className="resource-page__header">
        <div>
          <p className="resource-page__eyebrow">Operations</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <button className="button button--primary" type="button" onClick={openCreateModal}>
          Create {entityLabel}
        </button>
      </div>

      <div className="resource-toolbar">
        <label className="resource-search">
          <span>Search</span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={`Search ${title.toLowerCase()}`}
          />
        </label>
        <p>
          Showing {filteredRecords.length} of {records.length}
        </p>
      </div>

      {error && <div className="resource-alert" role="alert">{error}</div>}
      {actionError && <div className="resource-alert" role="alert">{actionError}</div>}

      <div className="resource-table-card">
        {isLoading ? (
          <div className="resource-state">Loading {title.toLowerCase()}...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="resource-state">No {title.toLowerCase()} match the current filters.</div>
        ) : (
          <div className="resource-table-wrap">
            <table className="resource-table operations-table">
              <thead>
                <tr>
                  <th>{isPurchaseOrder ? "PO Number" : "Customer"}</th>
                  <th>{isPurchaseOrder ? "Vendor" : "Email"}</th>
                  {isPurchaseOrder && <th>Warehouse</th>}
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={getId(record)}>
                    <td data-label={isPurchaseOrder ? "PO Number" : "Customer"}>
                      {isPurchaseOrder ? record.purchaseOrderNumber : record.customerName}
                    </td>
                    <td data-label={isPurchaseOrder ? "Vendor" : "Email"}>
                      {isPurchaseOrder ? record.vendorId?.vendorName || "-" : record.customerEmail}
                    </td>
                    {isPurchaseOrder && (
                      <td data-label="Warehouse">
                        {record.warehouseId?.warehouseName || "-"}
                      </td>
                    )}
                    <td data-label="Items">{renderItems(record.items)}</td>
                    <td data-label="Total">{formatCurrency(record.totalAmount)}</td>
                    <td data-label="Status">
                      <select
                        className="status-select"
                        value={record.status}
                        onChange={(event) => handleStatusChange(record, event.target.value)}
                        disabled={isSaving}
                        aria-label={`Update status for ${entityLabel}`}
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td data-label="Actions">
                      <div className="resource-actions">
                        <button
                          className="button button--ghost"
                          type="button"
                          onClick={() => openEditModal(record)}
                        >
                          Edit
                        </button>
                        <button
                          className="button button--danger"
                          type="button"
                          onClick={() => setDeleteTarget(record)}
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
          <div className="modal-panel modal-panel--wide" role="dialog" aria-modal="true" aria-labelledby="order-modal-title">
            <div className="modal-panel__header">
              <h3 id="order-modal-title">
                {modalMode === "edit" ? `Edit ${entityLabel}` : `Create ${entityLabel}`}
              </h3>
              <button className="icon-button" type="button" onClick={closeModal} aria-label="Close modal">
                X
              </button>
            </div>

            <form className="resource-form operations-form" onSubmit={handleSubmit}>
              {isPurchaseOrder ? (
                <>
                  <label className="resource-field">
                    <span>PO Number *</span>
                    <input
                      value={draft.purchaseOrderNumber || ""}
                      onChange={(event) => updateDraft("purchaseOrderNumber", event.target.value)}
                      placeholder="PO-1001"
                      required
                    />
                  </label>
                  <label className="resource-field">
                    <span>Status</span>
                    <select
                      value={draft.status || "Pending"}
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
                    <span>Vendor *</span>
                    <select
                      value={draft.vendorId || ""}
                      onChange={(event) => updateDraft("vendorId", event.target.value)}
                      required
                    >
                      <option value="">Select vendor</option>
                      {vendorOptions.map((vendor) => (
                        <option key={vendor.value} value={vendor.value}>
                          {vendor.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="resource-field">
                    <span>Warehouse *</span>
                    <select
                      value={draft.warehouseId || ""}
                      onChange={(event) => updateDraft("warehouseId", event.target.value)}
                      required
                    >
                      <option value="">Select warehouse</option>
                      {warehouseOptions.map((warehouse) => (
                        <option key={warehouse.value} value={warehouse.value}>
                          {warehouse.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <>
                  <label className="resource-field">
                    <span>Customer Name *</span>
                    <input
                      value={draft.customerName || ""}
                      onChange={(event) => updateDraft("customerName", event.target.value)}
                      placeholder="Acme Retail"
                      required
                    />
                  </label>
                  <label className="resource-field">
                    <span>Customer Email *</span>
                    <input
                      type="email"
                      value={draft.customerEmail || ""}
                      onChange={(event) => updateDraft("customerEmail", event.target.value)}
                      placeholder="orders@customer.com"
                      required
                    />
                  </label>
                  <label className="resource-field">
                    <span>Status</span>
                    <select
                      value={draft.status || "Pending"}
                      onChange={(event) => updateDraft("status", event.target.value)}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <div className="line-items-panel">
                <div className="line-items-panel__header">
                  <h4>Products</h4>
                  <button className="button button--ghost" type="button" onClick={addItem}>
                    Add Product
                  </button>
                </div>

                <div className="line-items">
                  {items.map((item, index) => {
                    const selectedProduct = productLookup[item.productId];
                    const availableQuantity =
                      Number(selectedProduct?.quantity || 0) +
                      previousItemQuantity(item.productId);

                    return (
                      <div className="line-item" key={`${item.productId}-${index}`}>
                        <label className="resource-field">
                          <span>Product *</span>
                          <select
                            value={item.productId}
                            onChange={(event) => updateItem(index, "productId", event.target.value)}
                            required
                          >
                            <option value="">Select product</option>
                            {products.map((product) => (
                              <option key={getId(product)} value={getId(product)}>
                                {product.productName} ({product.sku})
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="resource-field">
                          <span>Quantity *</span>
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(event) => updateItem(index, "quantity", event.target.value)}
                            required
                          />
                        </label>
                        <label className="resource-field">
                          <span>Unit Price *</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unitPrice}
                            onChange={(event) => updateItem(index, "unitPrice", event.target.value)}
                            required
                          />
                        </label>
                        <div className="line-item__meta">
                          {!isPurchaseOrder && selectedProduct && (
                            <span>Available: {availableQuantity}</span>
                          )}
                          <button
                            className="button button--danger"
                            type="button"
                            onClick={() => removeItem(index)}
                            disabled={items.length === 1}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isPurchaseOrder && inventoryError && (
                  <div className="resource-alert" role="alert">
                    {inventoryError}
                  </div>
                )}

                <div className="order-total">
                  <span>Calculated Total</span>
                  <strong>{formatCurrency(totalAmount)}</strong>
                </div>
              </div>

              <div className="modal-panel__actions">
                <button className="button button--ghost" type="button" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="button button--primary"
                  type="submit"
                  disabled={isSaving || Boolean(inventoryError)}
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel modal-panel--confirm" role="dialog" aria-modal="true" aria-labelledby="delete-order-title">
            <div className="modal-panel__header">
              <h3 id="delete-order-title">Delete {entityLabel}</h3>
              <button className="icon-button" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close dialog">
                X
              </button>
            </div>
            <p>This action will permanently remove this {entityLabel.toLowerCase()}.</p>
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

export default OrderManager;
