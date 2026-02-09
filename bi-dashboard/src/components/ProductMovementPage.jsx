// import { useMemo, useState, useRef } from "react";
// import { Bar, Line } from "react-chartjs-2";
// import {
//     Chart as ChartJS,
//     BarElement,
//     CategoryScale,
//     LinearScale,
//     Tooltip,
//     Legend,
//     PointElement,
//     LineElement,
//     Title,
//     Filler
// } from "chart.js";
// import { format } from "date-fns";

// ChartJS.register(
//     BarElement,
//     CategoryScale,
//     LinearScale,
//     Tooltip,
//     Legend,
//     PointElement,
//     LineElement,
//     Title,
//     Filler
// );

// const MONTHS_ORDER = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];

// const formatNumber = (val) => {
//     const num = Number(val || 0);
//     if (Math.abs(num) >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
//     else if (Math.abs(num) >= 100000) return (num / 100000).toFixed(2) + " L";
//     return num.toLocaleString("en-IN");
// };

// export default function ProductMovementPage({ data }) {
//     const [selectedYear, setSelectedYear] = useState("");
//     const [selectedProduct, setSelectedProduct] = useState("");
//     const [metric, setMetric] = useState("value"); // value, quantity, cm2

//     // 1. Extract Years & Products for Filters
//     const { allYears, allProducts } = useMemo(() => {
//         const years = new Set();
//         const products = new Set();
//         data.forEach(d => {
//             if (d.fy) years.add(d.fy);
//             if (d.product) products.add(d.product);
//         });
//         return {
//             allYears: Array.from(years).sort().reverse(),
//             allProducts: Array.from(products).sort()
//         };
//     }, [data]);

//     // Default selection
//     useMemo(() => {
//         if (!selectedYear && allYears.length > 0) setSelectedYear(allYears[0]);
//     }, [allYears]);

//     // 2. Filter Data
//     const filteredData = useMemo(() => {
//         return data.filter(d => {
//             if (selectedYear && d.fy !== selectedYear) return false;
//             if (selectedProduct && d.product !== selectedProduct) return false;
//             if (d.metric !== metric) return false;
//             return true;
//         });
//     }, [data, selectedYear, selectedProduct, metric]);

//     // 3. Aggregate for KPI Cards (Yearly Total)
//     const kpis = useMemo(() => {
//         let target = 0;
//         let achieved = 0;
//         filteredData.forEach(d => {
//             if (d.type === 'Target') target += d.amount;
//             if (d.type === 'Achieved') achieved += d.amount;
//         });
//         const achievementPct = target > 0 ? ((achieved / target) * 100).toFixed(1) : 0;
//         return { target, achieved, achievementPct };
//     }, [filteredData]);

//     // 4. Monthly Trend Data (Target vs Achieved)
//     const chartData = useMemo(() => {
//         const monthlyTarget = {};
//         const monthlyAchieved = {};

//         MONTHS_ORDER.forEach(m => {
//             monthlyTarget[m] = 0;
//             monthlyAchieved[m] = 0;
//         });

//         filteredData.forEach(d => {
//             if (d.type === 'Target') monthlyTarget[d.month] = (monthlyTarget[d.month] || 0) + d.amount;
//             if (d.type === 'Achieved') monthlyAchieved[d.month] = (monthlyAchieved[d.month] || 0) + d.amount;
//         });

//         return {
//             labels: MONTHS_ORDER,
//             datasets: [
//                 {
//                     label: 'Target',
//                     data: MONTHS_ORDER.map(m => monthlyTarget[m]),
//                     backgroundColor: '#E2E8F0', // Gray-200
//                     borderColor: '#94A3B8', // Gray-400
//                     borderWidth: 2,
//                     type: 'bar',
//                     order: 2,
//                     borderRadius: 4,
//                 },
//                 {
//                     label: 'Achieved',
//                     data: MONTHS_ORDER.map(m => monthlyAchieved[m]),
//                     borderColor: '#3B82F6', // Blue-500
//                     backgroundColor: 'rgba(59, 130, 246, 0.1)',
//                     borderWidth: 3,
//                     tension: 0.3,
//                     pointRadius: 4,
//                     pointBackgroundColor: '#FFFFFF',
//                     pointBorderWidth: 2,
//                     type: 'line',
//                     order: 1,
//                     fill: true
//                 }
//             ]
//         };
//     }, [filteredData]);

//     // 5. Product-wise Performance (Only if NO product specifically selected)
//     // Shows Top 10 Products by Achievement % or Absolute Achievement value
//     const productPerformance = useMemo(() => {
//         if (selectedProduct) return []; // Don't show if single product selected

//         // Need to aggregate ALL products for current year/metric, regardless of 'selectedProduct' state
//         // So we re-filter from 'data' just by Year and Metric
//         const yearData = data.filter(d =>
//             (!selectedYear || d.fy === selectedYear) &&
//             d.metric === metric
//         );

//         const prodMap = {};
//         yearData.forEach(d => {
//             if (!prodMap[d.product]) prodMap[d.product] = { target: 0, achieved: 0 };
//             if (d.type === 'Target') prodMap[d.product].target += d.amount;
//             if (d.type === 'Achieved') prodMap[d.product].achieved += d.amount;
//         });

//         return Object.entries(prodMap)
//             .map(([name, vals]) => ({
//                 name,
//                 target: vals.target,
//                 achieved: vals.achieved,
//                 pct: vals.target > 0 ? (vals.achieved / vals.target) * 100 : 0
//             }))
//             .sort((a, b) => b.achieved - a.achieved) // Sort by highest absolute achievement
//             .slice(0, 50);
//     }, [data, selectedYear, metric, selectedProduct]);

//     // Download Chart Feature
//     const chartRef = useRef(null);
//     const downloadChart = () => {
//         if (chartRef.current) {
//             const link = document.createElement('a');
//             link.download = `ProductMovement_${metric}_${selectedYear || 'All'}.png`;
//             link.href = chartRef.current.toBase64Image();
//             link.click();
//         }
//     };

//     return (
//         <div className="space-y-8 animate-fadeIn">
//             {/* Header & Controls */}
//             <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
//                 <div>
//                     <h2 className="text-2xl font-black text-gray-900 tracking-tight">Product Movement Analysis</h2>
//                     <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Target vs Achieved Real-time Tracking</p>
//                 </div>

//                 <div className="flex flex-wrap items-center gap-3">
//                     {/* Metric Toggle */}
//                     <div className="bg-gray-50 p-1 rounded-xl border border-gray-100 flex items-center">
//                         {['value', 'quantity', 'cm2'].map(m => (
//                             <button
//                                 key={m}
//                                 onClick={() => setMetric(m)}
//                                 className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${metric === m ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
//                                     }`}
//                             >
//                                 {m === 'value' ? 'Sales (Val)' : m === 'quantity' ? 'Quantity' : 'CM2'}
//                             </button>
//                         ))}
//                     </div>

//                     <div className="h-8 w-px bg-gray-100 mx-2"></div>

//                     <select
//                         value={selectedYear}
//                         onChange={e => setSelectedYear(e.target.value)}
//                         className="bg-gray-50 border-none text-[11px] font-bold text-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer"
//                     >
//                         {allYears.map(y => <option key={y} value={y}>{y}</option>)}
//                     </select>

//                     <select
//                         value={selectedProduct}
//                         onChange={e => setSelectedProduct(e.target.value)}
//                         className="bg-gray-50 border-none text-[11px] font-bold text-gray-700 rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-blue-100 cursor-pointer max-w-[200px]"
//                     >
//                         <option value="">All Products</option>
//                         {allProducts.map(p => <option key={p} value={p}>{p}</option>)}
//                     </select>
//                 </div>
//             </div>

//             {/* KPI Cards */}
//             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
//                 <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[24px] text-white shadow-lg shadow-blue-200">
//                     <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">Total Achieved</p>
//                     <h3 className="text-3xl font-black">{formatNumber(kpis.achieved)}</h3>
//                 </div>
//                 <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
//                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Target</p>
//                     <h3 className="text-3xl font-black text-gray-900">{formatNumber(kpis.target)}</h3>
//                 </div>
//                 <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between">
//                     <div>
//                         <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Achievement %</p>
//                         <h3 className={`text-3xl font-black ${Number(kpis.achievementPct) >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
//                             {kpis.achievementPct}%
//                         </h3>
//                     </div>
//                     {/* Simple Radial Progress or Icon */}
//                     <div className="w-12 h-12 rounded-full border-4 border-gray-50 flex items-center justify-center">
//                         <svg className={`w-6 h-6 ${Number(kpis.achievementPct) >= 100 ? 'text-emerald-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
//                     </div>
//                 </div>
//             </div>

//             {/* Main Chart Section */}
//             <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
//                 <div className="flex items-center justify-between mb-8">
//                     <div>
//                         <h3 className="text-lg font-black text-gray-900">Monthly Performance Trend</h3>
//                         <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-1">
//                             {selectedProduct || "Overall Portfolio"} — {selectedYear}
//                         </p>
//                     </div>
//                     <button onClick={downloadChart} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors">
//                         <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
//                     </button>
//                 </div>
//                 <div className="h-[400px]">
//                     <Line
//                         ref={chartRef}
//                         data={chartData}
//                         options={{
//                             responsive: true,
//                             maintainAspectRatio: false,
//                             scales: {
//                                 y: {
//                                     beginAtZero: true,
//                                     border: { dash: [4, 4] },
//                                     grid: { color: '#F8FAFC' },
//                                     ticks: { font: { weight: 'bold', size: 10 }, callback: (v) => formatNumber(v) }
//                                 },
//                                 x: {
//                                     grid: { display: false },
//                                     ticks: { font: { weight: 'bold', size: 10 } }
//                                 }
//                             },
//                             plugins: {
//                                 legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { weight: 'bold' } } },
//                                 tooltip: {
//                                     backgroundColor: '#1E293B',
//                                     padding: 12,
//                                     titleFont: { weight: 'bold' },
//                                     callbacks: { label: (c) => ` ${c.dataset.label}: ${formatNumber(c.raw)}` }
//                                 }
//                             }
//                         }}
//                     />
//                 </div>
//             </div>

//             {/* Product Wise Breakdown (Table) - Only visible if no product selected */}
//             {!selectedProduct && productPerformance.length > 0 && (
//                 <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] overflow-hidden">
//                     <h3 className="text-lg font-black text-gray-900 mb-6">Product Performance Breakdown</h3>
//                     <div className="overflow-x-auto">
//                         <table className="w-full text-left">
//                             <thead>
//                                 <tr className="border-b border-gray-50">
//                                     <th className="pb-4 pl-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
//                                     <th className="pb-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Target</th>
//                                     <th className="pb-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Achieved</th>
//                                     <th className="pb-4 pr-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Completion</th>
//                                 </tr>
//                             </thead>
//                             <tbody className="divide-y divide-gray-50">
//                                 {productPerformance.map((p, i) => (
//                                     <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
//                                         <td className="py-4 pl-4 font-bold text-xs text-gray-700">{p.name}</td>
//                                         <td className="py-4 text-right font-bold text-xs text-gray-500">{formatNumber(p.target)}</td>
//                                         <td className="py-4 text-right font-black text-sm text-gray-900">{formatNumber(p.achieved)}</td>
//                                         <td className="py-4 pr-4">
//                                             <div className="flex items-center justify-end gap-3">
//                                                 <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
//                                                     <div
//                                                         className={`h-full rounded-full ${p.pct >= 100 ? 'bg-emerald-500' : p.pct >= 80 ? 'bg-blue-500' : 'bg-red-400'}`}
//                                                         style={{ width: `${Math.min(p.pct, 100)}%` }}
//                                                     ></div>
//                                                 </div>
//                                                 <span className={`text-[10px] font-black w-8 text-right ${p.pct >= 100 ? 'text-emerald-600' : 'text-gray-500'}`}>
//                                                     {p.pct.toFixed(0)}%
//                                                 </span>
//                                             </div>
//                                         </td>
//                                     </tr>
//                                 ))}
//                             </tbody>
//                         </table>
//                     </div>
//                 </div>
//             )}
//         </div>
//     );
// }


import { useMemo, useState, useRef } from "react";
import { Bar, Line } from "react-chartjs-2";
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    Title,
    Filler
} from "chart.js";
import { format } from "date-fns";
ChartJS.register(
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    Title,
    Filler
);
const MONTHS_ORDER = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan', 'Feb', 'Mar'];
const formatNumber = (val) => {
    const num = Number(val || 0);
    if (Math.abs(num) >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
    else if (Math.abs(num) >= 100000) return (num / 100000).toFixed(2) + " L";
    return num.toLocaleString("en-IN");
};
export default function ProductMovementPage({ data, selectedProducts, selectedYears, metric: globalMetric }) {
    // We still need a local metric toggle because 'cm2' is unique to this page
    const [localMetric, setLocalMetric] = useState(null);
    const activeMetric = localMetric || globalMetric;

    // Filter Data based on global props
    const filteredData = useMemo(() => {
        return data.filter(d => {
            if (selectedYears && selectedYears.length > 0 && !selectedYears.includes(d.fy)) return false;
            if (selectedProducts && selectedProducts.length > 0 && !selectedProducts.includes(d.product)) return false;
            if (d.metric !== activeMetric) return false;
            return true;
        });
    }, [data, selectedYears, selectedProducts, activeMetric]);

    const kpis = useMemo(() => {
        let target = 0;
        let achieved = 0;
        filteredData.forEach(d => {
            if (d.type === 'Target') target += d.amount;
            if (d.type === 'Achieved') achieved += d.amount;
        });
        const achievementPct = target > 0 ? ((achieved / target) * 100).toFixed(1) : 0;
        return { target, achieved, achievementPct };
    }, [filteredData]);

    const chartData = useMemo(() => {
        const monthlyTarget = {};
        const monthlyAchieved = {};
        MONTHS_ORDER.forEach(m => {
            monthlyTarget[m] = 0;
            monthlyAchieved[m] = 0;
        });
        filteredData.forEach(d => {
            if (d.type === 'Target') monthlyTarget[d.month] = (monthlyTarget[d.month] || 0) + d.amount;
            if (d.type === 'Achieved') monthlyAchieved[d.month] = (monthlyAchieved[d.month] || 0) + d.amount;
        });
        return {
            labels: MONTHS_ORDER,
            datasets: [
                {
                    label: 'Target',
                    data: MONTHS_ORDER.map(m => monthlyTarget[m]),
                    backgroundColor: '#E2E8F0',
                    borderColor: '#94A3B8',
                    borderWidth: 2,
                    type: 'bar',
                    order: 2,
                    borderRadius: 4,
                },
                {
                    label: 'Achieved',
                    data: MONTHS_ORDER.map(m => monthlyAchieved[m]),
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    tension: 0.3,
                    pointRadius: 4,
                    pointBackgroundColor: '#FFFFFF',
                    pointBorderWidth: 2,
                    type: 'line',
                    order: 1,
                    fill: true
                }
            ]
        };
    }, [filteredData]);

    const productPerformance = useMemo(() => {
        // If multiple products are selected or filtered, showing a breakdown makes sense
        const prodMap = {};
        filteredData.forEach(d => {
            if (!prodMap[d.product]) prodMap[d.product] = { target: 0, achieved: 0 };
            if (d.type === 'Target') prodMap[d.product].target += d.amount;
            if (d.type === 'Achieved') prodMap[d.product].achieved += d.amount;
        });
        return Object.entries(prodMap)
            .map(([name, vals]) => ({
                name,
                target: vals.target,
                achieved: vals.achieved,
                pct: vals.target > 0 ? (vals.achieved / vals.target) * 100 : 0
            }))
            .sort((a, b) => b.achieved - a.achieved)
            .slice(0, 15);
    }, [filteredData]);

    const chartRef = useRef();
    const downloadChart = () => {
        if (chartRef.current) {
            const link = document.createElement("a");
            link.download = `product-movement-${activeMetric}.png`;
            link.href = chartRef.current.toBase64Image();
            link.click();
        }
    };

    const isFiltered = (selectedYears && selectedYears.length > 0) || (selectedProducts && selectedProducts.length > 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-6 bg-white p-6 rounded-[24px] shadow-sm border border-gray-100">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Product Movement Analysis</h2>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Target vs Achieved Real-time Tracking</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="bg-gray-50 p-1 rounded-xl border border-gray-100 flex items-center">
                        {[
                            { id: 'value', label: 'Sales (Val)' },
                            { id: 'quantity', label: 'Quantity' },
                            { id: 'cm2', label: 'CM2' }
                        ].map(m => (
                            <button
                                key={m.id}
                                onClick={() => setLocalMetric(m.id)}
                                className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${activeMetric === m.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                                    }`}
                            >
                                {m.label}
                            </button>
                        ))}
                    </div>

                    {isFiltered && (
                        <div className="flex gap-2">
                            <div className="h-8 w-px bg-gray-100 mx-2"></div>
                            {selectedYears.length > 0 && (
                                <span className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100">
                                    {selectedYears.length === 1 ? selectedYears[0] : `${selectedYears.length} Years`}
                                </span>
                            )}
                            {selectedProducts.length > 0 && (
                                <span className="bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                                    {selectedProducts.length === 1 ? (selectedProducts[0].length > 15 ? selectedProducts[0].substring(0, 15) + '...' : selectedProducts[0]) : `${selectedProducts.length} Products`}
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-[24px] text-white shadow-lg shadow-blue-200">
                    <p className="text-[10px] font-bold opacity-80 uppercase tracking-widest mb-1">Total Achieved</p>
                    <h3 className="text-3xl font-black">{formatNumber(kpis.achieved)}</h3>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Target</p>
                    <h3 className="text-3xl font-black text-gray-900">{formatNumber(kpis.target)}</h3>
                </div>
                <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Achievement %</p>
                        <h3 className={`text-3xl font-black ${Number(kpis.achievementPct) >= 100 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {kpis.achievementPct}%
                        </h3>
                    </div>
                    <div className="w-12 h-12 rounded-full border-4 border-gray-50 flex items-center justify-center">
                        <svg className={`w-6 h-6 ${Number(kpis.achievementPct) >= 100 ? 'text-emerald-500' : 'text-amber-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
                    </div>
                </div>
            </div>
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)]">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-black text-gray-900">Monthly Performance Trend</h3>
                        <p className="text-gray-400 text-[11px] font-bold uppercase tracking-widest mt-1">
                            {selectedProducts.length === 1 ? selectedProducts[0] : selectedProducts.length > 1 ? `${selectedProducts.length} Products` : "Overall Portfolio"} — {selectedYears.length === 1 ? selectedYears[0] : selectedYears.length > 1 ? `${selectedYears.length} Years` : "All Time"}
                        </p>
                    </div>
                    <button onClick={downloadChart} className="p-2 hover:bg-gray-50 rounded-xl text-gray-400 transition-colors">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    </button>
                </div>
                <div className="h-[400px]">
                    <Line
                        ref={chartRef}
                        data={chartData}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    border: { dash: [4, 4] },
                                    grid: { color: '#F8FAFC' },
                                    ticks: { font: { weight: 'bold', size: 10 }, callback: (v) => formatNumber(v) }
                                },
                                x: {
                                    grid: { display: false },
                                    ticks: { font: { weight: 'bold', size: 10 } }
                                }
                            },
                            plugins: {
                                legend: { position: 'top', align: 'end', labels: { usePointStyle: true, boxWidth: 8, font: { weight: 'bold' } } },
                                tooltip: {
                                    backgroundColor: '#1E293B',
                                    padding: 12,
                                    titleFont: { weight: 'bold' },
                                    callbacks: { label: (c) => ` ${c.dataset.label}: ${formatNumber(c.raw)}` }
                                },
                                datalabels: { display: false }
                            }
                        }}
                    />
                </div>
            </div>
            {selectedProducts.length !== 1 && productPerformance.length > 0 && (
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-[0_2px_15px_rgba(0,0,0,0.02)] overflow-hidden">
                    <h3 className="text-lg font-black text-gray-900 mb-6">Product Performance Breakdown</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-gray-50">
                                    <th className="pb-4 pl-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</th>
                                    <th className="pb-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Target</th>
                                    <th className="pb-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Achieved</th>
                                    <th className="pb-4 pr-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Completion</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {productPerformance.map((p, i) => (
                                    <tr key={i} className="group hover:bg-gray-50/50 transition-colors">
                                        <td className="py-4 pl-4 font-bold text-xs text-gray-700">{p.name}</td>
                                        <td className="py-4 text-right font-bold text-xs text-gray-500">{formatNumber(p.target)}</td>
                                        <td className="py-4 text-right font-black text-sm text-gray-900">{formatNumber(p.achieved)}</td>
                                        <td className="py-4 pr-4">
                                            <div className="flex items-center justify-end gap-3">
                                                <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${p.pct >= 100 ? 'bg-emerald-500' : p.pct >= 80 ? 'bg-blue-500' : 'bg-red-400'}`}
                                                        style={{ width: `${Math.min(p.pct, 100)}%` }}
                                                    ></div>
                                                </div>
                                                <span className={`text-[10px] font-black w-8 text-right ${p.pct >= 100 ? 'text-emerald-600' : 'text-gray-500'}`}>
                                                    {p.pct.toFixed(0)}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}