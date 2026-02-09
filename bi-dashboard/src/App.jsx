import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import Dashboard from "./components/Dashboard.jsx";
import ZonePage from "./components/ZonePage.jsx";
import VADPage from "./components/VADPage.jsx";
import SIVADPage from "./components/SIVADPage.jsx";
import SearchableMultiSelect from "./components/SearchableMultiSelect.jsx";
import ProductMovementPage from "./components/ProductMovementPage.jsx";
import { parseExcelDate, parseSIVADDate, getFinancialYear, processProductMovementData } from "./utils/DataUtils";
import { useAuth } from "./context/AuthContext";
import Login from "./components/auth/Login";
import Signup from "./components/auth/Signup";
import ForgotPassword from "./components/auth/ForgotPassword";
import ProtectedRoute from "./components/auth/ProtectedRoute";

// Reusable Collapsible Wrapper for Sidebar
function SidebarSection({ title, isOpen, onToggle, children, icon }) {
    return (
        <div className="border-b border-gray-50 last:border-0 pb-4 mb-4">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between group transition-all"
            >
                <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg transition-colors ${isOpen ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100 group-hover:text-gray-600'}`}>
                        {icon}
                    </div>
                    <div className="text-left">
                        <h4 className={`text-[11px] font-black uppercase tracking-widest transition-colors ${isOpen ? 'text-gray-900' : 'text-gray-400 group-hover:text-gray-600'}`}>
                            {title}
                        </h4>
                    </div>
                </div>
                <svg
                    className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="mt-4 animate-fadeIn">
                    {children}
                </div>
            )}
        </div>
    );
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
                path="/*"
                element={
                    <ProtectedRoute>
                        <DashboardContainerWrapper />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}

function DashboardContainerWrapper() {
    const { user } = useAuth();
    // Force remount of the entire dashboard state when the user changes
    return <DashboardContainer key={user?.email || 'guest'} />;
}

function DashboardContainer() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    // Helper to get user-specific key - ensure we never use "undefined_"
    const userKey = useCallback((key) => {
        if (!user?.email) return `guest_${key}`;
        return `${user.email}_${key}`;
    }, [user?.email]);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [sidebarWidth, setSidebarWidth] = useState(() => {
        const saved = localStorage.getItem(userKey("sidebarWidth"));
        return saved ? parseInt(saved, 10) : 280;
    });
    const [isResizing, setIsResizing] = useState(false);

    const startResizing = useCallback(() => {
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((e) => {
        if (isResizing) {
            const newWidth = e.clientX;
            if (newWidth >= 200 && newWidth <= 600) {
                setSidebarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
        } else {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        }
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    useEffect(() => {
        localStorage.setItem(userKey("sidebarWidth"), sidebarWidth);
    }, [sidebarWidth, user?.email, userKey]);

    const [page, setPage] = useState(() => localStorage.getItem(userKey("page")) || "overall");
    const [folderId, setFolderId] = useState(() => localStorage.getItem(userKey("folderId")) || "");
    const [rawData, setRawData] = useState([]);
    const [productMovementData, setProductMovementData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [autoRefresh, setAutoRefresh] = useState(false);

    // --- SHARED FILTERS ---
    const [selectedProducts, setSelectedProducts] = useState(() => {
        if (user?.preferences?.selectedProducts) return user.preferences.selectedProducts;
        const saved = localStorage.getItem(userKey("selectedProducts"));
        try { return saved ? JSON.parse(saved) : []; } catch { return []; }
    });
    const [selectedYears, setSelectedYears] = useState(() => {
        if (user?.preferences?.selectedYears) return user.preferences.selectedYears;
        const saved = localStorage.getItem(userKey("selectedYears"));
        try { return saved ? JSON.parse(saved) : []; } catch { return []; }
    });
    const [selectedVADs, setSelectedVADs] = useState(() => {
        if (user?.preferences?.selectedVADs) return user.preferences.selectedVADs;
        const saved = localStorage.getItem(userKey("selectedVADs"));
        try { return saved ? JSON.parse(saved) : []; } catch { return []; }
    });
    const [metric, setMetric] = useState(() => {
        return user?.preferences?.metric || localStorage.getItem(userKey("metric")) || "value";
    });

    const [dashboardView, setDashboardView] = useState(() => {
        return user?.preferences?.dashboardView || localStorage.getItem(userKey("dashboardView")) || "overall";
    });
    const [vadView, setVadView] = useState(() => {
        return user?.preferences?.vadView || localStorage.getItem(userKey("vadView")) || "time";
    });
    const [sivadView, setSivadView] = useState(() => {
        return user?.preferences?.sivadView || localStorage.getItem(userKey("sivadView")) || "time";
    });

    const { savePreferences } = useAuth();
    useEffect(() => {
        const prefs = { selectedProducts, selectedYears, selectedVADs, metric, dashboardView, vadView, sivadView };
        savePreferences(prefs);
    }, [selectedProducts, selectedYears, selectedVADs, metric, dashboardView, vadView, sivadView]);

    useEffect(() => { localStorage.setItem(userKey("page"), page); }, [page, user?.email]);
    useEffect(() => { localStorage.setItem(userKey("folderId"), folderId); }, [folderId, user?.email]);
    useEffect(() => { localStorage.setItem(userKey("selectedProducts"), JSON.stringify(selectedProducts)); }, [selectedProducts, user?.email]);
    useEffect(() => { localStorage.setItem(userKey("selectedYears"), JSON.stringify(selectedYears)); }, [selectedYears, user?.email]);
    useEffect(() => { localStorage.setItem(userKey("selectedVADs"), JSON.stringify(selectedVADs)); }, [selectedVADs, user?.email]);
    useEffect(() => { localStorage.setItem(userKey("metric"), metric); }, [metric, user?.email]);
    useEffect(() => { localStorage.setItem(userKey("dashboardView"), dashboardView); }, [dashboardView, user?.email]);
    useEffect(() => { localStorage.setItem(userKey("vadView"), vadView); }, [vadView, user?.email]);
    useEffect(() => { localStorage.setItem(userKey("sivadView"), sivadView); }, [sivadView, user?.email]);

    const [openSections, setOpenSections] = useState({ products: true, vads: false });
    const toggleSection = (s) => setOpenSections(prev => ({ ...prev, [s]: !prev[s] }));

    const loadFromDrive = async () => {
        if (!folderId.trim()) return;
        setLoading(true);
        try {
            setError("");
            const res = await fetch("http://localhost:5001/api/drive/folder", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ folderId: folderId.trim() }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to load Drive data");

            setRawData(Array.isArray(json.data) ? json.data : []);

            if (json.productMovementSheets) {
                let allProcessed = [];
                for (const sheet of json.productMovementSheets) {
                    const processed = processProductMovementData(sheet.data, sheet.fileName, sheet.sheetName);
                    allProcessed = allProcessed.concat(processed);
                }
                setProductMovementData(allProcessed);
            }
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const processedRawData = useMemo(() => {
        return rawData.map(row => {
            // Pre-calculate expensive date fields
            const invoiceDate = row["INVOICE DATE"] ? parseExcelDate(row["INVOICE DATE"]) : null;
            const sivadDate = row["Date"] ? parseSIVADDate(row["Date"]) : null;

            const dateObj = sivadDate || invoiceDate;
            const fy = getFinancialYear(dateObj);
            // .replace('.', '') handles locales that might produce "Nov." instead of "Nov"
            const monthShort = dateObj ? dateObj.toLocaleString('en-US', { month: 'short' }).replace('.', '') : "Unknown";

            // Pre-calculate quantities
            const qty = Number(row["Acutal Quantity"] || row["Actual Quantity"] || row["Total Quantity"] || row["total Quantity"] || row["QUANTITY"] || 0);

            // SI-VAD files use "SI PRICE" (Unit Price) while regular billing uses "ASSESSABLE VAL INR" (Total Value)
            const isSIVADFile = (row["__sourceFile"] || "").toLowerCase().includes("vad") && (row["__sourceFile"] || "").toLowerCase().includes("si");
            const rawSIPrice = Number(row["SI PRICE"] || 0);
            const rawTotalVal = Number(row["ASSESSABLE VAL INR"] || row["Assessable Value"] || row["Net Value"] || 0);

            let val = rawTotalVal;
            if (isSIVADFile && rawSIPrice > 0) {
                val = rawSIPrice * qty; // Calculate total sales value for relations
            } else if (val === 0 && rawSIPrice > 0) {
                val = rawSIPrice * qty; // Fallback calculation
            }

            const product = row["ITEM NAME"] || row["Item Name"] || "Unknown";
            const vad = row["CUSTOMER NAME"] || row["Company Name"] || "Unknown";
            const si = row["Party Name"] || "N/A";

            return {
                ...row,
                __product: product,
                __vad: vad,
                __si: si,
                __dateObj: dateObj,
                __fy: fy,
                __monthShort: monthShort,
                __qty: qty,
                __val: val,
                __isSIVAD: !!(row["Party Name"] && row["Company Name"] && isSIVADFile)
            };
        });
    }, [rawData]);

    const allProducts = useMemo(() => {
        const set = new Set();
        processedRawData.forEach(row => { if (row.__product) set.add(row.__product); });
        return Array.from(set).sort();
    }, [processedRawData]);

    const allVADs = useMemo(() => {
        const set = new Set();
        processedRawData.forEach(row => { if (row.__vad) set.add(row.__vad); });
        return Array.from(set).sort();
    }, [processedRawData]);

    const allYears = useMemo(() => {
        const years = new Set();
        processedRawData.forEach(row => {
            if (row.__fy !== "Unknown") years.add(row.__fy);
        });
        return Array.from(years).sort().reverse();
    }, [processedRawData]);

    return (
        <div className="min-h-screen bg-[#F8FAFC] font-sans text-gray-900 flex flex-col lg:flex-row overflow-x-hidden">
            {/* LEFT SIDEBAR */}
            <aside
                style={{ width: isSidebarOpen ? `${sidebarWidth}px` : "0px" }}
                className={`bg-white border-r border-gray-100 sticky top-0 h-screen overflow-y-auto z-30 hidden lg:block shrink-0 shadow-[2px_0_12px_rgba(0,0,0,0.01)] transition-all ${!isResizing ? "duration-500" : "duration-0"} ease-in-out ${isSidebarOpen ? "opacity-100" : "opacity-0 -translate-x-full"}`}
            >
                {/* Resize Handle */}
                <div
                    onMouseDown={startResizing}
                    className={`absolute right-0 top-0 w-1.5 h-full cursor-col-resize z-50 hover:bg-blue-400/30 transition-colors group ${isResizing ? "bg-blue-400/50" : "bg-transparent"}`}
                >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0.5 h-8 bg-gray-200 rounded-full group-hover:bg-blue-400 transition-colors opacity-0 group-hover:opacity-100" />
                </div>

                <div className={`p-8 w-full transition-opacity duration-300 ${isSidebarOpen ? "opacity-100" : "opacity-0 invisible"}`}>
                    <div className="mb-12 flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z" /><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z" /></svg>
                        </div>
                        <span className="font-extrabold text-[15px] tracking-tight text-gray-900">Insights360</span>
                    </div>

                    <div className="space-y-8">
                        {page === "overall" && (
                            <div className="space-y-4">
                                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Dashboard View</h3>
                                <div className="space-y-1">
                                    {[["overall", "Time-based"], ["comparative", "Comparative"], ["zone", "Region-wise"], ["model", "Model-wise"]].map(([k, l]) => (
                                        <button key={k} onClick={() => setDashboardView(k)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${dashboardView === k ? "text-blue-600 bg-blue-50/50" : "text-gray-400 hover:text-gray-900"}`}>
                                            <div className={`w-1 h-1 rounded-full ${dashboardView === k ? "bg-blue-600" : "bg-transparent"}`}></div>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {page === "vad" && (
                            <div className="space-y-4">
                                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">VAD Analysis View</h3>
                                <div className="space-y-1">
                                    {[["time", "Time-based"], ["zone", "Zone-wise"], ["product", "Product-wise"]].map(([k, l]) => (
                                        <button key={k} onClick={() => setVadView(k)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${vadView === k ? "text-blue-600 bg-blue-50/50" : "text-gray-400 hover:text-gray-900"}`}>
                                            <div className={`w-1 h-1 rounded-full ${vadView === k ? "bg-blue-600" : "bg-transparent"}`}></div>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {page === "sivad" && (
                            <div className="space-y-4">
                                <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">SI-VAD Views</h3>
                                <div className="space-y-1">
                                    {[["time", "Time-based"], ["product", "Product-wise"], ["zone", "Region-wise"]].map(([k, l]) => (
                                        <button key={k} onClick={() => setSivadView(k)} className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[12px] font-bold transition-all ${sivadView === k ? "text-blue-600 bg-blue-50/50" : "text-gray-400 hover:text-gray-900"}`}>
                                            <div className={`w-1 h-1 rounded-full ${sivadView === k ? "bg-blue-600" : "bg-transparent"}`}></div>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 pt-4 border-t border-gray-50">
                            <h3 className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Filters</h3>
                            <SidebarSection title="Products" isOpen={openSections.products} onToggle={() => toggleSection('products')} icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>}>
                                <div className="bg-[#F8FAFC] rounded-2xl border border-gray-100 overflow-hidden"><SearchableMultiSelect options={allProducts} value={selectedProducts} onChange={setSelectedProducts} placeholder="Search..." heightClass="max-h-64" /></div>
                            </SidebarSection>
                            <SidebarSection title="VADs" isOpen={openSections.vads} onToggle={() => toggleSection('vads')} icon={<svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}>
                                <div className="bg-[#F8FAFC] rounded-2xl border border-gray-100 overflow-hidden"><SearchableMultiSelect options={allVADs} value={selectedVADs} onChange={setSelectedVADs} placeholder="All VADs..." heightClass="max-h-64" /></div>
                            </SidebarSection>
                        </div>
                    </div>
                </div>
            </aside>

            {/* MAIN CONTENT */}
            <div className="flex-1 flex flex-col min-w-0">
                <header className="h-16 bg-white flex items-center justify-between px-10 sticky top-0 z-20 border-b border-gray-50">
                    <div className="flex items-center gap-6">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2.5 bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-blue-600 rounded-xl transition-all active:scale-95 border border-gray-100 shadow-sm">
                            <svg className={`w-5 h-5 transition-transform duration-500 ${!isSidebarOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={isSidebarOpen ? "M11 19l-7-7 7-7m8 14l-7-7 7-7" : "M13 5l7 7-7 7M5 5l7 7-7 7"} />
                            </svg>
                        </button>

                        <div className="flex items-center bg-gray-50/50 border border-gray-100 rounded-2xl p-1 transition-all focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/10 relative">
                            <div className="pl-3 pr-2"><svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                            <input value={folderId} onChange={(e) => { setFolderId(e.target.value); setError(""); }} placeholder="Folder ID..." className="w-48 py-2 text-[13px] bg-transparent font-medium text-gray-900 outline-none" />
                            <button onClick={loadFromDrive} disabled={loading} className="ml-2 px-5 py-2 bg-blue-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-500/10">{loading ? "Syncing..." : "Sync"}</button>
                            {error && (
                                <div className="absolute top-full left-0 mt-2 w-max max-w-xs bg-red-50 border border-red-100 text-red-600 text-[11px] font-bold px-3 py-2 rounded-xl shadow-xl z-50 animate-fadeIn">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                        {error}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="h-6 w-px bg-gray-100 mx-2"></div>

                        <div className="flex items-center gap-3">
                            {page !== "sivad" && (
                                <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-100 h-[38px] transition-all">
                                    <button onClick={() => setMetric("value")} className={`px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${metric === "value" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>Value</button>
                                    <button onClick={() => setMetric("quantity")} className={`px-4 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${metric === "quantity" ? "bg-white text-blue-600 shadow-sm" : "text-gray-400 hover:text-gray-600"}`}>Qty</button>
                                </div>
                            )}

                            <div className="group relative">
                                <button className="flex items-center gap-3 bg-white border border-gray-100 h-[38px] px-4 rounded-xl shadow-sm hover:border-blue-200 transition-all cursor-pointer">
                                    <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
                                    <span className="text-[11px] font-black text-gray-500 uppercase tracking-widest">
                                        {page === "overall" ? "Dashboard" : page === "zone" ? "Regional" : page === "vad" ? "VAD Analysis" : page === "sivad" ? "SI-VAD Relations" : "Product Movement"}
                                    </span>
                                    <svg className="w-3 h-3 text-gray-300 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                </button>
                                <div className="absolute top-full left-0 mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                    {[["overall", "Dashboard"], ["zone", "Regional Analysis"], ["vad", "VAD Analysis"], ["sivad", "SI-VAD Relations"], ["product_movement", "Product Movement"]].map(([t, l]) => (
                                        <button key={t} onClick={() => setPage(t)} className={`w-full text-left px-4 py-2.5 text-[12px] font-bold transition-all flex items-center gap-3 ${page === t ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:bg-gray-50"}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${page === t ? "bg-blue-600" : "bg-transparent"}`}></div>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex items-center gap-3 bg-white border border-gray-100 h-[38px] px-4 rounded-xl shadow-sm hover:border-blue-200 transition-all cursor-pointer">
                                <svg className="w-3.5 h-3.5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                <select value={selectedYears[0] || ""} onChange={(e) => setSelectedYears(e.target.value ? [e.target.value] : [])} className="bg-transparent text-[11px] font-black text-gray-500 uppercase tracking-widest outline-none cursor-pointer">
                                    <option value="">Yearly Filter</option>
                                    {allYears.map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                            <p className="text-[10px] font-bold text-emerald-500 uppercase">{rawData.length > 0 ? "Connected" : "Standing by"}</p>
                        </div>
                        <div className="group relative">
                            <button className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white shadow-lg hover:bg-blue-700 transition-all active:scale-95">
                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>
                            </button>
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <div className="px-4 py-2 border-b border-gray-50 mb-1">
                                    <p className="text-[11px] font-bold text-gray-900 truncate">{user?.name || 'User'}</p>
                                    <p className="text-[10px] text-gray-400 truncate">{user?.email}</p>
                                </div>
                                <button onClick={() => { logout(); navigate('/login'); }} className="w-full text-left px-4 py-2 text-[12px] font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-2">
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="max-w-[1400px] w-full mx-auto px-8 py-10">
                    <main>
                        {processedRawData.length > 0 ? (
                            page === "zone" ? (
                                <ZonePage rawData={processedRawData} selectedProducts={selectedProducts} setSelectedProducts={setSelectedProducts} selectedYears={selectedYears} setSelectedYears={setSelectedYears} metric={metric === "value" ? "sales" : "qty"} setMetric={(m) => setMetric(m === "sales" ? "value" : "quantity")} />
                            ) : page === "vad" ? (
                                <VADPage rawData={processedRawData} selectedProducts={selectedProducts} selectedYears={selectedYears} selectedVADs={selectedVADs} metric={metric} view={vadView} />
                            ) : page === "sivad" ? (
                                <SIVADPage rawData={processedRawData} selectedProducts={selectedProducts} selectedYears={selectedYears} selectedVADs={selectedVADs} metric={metric} view={sivadView} />
                            ) : page === "product_movement" ? (
                                <ProductMovementPage data={productMovementData} selectedProducts={selectedProducts} selectedYears={selectedYears} metric={metric} />
                            ) : (
                                <Dashboard rawData={processedRawData} selectedProducts={selectedProducts} setSelectedProducts={setSelectedProducts} selectedYears={selectedYears} setSelectedYears={setSelectedYears} metric={metric} setMetric={setMetric} view={dashboardView} setView={setDashboardView} allYears={allYears} />
                            )
                        ) : (
                            <div className="flex flex-col items-center justify-center py-24 bg-white border border-gray-100 rounded-[32px] text-center shadow-sm">
                                <div className="p-5 bg-blue-50 rounded-2xl mb-6 relative">
                                    <svg className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                    {loading && <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-2xl"><div className="w-6 h-6 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div></div>}
                                </div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{loading ? "Synchronizing Data..." : "No Data Found"}</h3>
                                <div className="mt-4 space-y-4 max-w-md mx-auto">
                                    <p className="text-gray-500 font-medium">
                                        {loading
                                            ? "We are currently scanning your Google Drive folder. This may take a few seconds depending on the number of files."
                                            : "We couldn't find any valid Excel files in the provided folder or the folder is not accessible."}
                                    </p>
                                    {!loading && (
                                        <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl text-left">
                                            <p className="text-[11px] font-black text-amber-800 uppercase tracking-widest mb-2">Required Action</p>
                                            <p className="text-[12px] text-amber-700 leading-relaxed font-medium">
                                                Please ensure you have <strong>shared</strong> your Google Drive folder with the following service account email:
                                            </p>
                                            <div className="mt-3 flex items-center justify-between bg-white/50 p-2 rounded-lg border border-amber-200">
                                                <code className="text-[11px] text-blue-600 font-bold select-all">bi-dashboard-reader@bi-dashboard-drive.iam.gserviceaccount.com</code>
                                                <button onClick={() => navigator.clipboard.writeText('bi-dashboard-reader@bi-dashboard-drive.iam.gserviceaccount.com')} className="text-[10px] font-black text-amber-800 uppercase hover:text-blue-600 transition-colors">Copy</button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
