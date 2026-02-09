import Select from "react-select";

export default function ProductSelect({
  products,
  value,
  onChange,
  placeholder = "Search and select products…",
}) {
  const options = products.map((p) => ({ value: p, label: p }));

  return (
    <Select
      isMulti
      isClearable
      isSearchable
      closeMenuOnSelect={false}
      options={options}
      value={value.map((v) => ({ value: v, label: v }))}
      onChange={(selected) => onChange((selected || []).map((s) => s.value))}
      placeholder={placeholder}
      styles={{
        control: (base) => ({
          ...base,
          borderRadius: 12,
          minHeight: 42,
          borderColor: "#e5e7eb",
          boxShadow: "none",
        }),
        menu: (base) => ({
          ...base,
          borderRadius: 12,
          overflow: "hidden",
          zIndex: 50,
        }),
      }}
    />
  );
}
