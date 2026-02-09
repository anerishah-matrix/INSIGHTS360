
import { useMemo, useState, useEffect, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { colorForIndex } from "../utils/chartColors";
import { parseExcelDate, getFinancialYear } from "../utils/DataUtils";
import { format } from "date-fns";

ChartJS.register(BarElement, CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler, ChartDataLabels);

const MONTHS_ORDER = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

const ALL_ZONE_NAMES = [
  "Zone #1: Tamil Nadu, Kerala",
  "Zone #2: Andhra Pradesh, Telangana",
  "Zone #3: Karnataka, Goa",
  "Zone #4: Gujarat, Madhya Pradesh, Chhattisgarh, Rajasthan",
  "Zone #5: Mumbai",
  "Zone #6: Maharashtra",
  "Zone #7: NCR – Delhi, Haryana, Uttar Pradesh, Uttarakhand",
  "Zone #8: Upper North – Chandigarh, Punjab, Himachal Pradesh, J&K",
  "Zone #9: West Bengal, Bihar, Jharkhand, Odisha, North-East",
  "Zone 10 - International"
];

// Helper to get short zone name (e.g. "Zone #1")
const getShortZoneName = (fullName) => {
  const match = fullName.match(/Zone\s*(#?\d+)/i);
  if (match) return match[1].startsWith('#') ? match[1] : `#${match[1]}`;
  return fullName;
};

export default function ZonePage({
  rawData,
  selectedProducts,
  setSelectedProducts,
  selectedYears,
  setSelectedYears,
  metric,
  setMetric
}) {
  // --- DRILL-DOWN STATES ---
  const [activeZone, setActiveZone] = useState(null);
  const [activeYear, setActiveYear] = useState(null);
  const [activeMonth, setActiveMonth] = useState(null);

  const topChartRef = useRef(null);
  const explorerChartRef = useRef(null);

  const downloadChart = (ref, fileName) => {
    if (!ref.current) return;
    const link = document.createElement('a');
    link.download = `${fileName}.png`;
    link.href = ref.current.toBase64Image();
    link.click();
  };

  const resetDrill = () => {
    setActiveZone(null);
    setActiveYear(null);
    setActiveMonth(null);
  };

  useEffect(() => {
    resetDrill();
  }, [selectedYears, selectedProducts]);

  const metricLabel = metric === "sales" ? "Sales (INR)" : "Quantity";
  const metricKey = metric === "sales" ? "ASSESSABLE VAL INR" : "QUANTITY";

  const getZoneGroup = (stateName) => {
    if (!stateName) return "Unknown";
    const s = stateName.trim().toLowerCase();
    if (["tamil nadu", "kerala"].includes(s)) return "Zone #1: Tamil Nadu, Kerala";
    if (["andhra pradesh", "telangana"].includes(s)) return "Zone #2: Andhra Pradesh, Telangana";
    if (["karnataka", "goa"].includes(s)) return "Zone #3: Karnataka, Goa";
    if (["gujarat", "madhya pradesh", "chhattisgarh", "rajasthan"].includes(s)) return "Zone #4: Gujarat, Madhya Pradesh, Chhattisgarh, Rajasthan";
    if (s === "mumbai") return "Zone #5: Mumbai";
    if (s === "maharashtra") return "Zone #6: Maharashtra";
    if (["delhi", "haryana", "uttar pradesh", "uttarakhand"].includes(s)) return "Zone #7: NCR – Delhi, Haryana, Uttar Pradesh, Uttarakhand";
    if (["chandigarh", "punjab", "himachal pradesh", "j&k", "jammu & kashmir"].includes(s)) return "Zone #8: Upper North – Chandigarh, Punjab, Himachal Pradesh, J&K";
    if (["west bengal", "bihar", "jharkhand", "odisha", "north-east", "assam", "sikkim", "meghalaya", "manipur", "mizoram", "nagaland", "tripura", "arunachal pradesh"].includes(s)) return "Zone #9: West Bengal, Bihar, Jharkhand, Odisha, North-East";
    return "Zone 10 - International";
  };

  const filteredData = useMemo(() => {
    let data = rawData;
    if (selectedProducts.length > 0) {
      const selected = new Set(selectedProducts);
      data = data.filter((row) => selected.has(row["ITEM NAME"]));
    }
    if (selectedYears.length > 0) {
      const selectedY = new Set(selectedYears);
      data = data.filter((row) => {
        const date = parseExcelDate(row["INVOICE DATE"]);
        if (!date || isNaN(date)) return false;
        return selectedY.has(getFinancialYear(date));
      });
    }
    return data;
  }, [rawData, selectedProducts, selectedYears]);

  const stackedChartData = useMemo(() => {
    // 1. First, group all raw values by month and zone
    const monthsMap = {};
    MONTHS_ORDER.forEach(m => { monthsMap[m] = {}; });

    filteredData.forEach(row => {
      const date = parseExcelDate(row["INVOICE DATE"]);
      const monthShort = format(date, "MMM");
      const zone = getZoneGroup(row["CUSTOMER STATE"]);
      const val = Number(row[metricKey] || 0);

      if (monthsMap[monthShort]) {
        monthsMap[monthShort][zone] = (monthsMap[monthShort][zone] || 0) + val;
      }
    });

    // Handle "Exploded View" (Single Month)
    if (activeMonth) {
      const targetMonthData = monthsMap[activeMonth];
      const sorted = [...ALL_ZONE_NAMES]
        .map(z => ({ zone: z, value: targetMonthData[z] || 0 }))
        .sort((a, b) => b.value - a.value);

      return {
        labels: sorted.map(s => getShortZoneName(s.zone)),
        datasets: [{
          label: `${activeMonth} Performance`,
          data: sorted.map(s => s.value),
          backgroundColor: sorted.map(s => {
            const idx = ALL_ZONE_NAMES.indexOf(s.zone);
            return colorForIndex(idx, ALL_ZONE_NAMES.length, 0.7).background;
          }),
          borderRadius: 8,
          barThickness: 45
        }]
      };
    }

    // Handle "Global Stacked View" (Dynamic Sorting per Month)
    // We create 10 datasets, one for each "Rank Layer" (0=Bottom/Highest, 9=Top/Lowest)
    const datasets = Array.from({ length: 10 }, (_, rankIndex) => ({
      label: `Rank ${rankIndex + 1}`,
      data: [],
      backgroundColor: [],
      borderRadius: 4,
      datalabels: {
        formatter: (val) => val.shortLabel // Use metadata for the label
      }
    }));

    MONTHS_ORDER.forEach((m) => {
      const monthData = monthsMap[m];
      // Sort all zones for THIS month by value
      const sortedZonesForMonth = [...ALL_ZONE_NAMES]
        .map(z => ({
          full: z,
          short: getShortZoneName(z),
          val: monthData[z] || 0,
          colorIdx: ALL_ZONE_NAMES.indexOf(z)
        }))
        .sort((a, b) => b.val - a.val); // Sort descending (Highest at bottom of array for datasets)

      // Assign each zone to its rank for this month
      // Note: Chart.js stacks datasets in order, so datasets[0] is at the bottom.
      sortedZonesForMonth.forEach((item, rank) => {
        if (datasets[rank]) {
          datasets[rank].data.push({
            x: m.toUpperCase(),
            y: item.val,
            zone: item.full,
            shortLabel: item.short
          });
          datasets[rank].backgroundColor.push(colorForIndex(item.colorIdx, ALL_ZONE_NAMES.length, 0.7).background);
        }
      });
    });

    return {
      labels: MONTHS_ORDER.map(m => m.toUpperCase()),
      datasets: datasets.reverse() // Reverse so the highest values (Rank 0) are at the bottom index (index 0)
    };
  }, [filteredData, metricKey, activeMonth]);

  const drillDownData = useMemo(() => {
    if (!activeZone) {
      const totals = {};
      filteredData.forEach(row => {
        const z = getZoneGroup(row["CUSTOMER STATE"]);
        totals[z] = (totals[z] || 0) + Number(row[metricKey] || 0);
      });
      return Object.entries(totals).sort((a, b) => b[1] - a[1]);
    }

    if (!activeYear) {
      const totals = {};
      filteredData.filter(row => getZoneGroup(row["CUSTOMER STATE"]) === activeZone)
        .forEach(row => {
          const fy = getFinancialYear(parseExcelDate(row["INVOICE DATE"]));
          totals[fy] = (totals[fy] || 0) + Number(row[metricKey] || 0);
        });
      return Object.entries(totals).sort((a, b) => a[0].localeCompare(b[0]));
    }

    const totals = {};
    filteredData.filter(row => {
      const isZone = getZoneGroup(row["CUSTOMER STATE"]) === activeZone;
      const isYear = getFinancialYear(parseExcelDate(row["INVOICE DATE"])) === activeYear;
      return isZone && isYear;
    }).forEach(row => {
      const m = format(parseExcelDate(row["INVOICE DATE"]), "MMM");
      totals[m] = (totals[m] || 0) + Number(row[metricKey] || 0);
    });
    return MONTHS_ORDER.map(m => [m, totals[m] || 0]);
  }, [filteredData, metricKey, activeZone, activeYear]);

  const formatIndianNumber = (val) => {
    const num = Number(val || 0);
    if (metric === "sales") {
      if (num >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
      if (num >= 100000) return (num / 100000).toFixed(2) + " Lac";
    }
    return num.toLocaleString("en-IN");
  };

  return (
    <div className="space-y-10 animate-fadeIn pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[32px] shadow-sm border border-gray-100">
        <div>
          <h2 className="text-3xl font-black text-gray-900 tracking-tight">Regional Intelligence</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
              {activeZone || "Global View"}
            </span>
            {activeYear && (
              <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-wider">
                {activeYear}
              </span>
            )}
          </div>
        </div>
        {(activeZone || activeMonth || activeYear) && (
          <button
            onClick={resetDrill}
            className="group flex items-center gap-2 px-6 py-3 bg-white text-gray-500 rounded-2xl text-[11px] font-black uppercase tracking-[0.1em] border border-gray-100 hover:border-red-200 hover:text-red-600 transition-all shadow-sm active:scale-95"
          >
            <svg className="w-3.5 h-3.5 group-hover:rotate-[-180deg] transition-transform duration-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset All Analysis
          </button>
        )}
      </div>

      <div className="flex flex-col gap-8">
        <div className="bg-white p-10 rounded-[40px] shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-gray-50 h-[650px] flex flex-col">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {activeMonth ? `${activeMonth} Internal Distribution` : "Zone Contribution by Month"}
              </h3>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {activeMonth ? "Deep dive into selected period" : "Click any month bar to expand its zonal breakdown"}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => downloadChart(topChartRef, "zone_monthly_contribution")}
                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors border border-gray-100 shadow-sm"
                title="Download as Image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
              {activeMonth && (
                <button onClick={() => setActiveMonth(null)} className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Back to Overview</button>
              )}
            </div>
          </div>
          <div className="flex-1">
            <Bar
              ref={topChartRef}
              data={stackedChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    mode: activeMonth ? 'index' : 'nearest',
                    callbacks: {
                      label: (ctx) => {
                        const zoneName = ctx.raw.zone || ctx.dataset.label;
                        const val = activeMonth ? ctx.raw : ctx.raw.y;
                        return `${zoneName}: ${formatIndianNumber(val)}`;
                      }
                    }
                  },
                  datalabels: {
                    display: (context) => (activeMonth ? context.dataset.data[context.dataIndex] : context.dataset.data[context.dataIndex].y) > 0,
                    color: '#fff',
                    font: { weight: 'bold', size: 9 },
                    formatter: (_, context) => {
                      if (activeMonth) return "";
                      return context.dataset.data[context.dataIndex].shortLabel || "";
                    },
                    anchor: 'center',
                    align: 'center'
                  }
                },
                onClick: (_, elements) => {
                  if (!elements.length || activeMonth) return;
                  setActiveMonth(MONTHS_ORDER[elements[0].index]);
                },
                scales: {
                  x: { stacked: !activeMonth, grid: { display: false }, ticks: { font: { weight: 'bold', size: 10 } } },
                  y: { stacked: !activeMonth, border: { dash: [4, 4] }, grid: { color: '#F1F5F9' }, ticks: { font: { weight: 'bold', size: 10 }, callback: (v) => formatIndianNumber(v) } }
                }
              }}
            />
          </div>
        </div>

        <div className="bg-white p-10 rounded-[40px] shadow-[0_4px_25px_rgba(0,0,0,0.02)] border border-gray-50 h-[600px] flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">
                {!activeZone ? "Zonal Performance" : activeYear ? "Monthly Performance" : "Yearly Performance"}
              </h3>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                {!activeZone ? "Explore by clicking a zone" : activeYear ? `Revenue for ${activeYear}` : `Historical performance for ${activeZone}`}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => downloadChart(explorerChartRef, "zonal_drilldown")}
                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors border border-gray-100 shadow-sm"
                title="Download as Image"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              </button>
              {activeZone && (
                <button
                  onClick={() => {
                    if (activeYear) setActiveYear(null);
                    else setActiveZone(null);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-all"
                >
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                  Back
                </button>
              )}
            </div>
          </div>
          <div className="flex-1">
            {activeZone && activeYear ? (
              <Line
                ref={explorerChartRef}
                data={{
                  labels: drillDownData.map(d => d[0]),
                  datasets: [{
                    label: metricLabel,
                    data: drillDownData.map(d => d[1]),
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    pointBackgroundColor: '#3b82f6',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: {
                      backgroundColor: 'rgba(30, 41, 59, 0.95)',
                      padding: 12,
                      titleFont: { size: 13, weight: 'bold' },
                      bodyFont: { size: 12 },
                      callbacks: { label: (ctx) => ` ${formatIndianNumber(ctx.raw)}` }
                    },
                    datalabels: { display: false }
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 10 } } },
                    y: { border: { dash: [4, 4] }, grid: { color: '#F8FAFC' }, ticks: { font: { weight: 'bold', size: 10 }, callback: (v) => formatIndianNumber(v) } }
                  }
                }}
              />
            ) : (
              <Bar
                ref={explorerChartRef}
                data={{
                  labels: drillDownData.map(d => d[0]),
                  datasets: [{
                    label: metricLabel,
                    data: drillDownData.map(d => d[1]),
                    backgroundColor: activeZone ? '#6366f1' : drillDownData.map((_, i) => colorForIndex(i, drillDownData.length, 0.7).background),
                    borderRadius: 8,
                    barThickness: drillDownData.length > 5 ? 20 : 40
                  }]
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: (ctx) => formatIndianNumber(ctx.raw) } },
                    datalabels: {
                      display: true,
                      color: '#000',
                      anchor: 'end',
                      align: 'top',
                      font: { weight: 'bold', size: 9 },
                      formatter: (v) => formatIndianNumber(v)
                    }
                  },
                  onClick: (_, elements) => {
                    if (!elements.length) return;
                    const clickedLabel = drillDownData[elements[0].index][0];
                    if (!activeZone) setActiveZone(clickedLabel);
                    else if (!activeYear) setActiveYear(clickedLabel);
                  },
                  scales: {
                    x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 10 } } },
                    y: { border: { dash: [4, 4] }, grid: { color: '#F8FAFC' }, ticks: { font: { weight: 'bold', size: 10 }, callback: (v) => formatIndianNumber(v) } }
                  }
                }}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
