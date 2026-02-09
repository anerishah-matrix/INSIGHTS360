import { useMemo, useState, useEffect, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
    Chart as ChartJS,
    BarElement,
    CategoryScale,
    LinearScale,
    Tooltip,
    Legend,
} from "chart.js";
import { parseSIVADDate, getFinancialYear } from "../utils/DataUtils";
import { colorForIndex } from "../utils/chartColors";

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const formatNumber = (val) => {
    const num = Number(val || 0);
    if (num >= 10000000) return (num / 10000000).toFixed(2) + " Cr";
    else if (num >= 100000) return (num / 100000).toFixed(2) + " Lac";
    return num.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

export default function SIVADPage({
    rawData,
    selectedProducts,
    selectedYears,
    selectedVADs,
    view,   // 'time' | 'product' | 'zone'
}) {
    // Drill-down stack: each item is { type: 'year'|'month'|'vad'|'si'|'product'|'state', value: '...' }
    const [drillStack, setDrillStack] = useState([]);
    const chartRef = useRef(null);

    // Reset drill on view/filter change
    useEffect(() => {
        setDrillStack([]);
    }, [view, selectedYears, selectedVADs, selectedProducts]);

    // 1. Filter Data specific to SI-VAD file
    const filteredData = useMemo(() => {
        let data = rawData.filter(r => r.__isSIVAD);

        // Global Filters
        if (selectedVADs?.length > 0) {
            const set = new Set(selectedVADs);
            data = data.filter(r => set.has(r.__vad));
        }
        if (selectedProducts?.length > 0) {
            const set = new Set(selectedProducts);
            data = data.filter(r => set.has(r.__product));
        }
        if (selectedYears?.length > 0) {
            const set = new Set(selectedYears);
            data = data.filter(r => set.has(r.__fy));
        }

        // Drill Filters
        for (const filter of drillStack) {
            if (filter.type === 'year') {
                data = data.filter(r => r.__fy === filter.value);
            } else if (filter.type === 'month') {
                data = data.filter(r => r.__monthShort === filter.value);
            } else if (filter.type === 'vad') {
                data = data.filter(r => r.__vad === filter.value);
            } else if (filter.type === 'si') {
                data = data.filter(r => r.__si === filter.value);
            } else if (filter.type === 'product') {
                data = data.filter(r => r.__product === filter.value);
            } else if (filter.type === 'state') {
                data = data.filter(r => r["Party State"] === filter.value);
            }
        }

        return data;
    }, [rawData, selectedVADs, selectedProducts, selectedYears, drillStack]);

    // 2. Determine current level and group data
    const chartData = useMemo(() => {
        const group = (keyFn) => {
            const agg = {};
            filteredData.forEach(row => {
                const k = keyFn(row) || "Unknown";
                agg[k] = (agg[k] || 0) + row.__qty;
            });
            return Object.entries(agg)
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => ({ label: k, value: v }));
        };

        // VIEW LOGIC
        if (view === "time") {
            const stackTypes = drillStack.map(d => d.type);

            if (!stackTypes.includes('year') && filteredData.some(r => r.__fy !== "Unknown")) {
                const res = group(r => r.__fy);
                return { type: 'year', data: res.sort((a, b) => b.label.localeCompare(a.label)) };
            }
            if (!stackTypes.includes('month')) {
                const res = group(r => r.__monthShort);
                const mOrder = { Apr: 1, May: 2, Jun: 3, Jul: 4, Aug: 5, Sep: 6, Oct: 7, Nov: 8, Dec: 9, Jan: 10, Feb: 11, Mar: 12 };
                return { type: 'month', data: res.sort((a, b) => (mOrder[a.label] || 0) - (mOrder[b.label] || 0)) };
            }
            if (!stackTypes.includes('vad')) return { type: 'vad', data: group(r => r.__vad) };
            if (!stackTypes.includes('si')) return { type: 'si', data: group(r => r.__si) };
            return { type: 'product', data: group(r => r.__product) };
        }

        if (view === "product") {
            const stackTypes = drillStack.map(d => d.type);
            if (!stackTypes.includes('product')) return { type: 'product', data: group(r => r.__product) };
            if (!stackTypes.includes('vad')) return { type: 'vad', data: group(r => r.__vad) };
            return { type: 'si', data: group(r => r.__si) };
        }

        if (view === "zone") {
            const stackTypes = drillStack.map(d => d.type);
            if (!stackTypes.includes('state')) return { type: 'state', data: group(r => r["Party State"]) };
            if (!stackTypes.includes('vad')) return { type: 'vad', data: group(r => r.__vad) };
            return { type: 'si', data: group(r => r.__si) };
        }

        return { type: 'none', data: [] };
    }, [filteredData, view, drillStack]);

    const handleBarClick = (element) => {
        if (!element.length) return;
        const index = element[0].index;
        const label = chartData.data[index].label;

        setDrillStack(prev => [...prev, { type: chartData.type, value: label }]);
    };

    const handleReset = () => {
        setDrillStack([]);
    };

    const handleBack = () => {
        setDrillStack(prev => prev.slice(0, -1));
    };

    const currentTitle = useMemo(() => {
        const parts = [];
        if (view === "time") parts.push("Time Analysis");
        else if (view === "product") parts.push("Product Analysis");
        else parts.push("Regional Analysis");

        drillStack.forEach(d => parts.push(d.value));
        return parts.join(" > ");
    }, [view, drillStack]);

    return (
        <div className="grid grid-cols-12 gap-8 animate-fadeIn">
            {/* Main Chart */}
            <div className="col-span-12 bg-white p-8 rounded-[32px] shadow-sm border border-gray-50 h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">{currentTitle}</h3>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                            {drillStack.length > 0 ? "Click 'Back' to go up a level" : "Click a bar to drill down"}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        {drillStack.length > 0 && (
                            <>
                                <button onClick={handleBack} className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-gray-100 transition-all">Back</button>
                                <button onClick={handleReset} className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-all">Reset</button>
                            </>
                        )}
                    </div>
                </div>

                <div className="flex-1 relative">
                    <Bar
                        ref={chartRef}
                        data={{
                            labels: chartData.data.map(d => d.label),
                            datasets: [{
                                label: "Quantity",
                                data: chartData.data.map(d => d.value),
                                backgroundColor: chartData.data.map((_, i) => colorForIndex(i, chartData.data.length, 0.7).background),
                                borderRadius: 8,
                                barThickness: chartData.data.length > 20 ? 10 : 30
                            }]
                        }}
                        options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false },
                                tooltip: {
                                    callbacks: {
                                        label: (ctx) => `${ctx.raw.toLocaleString()} Units`
                                    }
                                }
                            },
                            scales: {
                                x: { grid: { display: false }, ticks: { font: { size: 10, weight: 'bold' } } },
                                y: { border: { dash: [4, 4] }, grid: { color: '#F8FAFC' } }
                            },
                            onClick: (_, elems) => handleBarClick(elems)
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
