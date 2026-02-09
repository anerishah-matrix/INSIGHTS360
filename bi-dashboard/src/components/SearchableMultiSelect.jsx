// import { useMemo, useState } from "react";

// export default function SearchableMultiSelect({
//   options,
//   value,
//   onChange,
//   placeholder = "Search products…",
//   heightClass = "max-h-56",
// }) {
//   const [query, setQuery] = useState("");

//   const filtered = useMemo(() => {
//     const q = query.trim().toLowerCase();
//     if (!q) return options;
//     return options.filter((o) => o.toLowerCase().includes(q));
//   }, [options, query]);

//   const toggle = (opt) => {
//     if (value.includes(opt)) onChange(value.filter((v) => v !== opt));
//     else onChange([...value, opt]);
//   };

//   return (
//     <div className="w-full">
//       <input
//         value={query}
//         onChange={(e) => setQuery(e.target.value)}
//         placeholder={placeholder}
//         className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
//       />

//       {/* Select All / Clear actions */}
//       {filtered.length > 0 && query.trim() !== "" && (
//         <div className="flex gap-3 text-xs mt-1 px-1">
//           <button
//             onClick={() => {
//               const allFiltered = new Set([...value, ...filtered]);
//               onChange(Array.from(allFiltered));
//             }}
//             className="text-blue-600 hover:underline font-medium"
//           >
//             Select All
//           </button>
//           <button
//             onClick={() => {
//               const filteredSet = new Set(filtered);
//               onChange(value.filter((v) => !filteredSet.has(v)));
//             }}
//             className="text-gray-500 hover:underline"
//           >
//             Clear Search Results
//           </button>
//         </div>
//       )}

//       <div className={`mt-2 border rounded-lg overflow-auto ${heightClass}`}>
//         {filtered.length === 0 ? (
//           <div className="p-3 text-sm text-gray-500">No matches</div>
//         ) : (
//           filtered.map((opt) => (
//             <label
//               key={opt}
//               className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
//             >
//               <input
//                 type="checkbox"
//                 checked={value.includes(opt)}
//                 onChange={() => toggle(opt)}
//               />
//               <span className="truncate">{opt}</span>
//             </label>
//           ))
//         )}
//       </div>

//       <div className="mt-2 flex flex-wrap gap-2 text-xs text-gray-600">
//         <span className="font-medium">Selected:</span>
//         {value.length === 0 ? (
//           <span>All products</span>
//         ) : (
//           <span>{value.length} products</span>
//         )}
//       </div>
//     </div>
//   );
// }



import { useEffect, useMemo, useRef, useState } from "react";

function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function SearchableMultiSelect({
  options,
  value,
  onChange,
  placeholder = "Search…",
  heightClass = "max-h-64",
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => String(o).toLowerCase().includes(q));
  }, [options, query]);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const allFilteredSelected = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.every((o) => selectedSet.has(o));
  }, [filtered, selectedSet]);

  const someFilteredSelected = useMemo(() => {
    if (filtered.length === 0) return false;
    return filtered.some((o) => selectedSet.has(o));
  }, [filtered, selectedSet]);

  const toggle = (opt) => {
    if (selectedSet.has(opt)) onChange(value.filter((v) => v !== opt));
    else onChange([...value, opt]);
  };

  const clearAll = () => onChange([]);

  const selectAllFiltered = () => {
    const merged = new Set(value);
    for (const o of filtered) merged.add(o);
    onChange(Array.from(merged));
  };

  const clearFiltered = () => {
    const filteredSet = new Set(filtered);
    onChange(value.filter((v) => !filteredSet.has(v)));
  };

  // Indeterminate checkbox for "Select all filtered"
  const selectAllRef = useRef(null);
  useEffect(() => {
    if (!selectAllRef.current) return;
    selectAllRef.current.indeterminate = !allFilteredSelected && someFilteredSelected;
  }, [allFilteredSelected, someFilteredSelected]);

  const [visibleCount, setVisibleCount] = useState(10);

  return (
    <div className="w-full">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {value.slice(0, visibleCount).map((v) => (
            <button
              type="button"
              key={v}
              onClick={() => toggle(v)}
              className="group inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              title="Remove"
            >
              <span className="max-w-[220px] truncate">{v}</span>
              <span className="text-gray-400 group-hover:text-gray-600">✕</span>
            </button>
          ))}
          {value.length > visibleCount && (
            <button
              type="button"
              onClick={() => setVisibleCount((prev) => prev + 20)}
              className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              +{value.length - visibleCount} more
            </button>
          )}
          <button
            type="button"
            onClick={clearAll}
            className="ml-auto inline-flex items-center rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative w-full">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholder}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            aria-label="Search options"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
              aria-label="Clear search"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Bulk actions */}
      <div className="mt-2 flex flex-wrap items-center justify-between text-xs">
        <label className="inline-flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50/80 px-2.5 py-1.5 shadow-sm cursor-pointer hover:bg-white transition-colors group">
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allFilteredSelected}
            onChange={() => (allFilteredSelected ? clearFiltered() : selectAllFiltered())}
            className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-0 cursor-pointer"
          />
          <span className="font-bold text-gray-600 group-hover:text-gray-900">
            {allFilteredSelected ? "Deselect" : "Select"} Shown Products
          </span>
          <span className="text-gray-400 font-medium">({filtered.length})</span>
        </label>

        <span className="text-gray-500 font-medium">
          Total Selected: <span className="font-bold text-blue-600">{value.length || 0}</span>
        </span>
      </div>

      {/* Options list */}
      <div className={cx("mt-2 overflow-auto rounded-xl border border-gray-200 bg-white", heightClass)}>
        {filtered.length === 0 ? (
          <div className="p-4 text-sm text-gray-500">No matches.</div>
        ) : (
          filtered.map((opt) => {
            const checked = selectedSet.has(opt);
            return (
              <label
                key={opt}
                className={cx(
                  "flex items-center gap-3 px-3 py-2 text-sm cursor-pointer",
                  "hover:bg-gray-50",
                  checked && "bg-blue-50/50"
                )}
              >
                <input type="checkbox" checked={checked} onChange={() => toggle(opt)} />
                <span className="truncate text-gray-800">{opt}</span>
              </label>
            );
          })
        )}
      </div>

      {/* Hint */}
      <p className="mt-2 text-xs text-gray-400">
        Tip: use search + “Select filtered” to quickly pick many items.
      </p>
    </div>
  );
}

