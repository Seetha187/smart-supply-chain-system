import ResourceManager from "../components/ResourceManager";

const columns = [
  { key: "warehouseName", label: "Warehouse" },
  { key: "location", label: "Location" },
  { key: "capacity", label: "Capacity" },
  { key: "managerName", label: "Manager" },
  { key: "contactNumber", label: "Contact" },
];

const fields = [
  {
    name: "warehouseName",
    label: "Warehouse Name",
    required: true,
    placeholder: "North Distribution Hub",
  },
  {
    name: "location",
    label: "Location",
    required: true,
    placeholder: "Dallas, TX",
  },
  {
    name: "capacity",
    label: "Capacity",
    type: "number",
    min: 0,
    required: true,
    defaultValue: 0,
  },
  {
    name: "managerName",
    label: "Manager Name",
    placeholder: "Operations lead",
  },
  {
    name: "contactNumber",
    label: "Contact Number",
    type: "tel",
    placeholder: "+1 555 0142",
  },
];

function Warehouses() {
  return (
    <ResourceManager
      title="Warehouses"
      description="Maintain warehouse locations, storage capacity, and site ownership details."
      entityLabel="Warehouse"
      endpoint="/warehouses"
      collectionKey="warehouses"
      columns={columns}
      fields={fields}
      searchKeys={["warehouseName", "location", "managerName", "contactNumber"]}
      emptyMessage="No warehouses match the current filters."
    />
  );
}

export default Warehouses;
