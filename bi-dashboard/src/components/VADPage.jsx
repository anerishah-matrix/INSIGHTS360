
import { useMemo, useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
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

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, ArcElement, PointElement, LineElement);

const formatIndianNumber = (val, isMetricValue = true) => {
    const num = Number(val || 0);
    if (!isMetricValue) return num.toLocaleString("en-IN");
    if (num >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
    else if (num >= 100000) return (num / 100000).toFixed(2) + " Lac";
    return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const MONTHS_ORDER = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

export default function VADPage({
    rawData,
    selectedProducts,
    selectedYears,
    selectedVADs,
    metric,
    view, // 'time' | 'zone' | 'product'
}) {
    // --- INTERNAL DRILL-DOWN ---
    const [timeLevel, setTimeLevel] = useState("year");
    const [activeYear, setActiveYear] = useState(null);
    const [activeMonth, setActiveMonth] = useState(null);
    const [activeRegion, setActiveRegion] = useState(null);
    const [activeProduct, setActiveProduct] = useState(null);

    const chartRef = useRef(null);

    const [topN, setTopN] = useState(() => {
        const saved = localStorage.getItem("vad_topN");
        return saved ? (saved === "null" ? null : Number(saved)) : null;
    });

    useEffect(() => { localStorage.setItem("vad_topN", String(topN)); }, [topN]);

    const resetDrill = () => {
        setTimeLevel("year");
        setActiveYear(null);
        setActiveMonth(null);
        setActiveRegion(null);
        setActiveProduct(null);
    };

    const downloadChart = (ref, fileName) => {
        if (!ref.current) return;
        const link = document.createElement('a');
        link.download = `${fileName}.png`;
        link.href = ref.current.toBase64Image();
        link.click();
    };

    useEffect(() => {
        resetDrill();
    }, [view, metric, selectedYears, selectedVADs]);

    const formatValue = (v) => {
        return metric === "value" ? `₹ ${formatIndianNumber(v)}` : formatIndianNumber(v, false);
    };

    // 1. Filter data based on selected VADs, Products, and Years
    const filteredRawData = useMemo(() => {
        let data = rawData.filter(r => !r.__isSIVAD); // Strictly exclude SI-VAD logic here
        if (selectedVADs && selectedVADs.length > 0) {
            const selected = new Set(selectedVADs);
            data = data.filter((row) => selected.has(row.__vad));
        }
        if (selectedProducts && selectedProducts.length > 0) {
            const selectedP = new Set(selectedProducts);
            data = data.filter((row) => selectedP.has(row.__product));
        }
        if (selectedYears && selectedYears.length > 0) {
            const selectedY = new Set(selectedYears);
            data = data.filter((row) => selectedY.has(row.__fy));
        }

        // Apply Drill-down filters
        if (activeYear) {
            data = data.filter(row => row.__fy === activeYear);
        }
        if (activeMonth) {
            data = data.filter(row => row.__monthShort === activeMonth);
        }
        if (activeRegion) {
            data = data.filter(row => row["CUSTOMER STATE"] === activeRegion);
        }
        if (activeProduct) {
            data = data.filter(row => row.__product === activeProduct);
        }

        return data;
    }, [rawData, selectedVADs, selectedProducts, selectedYears, activeYear, activeMonth, activeRegion, activeProduct]);

    // 2. KPIS
    const kpis = useMemo(() => {
        const getVal = (row) => metric === "value" ? row.__val : row.__qty;
        const total = filteredRawData.reduce((sum, row) => sum + getVal(row), 0);
        const transactionCount = filteredRawData.length;
        const uniqueVADs = new Set(filteredRawData.map(row => row.__vad));
        const avgValue = transactionCount > 0 ? total / transactionCount : 0;
        return { total, transactionCount, uniqueVADs: uniqueVADs.size, avgValue };
    }, [filteredRawData, metric]);

    // 3. Grouping for Main Chart
    const chartData = useMemo(() => {
        const getVal = (row) => metric === "value" ? row.__val : row.__qty;

        // If we are at the deepest level (after selecting month, region, or product), show VAD breakdown
        const shouldShowVADs = (view === "time" && activeMonth) || (view === "zone" && activeRegion) || (view === "product" && activeProduct);

        if (shouldShowVADs) {
            const vadGroup = {};
            filteredRawData.forEach(row => {
                const name = row.__vad || "Unknown";
                vadGroup[name] = (vadGroup[name] || 0) + getVal(row);
            });
            let entries = Object.entries(vadGroup).sort((a, b) => b[1] - a[1]);
            if (topN) entries = entries.slice(0, topN);
            return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
        }

        // Otherwise use standard grouping or drill levels
        if (view === "time") {
            const grouped = groupSalesData({
                rawData: filteredRawData,
                view: "overall",
                timeLevel: timeLevel,
                activeYear,
                activeMonth: null, // we only use activeMonth to trigger VAD view above
                metric,
            });
            let entries = Object.entries(grouped);
            const monthOrder = { Apr: 0, May: 1, Jun: 2, Jul: 3, Aug: 4, Sep: 5, Oct: 6, Nov: 7, Dec: 8, Jan: 9, Feb: 10, Mar: 11 };
            entries.sort((a, b) => {
                const kA = a[0], kB = b[0];
                if (monthOrder[kA] !== undefined && monthOrder[kB] !== undefined) return monthOrder[kA] - monthOrder[kB];
                if (kA.startsWith("FY")) return kA.localeCompare(kB);
                return 0;
            });
            if (topN) entries = entries.slice(0, topN);
            return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
        }

        if (view === "zone") {
            const zoneGroup = {};
            filteredRawData.forEach(row => {
                const state = row["CUSTOMER STATE"] || "Unknown";
                zoneGroup[state] = (zoneGroup[state] || 0) + getVal(row);
            });
            let entries = Object.entries(zoneGroup).sort((a, b) => b[1] - a[1]);
            if (topN) entries = entries.slice(0, topN);
            return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
        }

        if (view === "product") {
            const prodGroup = {};
            filteredRawData.forEach(row => {
                const item = row["ITEM NAME"] || "Unknown";
                prodGroup[item] = (prodGroup[item] || 0) + getVal(row);
            });
            let entries = Object.entries(prodGroup).sort((a, b) => b[1] - a[1]);
            if (topN) entries = entries.slice(0, topN);
            return { labels: entries.map(e => e[0]), values: entries.map(e => e[1]) };
        }

        return { labels: [], values: [] };
    }, [filteredRawData, view, timeLevel, activeYear, activeMonth, activeRegion, activeProduct, metric, topN]);

    const isDrilled = activeYear || activeMonth || activeRegion || activeProduct;

    return (
        <div className="grid grid-cols-12 gap-8 animate-fadeIn">
            {/* KPI Sidebar */}
            <div className="col-span-12 lg:col-span-3 space-y-4">
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-50">
                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">VAD Overview</h5>
                    <div className="space-y-6">
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Total Volume</p>
                            <p className="text-xl font-black text-blue-600">{formatValue(kpis.total)}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Distributors</p>
                            <p className="text-xl font-black text-gray-900">{kpis.uniqueVADs}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Transactions</p>
                            <p className="text-xl font-black text-gray-900">{kpis.transactionCount.toLocaleString()}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-bold text-gray-400 uppercase">Avg Payout</p>
                            <p className="text-xl font-black text-gray-900">{formatValue(kpis.avgValue)}</p>
                        </div>
                    </div>
                </div>

                {/* Top 5 Customers List */}
                <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-50">
                    <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Top Customers</h5>
                    <div className="space-y-3">
                        {Object.entries(filteredRawData.reduce((acc, row) => {
                            const name = row.__vad || "Unknown";
                            const val = metric === "value" ? row.__val : row.__qty;
                            acc[name] = (acc[name] || 0) + val;
                            return acc;
                        }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, val], i) => (
                            <div key={i} className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 truncate w-32">{name}</span>
                                <span className="text-[10px] font-black text-gray-900">{formatValue(val)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="col-span-12 lg:col-span-9 space-y-8">
                <div className="bg-white p-8 rounded-[32px] shadow-sm border border-gray-50 h-[550px] flex flex-col">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                {view === "time" ? (activeMonth ? `Distributors in ${activeMonth}` : "VAD Performance Over Time") :
                                    view === "zone" ? (activeRegion ? `Distributors in ${activeRegion}` : "Zonal Distribution") :
                                        (activeProduct ? `Distributors for ${activeProduct}` : "Product Affinity")}
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                {isDrilled ? "Deep dive into selection" : "Click a bar to explore distributor-level details"}
                            </p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => downloadChart(chartRef, "vad_analysis_chart")}
                                className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors border border-gray-100 shadow-sm"
                                title="Download as Image"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            </button>
                            <div className="flex items-center gap-2">
                                {isDrilled && (
                                    <button onClick={resetDrill} className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-red-100 shadow-sm hover:bg-red-100 transition-all">Reset Drill</button>
                                )}
                                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100">
                                    {[null, 5, 10, 20].map(n => (
                                        <button key={String(n)} onClick={() => setTopN(n)} className={`px-3 py-1.5 rounded-lg text-[9px] font-black transition-all ${topN === n ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>
                                            {n || "ALL"}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1">
                        <Bar
                            ref={chartRef}
                            data={{
                                labels: chartData.labels,
                                datasets: [{
                                    label: metric === "value" ? "Sales (INR)" : "Quantity",
                                    data: chartData.values,
                                    backgroundColor: chartData.values.map((_, i) => colorForIndex(i, chartData.values.length, 0.7).background),
                                    borderRadius: 12,
                                    barThickness: chartData.labels.length > 15 ? 15 : 40
                                }]
                            }}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { display: false },
                                    tooltip: { callbacks: { label: (ctx) => formatValue(ctx.raw) } },
                                    datalabels: { display: false }
                                },
                                onClick: (_, elements) => {
                                    if (!elements.length) return;
                                    const clicked = chartData.labels[elements[0].index];

                                    if (view === "time") {
                                        if (timeLevel === "year") {
                                            setActiveYear(clicked);
                                            setTimeLevel("month");
                                        } else if (timeLevel === "month" && !activeMonth) {
                                            setActiveMonth(clicked);
                                        }
                                    } else if (view === "zone" && !activeRegion) {
                                        setActiveRegion(clicked);
                                    } else if (view === "product" && !activeProduct) {
                                        setActiveProduct(clicked);
                                    }
                                },
                                scales: {
                                    x: { grid: { display: false }, ticks: { font: { weight: 'bold', size: 9 } } },
                                    y: { border: { dash: [4, 4] }, grid: { color: '#F8FAFC' }, ticks: { font: { weight: 'bold', size: 9 }, callback: (v) => formatIndianNumber(v) } }
                                }
                            }}
                        />
                    </div>
                </div>

                {/* Detail Table */}
                <div className="bg-white rounded-[32px] shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-8 border-b border-gray-50">
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Active Distributor Performance</h3>
                    </div>
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-[#F8FAFC] sticky top-0 z-10">
                                <tr>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest">Distributor Name</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Contribution (%)</th>
                                    <th className="px-8 py-5 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Absolute Value</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {Object.entries(filteredRawData.reduce((acc, row) => {
                                    const n = row.__vad || "Unknown";
                                    const v = metric === "value" ? row.__val : row.__qty;
                                    acc[n] = (acc[n] || 0) + v;
                                    return acc;
                                }, {})).sort((a, b) => b[1] - a[1]).slice(0, 50).map(([name, val], i, arr) => {
                                    const totalVal = arr.reduce((sum, item) => sum + item[1], 0);
                                    const pct = totalVal > 0 ? ((val / totalVal) * 100).toFixed(1) : 0;
                                    return (
                                        <tr key={name} className="hover:bg-blue-50/30 transition-colors group">
                                            <td className="px-8 py-4 font-bold text-gray-700 text-[13px]">{name}</td>
                                            <td className="px-8 py-4 text-right">
                                                <div className="flex items-center justify-end gap-3 font-black text-blue-600">
                                                    <div className="w-24 h-1 bg-gray-100 rounded-full overflow-hidden">
                                                        <div className="h-full bg-blue-500 group-hover:bg-blue-600 transition-colors" style={{ width: `${pct}%` }}></div>
                                                    </div>
                                                    <span className="text-[11px] w-10">{pct}%</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-4 font-black text-gray-900 text-right text-[13px]">{formatValue(val)}</td>
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
