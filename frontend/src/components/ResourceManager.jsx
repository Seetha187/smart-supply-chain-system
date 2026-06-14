import { useCallback, useEffect, useMemo, useState } from "react";
import API from "../services/api";
import "./ResourceManager.css";

const getRecordId = (record) => record?._id || record?.id;

const getValueByPath = (item, path) => {
  if (!path) {
    return "";
  }

  return path.split(".").reduce((value, key) => value?.[key], item);
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === "") {
    return "-";
  }

  if (typeof value === "object") {
    return value.name || value.label || value._id || "-";
  }

  return value;
};

function ResourceManager({
  title,
  description,
  entityLabel,
  endpoint,
  collectionKey,
  columns,
  fields,
  searchKeys,
  emptyMessage,
  headerActions,
  notice,
  reloadKey,
}) {
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [modalMode, setModalMode] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [draft, setDraft] = useState({});

  const buildEmptyDraft = useCallback(() => {
    return fields.reduce((nextDraft, field) => {
      nextDraft[field.name] = field.defaultValue ?? "";
      return nextDraft;
    }, {});
  }, [fields]);

  const buildEditDraft = useCallback(
    (record) => {
      return fields.reduce((nextDraft, field) => {
        const value = field.getValue
          ? field.getValue(record)
          : getValueByPath(record, field.name);
        nextDraft[field.name] = value ?? "";
        return nextDraft;
      }, {});
    },
    [fields]
  );

  const fetchRecords = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await API.get(endpoint);
      setRecords(response.data[collectionKey] || []);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          `Unable to load ${entityLabel.toLowerCase()} records.`
      );
    } finally {
      setIsLoading(false);
    }
  }, [collectionKey, endpoint, entityLabel]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchRecords();
  }, [fetchRecords, reloadKey]);

  const filteredRecords = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) {
      return records;
    }

    const keys = searchKeys || columns.map((column) => column.key);

    return records.filter((record) =>
      keys.some((key) => {
        const value =
          typeof key === "function" ? key(record) : getValueByPath(record, key);
        return String(displayValue(value)).toLowerCase().includes(query);
      })
    );
  }, [columns, records, searchKeys, searchTerm]);

  const openCreateModal = () => {
    setActionError("");
    setSelectedRecord(null);
    setDraft(buildEmptyDraft());
    setModalMode("create");
  };

  const openEditModal = (record) => {
    setActionError("");
    setSelectedRecord(record);
    setDraft(buildEditDraft(record));
    setModalMode("edit");
  };

  const closeModal = () => {
    setModalMode(null);
    setSelectedRecord(null);
    setDraft({});
    setActionError("");
  };

  const handleFieldChange = (fieldName, value) => {
    setDraft((currentDraft) => ({
      ...currentDraft,
      [fieldName]: value,
    }));
  };

  const buildPayload = () => {
    return fields.reduce((payload, field) => {
      let value = draft[field.name];

      if (field.type === "number") {
        value = value === "" ? undefined : Number(value);
      }

      if (field.normalize) {
        value = field.normalize(value, draft);
      }

      if (value === "" && !field.required) {
        return payload;
      }

      if (value !== undefined) {
        payload[field.name] = value;
      }

      return payload;
    }, {});
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setActionError("");

    try {
      const payload = buildPayload();

      if (modalMode === "edit") {
        await API.put(`${endpoint}/${getRecordId(selectedRecord)}`, payload);
      } else {
        await API.post(endpoint, payload);
      }

      closeModal();
      await fetchRecords();
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Unable to save ${entityLabel.toLowerCase()}.`
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
      await API.delete(`${endpoint}/${getRecordId(deleteTarget)}`);
      setDeleteTarget(null);
      await fetchRecords();
    } catch (requestError) {
      setActionError(
        requestError.response?.data?.message ||
          `Unable to delete ${entityLabel.toLowerCase()}.`
      );
    } finally {
      setIsSaving(false);
    }
  };

  const modalTitle =
    modalMode === "edit" ? `Edit ${entityLabel}` : `Add ${entityLabel}`;

  return (
    <section className="resource-page">
      <div className="resource-page__header">
        <div>
          <p className="resource-page__eyebrow">Master Data</p>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <div className="resource-page__actions">
          {headerActions}
          <button className="button button--primary" type="button" onClick={openCreateModal}>
            Add {entityLabel}
          </button>
        </div>
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
      {actionError && (
        <div className="resource-alert" role="alert">
          {actionError}
        </div>
      )}
      {notice}

      <div className="resource-table-card">
        {isLoading ? (
          <div className="resource-state">Loading {title.toLowerCase()}...</div>
        ) : filteredRecords.length === 0 ? (
          <div className="resource-state">{emptyMessage}</div>
        ) : (
          <div className="resource-table-wrap">
            <table className="resource-table">
              <thead>
                <tr>
                  {columns.map((column) => (
                    <th key={column.key}>{column.label}</th>
                  ))}
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredRecords.map((record) => (
                  <tr key={getRecordId(record)}>
                    {columns.map((column) => (
                      <td key={column.key} data-label={column.label}>
                        {column.render
                          ? column.render(record)
                          : displayValue(getValueByPath(record, column.key))}
                      </td>
                    ))}
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
          <div className="modal-panel" role="dialog" aria-modal="true" aria-labelledby="resource-modal-title">
            <div className="modal-panel__header">
              <h3 id="resource-modal-title">{modalTitle}</h3>
              <button className="icon-button" type="button" onClick={closeModal} aria-label="Close modal">
                X
              </button>
            </div>

            <form className="resource-form" onSubmit={handleSubmit}>
              {fields.map((field) => (
                <label className="resource-field" key={field.name}>
                  <span>
                    {field.label}
                    {field.required ? " *" : ""}
                  </span>
                  {field.type === "textarea" ? (
                    <textarea
                      value={draft[field.name] ?? ""}
                      onChange={(event) => handleFieldChange(field.name, event.target.value)}
                      required={field.required}
                      rows={3}
                      placeholder={field.placeholder}
                    />
                  ) : field.type === "select" ? (
                    <select
                      value={draft[field.name] ?? ""}
                      onChange={(event) => handleFieldChange(field.name, event.target.value)}
                      required={field.required}
                    >
                      {(field.options || []).map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type || "text"}
                      value={draft[field.name] ?? ""}
                      onChange={(event) => handleFieldChange(field.name, event.target.value)}
                      required={field.required}
                      min={field.min}
                      max={field.max}
                      step={field.step}
                      placeholder={field.placeholder}
                    />
                  )}
                </label>
              ))}

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

      {deleteTarget && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal-panel modal-panel--confirm" role="dialog" aria-modal="true" aria-labelledby="delete-modal-title">
            <div className="modal-panel__header">
              <h3 id="delete-modal-title">Delete {entityLabel}</h3>
              <button className="icon-button" type="button" onClick={() => setDeleteTarget(null)} aria-label="Close dialog">
                X
              </button>
            </div>
            <p>
              This action will permanently remove this {entityLabel.toLowerCase()}.
            </p>
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

export default ResourceManager;
