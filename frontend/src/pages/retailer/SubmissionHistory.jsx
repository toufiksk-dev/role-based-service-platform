import React, { useEffect, useState, useMemo } from "react";
import { listRetailerSubmissions } from "../../api/retailer";
import { listServices } from "../../api/services";
import toast from "react-hot-toast";
import Swal from "sweetalert2";
import RetryPaymentModal from "./RetryPaymentModal";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Eye,
  FileDown,
  FilterX,
  Search,
  Filter,
  RefreshCw,
  Inbox,
  Globe,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  SlidersHorizontal,
  X,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { checkOrderStatus } from "../../api/wallet";
import { motion, AnimatePresence } from "framer-motion";

/* ── helpers ── */
const statusConfig = {
  Submitted:  { bg: "bg-sky-100",    text: "text-sky-700",    dot: "bg-sky-500"    },
  Completed:  { bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500" },
  Rejected:   { bg: "bg-red-100",    text: "text-red-600",    dot: "bg-red-500"    },
  Processing: { bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500"  },
};

const paymentConfig = {
  paid:    { bg: "bg-emerald-100", text: "text-emerald-700" },
  failed:  { bg: "bg-red-100",    text: "text-red-600"     },
  pending: { bg: "bg-amber-100",  text: "text-amber-700"   },
};

const StatusBadge = ({ value, configMap }) => {
  const cfg = configMap[value] || { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
      {cfg.dot && <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />}
      {value || "N/A"}
    </span>
  );
};

const TABLE_COLS = [
  "S.No", "Action", "App. No", "Service", "Sub-Service",
  "Option", "Mode", "Name", "User ID", "Amount",
  "Pay Method", "Status", "Pay Status", "Sub-Status",
  "PDF", "Date & Time", "Month",
];

const SubmissionHistory = () => {
  const [allSubmissions, setAllSubmissions]   = useState([]);
  const [loading, setLoading]                 = useState(true);
  const [services, setServices]               = useState([]);
  const [search, setSearch]                   = useState("");
  const [retryModalOpen, setRetryModalOpen]   = useState(false);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [verifying, setVerifying]             = useState(false);
  const [showFilters, setShowFilters]         = useState(false);

  const location = useLocation();
  const navigate  = useNavigate();

  const [stagedFilters, setStagedFilters] = useState({ serviceId: "", subServiceId: "", optionId: "" });
  const [activeFilters, setActiveFilters] = useState({ serviceId: "", subServiceId: "", optionId: "" });
  const [subServiceOptions, setSubServiceOptions] = useState([]);
  const [optionOptions, setOptionOptions]         = useState([]);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  /* ── load ── */
  const loadData = async () => {
    try {
      setLoading(true);
      const [subsRes, servicesRes] = await Promise.all([
        listRetailerSubmissions(),
        listServices(),
      ]);
      setAllSubmissions(subsRes.data?.subs || []);
      setServices(servicesRes.data?.services || []);
    } catch {
      toast.error("Failed to load submission history");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  /* ── verify payment ── */
  const verifyPaymentRedirect = async (orderId) => {
    if (verifying || !orderId) return;
    setVerifying(true);
    navigate("/retailer/submission-history", { replace: true });
    Swal.fire({ title: "Verifying Payment...", html: "Please wait while we confirm your payment.", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const { data } = await checkOrderStatus({ order_id: orderId });
      Swal.close();
      if (data.ok && data.order.status === "Success") {
        Swal.fire("Payment Successful!", "Your payment was completed.", "success");
        loadData();
      } else {
        Swal.fire("Payment Failed", "Your payment could not be completed.", "error");
      }
    } catch (error) {
      Swal.close();
      Swal.fire("Error", error.response?.data?.message || "Verification failed. Contact support.", "error");
    } finally {
      setVerifying(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("order_id")) verifyPaymentRedirect(params.get("order_id"));
  }, [location.search]);

  /* ── filters ── */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setStagedFilters((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "serviceId") {
        updated.subServiceId = ""; updated.optionId = "";
        const sel = services.find((s) => s._id === value);
        setSubServiceOptions(sel?.subServices || []);
        setOptionOptions([]);
      }
      if (name === "subServiceId") {
        updated.optionId = "";
        const sel = subServiceOptions.find((s) => s._id === value);
        setOptionOptions(sel?.options || []);
      }
      return updated;
    });
  };

  const applyFilters  = () => { setActiveFilters(stagedFilters); setCurrentPage(1); setShowFilters(false); };
  const resetFilters  = () => {
    setSearch(""); setStagedFilters({ serviceId: "", subServiceId: "", optionId: "" });
    setActiveFilters({ serviceId: "", subServiceId: "", optionId: "" });
    setSubServiceOptions([]); setOptionOptions([]);
  };

  const activeFilterCount = Object.values(activeFilters).filter(Boolean).length + (search ? 1 : 0);

  /* ── filtered data ── */
  const filteredSubmissions = useMemo(() => {
    let f = [...allSubmissions];
    if (search) f = f.filter((s) =>
      s.serviceId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.optionId?.subServiceId?.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.optionId?.name?.toLowerCase().includes(search.toLowerCase())
    );
    if (activeFilters.serviceId)    f = f.filter((s) => s.serviceId?._id === activeFilters.serviceId);
    if (activeFilters.subServiceId) f = f.filter((s) => s.optionId?.subServiceId?._id === activeFilters.subServiceId);
    if (activeFilters.optionId)     f = f.filter((s) => s.optionId?._id === activeFilters.optionId);
    return f;
  }, [search, activeFilters, allSubmissions]);

  /* ── export ── */
  const handleExport = (type) => {
    if (!filteredSubmissions.length) { toast.error("No data to export"); return; }
    const exportData = filteredSubmissions.map((s, i) => ({
      "Serial No": i + 1,
      "Application No": s.applicationNumber || "N/A",
      "Service": s.serviceId?.name || "N/A",
      "Sub-Service": s.optionId?.subServiceId?.name || "N/A",
      "Option": s.optionId?.name || "N/A",
      "Mode": "Web",
      "User Name": s.retailerId?.name || "N/A",
      "User ID": s.retailerId?.mobile || "N/A",
      "Amount": `₹${s.amount?.toFixed(2) || "0.00"}`,
      "Payment Method": s.paymentMethod || "N/A",
      "Status": s.status || "N/A",
      "Payment Status": s.paymentStatus || "N/A",
      "Sub-Status": s.adminRemarks || "-",
      "PDF Status": s.finalDocument ? "Yes" : "No",
      "Apply Date & Time": new Date(s.createdAt).toLocaleString(),
      "Month": new Date(s.createdAt).toLocaleString("default", { month: "long" }),
    }));

    if (type === "excel") {
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Submissions");
      XLSX.writeFile(wb, "MySubmissions.xlsx");
    } else {
      const doc = new jsPDF({ orientation: "landscape" });
      autoTable(doc, { head: [Object.keys(exportData[0])], body: exportData.map((r) => Object.values(r)) });
      doc.save("MySubmissions.pdf");
    }
  };

  /* ── pagination ── */
  const totalPages  = Math.ceil(filteredSubmissions.length / itemsPerPage);
  const currentData = filteredSubmissions.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleRetryClick  = (sub) => { setSelectedSubmission(sub); setRetryModalOpen(true); };
  const handleModalClose  = (refresh) => { setRetryModalOpen(false); setSelectedSubmission(null); if (refresh) loadData(); };

  /* ════════════════════════ UI ════════════════════════ */
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 mb-6">
        <div className="max-w-screen-2xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <ClipboardList size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">Submission History</h1>
              <p className="text-xs text-slate-400">Track and manage all your service submissions</p>
            </div>
          </div>

          {/* Export buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleExport("excel")}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <FileDown size={14} /> Excel
            </button>
            <button
              onClick={() => handleExport("pdf")}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors"
            >
              <FileDown size={14} /> PDF
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 pb-16 space-y-4">

        {/* ── FILTER BAR ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap">

            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by service, option…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all placeholder:text-slate-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {activeFilterCount > 0 && (
                <button onClick={resetFilters} className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-600 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-lg transition-colors">
                  <FilterX size={13} /> Clear ({activeFilterCount})
                </button>
              )}
              <button
                onClick={() => setShowFilters((v) => !v)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-colors
                  ${showFilters ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"}`}
              >
                <SlidersHorizontal size={13} />
                Filters
                {activeFilterCount > 0 && (
                  <span className={`w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center ${showFilters ? "bg-white text-indigo-600" : "bg-indigo-600 text-white"}`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Collapsible Filter Panel */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden border-t border-slate-100"
              >
                <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                  <select
                    name="serviceId"
                    value={stagedFilters.serviceId}
                    onChange={handleFilterChange}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
                  >
                    <option value="">All Services</option>
                    {services.map((s) => <option key={s._id} value={s._id}>{s.name}</option>)}
                  </select>

                  <select
                    name="subServiceId"
                    value={stagedFilters.subServiceId}
                    onChange={handleFilterChange}
                    disabled={!stagedFilters.serviceId}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">All Sub-Services</option>
                    {subServiceOptions.map((ss) => <option key={ss._id} value={ss._id}>{ss.name}</option>)}
                  </select>

                  <select
                    name="optionId"
                    value={stagedFilters.optionId}
                    onChange={handleFilterChange}
                    disabled={!stagedFilters.subServiceId}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-700 bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <option value="">All Options</option>
                    {optionOptions.map((o) => <option key={o._id} value={o._id}>{o.name}</option>)}
                  </select>

                  <button
                    onClick={applyFilters}
                    className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold px-4 py-2.5 transition-colors"
                  >
                    <Filter size={14} /> Apply Filters
                  </button>

                  <button
                    onClick={resetFilters}
                    className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-sm font-semibold px-4 py-2.5 transition-colors"
                  >
                    <FilterX size={14} /> Reset
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ── TABLE CARD ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

          {/* Table Header Row */}
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100">
            <div>
              <span className="text-sm font-bold text-slate-800">All Submissions</span>
              <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-600 text-xs font-bold rounded-full">
                {filteredSubmissions.length}
              </span>
            </div>
            <button onClick={loadData} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
              <RefreshCw size={13} /> Refresh
            </button>
          </div>

          {/* Scrollable Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {TABLE_COLS.map((col) => (
                    <th key={col} className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {/* ── Loading skeleton ── */}
                {loading && Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: TABLE_COLS.length }).map((_, j) => (
                      <td key={j} className="px-4 py-3.5">
                        <div className="h-3.5 bg-slate-100 rounded-md w-full" />
                      </td>
                    ))}
                  </tr>
                ))}

                {/* ── Data rows ── */}
                {!loading && currentData.length > 0 && currentData.map((sub, index) => (
                  <tr key={sub._id} className="hover:bg-slate-50/70 transition-colors group">

                    {/* S.No */}
                    <td className="px-4 py-3.5 text-slate-400 text-xs font-medium">
                      {(currentPage - 1) * itemsPerPage + index + 1}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5">
                      <Link
                        to={`/retailer/view-submission/${sub._id}`}
                        className="inline-flex items-center justify-center w-8 h-8 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye size={15} />
                      </Link>
                    </td>

                    {/* App No */}
                    <td className="px-4 py-3.5">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-md whitespace-nowrap">
                        {sub.applicationNumber || "N/A"}
                      </span>
                    </td>

                    {/* Service */}
                    <td className="px-4 py-3.5 font-semibold text-slate-700 whitespace-nowrap text-xs">
                      {sub.serviceId?.name || "N/A"}
                    </td>

                    {/* Sub-Service */}
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                      {sub.optionId?.subServiceId?.name || "N/A"}
                    </td>

                    {/* Option */}
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                      {sub.optionId?.name || "N/A"}
                    </td>

                    {/* Mode */}
                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-md">
                        <Globe size={10} /> Web
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3.5 text-slate-600 whitespace-nowrap text-xs font-medium">
                      {sub.retailerId?.name || "N/A"}
                    </td>

                    {/* User ID */}
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap text-xs">
                      {sub.retailerId?.mobile || "N/A"}
                    </td>

                    {/* Amount */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-sm font-bold text-slate-800">
                        ₹{sub.amount?.toFixed(2) || "0.00"}
                      </span>
                    </td>

                    {/* Pay Method */}
                    <td className="px-4 py-3.5 text-slate-500 whitespace-nowrap capitalize text-xs">
                      {sub.paymentMethod || "N/A"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <StatusBadge value={sub.status} configMap={statusConfig} />
                    </td>

                    {/* Payment Status */}
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col gap-1.5">
                        <StatusBadge value={sub.paymentStatus} configMap={paymentConfig} />
                        {sub.paymentStatus === "failed" && (
                          <button
                            onClick={() => handleRetryClick(sub)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-red-600 hover:text-red-700 transition-colors"
                          >
                            <RefreshCw size={11} /> Retry
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Sub-Status */}
                    <td className="px-4 py-3.5 text-slate-500 text-xs whitespace-nowrap">
                      {sub.adminRemarks || <span className="text-slate-300">—</span>}
                    </td>

                    {/* PDF */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center px-2 py-1 text-[11px] font-semibold rounded-md ${
                        sub.finalDocument ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                      }`}>
                        {sub.finalDocument ? "Ready" : "Pending"}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap text-xs">
                      {new Date(sub.createdAt).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </td>

                    {/* Month */}
                    <td className="px-4 py-3.5 text-slate-400 whitespace-nowrap text-xs">
                      {new Date(sub.createdAt).toLocaleString("default", { month: "long" })}
                    </td>
                  </tr>
                ))}

                {/* ── Empty state ── */}
                {!loading && currentData.length === 0 && (
                  <tr>
                    <td colSpan={TABLE_COLS.length} className="text-center py-20">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                          <Inbox size={24} className="text-slate-300" />
                        </div>
                        <p className="font-semibold text-slate-500 text-sm">No submissions found</p>
                        <p className="text-xs text-slate-400">Try adjusting your filters or search term</p>
                        {activeFilterCount > 0 && (
                          <button onClick={resetFilters} className="mt-1 text-xs font-semibold text-indigo-600 hover:underline">
                            Clear all filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {!loading && totalPages > 1 && (
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-slate-400">
                Showing{" "}
                <span className="font-semibold text-slate-600">
                  {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredSubmissions.length)}
                </span>{" "}
                of <span className="font-semibold text-slate-600">{filteredSubmissions.length}</span> results
              </p>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                  disabled={currentPage === 1}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>

                {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors border ${
                        currentPage === page
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                {totalPages > 7 && (
                  <span className="w-8 h-8 flex items-center justify-center text-slate-400 text-xs">…</span>
                )}

                <button
                  onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Retry Modal ── */}
      {retryModalOpen && selectedSubmission && (
        <RetryPaymentModal
          submission={selectedSubmission}
          onClose={() => handleModalClose(false)}
          onSuccess={() => handleModalClose(true)}
        />
      )}
    </div>
  );
};

export default SubmissionHistory;