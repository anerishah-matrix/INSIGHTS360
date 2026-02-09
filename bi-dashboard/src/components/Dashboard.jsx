
import { useMemo, useState, useEffect, useRef } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    ArcElement,
    PointElement,
    LineElement,
} from "chart.js";

import { groupSalesData, parseExcelDate, getFinancialYear } from "../utils/DataUtils";
import { colorForIndex } from "../utils/chartColors";
import { format } from "date-fns";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, PointElement, LineElement);

const formatIndianNumber = (val, isMetricValue = true) => {
    const num = Number(val || 0);
    if (!isMetricValue) return num.toLocaleString("en-IN");
    if (num >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
    else if (num >= 100000) return (num / 100000).toFixed(2) + " Lac";
    return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const MONTHS_ORDER = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export default function Dashboard({
    rawData,
    selectedProducts,
    setSelectedProducts,
    selectedYears,
    setSelectedYears,
    metric,
    setMetric,
    view,
    setView,
    allYears
}) {
    const [timeLevel, setTimeLevel] = useState("year");
    const [activeYear, setActiveYear] = useState(null);
    const [activeMonth, setActiveMonth] = useState(null);
    const [activeZone, setActiveZone] = useState(null);
    const [activeModel, setActiveModel] = useState(null);

    const [topN, setTopN] = useState(() => {
        const saved = localStorage.getItem("dashboard_topN");
        return saved ? (saved === "null" ? null : Number(saved)) : null;
    });
    const [topProducts, setTopProducts] = useState(() => {
        const saved = localStorage.getItem("dashboard_topProducts");
        return saved ? Number(saved) : 10;
    });

    useEffect(() => { localStorage.setItem("dashboard_topN", String(topN)); }, [topN]);
    useEffect(() => { localStorage.setItem("dashboard_topProducts", String(topProducts)); }, [topProducts]);

    const mainChartRef = useRef(null);
    const donutChartRef = useRef(null);
    const isDrillingRef = useRef(false);

    const downloadChart = (ref, fileName) => {
        if (!ref.current) return;
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = ref.current.toBase64Image();
        link.click();
    };

    const resetDrill = () => {
        setTimeLevel("year");
        setActiveYear(null);
        setActiveMonth(null);
        setActiveZone(null);
        setActiveModel(null);
    };

    useEffect(() => {
        if (isDrillingRef.current) {
            isDrillingRef.current = false;
            setTimeLevel("year");
            setActiveYear(null);
            setActiveMonth(null);
        } else {
            resetDrill();
        }
    }, [view, metric, selectedYears]);

    const metricLabel = metric === "value" ? "Sales (INR)" : "Quantity";

    const filteredRawData = useMemo(() => {
        let data = rawData.filter(r => !r.__isSIVAD);
        if (selectedProducts.length > 0) {
            const selected = new Set(selectedProducts);
            data = data.filter((row) => selected.has(row.__product));
        }
        if (selectedYears.length > 0) {
            const selectedY = new Set(selectedYears);
            data = data.filter((row) => selectedY.has(row.__fy));
        }
        if (activeZone) {
            data = data.filter((row) => {
                const zone = row["CUSTOMER STATE"] ? row["CUSTOMER STATE"].trim().toLowerCase() : "";
                const getZone = (s) => {
                    if (!s) return "Unknown";
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
                return getZone(zone) === activeZone;
            });
        }
        if (activeModel) data = data.filter((row) => row.__product === activeModel);
        return data;
    }, [rawData, selectedProducts, selectedYears, activeZone, activeModel]);

    const groupedData = useMemo(() => {
        return groupSalesData({
            rawData: filteredRawData,
            view,
            timeLevel,
            activeYear,
            activeMonth,
            metric,
        });
    }, [filteredRawData, view, timeLevel, activeYear, activeMonth, metric]);

    const kpis = useMemo(() => {
        const total = filteredRawData.reduce((sum, row) => sum + (metric === "value" ? row.__val : row.__qty), 0);
        const totalQuantity = filteredRawData.reduce((sum, row) => sum + row.__qty, 0);
        const transactionCount = filteredRawData.length;
        const uniqueProducts = new Set();
        filteredRawData.forEach(row => {
            if (row.__product) uniqueProducts.add(row.__product);
        });
        const avgValue = transactionCount > 0 ? total / transactionCount : 0;
        return { total, totalQuantity, transactionCount, uniqueProducts: uniqueProducts.size, avgValue };
    }, [filteredRawData, metric]);

    const comparativeData = useMemo(() => {
        if (view !== "comparative") return null;

        const yearsToCompare = selectedYears.length > 0 ? selectedYears : allYears;
        const dataset = yearsToCompare.map((fy, i) => {
            const yearData = rawData.filter(row => {
                if (row.__isSIVAD) return false;
                if (selectedProducts.length > 0 && !selectedProducts.includes(row.__product)) return false;
                return row.__fy === fy;
            });

            const monthlyMap = {};
            yearData.forEach(row => {
                const val = metric === "value" ? row.__val : row.__qty;
                monthlyMap[row.__monthShort] = (monthlyMap[row.__monthShort] || 0) + val;
            });

            return {
                label: fy,
                data: MONTHS_ORDER.map(m => monthlyMap[m] || 0),
                borderColor: colorForIndex(i, yearsToCompare.length).background,
                backgroundColor: colorForIndex(i, yearsToCompare.length, 0.1).background,
                tension: 0.4,
                pointRadius: 4,
                borderWidth: 3
            };
        });

        return { labels: MONTHS_ORDER.map(m => m.toUpperCase()), datasets: dataset };
    }, [view, rawData, selectedYears, allYears, metric, selectedProducts]);

    const sortedEntries = useMemo(() => {
        let entries = Object.entries(groupedData);

        // Normalize Month view to show all 12 months (April-March) even if data is 0
        if (view === "overall" && timeLevel === "month" && topN === null) {
            return MONTHS_ORDER.map(m => [m, groupedData[m] || 0]);
        }

        if (topN !== null) return entries.sort((a, b) => b[1] - a[1]).slice(0, topN);

        if (view === "overall") {
            const monthOrder = { Apr: 0, May: 1, Jun: 2, Jul: 3, Aug: 4, Sep: 5, Oct: 6, Nov: 7, Dec: 8, Jan: 9, Feb: 10, Mar: 11 };
            return entries.sort((a, b) => {
                const kA = a[0], kB = b[0];
                if (monthOrder[kA] !== undefined && monthOrder[kB] !== undefined) return monthOrder[kA] - monthOrder[kB];
                if (kA.startsWith("FY")) return kA.localeCompare(kB);
                const nA = Number(kA), nB = Number(kB);
                if (!isNaN(nA) && !isNaN(nB)) return nA - nB;
                return 0;
            });
        }
        return entries.sort((a, b) => b[1] - a[1]);
    }, [groupedData, topN, view, timeLevel]);

    const labels = useMemo(() => sortedEntries.map(([k]) => k), [sortedEntries]);
    const values = useMemo(() => sortedEntries.map(([, v]) => v), [sortedEntries]);

    const formatValue = (v) => {
        return metric === "value" ? `₹ ${formatIndianNumber(v)}` : formatIndianNumber(v, false);
    };

    const productTotals = useMemo(() => {
        const totalsByProduct = {};
        for (const row of filteredRawData) {
            const product = row.__product || "Unknown";
            const value = metric === "value" ? row.__val : row.__qty;
            totalsByProduct[product] = (totalsByProduct[product] || 0) + value;
        }
        return Object.entries(totalsByProduct).sort((a, b) => b[1] - a[1]);
    }, [filteredRawData, metric]);

    const topProductEntries = useMemo(() => productTotals.slice(0, topProducts), [productTotals, topProducts]);
    const totalProductMetricValue = useMemo(() => topProductEntries.reduce((sum, [, v]) => sum + v, 0), [topProductEntries]);

    return (
        <div className="grid grid-cols-12 gap-8 animate-fadeIn">
            {/* Left Column: KPI Cards */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
                {[
                    { label: metric === "quantity" ? "Total Quantity" : "Gross Revenue", value: kpis.total, sub: metric === "quantity" ? "Units" : "INR", color: "text-blue-600" },
                    { label: "Total Products Sold", value: kpis.totalQuantity, sub: "Units", color: "text-gray-900" },
                    { label: "Product Portfolio", value: kpis.uniqueProducts, sub: "Items", color: "text-gray-900" },
                    { label: "Avg. Deal Size", value: kpis.avgValue, sub: metric === "quantity" ? "Qty / Tx" : "INR", color: "text-gray-900" }
                ].map((kpi, i) => (
                    <div key={i} className="bg-white p-5 rounded-[20px] shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-gray-50 group transition-all duration-300">
                        <h5 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{kpi.label}</h5>
                        <div className="flex items-baseline gap-2">
                            <span className={`text-2xl font-black tracking-tighter ${kpi.color}`}>
                                {kpi.label.includes("Revenue") || kpi.label.includes("Size") ? formatIndianNumber(kpi.value) : kpi.value.toLocaleString()}
                            </span>
                            <span className="text-[9px] font-bold text-gray-300 uppercase">{kpi.sub}</span>
                        </div>
                        <div className="mt-3 w-8 h-1 bg-gray-50 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 w-1/3 group-hover:w-full transition-all duration-500"></div>
                        </div>
                    </div>
                ))}

                {/* PRODUCT DONUT CHART */}
                <div className="bg-white p-6 rounded-[24px] shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-50">
                    <div className="flex items-center justify-between mb-6">
                        <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Product Performance</h5>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => downloadChart(donutChartRef, "product_performance")}
                                className="p-1.5 hover:bg-gray-50 rounded-lg text-gray-400 transition-colors"
                                title="Download as Image"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            <select
                                value={topProducts}
                                onChange={(e) => setTopProducts(Number(e.target.value))}
                                className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg outline-none cursor-pointer"
                            >
                                {[5, 10, 20].map(n => <option key={n} value={n}>Top {n}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="h-48 relative mb-6">
                        <Doughnut ref={donutChartRef} data={{
                            labels: topProductEntries.map(([p]) => p),
                            datasets: [{
                                data: topProductEntries.map(([, v]) => v),
                                backgroundColor: topProductEntries.map((_, i) => colorForIndex(i, topProductEntries.length, 0.8).background),
                                borderWidth: 0,
                                cutout: '75%'
                            }]
                        }} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, datalabels: { display: false } } }} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-black text-gray-900 tracking-tighter">{topProductEntries.length}</span>
                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Models</span>
                        </div>
                    </div>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                        {topProductEntries.map(([label, val], i) => {
                            const pct = totalProductMetricValue > 0 ? ((val / totalProductMetricValue) * 100).toFixed(0) : 0;
                            return (
                                <div key={label} className="flex items-center justify-between text-[10px] font-bold">
                                    <div className="flex items-center gap-2 truncate pr-2">
                                        <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: colorForIndex(i, topProductEntries.length).background }}></div>
                                        <span className="text-gray-600 truncate">{label}</span>
                                    </div>
                                    <span className="text-gray-900 shrink-0">{pct}%</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Right Column: Main Charts */}
            <div className="col-span-12 lg:col-span-8 space-y-8">
                <div className="bg-white p-8 rounded-[32px] shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-50 h-[480px] flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                {view === "comparative" ? "Comparative Analytics" : "Performance Trends"}
                            </h3>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {view === 'comparative' ? 'Year-over-Year Monthly Comparisons' : view === 'overall' ? 'Time-series analysis' : view === 'zone' ? 'Geographic distribution' : 'Model-wise breakdown'}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => downloadChart(mainChartRef, "main_chart")}
                                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors border border-gray-100 shadow-sm"
                                title="Download as Image"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            {view !== "comparative" && (
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-1 bg-gray-50 p-1 rounded-xl">
                                        {[null, 5, 10, 20].map((n) => (
                                            <button key={String(n)} onClick={() => setTopN(n)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${topN === n ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                                                {n || "ALL"}
                                            </button>
                                        ))}
                                    </div>
                                    {(timeLevel !== "year" || activeZone || activeModel) && (
                                        <button onClick={resetDrill} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-red-100 hover:bg-red-100 transition-all">Reset</button>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-1">
                        {view === "comparative" ? (
                            <Line ref={mainChartRef} data={comparativeData} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom', labels: { boxWidth: 12, padding: 20, font: { weight: 'bold', size: 10 } } },
                                    tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatValue(ctx.raw)}` } },
                                    datalabels: { display: false }
                                },
                                scales: {
                                    x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 9 } } },
                                    y: { border: { dash: [4, 4] }, grid: { color: '#F8FAFC' }, ticks: { font: { weight: 'bold', size: 9 }, callback: (v) => formatIndianNumber(v) } }
                                }
                            }} />
                        ) : (
                            <Bar ref={mainChartRef} data={{
                                labels,
                                datasets: [{
                                    label: metricLabel,
                                    data: values,
                                    backgroundColor: values.map((_, i) => colorForIndex(i, values.length, 0.7).background),
                                    borderRadius: 6,
                                    barThickness: labels.length > 10 ? 20 : 32,
                                }]
                            }} options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: { callbacks: { label: (ctx) => formatValue(ctx.raw) } },
                                    datalabels: { display: false }
                                },
                                onClick: (_, elements) => {
                                    if (!elements.length) return;
                                    const clickedLabel = labels[elements[0].index];
                                    if (view === "zone") {
                                        setActiveZone(clickedLabel);
                                        isDrillingRef.current = true;
                                        setView("overall");
                                        return;
                                    }
                                    if (view === "model") {
                                        setActiveModel(clickedLabel);
                                        isDrillingRef.current = true;
                                        setView("overall");
                                        return;
                                    }
                                    if (view === "overall") {
                                        if (timeLevel === "year") { setActiveYear(clickedLabel); setTimeLevel("month"); }
                                        else if (timeLevel === "month") { setActiveMonth(clickedLabel); setTimeLevel("day"); }
                                    }
                                },
                                scales: {
                                    x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 9 } } },
                                    y: { border: { dash: [4, 4] }, grid: { color: '#F8FAFC' }, ticks: { font: { weight: 'bold', size: 9 }, callback: (v) => formatIndianNumber(v) } }
                                }
                            }} />
                        )}
                    </div>
                </div>

                {/* Data Breakdown Table */}
                <div className="bg-white p-8 rounded-[32px] shadow-[0_2px_15px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
                    <h3 className="text-lg font-black text-gray-900 tracking-tight mb-8">Detailed Breakdown</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-2/3">Dimension</th>
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Contribution (%)</th>
                                    <th className="pb-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Absolute Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {sortedEntries.slice(0, 15).map(([label, val], i) => {
                                    const totalValueSum = values.reduce((a, b) => a + b, 0);
                                    const pct = totalValueSum > 0 ? ((val / totalValueSum) * 100).toFixed(1) : 0;
                                    return (
                                        <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 font-bold text-[13px] text-gray-700">{label}</td>
                                            <td className="py-4 text-right">
                                                <div className="inline-flex items-center gap-3">
                                                    <div className="w-20 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                    <span className="text-[11px] font-black text-blue-600 w-8">{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="py-4 text-right font-black text-[13px] text-gray-900">{formatValue(val)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
