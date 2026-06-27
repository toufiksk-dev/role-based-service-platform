import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Users, BriefcaseBusiness, LogOut, ChevronRight, X,
  Package, Layers, History, BarChart3, LifeBuoy, Megaphone, UserCheck,
  UserPlus, UserCog, Store, ClipboardList, WalletCards, ArrowRightLeft,
  Wallet, MessageCircle, UserCircle, ConciergeBell, Tv, FileText,
  Landmark, FileSearch, PieChart, MessageSquareWarning,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";

/* ─── colour tokens per role ─────────────────────────────────────── */
const THEME = {
  admin: {
    accent: "#6366f1",
    accentDark: "#4f46e5",
    accentBg: "#eef2ff",
    accentText: "#6366f1",
    avatarGrad: "linear-gradient(135deg,#7c3aed,#6366f1)",
    badgeBg: "#ede9fe",
    badgeText: "#7c3aed",
    activeShadow: "0 4px 16px rgba(99,102,241,.28)",
  },
  retailer: {
    accent: "#10b981",
    accentDark: "#059669",
    accentBg: "#ecfdf5",
    accentText: "#059669",
    avatarGrad: "linear-gradient(135deg,#10b981,#0d9488)",
    badgeBg: "#d1fae5",
    badgeText: "#065f46",
    activeShadow: "0 4px 16px rgba(16,185,129,.25)",
  },
};

/* ─── nav definitions ────────────────────────────────────────────── */
const retailerLinks = [
  { id: "dashboard",   to: "/retailer/dashboard",          label: "Dashboard",      icon: LayoutDashboard },
  { id: "services",    to: "/retailer/services",           label: "Services",       icon: BriefcaseBusiness },
  { id: "submissions", to: "/retailer/submission-history", label: "Submissions",    icon: History },
  { id: "findDocs",    to: "/retailer/find-documents",     label: "Find Documents", icon: FileSearch },
  { id: "complaint",   to: "/retailer/raise-complaint",    label: "Raise Complaint",icon: MessageSquareWarning },
  { id: "txn",         to: "/retailer/transaction",        label: "Transactions",   icon: ArrowRightLeft },
  {
    id: "wallet", label: "Wallet", icon: Wallet,
    children: [
      { to: "/retailer/wallet",               label: "Add Money",       icon: WalletCards },
      { to: "/retailer/fund-request",         label: "Fund Request",    icon: Landmark },
      { to: "/retailer/fund-request-history", label: "Request History", icon: History },
    ],
  },
  {
    id: "svc-req", label: "Service Request", icon: ConciergeBell,
    children: [
      { to: "/retailer/pan-card",        label: "Pan Card",        icon: Tv },
      { to: "/retailer/driving-licence", label: "Driving Licence", icon: FileText },
      { to: "/retailer/insurance",       label: "Insurance",       icon: Landmark },
      { to: "/retailer/Income Tax File", label: "Income Tax",      icon: WalletCards },
      { to: "/retailer/Gst",             label: "GST",             icon: FileText },
    ],
  },
  {
    id: "business", label: "My Business", icon: Store,
    children: [
      { to: "/retailer/commision-chart", label: "Commission Chart", icon: PieChart },
      { to: "/retailer/price-chart",     label: "Price Chart",      icon: BarChart3 },
    ],
  },
  {
    id: "account", label: "Account", icon: UserCircle,
    children: [
      { to: "/retailer/profile", label: "My Profile", icon: UserCircle },
    ],
  },
  { id: "support", to: "/retailer/support", label: "Support", icon: LifeBuoy },
];

const adminLinks = [
  { id: "dashboard", to: "/st-admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    id: "retailers", label: "Retailers", icon: Store,
    children: [
      { to: "/st-admin/verify-retailers", label: "KYC Pending",      icon: UserCheck },
      { to: "/st-admin/kyc-requests",     label: "KYC Requests",     icon: UserCog },
      { to: "/st-admin/retailers",        label: "Active Retailers",  icon: Users },
    ],
  },
  {
    id: "services", label: "Services", icon: BriefcaseBusiness,
    children: [
      { to: "/st-admin/services",          label: "Services",        icon: Package },
      { to: "/st-admin/subservices",       label: "Sub Services",    icon: Layers },
      { to: "/st-admin/subservice-option", label: "Service Options", icon: UserCog },
    ],
  },
  { id: "svc-req",  to: "/st-admin/service-requests",         label: "Service Requests",     icon: ClipboardList },
  { id: "offline",  to: "/st-admin/offline-recharge-request", label: "Offline Wallet Credit", icon: Wallet },
  { id: "credit",   to: "/st-admin/credit-wallet",            label: "Credit Wallet",         icon: WalletCards },
  { id: "notices",  to: "/st-admin/manage-notices",           label: "Manage Notices",        icon: Megaphone },
  {
    id: "user", label: "User Management", icon: Users,
    children: [
      { to: "/st-admin/add-user",   label: "Add New User", icon: UserPlus },
      { to: "/st-admin/admin-list", label: "Admin List",   icon: UserCog },
    ],
  },
  { id: "wishes", to: "/st-admin/retailer-wishes", label: "Global Messages", icon: MessageCircle },
];

/* ─── section grouping per role ─────────────────────────────────── */
const retailerSections = [
  { label: null,         ids: ["dashboard"] },
  { label: "Operations", ids: ["services","submissions","findDocs","complaint","txn"] },
  { label: "Finance",    ids: ["wallet"] },
  { label: "Services",   ids: ["svc-req"] },
  { label: "Business",   ids: ["business"] },
  { label: "Account",    ids: ["account","support"] },
];

const adminSections = [
  { label: null,          ids: ["dashboard"] },
  { label: "Management",  ids: ["retailers","services","svc-req"] },
  { label: "Finance",     ids: ["offline","credit"] },
  { label: "Admin Tools", ids: ["notices","user","wishes"] },
];

/* ─── component ─────────────────────────────────────────────────── */
export default function ModernSidebar({ isOpen, toggleSidebar }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(null);

  const isAdmin = user?.role === "admin";
  const T = isAdmin ? THEME.admin : THEME.retailer;
  const links = isAdmin ? adminLinks : retailerLinks;
  const sections = isAdmin ? adminSections : retailerSections;

  const toggle = (id) => setExpanded(p => p === id ? null : id);

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: T.accent,
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Yes, log me out!",
    }).then(async (r) => {
      if (r.isConfirmed) {
        await logout();
        navigate("/");
        Swal.fire({ title: "Logged Out!", icon: "success", timer: 1500, showConfirmButton: false });
      }
    });
  };

  /* ── shared nav-row renderer ── */
  const NavRow = ({ link, isActive = false }) => {
    const Icon = link.icon;
    const hasChildren = !!link.children;
    const isExp = expanded === link.id;

    const rowStyle = isActive
      ? { background: `linear-gradient(135deg,${T.accent},${T.accentDark})`, boxShadow: T.activeShadow }
      : isExp
        ? { background: "#f8fafc" }
        : {};

    const iconStyle = isActive
      ? { background: "rgba(255,255,255,.18)" }
      : { background: "#f1f5f9" };

    return (
      <div
        className="flex items-center gap-3 mx-2 px-2 py-[9px] rounded-[11px] cursor-pointer transition-all duration-150 select-none"
        style={{
          ...rowStyle,
          justifyContent: isOpen ? undefined : "center",
          color: isActive ? "#fff" : "#475569",
          fontSize: "13.5px",
          fontWeight: isActive ? 600 : 500,
        }}
        onClick={hasChildren ? () => toggle(link.id) : undefined}
        title={!isOpen ? link.label : undefined}
      >
        {/* icon chip */}
        <div
          className="w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0 transition-all"
          style={iconStyle}
        >
          <Icon style={{ width: 16, height: 16 }} />
        </div>

        {isOpen && (
          <>
            <span className="flex-1 truncate leading-none">{link.label}</span>
            {hasChildren && (
              <ChevronRight
                size={13}
                style={{
                  color: isActive ? "rgba(255,255,255,.7)" : "#94a3b8",
                  transition: "transform .2s",
                  transform: isExp ? "rotate(90deg)" : "none",
                  flexShrink: 0,
                }}
              />
            )}
          </>
        )}
      </div>
    );
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        .sb-wrap { font-family:'Plus Jakarta Sans',sans-serif; }
        .sb-scroll::-webkit-scrollbar { width:3px; }
        .sb-scroll::-webkit-scrollbar-track { background:transparent; }
        .sb-scroll::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:8px; }
        .nr-hover:hover { background:#f8fafc; }
        .logout-row:hover { background:#fff1f2 !important; color:#ef4444 !important; }
        .logout-row:hover .logout-ic { background:#fee2e2 !important; color:#ef4444 !important; }
      `}</style>

      {/* Mobile overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-30 md:hidden" onClick={toggleSidebar} />
      )}

      <aside
        className={`sb-wrap fixed md:relative top-0 left-0 z-[999] h-screen flex flex-col
          bg-white border-r border-slate-100 shadow-[2px_0_20px_rgba(0,0,0,.05)]
          transition-all duration-300 ease-in-out overflow-hidden
          ${isOpen ? "w-[260px]" : "w-0 md:w-[66px]"}`}
      >

        {/* ── HEADER ── */}
        <div
          className="flex items-center border-b border-slate-100 flex-shrink-0"
          style={{ padding: isOpen ? "14px 14px" : "14px 8px", justifyContent: isOpen ? undefined : "center" }}
        >
          <div className="relative flex-shrink-0">
            <div
              className="w-10 h-10 rounded-[13px] flex items-center justify-center text-white text-sm font-bold shadow-md"
              style={{ background: T.avatarGrad }}
            >
              {user?.name?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full bg-emerald-400 border-[2px] border-white" />
          </div>

          {isOpen && (
            <>
              <div className="ml-3 flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-slate-800 truncate leading-tight">
                  {user?.name}
                </p>
                <span
                  className="inline-block text-[10px] font-semibold px-2 py-[2px] rounded-full mt-[3px] capitalize"
                  style={{ background: T.badgeBg, color: T.badgeText }}
                >
                  {user?.role}
                </span>
              </div>
              <button
                onClick={toggleSidebar}
                className="md:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 flex-shrink-0 ml-1"
              >
                <X size={14} />
              </button>
            </>
          )}
        </div>

        {/* ── SEARCH (expanded only) ── */}
        {isOpen && (
          <div className="px-3 pt-3 pb-1 flex-shrink-0">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-[10px] px-3 py-2">
              <svg className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <span className="text-[12px] text-slate-400">Search menu…</span>
            </div>
          </div>
        )}

        {/* ── NAV ── */}
        <nav className="sb-scroll flex-1 overflow-y-auto py-2">
          {sections.map(({ label, ids }) => {
            const sectionLinks = links.filter(l => ids.includes(l.id));
            if (!sectionLinks.length) return null;

            return (
              <div key={label || "__top"}>
                {/* Section label */}
                {label && isOpen && (
                  <div style={{
                    fontSize: 9.5,
                    fontWeight: 700,
                    letterSpacing: ".09em",
                    textTransform: "uppercase",
                    color: "#94a3b8",
                    padding: "10px 18px 4px",
                  }}>
                    {label}
                  </div>
                )}

                {sectionLinks.map(link => {
                  const isExp = expanded === link.id;

                  /* ── has children (accordion) ── */
                  if (link.children) {
                    return (
                      <div key={link.id}>
                        <div className="nr-hover" style={{ borderRadius: 11, margin: "1px 8px", cursor: "pointer" }}>
                          <NavRow link={link} isActive={false} />
                        </div>

                        <AnimatePresence>
                          {isExp && isOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2, ease: "easeOut" }}
                              className="overflow-hidden"
                            >
                              <div
                                className="ml-[58px] mr-3 my-1 pl-3 space-y-[2px]"
                                style={{ borderLeft: `2px solid ${T.accentBg}` }}
                              >
                                {link.children.map((sub, i) => {
                                  const SubIcon = sub.icon;
                                  return (
                                    <NavLink
                                      key={i}
                                      to={sub.to}
                                      className={({ isActive }) =>
                                        `flex items-center gap-2.5 px-2.5 py-2 rounded-[9px] text-[12.5px] font-medium transition-all duration-150 ${
                                          isActive ? "font-semibold" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                                        }`
                                      }
                                      style={({ isActive }) =>
                                        isActive ? { background: T.accentBg, color: T.accentText } : {}
                                      }
                                    >
                                      <SubIcon style={{ width: 13, height: 13, flexShrink: 0 }} />
                                      <span>{sub.label}</span>
                                    </NavLink>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  }

                  /* ── leaf link ── */
                  return (
                    <NavLink
                      key={link.id}
                      to={link.to}
                      title={!isOpen ? link.label : undefined}
                      className={() => "block"}
                    >
                      {({ isActive }) => (
                        <div
                          className={isActive ? "" : "nr-hover"}
                          style={{ borderRadius: 11, margin: "1px 8px" }}
                        >
                          <NavRow link={link} isActive={isActive} />
                        </div>
                      )}
                    </NavLink>
                  );
                })}
              </div>
            );
          })}
        </nav>

        {/* ── SIGN OUT ── */}
        <div className="border-t border-slate-100 p-2 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="logout-row flex items-center gap-3 w-full px-2 py-[9px] rounded-[11px] transition-all duration-150 text-slate-500 text-[13.5px] font-medium"
            style={{ justifyContent: isOpen ? undefined : "center" }}
            title={!isOpen ? "Sign Out" : undefined}
          >
            <div
              className="logout-ic w-[34px] h-[34px] rounded-[9px] flex items-center justify-center flex-shrink-0 transition-all"
              style={{ background: "#fef2f2", color: "#f87171" }}
            >
              <LogOut style={{ width: 15, height: 15 }} />
            </div>
            {isOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}