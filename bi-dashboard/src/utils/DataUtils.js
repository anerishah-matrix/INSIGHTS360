// import { format } from "date-fns";

// /**
//  * Parse Excel date (serial OR string)
//  */
// export const parseExcelDate = (value) => {
//   if (!value) return null;

//   // Excel serial date -> JS Date
//   if (typeof value === "number") {
//     return new Date((value - 25569) * 86400 * 1000);
//   }

//   // String date -> JS Date
//   return new Date(value);
// };

// /**
//  * Get Financial Year string (e.g., "FY 2023-24")
//  * FY starts April 1st.
//  */
// export const getFinancialYear = (date) => {
//   if (!date) return "Unknown";
//   const year = date.getFullYear();
//   const month = date.getMonth(); // 0 = Jan, 3 = April

//   // If Jan/Feb/Mar, it belongs to previous year's FY start
//   // e.g. Mar 2024 -> FY 2023-24
//   // e.g. Apr 2024 -> FY 2024-25
//   const startYear = month < 3 ? year - 1 : year;
//   const endYear = startYear + 1;
//   return `FY ${startYear}-${String(endYear).slice(-2)}`;
// };

// /**
//  * Core BI grouping engine (Overall / Zone / Model) + Drill-down (Year / Month / Day)
//  * Now supports metric switching: Sales Value vs Quantity
//  */
// export const groupSalesData = ({
//   rawData,
//   view,        // 'overall' | 'zone' | 'model'
//   timeLevel,   // 'year' | 'month' | 'day'
//   activeYear,
//   activeMonth,
//   metric = "value", // ✅ NEW: 'value' | 'quantity'
// }) => {
//   return rawData.reduce((acc, row) => {
//     const date = parseExcelDate(row["INVOICE DATE"]);
//     if (!date || isNaN(date)) return acc;

//     const fy = getFinancialYear(date); // "FY 2023-24"
//     const year = date.getFullYear();
//     const month = format(date, "MMM");
//     const day = format(date, "dd");

//     // Drill-down filter
//     // If drilling into months, activeYear is now "FY 2023-24"
//     if (timeLevel === "month" && fy !== activeYear) return acc;

//     // If drilling into days, we need to match month AND the FY
//     if (timeLevel === "day") {
//       if (fy !== activeYear || month !== activeMonth) return acc;
//     }

//     // Time key
//     let timeKey;
//     if (timeLevel === "year") timeKey = fy; // Group by FY
//     if (timeLevel === "month") timeKey = month;
//     if (timeLevel === "day") timeKey = day;

//     // Dimension key
//     let dimensionKey = "Overall";
//     if (view === "zone") dimensionKey = row["CUSTOMER STATE"] || "Unknown";
//     if (view === "model") dimensionKey = row["ITEM NAME"] || "Unknown";
//     if (view === "vad") dimensionKey = row["CUSTOMER NAME"] || "Unknown";

//     // ✅ FIXED: For Zone/Model/VAD views, aggregate by Dimension ONLY.
//     // We only include timeKey if we are in 'overall' (Time) view.
//     const key = view === "overall" ? timeKey : dimensionKey;

//     // ✅ Metric value selection (this is the main change)
//     const value =
//       metric === "quantity"
//         ? Number(row["QUANTITY"] || 0)
//         : Number(row["ASSESSABLE VAL INR"] || 0);

//     acc[key] = (acc[key] || 0) + value;

//     return acc;
//   }, {});
// };

// /**
//  * Custom Parser for "Product Movement" Files (Array of Arrays)
//  * Handles merged headers: "APR'25 - TARGET" | "APR'25 - ACHIEVED"
//  * Maps columns: Qty, Sales, Value, CM2
//  */
// export const processProductMovementData = (rawArrays) => {
//   if (!rawArrays || rawArrays.length < 3) return [];

//   // 1. Identify Header Row (Look for row containing Month + Target/Achieved)
//   let headerRowIndex = -1;
//   const headerRegex = /([A-Za-z]{3})[\s'’\-]*(\d{2,4})[\s\-–—]*(TARGET|ACHIEVED)/i;

//   for (let i = 0; i < 15 && i < rawArrays.length; i++) {
//     const row = rawArrays[i] || [];
//     // Check if this row has at least one cell matching the month-target pattern
//     const hasMonthHeader = row.some(cell => {
//       const cellStr = (cell || "").toString().trim();
//       return headerRegex.test(cellStr);
//     });

//     if (hasMonthHeader) {
//       headerRowIndex = i;
//       break;
//     }
//   }

//   if (headerRowIndex === -1) return [];

//   const mainHeader = rawArrays[headerRowIndex];
//   const subHeader = rawArrays[headerRowIndex + 1] || []; // Qty, Sales, etc.

//   // 2. Map Columns
//   const columnMap = []; // { index, month, year, type: 'Target'|'Achieved', metric: 'qty'|'value'|'cm2' }
//   let currentMonth = null;
//   let currentYear = null;
//   let currentType = null; // 'Target' | 'Achieved'

//   // Uses the headerRegex defined above
//   for (let c = 0; c < mainHeader.length; c++) {
//     const mainTitle = (mainHeader[c] || "").toString().trim();
//     if (mainTitle) {
//       const match = mainTitle.match(headerRegex);
//       if (match) {
//         // Normalize month to Title Case (e.g., "APR" -> "Apr") to match MONTHS_ORDER
//         const rawMonth = match[1].toUpperCase();
//         currentMonth = rawMonth.charAt(0) + rawMonth.slice(1).toLowerCase();

//         let yearStr = match[2];  // 24 or 2024
//         currentYear = yearStr.length === 2 ? `20${yearStr}` : yearStr;
//         currentType = match[3].toUpperCase() === "TARGET" ? "Target" : "Achieved";
//       }
//     }

//     // If we are inside a valid block, check sub-header
//     if (currentMonth && currentType) {
//       const subTitle = (subHeader[c] || "").toString().trim().toLowerCase();

//       let metric = null;
//       if (subTitle.startsWith("qty") || subTitle === "quantity") {
//         metric = "quantity";
//       }
//       else if (subTitle === "cm2") {
//         metric = "cm2";
//       }
//       else if (subTitle === "value" || subTitle === "sales" || subTitle === "amt") {
//         // In the user's file, Target uses "Value" and Achieved uses "Sales"
//         metric = "value";
//       }

//       if (metric) {
//         // Robust month mapping to avoid locale issues
//         const monthMap = {
//           'JAN': 0, 'FEB': 1, 'MAR': 2, 'APR': 3, 'MAY': 4, 'JUN': 5,
//           'JUL': 6, 'AUG': 7, 'SEP': 8, 'OCT': 9, 'NOV': 10, 'DEC': 11
//         };
//         const monthIndex = monthMap[currentMonth.toUpperCase()];

//         if (monthIndex !== undefined) {
//           columnMap.push({
//             index: c,
//             month: currentMonth,
//             monthIndex,
//             year: currentYear,
//             type: currentType,
//             metric
//           });
//         }
//       }
//     }
//   }

//   // 3. Iterate Data Rows
//   const dataStart = headerRowIndex + 2;
//   const normalized = [];

//   const cleanNumber = (val) => {
//     if (val === undefined || val === null || val === "") return 0;
//     if (typeof val === "number") return val;
//     // Remove commas and other non-numeric characters (keep decimal and minus)
//     const str = val.toString().replace(/,/g, "").trim();
//     return Number(str) || 0;
//   };

//   for (let r = dataStart; r < rawArrays.length; r++) {
//     const row = rawArrays[r];
//     if (!row || row.length === 0) continue;

//     // 1. Validation: Skip rows that don't have a valid SAP Code (Column B / Index 1)
//     // Most products have a numeric SAP code. If it's empty or doesn't look like a code, skip.
//     const sapCode = (row[1] || "").toString().trim();
//     if (!sapCode || isNaN(Number(sapCode))) continue;

//     // 2. Identify Product Name (Column C / Index 2)
//     let productName = (row[2] || "").toString().trim();
//     if (!productName) continue;

//     // Skip explicit total rows
//     if (productName.toLowerCase().includes("total")) continue;

//     columnMap.forEach(map => {
//       const val = row[map.index];
//       const amount = cleanNumber(val);

//       // Only push if there's actual data to avoid polluting with empty 0s
//       if (val !== undefined && val !== null && val !== "" && amount !== 0) {
//         normalized.push({
//           product: productName,
//           sapCode: sapCode,
//           month: map.month, // This is now Title Case "Jan", "Feb"...
//           year: map.year,
//           fy: getFinancialYear(new Date(map.year, map.monthIndex, 1)),
//           type: map.type,
//           metric: map.metric,
//           amount: amount
//         });
//       }
//     });
//   }

//   return normalized;
// };
import { format } from "date-fns";
export const parseExcelDate = (value) => {
  if (!value) return null;
  if (typeof value === "number") {
    return new Date((value - 25569) * 86400 * 1000);
  }
  return new Date(value);
};
export const getFinancialYear = (date) => {
  if (!date) return "Unknown";
  const year = date.getFullYear();
  const month = date.getMonth();
  const startYear = month < 3 ? year - 1 : year;
  const endYear = startYear + 1;
  return `FY ${startYear}-${String(endYear).slice(-2)}`;
};
export const groupSalesData = ({
  rawData,
  view,
  timeLevel,
  activeYear,
  activeMonth,
  metric = "value",
}) => {
  return rawData.reduce((acc, row) => {
    const fy = row.__fy || "Unknown";
    const month = row.__monthShort || "Unknown";

    // Day logic is complex if we don't have day pre-calculated, 
    // but for now let's focus on Year/Month which are most used.
    const day = row.__dateObj ? format(row.__dateObj, "dd") : "01";

    if (timeLevel === "month" && fy !== activeYear) return acc;
    if (timeLevel === "day") {
      if (fy !== activeYear || month !== activeMonth) return acc;
    }

    // Time key
    let timeKey;
    if (timeLevel === "year") timeKey = fy;
    if (timeLevel === "month") timeKey = month;
    if (timeLevel === "day") timeKey = day;

    // Dimension key
    let dimensionKey = "Overall";
    if (view === "zone") dimensionKey = row["CUSTOMER STATE"] || "Unknown";
    if (view === "model") dimensionKey = row.__product;
    if (view === "vad") dimensionKey = row.__vad;

    const key = view === "overall" ? timeKey : dimensionKey;
    const value = metric === "quantity" ? row.__qty : row.__val;

    acc[key] = (acc[key] || 0) + value;
    return acc;
  }, {});
};
export const processProductMovementData = (rawArrays, fileName = "Unknown", sheetName = "Unknown") => {
  if (!rawArrays || rawArrays.length < 3) return [];
  let headerRowIndex = -1;
  const headerRegex = /([A-Za-z]{3})[\s'’\-]*(\d{2,4})[\s\-–—]*(TARGET|ACHIEVED)/i;
  for (let i = 0; i < 15 && i < rawArrays.length; i++) {
    const row = rawArrays[i] || [];
    const hasMonthHeader = row.some(cell => {
      const cellStr = (cell || "").toString().trim();
      return headerRegex.test(cellStr);
    });
    if (hasMonthHeader) {
      headerRowIndex = i;
      break;
    }
  }
  if (headerRowIndex === -1) return [];
  const mainHeader = rawArrays[headerRowIndex];
  const subHeader = rawArrays[headerRowIndex + 1] || [];
  const columnMap = [];
  let currentMonth = null;
  let currentYear = null;
  let currentType = null;
  const MONTH_MAP = {
    'JAN': 'Jan', 'FEB': 'Feb', 'MAR': 'Mar', 'APR': 'Apr',
    'MAY': 'May', 'JUN': 'Jun', 'JUL': 'Jul', 'AUG': 'Aug',
    'SEP': 'Sep', 'OCT': 'Oct', 'NOV': 'Nov', 'DEC': 'Dec'
  };
  for (let c = 0; c < mainHeader.length; c++) {
    const mainTitle = (mainHeader[c] || "").toString().trim();
    if (mainTitle) {
      const match = mainTitle.match(headerRegex);
      if (match) {
        const rawMonth = match[1].toUpperCase();
        currentMonth = MONTH_MAP[rawMonth];
        let yearStr = match[2];
        currentYear = yearStr.length === 2 ? `20${yearStr}` : yearStr;
        currentType = match[3].toUpperCase() === "TARGET" ? "Target" : "Achieved";
      }
    }
    if (currentMonth && currentType) {
      const subTitle = (subHeader[c] || "").toString().trim().toLowerCase();
      let metric = null;
      if (subTitle.startsWith("qty") || subTitle === "quantity") {
        metric = "quantity";
      }
      else if (subTitle === "cm2") {
        metric = "cm2";
      }
      else if (subTitle === "value" || subTitle === "sales" || subTitle === "amt") {
        metric = "value";
      }
      if (metric) {
        const monthIndex = Object.keys(MONTH_MAP).indexOf(currentMonth.toUpperCase());
        if (monthIndex !== -1) {
          columnMap.push({
            index: c,
            month: currentMonth,
            monthIndex,
            year: currentYear,
            type: currentType,
            metric
          });
        }
      }
    }
  }
  const dataStart = headerRowIndex + 2;
  const normalized = [];
  const cleanNumber = (val) => {
    if (val === undefined || val === null || val === "") return null;
    if (typeof val === "number") {
      if (val === 0) return null;
      return val;
    }
    const str = val.toString().replace(/,/g, "").trim();
    if (str === "" || str === "0") return null;
    const num = Number(str);
    if (isNaN(num) || num === 0) return null;
    return num;
  };
  for (let r = dataStart; r < rawArrays.length; r++) {
    const row = rawArrays[r];
    if (!row || row.length === 0) continue;
    const sapCode = (row[1] || "").toString().trim();
    const productName = (row[2] || "").toString().trim();

    // STRICT FILTER: Ignore headers, categories, totals and FY blocks
    const searchable = (sapCode + productName).toLowerCase();
    const isTotalRow = searchable.includes("total") || searchable.includes("grand") || searchable.includes("summary") || searchable.includes("overall") || searchable.includes("fy ");

    if (!sapCode || isNaN(Number(sapCode)) || isTotalRow) continue;
    if (!productName) continue;

    columnMap.forEach(map => {
      const val = row[map.index];
      const amount = cleanNumber(val);
      if (amount !== null) {
        normalized.push({
          product: productName,
          sapCode: sapCode,
          month: map.month,
          year: map.year,
          fy: getFinancialYear(new Date(map.year, map.monthIndex, 1)),
          type: map.type,
          metric: map.metric,
          amount: amount,
          source: `${fileName} (${sheetName})`
        });
      }
    });
  }

  if (normalized.length > 0) {
    console.log(`✅ Processed ${normalized.length} records from ${fileName} > ${sheetName}`);
  }

  return normalized;
};

export const parseSIVADDate = (dateStr) => {
  if (!dateStr) return null;
  let str = String(dateStr).toUpperCase().trim();

  const monthMap = {
    'JAN': 0, 'JANUARY': 0, 'JANAURY': 0,
    'FEB': 1, 'FEBRUARY': 1,
    'MAR': 2, 'MARCH': 2,
    'APR': 3, 'APRIL': 3,
    'MAY': 4,
    'JUN': 5, 'JUNE': 5,
    'JUL': 6, 'JULY': 6,
    'AUG': 7, 'AUGUST': 7,
    'SEP': 8, 'SEPT': 8, 'SEPTEMBER': 8,
    'OCT': 9, '0CT': 9, 'OCTOBER': 9,
    'NOV': 10, 'N0V': 10, 'NOVEMBER': 10,
    'DEC': 11, 'DECEMBER': 11
  };

  // Robust Regex: Month name followed by optional separator and Year
  // Handles formats like: APR'25, NOV-24, DEC 2024, JAN/25, OCT.24
  const match = str.match(/([A-Z0-9]+)[\s'\-\/\.]*(\d{2,4})/);
  if (match) {
    const monthName = match[1];
    const yearPart = match[2];
    const month = monthMap[monthName];
    if (month !== undefined) {
      let year = parseInt(yearPart);
      if (yearPart.length === 2) year += 2000;
      return new Date(year, month, 1);
    }
  }

  // Single word month name (APR, MAY, etc.)
  if (monthMap[str] !== undefined) {
    const month = monthMap[str];
    // Guess year based on FY context (Apr-Dec 2025, Jan-Mar 2026)
    const year = (month >= 3) ? 2025 : 2026;
    return new Date(year, month, 1);
  }

  // Fallback to Excel serial or standard string
  return parseExcelDate(dateStr);
};
