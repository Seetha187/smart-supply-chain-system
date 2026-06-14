import ResourceManager from "../components/ResourceManager";

const columns = [
  { key: "vendorName", label: "Vendor" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "address", label: "Address" },
  { key: "rating", label: "Rating" },
];

const fields = [
  {
    name: "vendorName",
    label: "Vendor Name",
    required: true,
    placeholder: "Apex Components",
  },
  {
    name: "email",
    label: "Email",
    type: "email",
    required: true,
    placeholder: "supply@vendor.com",
  },
  {
    name: "phone",
    label: "Phone",
    type: "tel",
    required: true,
    placeholder: "+1 555 0199",
  },
  {
    name: "rating",
    label: "Rating",
    type: "number",
    min: 0,
    max: 5,
    step: "0.1",
    defaultValue: 0,
  },
  {
    name: "address",
    label: "Address",
    type: "textarea",
    required: true,
    placeholder: "Street, city, region",
  },
];

function Vendors() {
  return (
    <ResourceManager
      title="Vendors"
      description="Manage supplier contact information, addresses, and performance ratings."
      entityLabel="Vendor"
      endpoint="/vendors"
      collectionKey="vendors"
      columns={columns}
      fields={fields}
      searchKeys={["vendorName", "email", "phone", "address"]}
      emptyMessage="No vendors match the current filters."
    />
  );
}

export default Vendors;
