import { useEffect, useMemo, useRef, useState } from "react";
import ResourceManager from "../components/ResourceManager";
import API from "../services/api";

const sampleCsv = [
  "productName,sku,category,quantity,minimumStock,unitPrice,warehouseId",
  "Industrial Sensor,SEN-1001,Electronics,50,10,29.99,",
  "Packing Tape,TAPE-2001,Packaging,120,25,3.5,",
].join("\n");

const formatCurrency = (value) => {
  const numberValue = Number(value || 0);
  return `$${numberValue.toFixed(2)}`;
};

function Products() {
  const [warehouses, setWarehouses] = useState([]);
  const [importSummary, setImportSummary] = useState(null);
  const [importError, setImportError] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const fetchWarehouses = async () => {
      try {
        const response = await API.get("/warehouses");
        setWarehouses(response.data.warehouses || []);
      } catch {
        setWarehouses([]);
      }
    };

    fetchWarehouses();
  }, []);

  const warehouseLookup = useMemo(() => {
    return warehouses.reduce((lookup, warehouse) => {
      lookup[warehouse._id] = warehouse.warehouseName;
      return lookup;
    }, {});
  }, [warehouses]);

  const getWarehouseName = (warehouseId) => {
    if (!warehouseId) {
      return "Unassigned";
    }

    if (typeof warehouseId === "object") {
      return warehouseId.warehouseName || warehouseId._id || "Unassigned";
    }

    return warehouseLookup[warehouseId] || warehouseId;
  };

  const fields = useMemo(
    () => [
      {
        name: "productName",
        label: "Product Name",
        required: true,
        placeholder: "Industrial sensor",
      },
      {
        name: "sku",
        label: "SKU",
        required: true,
        placeholder: "SKU-1001",
      },
      {
        name: "category",
        label: "Category",
        defaultValue: "General",
        placeholder: "General",
      },
      {
        name: "quantity",
        label: "Quantity",
        type: "number",
        min: 0,
        defaultValue: 0,
        required: true,
      },
      {
        name: "minimumStock",
        label: "Minimum Stock",
        type: "number",
        min: 0,
        defaultValue: 0,
      },
      {
        name: "unitPrice",
        label: "Unit Price",
        type: "number",
        min: 0,
        step: "0.01",
        defaultValue: 0,
      },
      {
        name: "warehouseId",
        label: "Warehouse",
        type: "select",
        getValue: (product) =>
          typeof product.warehouseId === "object"
            ? product.warehouseId?._id
            : product.warehouseId,
        options: [
          { value: "", label: "Unassigned" },
          ...warehouses.map((warehouse) => ({
            value: warehouse._id,
            label: warehouse.warehouseName,
          })),
        ],
      },
    ],
    [warehouses]
  );

  const columns = [
    { key: "productName", label: "Product" },
    { key: "sku", label: "SKU" },
    { key: "category", label: "Category" },
    { key: "quantity", label: "Quantity" },
    { key: "minimumStock", label: "Min Stock" },
    {
      key: "unitPrice",
      label: "Unit Price",
      render: (product) => formatCurrency(product.unitPrice),
    },
    {
      key: "warehouseId",
      label: "Warehouse",
      render: (product) => getWarehouseName(product.warehouseId),
    },
  ];

  const openImportPicker = () => {
    setImportError("");
    fileInputRef.current?.click();
  };

  const handleCsvImport = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    setIsImporting(true);
    setImportError("");

    try {
      const response = await API.post("/products/import", formData);

      setImportSummary(response.data);
      setReloadKey((currentKey) => currentKey + 1);
    } catch (requestError) {
      setImportSummary(null);
      setImportError(
        requestError.response?.data?.message || "Unable to import product CSV."
      );
    } finally {
      setIsImporting(false);
    }
  };

  const downloadSampleCsv = () => {
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "product-import-sample.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const importNotice = importError ? (
    <div className="resource-alert" role="alert">
      {importError}
    </div>
  ) : importSummary ? (
    <div className="resource-alert resource-alert--success" role="status">
      Imported {importSummary.importedRows} of {importSummary.totalRows} rows.
      Skipped {importSummary.skippedRows} rows.
      {importSummary.errors?.length > 0 && (
        <ul className="resource-alert__details">
          {importSummary.errors.slice(0, 5).map((item) => (
            <li key={`${item.row}-${item.sku}-${item.reason}`}>
              Row {item.row}: {item.sku} - {item.reason}
            </li>
          ))}
        </ul>
      )}
    </div>
  ) : null;

  const headerActions = (
    <>
      <input
        accept=".csv,text/csv"
        hidden
        ref={fileInputRef}
        type="file"
        onChange={handleCsvImport}
      />
      <button
        className="button button--ghost"
        type="button"
        onClick={downloadSampleCsv}
      >
        Download Sample CSV
      </button>
      <button
        className="button button--ghost"
        type="button"
        onClick={openImportPicker}
        disabled={isImporting}
      >
        {isImporting ? "Importing..." : "Import CSV"}
      </button>
    </>
  );

  return (
    <ResourceManager
      title="Products"
      description="Manage inventory items, stock thresholds, unit pricing, and warehouse assignments."
      entityLabel="Product"
      endpoint="/products"
      collectionKey="products"
      columns={columns}
      fields={fields}
      searchKeys={[
        "productName",
        "sku",
        "category",
        (product) => getWarehouseName(product.warehouseId),
      ]}
      emptyMessage="No products match the current filters."
      headerActions={headerActions}
      notice={importNotice}
      reloadKey={reloadKey}
    />
  );
}

export default Products;
