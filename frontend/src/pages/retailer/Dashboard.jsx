import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getDashboardStats, getServiceCount, getApplicationStatusStats,
  getTotalOrdersStats, getWeeklyOrdersStats, getDailyOrdersStats,
  getStatusCardStats, getMonthlyProfitStats, getWeeklyProfitStats,
  getDailyProfitStats, getTotalRevenue, getActiveWishes, getMyKycDetails,
} from "../../api/retailer";
import { motion } from "framer-motion";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import { getWalletBalance, getRecentTransactions } from "../../api/wallet";
import {
  Wallet as WalletIcon, BarChart2, CheckCircle, TrendingUp,
  CreditCard, Bell, Info, Clock, AlertCircle, Loader2,
  ArrowUpCircle, ArrowDownCircle, XCircle, ArrowRight,
  Sparkles, Activity,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell,
} from "recharts";
import NoticeBoard from "./NoticeBoard";
import toast from "react-hot-toast";
import KycPromptNotice from "../../components/common/KycPromptNotice";

/* ── spark data ─────────────────────────────────── */
const sparkData = Array.from({ length: 14 }, (_, i) => ({
  t: i + 1,
  v: 40 + Math.round(Math.random() * 20),
}));

/* ================================================================
   StatCard
================================================================ */
const StatCard = ({ title, value, icon: Icon, gradient, onClick, loading }) => (
  <motion.div
    whileHover={{ y: -3, scale: 1.01 }}
    transition={{ type: "spring", stiffness: 300, damping: 20 }}
    onClick={onClick}
    className="relative overflow-hidden bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md cursor-pointer p-5 flex items-center gap-4 group"
  >
    {/* background blob */}
    <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-10 ${gradient}`} />

    <div className={`relative w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${gradient} shadow-sm`}>
      <Icon className="w-5 h-5 text-white" />
    </div>

    <div className="min-w-0">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-slate-800 mt-0.5 leading-tight">
        {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : value}
      </p>
    </div>

    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all ml-auto flex-shrink-0" />
  </motion.div>
);

/* ================================================================
   MiniKPI
================================================================ */
const MiniKPI = ({ title, value, sub, change, positive }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
    <div className="flex items-center justify-between mb-3">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${positive ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
        {positive ? "▲" : "▼"} {change}
      </span>
    </div>
    <p className="text-2xl font-bold text-slate-800">{value}</p>
    <p className="text-xs text-slate-400 mt-1">{sub}</p>
  </div>
);

/* ================================================================
   ProfitSpark
================================================================ */
const ProfitSpark = ({ title, value, change }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
    <div className="flex items-center justify-between mb-1">
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
        <p className="text-xl font-bold text-slate-800 mt-1">{value}</p>
      </div>
      <span className="text-xs font-semibold px-2 py-1 rounded-lg bg-emerald-50 text-emerald-600">
        +{change}
      </span>
    </div>
    <div className="h-14 mt-3">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={sparkData}>
          <defs>
            <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area dataKey="v" type="monotone" stroke="#10b981" strokeWidth={1.5} fill="url(#spark-grad)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  </div>
);

/* ================================================================
   TransactionItem
================================================================ */
const TransactionItem = ({ transaction }) => {
  const getDesc = (meta) => {
    if (typeof meta === "string" && meta.startsWith("WALLET_")) return "Wallet Recharge";
    if (meta?.reason?.startsWith("Payment Failed")) return `Failed: ${meta.reason}`;
    if (meta?.reason === "service purchase") return "Wallet Payment for Service";
    if (meta?.reason === "Online Service Payment") return "Online Payment for Service";
    if (meta?.reason === "service purchase retry") return "Retry Payment for Submission";
    if (meta?.reason === "Refund for cancelled service") return `Refund for Cancelled ${meta.serviceName || "Service"}`;
    if (meta?.reason) return `Manual Credit: ${meta.reason}`;
    if (typeof meta === "string") return meta;
    return "Transaction";
  };

  const isCredit = transaction.type === "credit";
  const isDebit  = transaction.type === "debit";
  const Icon     = isCredit ? ArrowDownCircle : isDebit ? ArrowUpCircle : XCircle;

  return (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${isCredit ? "bg-emerald-50" : isDebit ? "bg-rose-50" : "bg-slate-100"}`}>
          <Icon className={`w-4 h-4 ${isCredit ? "text-emerald-500" : isDebit ? "text-rose-500" : "text-slate-400"}`} />
        </div>
        <div>
          <p className="text-xs font-semibold text-slate-700 leading-tight">{getDesc(transaction.meta)}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{new Date(transaction.createdAt).toLocaleString()}</p>
        </div>
      </div>
      <p className={`text-xs font-bold flex-shrink-0 ${isCredit ? "text-emerald-600" : isDebit ? "text-rose-500" : "text-slate-400"}`}>
        {isCredit ? "+" : isDebit ? "-" : ""}₹{transaction.amount.toFixed(2)}
      </p>
    </div>
  );
};

/* ================================================================
   GlobalMessageCard
================================================================ */
const GlobalMessageCard = ({ message }) => {
  if (!message) return null;
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-violet-600 to-purple-600 p-5 shadow-md">
      {/* decorative circles */}
      <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5" />
      <div className="flex items-start gap-4 relative">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-white/60 uppercase tracking-wider mb-1">Announcement</p>
          <p className="text-sm text-white/90 leading-relaxed font-medium">{message}</p>
        </div>
      </div>
    </div>
  );
};

/* ================================================================
   Status pill
================================================================ */
const StatusCard = ({ icon: Icon, label, value, change, borderColor, iconBg, iconColor, changePositive }) => (
  <div className={`bg-white rounded-2xl border border-slate-100 shadow-sm p-5 border-l-4 ${borderColor}`}>
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <Icon className={`w-6 h-6 ${iconColor}`} />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value}</p>
        {change !== undefined && (
          <p className={`text-xs mt-1 font-medium ${changePositive ? "text-emerald-600" : "text-rose-500"}`}>
            {changePositive ? "▲" : "▼"} {Math.abs(change)}% from last month
          </p>
        )}
      </div>
    </div>
  </div>
);

/* ================================================================
   Main Dashboard
================================================================ */
export default function Dashboard() {
  const { user } = useAuth();
  const navigate  = useNavigate();

  const [stats, setStats]               = useState({ walletBalance: 0, servicesCount: 0, monthlyApplications: 0, serviceUsage: [] });
  const [recentTx, setRecentTx]         = useState([]);
  const [totalOrders, setTotalOrders]   = useState({ total: 0, percentageChange: 0 });
  const [weeklyOrders, setWeeklyOrders] = useState({ total: 0, percentageChange: 0 });
  const [dailyOrders, setDailyOrders]   = useState({ total: 0, percentageChange: 0 });
  const [statusCards, setStatusCards]   = useState({ completed: { total: 0, percentageChange: 0 }, pending: { total: 0 }, cancelled: { total: 0, percentageChange: 0 } });
  const [pieData, setPieData]           = useState([]);
  const [monthlyProfit, setMonthlyProfit] = useState({ total: 0, percentageChange: 0 });
  const [weeklyProfit, setWeeklyProfit]   = useState({ total: 0, percentageChange: 0 });
  const [dailyProfit, setDailyProfit]     = useState({ total: 0, percentageChange: 0 });
  const [totalRevenue, setTotalRevenue]   = useState(0);
  const [loading, setLoading]             = useState(true);
  const [activeWish, setActiveWish]       = useState(null);
  const [kycData, setKycData]             = useState(null);

  const statusColors = {
    Applied: "#6366f1", "On Process": "#f97316", Completed: "#10b981",
    "Reject | Failed": "#ef4444", "On Hold": "#eab308",
    "Payment Failed": "#ef4444", "Document Required": "#a855f7",
    default: "#94a3b8",
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        setLoading(true);
        const [
          statsRes, walletRes, svcCountRes, txRes, statusStatsRes,
          totalOrdRes, weeklyOrdRes, dailyOrdRes, statusCardsRes,
          mProfRes, wProfRes, dProfRes, revRes, wishRes, kycRes,
        ] = await Promise.all([
          getDashboardStats(), getWalletBalance(), getServiceCount(),
          getRecentTransactions(), getApplicationStatusStats(),
          getTotalOrdersStats(), getWeeklyOrdersStats(), getDailyOrdersStats(),
          getStatusCardStats(), getMonthlyProfitStats(), getWeeklyProfitStats(),
          getDailyProfitStats(), getTotalRevenue(), getActiveWishes(), getMyKycDetails(),
        ]);

        setStats({
          monthlyApplications: statsRes.data?.monthlyApplicationsCount || 0,
          serviceUsage: statsRes.data?.serviceUsage || [],
          walletBalance: walletRes.data?.balance || 0,
          servicesCount: svcCountRes.data?.count || 0,
        });
        setRecentTx(txRes.data?.transactions || []);
        setTotalOrders({ total: totalOrdRes.data.stats.totalOrdersThisMonth, percentageChange: totalOrdRes.data.stats.percentageChange });
        setWeeklyOrders({ total: weeklyOrdRes.data.stats.totalOrdersThisWeek, percentageChange: weeklyOrdRes.data.stats.percentageChange });
        setDailyOrders({ total: dailyOrdRes.data.stats.totalOrdersToday, percentageChange: dailyOrdRes.data.stats.percentageChange });
        setStatusCards(statusCardsRes.data.stats);
        setMonthlyProfit(mProfRes.data.stats);
        setWeeklyProfit(wProfRes.data.stats);
        setDailyProfit(dProfRes.data.stats);
        setTotalRevenue(revRes.data.totalRevenue);
        setKycData(kycRes.data);
        if (wishRes.data.wishes?.length) setActiveWish(wishRes.data.wishes[0]);
        setPieData(statusStatsRes.data.stats.map(s => ({ status: s.status, count: s.count, color: statusColors[s.status] || statusColors.default })));
      } catch {
        toast.error("Could not load dashboard data.");
      } finally {
        setLoading(false);
      }
    })();
  }, [user, navigate]);

  useEffect(() => {
    if (!user || user.isKycVerified || !kycData) return;
    if (kycData.kycStatus === "pending") {
      Swal.fire({ title: "KYC Under Review", text: "Your documents are being reviewed.", icon: "info", confirmButtonText: "OK" });
    } else if (kycData.kycStatus === "rejected") {
      Swal.fire({
        title: "KYC Rejected", html: `Reason: <b>${kycData.details?.rejectionReason || "Not specified"}</b>`,
        icon: "error", showCancelButton: true, confirmButtonText: "Re-submit KYC", cancelButtonText: "Later",
      }).then(r => { if (r.isConfirmed) navigate("/retailer/kyc"); });
    } else {
      Swal.fire({
        title: "KYC Required", text: "Please complete your KYC to access all services.", icon: "warning",
        showCancelButton: true, confirmButtonText: "Complete KYC Now", cancelButtonText: "Later",
      }).then(r => { if (r.isConfirmed) navigate("/retailer/kyc"); });
    }
  }, [user, kycData, navigate]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 font-[Plus_Jakarta_Sans,sans-serif]">

      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">Overview</p>
          <h1 className="text-2xl font-bold text-slate-800">
            Good day, <span className="text-indigo-600">{user?.name?.split(" ")[0]}</span> 👋
          </h1>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-100 shadow-sm rounded-xl px-3 py-2">
          <Bell className="w-4 h-4 text-indigo-500" />
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">Stay updated</span>
        </div>
      </div>

      {/* KYC prompt */}
      {!user?.isKycVerified && <KycPromptNotice kycData={kycData} />}

      {/* ── Global message ── */}
      {user?.isKycVerified && activeWish?.message && (
        <div className="mb-6">
          <GlobalMessageCard message={activeWish.message} />
        </div>
      )}

      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard
          title="Wallet Balance"
          value={`₹${stats.walletBalance.toFixed(2)}`}
          icon={WalletIcon}
          gradient="bg-gradient-to-br from-indigo-500 to-violet-600"
          onClick={() => navigate("/retailer/wallet")}
          loading={loading}
        />
        <StatCard
          title="Total Services"
          value={stats.servicesCount}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-600"
          onClick={() => navigate("/retailer/services")}
          loading={loading}
        />
        <StatCard
          title="Monthly Applications"
          value={stats.monthlyApplications}
          icon={BarChart2}
          gradient="bg-gradient-to-br from-sky-500 to-blue-600"
          onClick={() => navigate("/retailer/submission-history")}
          loading={loading}
        />
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* ======= LEFT / MAIN COL ======= */}
        <div className="xl:col-span-2 space-y-6">

          {/* Bar chart — service usage */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">This Month</p>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">Service Usage</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Activity className="w-4 h-4 text-indigo-500" />
              </div>
            </div>
            <div className="h-64">
              {loading ? (
                <div className="flex items-center justify-center h-full text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : stats.serviceUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.serviceUsage} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: "rgba(99,102,241,.06)" }}
                      contentStyle={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 12 }}
                    />
                    <Bar dataKey="applications" name="Applications" fill="#6366f1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                  <Info className="w-4 h-4 mr-2" /> No data yet for this month.
                </div>
              )}
            </div>
          </div>

          {/* Pie + circle summary */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Pie chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 lg:col-span-2">
              <div className="mb-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Breakdown</p>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">Application Status</h3>
              </div>
              {loading ? (
                <div className="flex items-center justify-center h-56 text-slate-400">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} innerRadius={40}
                        dataKey="count" nameKey="status"
                        label={({ status, percent }) => `${status} ${(percent * 100).toFixed(0)}%`}
                        labelLine={false}
                      >
                        {pieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* legend */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
                    {pieData.map((e, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: e.color }} />
                        <span className="text-xs text-slate-500">{e.status}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-center h-56 text-slate-400 text-sm">No order data.</div>
              )}
            </div>

            {/* Circle summary */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col items-center justify-center">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center">Total Applications</p>
              <p className="text-[11px] text-slate-400 mb-4 text-center">This Month vs. Last Month</p>
              {loading ? (
                <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
              ) : (
                <>
                  <div className="relative">
                    <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none" stroke="#f1f5f9" strokeWidth="3" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                        fill="none"
                        stroke={totalOrders.percentageChange >= 0 ? "#10b981" : "#ef4444"}
                        strokeWidth="3"
                        strokeDasharray={`${Math.min(Math.abs(totalOrders.percentageChange), 100)}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <p className={`text-xl font-bold ${totalOrders.percentageChange >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {totalOrders.percentageChange >= 0 ? "▲" : "▼"}{Math.abs(totalOrders.percentageChange)}%
                      </p>
                      <p className="text-[10px] text-slate-400">Change</p>
                    </div>
                  </div>
                  <div className="mt-4 text-center">
                    <p className="text-xs text-slate-400">This Month</p>
                    <p className="text-2xl font-bold text-slate-800">{totalOrders.total}</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mini KPI row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MiniKPI
              title="Monthly Growth"
              value={`${totalOrders.percentageChange}%`}
              sub="vs. Last Month"
              change={`${totalOrders.percentageChange >= 0 ? "+" : ""}${totalOrders.percentageChange}%`}
              positive={totalOrders.percentageChange >= 0}
            />
            <MiniKPI
              title="Weekly Applications"
              value={weeklyOrders.total}
              sub="This Week"
              change={`${weeklyOrders.percentageChange >= 0 ? "+" : ""}${weeklyOrders.percentageChange}%`}
              positive={weeklyOrders.percentageChange >= 0}
            />
            <MiniKPI
              title="Today's Applications"
              value={dailyOrders.total}
              sub="vs. Yesterday"
              change={`${dailyOrders.percentageChange >= 0 ? "+" : ""}${dailyOrders.percentageChange}%`}
              positive={dailyOrders.percentageChange >= 0}
            />
          </div>

          {/* Profit spark row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ProfitSpark
              title="Monthly Profit"
              value={`₹${monthlyProfit.total.toFixed(2)}`}
              change={`${monthlyProfit.percentageChange.toFixed(1)}%`}
            />
            <ProfitSpark
              title="Weekly Profit"
              value={`₹${weeklyProfit.total.toFixed(2)}`}
              change={`${weeklyProfit.percentageChange.toFixed(1)}%`}
            />
            <ProfitSpark
              title="Daily Profit"
              value={`₹${dailyProfit.total.toFixed(2)}`}
              change={`${dailyProfit.percentageChange.toFixed(1)}%`}
            />
          </div>

          {/* Status cards row */}
          {loading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatusCard
                icon={CheckCircle}
                label="Completed"
                value={statusCards.completed.total}
                change={statusCards.completed.percentageChange}
                changePositive={statusCards.completed.percentageChange >= 0}
                borderColor="border-l-emerald-500"
                iconBg="bg-emerald-50"
                iconColor="text-emerald-500"
              />
              <StatusCard
                icon={Clock}
                label="Pending"
                value={statusCards.pending.total}
                borderColor="border-l-amber-500"
                iconBg="bg-amber-50"
                iconColor="text-amber-500"
              />
              <StatusCard
                icon={AlertCircle}
                label="Cancelled"
                value={statusCards.cancelled.total}
                change={statusCards.cancelled.percentageChange}
                changePositive={statusCards.cancelled.percentageChange >= 0}
                borderColor="border-l-rose-500"
                iconBg="bg-rose-50"
                iconColor="text-rose-500"
              />
            </div>
          )}
        </div>

        {/* ======= RIGHT SIDEBAR COL ======= */}
        <div className="space-y-6">

          {/* Notice board */}
          <NoticeBoard />

          {/* Recent transactions */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Latest</p>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">Transactions</h3>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-6 text-slate-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> Loading…
              </div>
            ) : recentTx.length > 0 ? (
              recentTx.map(tx => <TransactionItem key={tx._id} transaction={tx} />)
            ) : (
              <p className="text-center text-slate-400 text-sm py-6">No recent transactions.</p>
            )}
          </div>

          {/* Wallet quick card */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-5 shadow-md text-white">
            <div className="absolute -right-6 -top-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-8 w-20 h-20 rounded-full bg-white/5" />
            <div className="relative">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <CreditCard className="w-4 h-4 text-white" />
                </div>
                <p className="text-sm font-semibold text-white/80">Wallet Balance</p>
              </div>
              <p className="text-3xl font-bold text-white mb-1">
                {loading ? "…" : `₹${stats.walletBalance.toFixed(2)}`}
              </p>
              <p className="text-xs text-indigo-200 mb-4">Available funds</p>
              <button
                onClick={() => navigate("/retailer/wallet")}
                className="flex items-center gap-2 bg-white/20 hover:bg-white/30 transition-colors rounded-xl px-4 py-2 text-sm font-semibold text-white"
              >
                Add Money <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Revenue mini card */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-1">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lifetime</p>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">Total Revenue</h3>
              </div>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-800 mt-2">
              ₹{loading ? "…" : totalRevenue.toFixed(2)}
            </p>
            <div className="h-16 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData}>
                  <defs>
                    <linearGradient id="rev-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area dataKey="v" type="monotone" stroke="#6366f1" strokeWidth={1.5} fill="url(#rev-grad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}