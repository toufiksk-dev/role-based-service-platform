import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  getWalletBalance,
  createPaymentOrderForWallet,
  checkOrderStatus,
  getRecentTransactions,
  submitOfflineRequest,
} from "../../api/wallet";
import {
  Wallet as WalletIcon,
  IndianRupee,
  Loader2,
  AlertCircle,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  PlusCircle,
  XCircle,
  QrCode,
  CheckCircle,
  Clock,
  Phone,
  Zap,
  TrendingUp,
  Shield,
  ChevronRight,
  Copy,
  Info,
} from "lucide-react";
import Swal from "sweetalert2";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

/* ------------------ STATIC BANKS ------------------ */
const BANKS = [
  { id: "sbi", name: "State Bank of India", qr: "/qrcode/canara.png" },
];

const QUICK_AMOUNTS = [100, 200, 500, 1000];

const Wallet = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState("online");
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);

  // Online
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // Offline
  const [bank, setBank] = useState("");
  const [utr, setUtr] = useState("");
  const [date, setDate] = useState("");
  const [mode, setMode] = useState("UPI");

  const selectedBank = BANKS.find((b) => b.id === bank);

  /* ------------------ FETCH DATA ------------------ */
  const fetchWalletBalance = async () => {
    try {
      const { data } = await getWalletBalance();
      if (data.ok) setBalance(data.balance);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchWalletTransactions = async () => {
    try {
      const { data } = await getRecentTransactions();
      if (data.ok) setTransactions(data.transactions || []);
    } catch (e) {
      console.error(e);
    }
  };

  /* ------------------ VERIFY PAYMENT ------------------ */
  const verifyPaymentRedirect = async (orderId) => {
    if (!orderId || verifying) return;
    setVerifying(true);
    navigate("/retailer/wallet", { replace: true });
    Swal.fire({ title: "Verifying Payment...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const { data } = await checkOrderStatus({ order_id: orderId });
      Swal.close();
      if (data.ok && data.order.status === "Success") {
        Swal.fire("Success", "Wallet recharged successfully", "success");
        fetchWalletBalance();
        fetchWalletTransactions();
      } else {
        Swal.fire("Payment Failed", "Transaction not completed", "error");
      }
    } catch {
      Swal.fire("Error", "Verification failed", "error");
    } finally {
      setVerifying(false);
    }
  };

  /* ------------------ ONLINE ADD MONEY ------------------ */
  const handleAddMoney = async (e) => {
    e.preventDefault();
    if (+rechargeAmount < 1) {
      Swal.fire("Invalid Amount", "Minimum ₹1 required", "warning");
      return;
    }
    setIsProcessing(true);
    try {
      const { data } = await createPaymentOrderForWallet({ amount: rechargeAmount });
      window.location.href = data.payment_url;
    } catch {
      Swal.fire("Error", "Payment initiation failed", "error");
      setIsProcessing(false);
    }
  };

  /* ------------------ OFFLINE SUBMIT ------------------ */
  const handleOfflineSubmit = async (e) => {
    e.preventDefault();
    if (Number(rechargeAmount) < 1) {
      Swal.fire("Invalid Amount", "Minimum amount is ₹1", "error");
      return;
    }
    if (!bank || !rechargeAmount || !utr || !date) {
      Swal.fire("Missing Fields", "All fields are required", "warning");
      return;
    }
    setIsProcessing(true);
    try {
      const { data } = await submitOfflineRequest({ amount: rechargeAmount, bank, utr, date, mode });
      if (data.ok) {
        Swal.fire("Request Submitted", "Your payment will be verified shortly", "success");
        setBank(""); setRechargeAmount(""); setUtr(""); setDate("");
      }
    } catch (error) {
      Swal.fire("Error", error.response?.data?.message || "Submission failed", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  /* ------------------ INIT ------------------ */
  useEffect(() => {
    if (!user) return;
    const params = new URLSearchParams(location.search);
    if (params.has("order_id")) {
      verifyPaymentRedirect(params.get("order_id"));
    } else {
      fetchWalletBalance();
      fetchWalletTransactions();
    }
  }, [user, location.search]);

  const getTransactionDescription = (meta) => {
    if (typeof meta === "string") return "Wallet Transaction";
    if (meta?.reason) return meta.reason;
    return "Transaction";
  };

  /* ============================= UI ============================= */
  return (
    <div className="min-h-screen bg-slate-50 font-sans">

      {/* ── PAGE HEADER ── */}
      <div className="bg-white border-b border-slate-100 px-6 py-5 mb-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
              <WalletIcon size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 leading-tight">My Wallet</h1>
              <p className="text-xs text-slate-400">Manage your balance & transactions</p>
            </div>
          </div>
          <Link
            to="/retailer/transaction"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <Receipt size={15} />
            All Transactions
            <ChevronRight size={14} />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-16 space-y-8">

        {/* ── TOP ROW ── */}
        <div className="grid lg:grid-cols-3 gap-6">

          {/* ── BALANCE CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="lg:col-span-1 flex flex-col gap-5"
          >
            {/* Balance */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white shadow-xl shadow-blue-200">
              {/* decorative circles */}
              <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/5" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-white/5" />

              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-sm font-medium text-blue-100">Available Balance</span>
                  <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                    <TrendingUp size={16} />
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center gap-2 h-12">
                    <Loader2 className="animate-spin" size={24} />
                    <span className="text-blue-200 text-sm">Loading...</span>
                  </div>
                ) : (
                  <div>
                    <p className="text-4xl font-bold tracking-tight">
                      ₹{balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                    <p className="text-blue-200 text-xs mt-1">Updated just now</p>
                  </div>
                )}

                {!loading && balance < 99 && (
                  <div className="mt-5 flex items-center gap-2 bg-amber-400/20 border border-amber-300/30 text-amber-100 px-3 py-2.5 rounded-xl text-xs font-medium">
                    <AlertCircle size={14} />
                    Low balance — top up recommended
                  </div>
                )}
              </div>
            </div>

            {/* Info Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Info size={15} className="text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">How to Recharge</span>
              </div>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <Zap size={12} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Online (Instant)</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Enter amount → Pay via UPI → Balance credited instantly.
                      Do not refresh during verification.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="mt-0.5 w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <Clock size={12} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-slate-700">Offline (Manual)</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      Scan bank QR → Pay → Submit UTR. Verified &amp; credited within 24 hrs.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                <Phone size={13} className="text-slate-400" />
                <p className="text-xs text-slate-500">
                  Support:{" "}
                  <a href="tel:+919919918196" className="font-semibold text-blue-600 hover:underline">
                    +91 99199 18196
                  </a>
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── ADD MONEY CARD ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
          >
            {/* Card Header */}
            <div className="px-7 pt-6 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center">
                  <PlusCircle size={18} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800">Add Money to Wallet</h2>
                  <p className="text-xs text-slate-400">Choose a payment method below</p>
                </div>
              </div>
            </div>

            <div className="p-7">
              {/* TABS */}
              <div className="flex bg-slate-100 rounded-xl p-1 mb-7 gap-1">
                {[
                  { key: "online", label: "Online", sublabel: "Instant", icon: <Zap size={14} /> },
                  { key: "offline", label: "Offline", sublabel: "Within 24h", icon: <Clock size={14} /> },
                ].map(({ key, label, sublabel, icon }) => (
                  <button
                    key={key}
                    onClick={() => setActiveTab(key)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                      ${activeTab === key
                        ? "bg-white text-blue-600 shadow-sm ring-1 ring-slate-200"
                        : "text-slate-500 hover:text-slate-700"
                      }`}
                  >
                    {icon}
                    <span>{label}</span>
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                      activeTab === key ? "bg-blue-50 text-blue-500" : "bg-slate-200 text-slate-400"
                    }`}>{sublabel}</span>
                  </button>
                ))}
              </div>

              {/* ── ONLINE FORM ── */}
              {activeTab === "online" && (
                <form onSubmit={handleAddMoney} className="space-y-5">
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                      Quick Select
                    </p>
                    <div className="grid grid-cols-4 gap-2.5">
                      {QUICK_AMOUNTS.map((v) => (
                        <button
                          type="button"
                          key={v}
                          onClick={() => setRechargeAmount(String(v))}
                          className={`py-3 rounded-xl text-sm font-semibold border-2 transition-all duration-150
                            ${String(rechargeAmount) === String(v)
                              ? "border-blue-500 bg-blue-50 text-blue-600"
                              : "border-slate-200 text-slate-600 hover:border-blue-300 hover:bg-blue-50/50"
                            }`}
                        >
                          ₹{v}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Or Enter Amount
                    </p>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center">
                        <IndianRupee size={14} className="text-slate-500" />
                      </div>
                      <input
                        value={rechargeAmount}
                        onChange={(e) => {
                          if (/^\d*$/.test(e.target.value)) setRechargeAmount(e.target.value);
                        }}
                        className="w-full pl-14 pr-4 py-3.5 border-2 border-slate-200 rounded-xl text-slate-800 font-semibold text-base focus:outline-none focus:border-blue-400 transition-colors placeholder:font-normal placeholder:text-slate-400"
                        placeholder="Enter custom amount"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing || !rechargeAmount}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
                  >
                    {isProcessing ? (
                      <><Loader2 size={16} className="animate-spin" /> Processing…</>
                    ) : (
                      <><Zap size={16} /> Add Money Instantly</>
                    )}
                  </button>

                  <div className="flex items-center gap-2 justify-center text-xs text-slate-400">
                    <Shield size={12} />
                    <span>Secured by 256-bit encryption</span>
                  </div>
                </form>
              )}

              {/* ── OFFLINE FORM ── */}
              {activeTab === "offline" && (
                <form onSubmit={handleOfflineSubmit} className="grid md:grid-cols-2 gap-6">

                  {/* LEFT: FORM FIELDS */}
                  <div className="space-y-4">
                    {/* Bank Select */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                        Bank
                      </label>
                      <select
                        value={bank}
                        onChange={(e) => setBank(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm text-slate-700 font-medium focus:outline-none focus:border-blue-400 transition-colors bg-white"
                      >
                        <option value="">Select a bank</option>
                        {BANKS.map((b) => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                        Amount (₹)
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-semibold text-sm">₹</div>
                        <input
                          type="text"
                          placeholder="0"
                          value={rechargeAmount}
                          onChange={(e) => {
                            if (/^\d*$/.test(e.target.value)) setRechargeAmount(e.target.value);
                          }}
                          className="w-full pl-8 pr-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-blue-400 transition-colors"
                        />
                      </div>
                    </div>

                    {/* UTR */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                        UTR / Reference No.
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 123456789012"
                        value={utr}
                        onChange={(e) => setUtr(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-400 transition-colors placeholder:font-normal placeholder:text-slate-400"
                      />
                    </div>

                    {/* Date */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                        Payment Date
                      </label>
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 focus:outline-none focus:border-blue-400 transition-colors"
                      />
                    </div>

                    {/* Mode */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wider">
                        Payment Mode
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {["UPI", "IMPS", "NEFT"].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setMode(m)}
                            className={`py-2.5 rounded-xl text-xs font-bold border-2 transition-all
                              ${mode === m
                                ? "border-blue-500 bg-blue-50 text-blue-600"
                                : "border-slate-200 text-slate-500 hover:border-blue-300"
                              }`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full py-3.5 bg-indigo-700 hover:bg-indigo-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {isProcessing ? (
                        <><Loader2 size={15} className="animate-spin" /> Submitting…</>
                      ) : (
                        "Submit Payment Request"
                      )}
                    </button>
                  </div>

                  {/* RIGHT: QR */}
                  <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 p-6 bg-slate-50/60">
                    {selectedBank ? (
                      <div className="flex flex-col items-center text-center space-y-4">
                        <div className="p-3 bg-white rounded-2xl shadow-md border border-slate-100">
                          <img src={selectedBank.qr} alt="UPI QR" className="w-44 h-44 object-contain" />
                        </div>

                        <div>
                          <p className="font-semibold text-slate-700 text-sm">
                            Scan &amp; Pay via Any UPI App
                          </p>
                          <p className="text-xs text-slate-400 mt-1">
                            Balance credited within <span className="font-semibold text-slate-600">24 hours</span> after manual verification
                          </p>
                        </div>

                        {selectedBank.upiId && (
                          <div className="w-full bg-white rounded-xl border border-slate-200 px-3 py-2.5 flex items-center justify-between gap-2">
                            <div>
                              <p className="text-[10px] text-slate-400 font-medium">UPI ID</p>
                              <p className="text-sm font-semibold text-slate-700 truncate">{selectedBank.upiId}</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(selectedBank.upiId)}
                              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 flex-shrink-0"
                            >
                              <Copy size={12} /> Copy
                            </button>
                          </div>
                        )}

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Phone size={12} />
                          <a href="tel:+919919918196" className="font-semibold text-blue-600 hover:underline">
                            +91 99199 18196
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className="w-16 h-16 rounded-2xl bg-slate-200 flex items-center justify-center">
                          <QrCode size={30} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-500 text-sm">QR code will appear here</p>
                          <p className="text-xs text-slate-400 mt-1">Select a bank from the left</p>
                        </div>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </div>
          </motion.div>
        </div>

        {/* ── RECENT TRANSACTIONS ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          <div className="px-7 py-5 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-violet-50 rounded-xl flex items-center justify-center">
                <Receipt size={16} className="text-violet-600" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-800">Recent Transactions</h2>
                <p className="text-xs text-slate-400">{transactions.length} latest entries</p>
              </div>
            </div>
            <Link
              to="/retailer/transaction"
              className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg"
            >
              View All <ChevronRight size={13} />
            </Link>
          </div>

          {transactions.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80">
                    <th className="py-3 px-7 text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Transaction
                    </th>
                    <th className="py-3 px-7 text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {transactions.map((tx, idx) => (
                    <tr
                      key={tx._id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-4 px-7">
                        <div className="flex items-center gap-3.5">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            tx.type === "credit"
                              ? "bg-emerald-100"
                              : tx.type === "debit"
                              ? "bg-red-100"
                              : "bg-slate-100"
                          }`}>
                            {tx.type === "credit" ? (
                              <ArrowDownCircle size={16} className="text-emerald-600" />
                            ) : tx.type === "debit" ? (
                              <ArrowUpCircle size={16} className="text-red-500" />
                            ) : (
                              <XCircle size={16} className="text-slate-400" />
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-700 text-sm">
                              {getTransactionDescription(tx.meta)}
                            </p>
                            <p className="text-xs text-slate-400 mt-0.5">
                              {new Date(tx.createdAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-7 text-right">
                        <span className={`text-sm font-bold ${
                          tx.type === "credit" ? "text-emerald-600" : "text-red-500"
                        }`}>
                          {tx.type === "credit" ? "+" : "−"}₹
                          {tx.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                        <p className={`text-[10px] font-medium mt-0.5 capitalize ${
                          tx.type === "credit" ? "text-emerald-400" : "text-red-400"
                        }`}>
                          {tx.type}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mb-4">
                <Receipt size={24} className="text-slate-300" />
              </div>
              <p className="font-semibold text-slate-500">No transactions yet</p>
              <p className="text-xs text-slate-400 mt-1">Add money to get started</p>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
};

export default Wallet;