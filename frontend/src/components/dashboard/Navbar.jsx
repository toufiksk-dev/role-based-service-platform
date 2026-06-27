import { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Menu, LogOut, ChevronDown, Wallet, PhoneCall, Globe, Bell } from "lucide-react";
import { getWalletBalance } from "../../api/wallet";
import Swal from "sweetalert2";

const Navbar = ({ toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [languageOpen, setLanguageOpen] = useState(false);

  const profileRef = useRef(null);
  const langRef = useRef(null);

  // -------------------------------------------
  // GOOGLE TRANSLATE SCRIPT LOAD
  // -------------------------------------------
  const googleTranslateElementInit = () => {
    new window.google.translate.TranslateElement(
      {
        pageLanguage: "en",
        includedLanguages: "en,hi,bn",
        autoDisplay: false,
        layout: window.google.translate.TranslateElement.InlineLayout.HORIZONTAL,
      },
      "google_translate_element"
    );
  };

  useEffect(() => {
    window.googleTranslateElementInit = googleTranslateElementInit;
    if (!document.querySelector("script[src*='translate.google.com']")) {
      const googleTranslateScript = document.createElement("script");
      googleTranslateScript.id = "google-translate-script";
      googleTranslateScript.src =
        "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(googleTranslateScript);
    }
  }, []);

  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      .goog-te-banner-frame { display: none !important; }
      .goog-logo-link { display: none !important; }
      .goog-te-gadget { height: 0 !important; overflow: hidden; }
      .goog-te-gadget-simple { display: none !important; }
    `;
    document.head.appendChild(style);
  }, []);

  const changeLanguage = (langCode) => {
    const select = document.querySelector(".goog-te-combo");
    if (select) {
      select.value = "en";
      select.dispatchEvent(new Event("change"));
      if (langCode !== "en") {
        select.value = langCode;
        select.dispatchEvent(new Event("change"));
      }
    }
    setLanguageOpen(false);
  };

  const fetchBalance = async () => {
    if (user?.role === "retailer") {
      try {
        const { data } = await getWalletBalance();
        setWalletBalance(data.balance);
      } catch {
        setWalletBalance(null);
      }
    }
  };

  useEffect(() => {
    fetchBalance();
  }, [user]);

  const handleLogout = () => {
    Swal.fire({
      title: "Are you sure?",
      text: "You will be logged out.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#6366f1",
      cancelButtonColor: "#ef4444",
      confirmButtonText: "Yes, log me out!",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await logout();
        navigate("/");
        Swal.fire({
          title: "Logged Out!",
          text: "You have been logged out successfully.",
          icon: "success",
          timer: 1200,
          showConfirmButton: false,
        });
      }
    });
  };

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLanguageOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const languages = [
    { code: "en", label: "English", flag: "🇬🇧" },
    { code: "hi", label: "हिंदी", flag: "🇮🇳" },
    { code: "bn", label: "বাংলা", flag: "🇧🇩" },
  ];

  const roleColor = user?.role === "admin"
    ? "from-violet-500 to-indigo-600"
    : "from-emerald-400 to-teal-600";

  return (
    <>
      <div id="google_translate_element" className="hidden" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap');

        .navbar-root * { font-family: 'Outfit', sans-serif; }

        .glass-pill {
          background: rgba(255,255,255,0.7);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.9);
          transition: all 0.2s ease;
        }
        .glass-pill:hover {
          background: rgba(255,255,255,0.95);
          box-shadow: 0 4px 20px rgba(99,102,241,0.12);
        }

        .avatar-ring {
          background: linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4);
          padding: 2px;
          border-radius: 50%;
        }
        .avatar-inner {
          background: white;
          border-radius: 50%;
          padding: 2px;
        }

        .dropdown-card {
          background: white;
          border: 1px solid rgba(99,102,241,0.1);
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(99,102,241,0.08);
        }

        .wallet-badge {
          background: linear-gradient(135deg, #f0fdf4, #dcfce7);
          border: 1.5px solid #86efac;
        }

        .navbar-bg {
          background: #ffffffcc;
          backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(226,232,240,0.8);
        }

        .menu-btn {
          transition: all 0.2s ease;
        }
        .menu-btn:hover {
          background: rgba(99,102,241,0.08);
          transform: scale(1.05);
        }

        .lang-option {
          transition: all 0.15s ease;
        }
        .lang-option:hover {
          background: linear-gradient(135deg, #f0f0ff, #f5f3ff);
          padding-left: 20px;
        }

        .profile-option:hover {
          background: #fef2f2;
          color: #ef4444;
        }
      `}</style>

      <header className="navbar-root sticky top-0 z-50 navbar-bg">
        <div className="flex items-center justify-between px-4 sm:px-6 h-[64px]">

          {/* LEFT */}
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSidebar}
              className="menu-btn p-2.5 rounded-xl text-gray-500"
            >
              <Menu className="h-5 w-5" />
            </button>

            <img
              src="/logo.png"
              alt="Logo"
              className="md:h-10 h-8 w-auto object-contain"
            />
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-2 sm:gap-3">

            {/* Language Picker */}
            <div className="relative hidden sm:block" ref={langRef}>
              <button
                onClick={() => setLanguageOpen(!languageOpen)}
                className="glass-pill flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-gray-600 font-medium"
              >
                <Globe className="h-4 w-4 text-indigo-500" />
                <span className="hidden md:inline">Language</span>
                <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform duration-200 ${languageOpen ? "rotate-180" : ""}`} />
              </button>

              {languageOpen && (
                <div className="dropdown-card absolute right-0 mt-2 w-44 py-2 z-50">
                  {languages.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => changeLanguage(lang.code)}
                      className="lang-option w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 font-medium"
                    >
                      <span className="text-base">{lang.flag}</span>
                      {lang.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Wallet */}
            {user?.role === "retailer" && (
              <Link
                to="/retailer/wallet"
                className="wallet-badge flex items-center gap-2 px-3 py-2 rounded-xl"
              >
                <Wallet className="h-4 w-4 text-emerald-600" />
                <span className="text-sm font-semibold text-emerald-700">
                  {walletBalance !== null ? `₹${walletBalance.toFixed(2)}` : "—"}
                </span>
              </Link>
            )}

            {/* Support */}
            <a
              href="https://wa.me/919919918196"
              target="_blank"
              rel="noopener noreferrer"
              className="glass-pill hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-gray-600"
            >
              <PhoneCall className="h-4 w-4 text-green-500" />
              <span className="hidden md:inline">Support</span>
            </a>

            {/* Divider */}
            <div className="hidden sm:block w-px h-7 bg-gray-200 mx-1" />

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2.5 pl-1 pr-3 py-1 rounded-xl hover:bg-white/80 transition-all duration-200"
              >
                <div className="avatar-ring">
                  <div className="avatar-inner">
                    <div className={`h-8 w-8 flex items-center justify-center rounded-full bg-gradient-to-br ${roleColor} text-white text-sm font-bold`}>
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                  </div>
                </div>

                <div className="hidden sm:block text-left">
                  <p className="text-sm font-semibold text-gray-800 leading-tight">{user?.name}</p>
                  <p className="text-[11px] text-indigo-500 font-medium capitalize">{user?.role}</p>
                </div>

                <ChevronDown className={`h-4 w-4 text-gray-400 hidden sm:block transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`} />
              </button>

              {profileOpen && (
                <div className="dropdown-card absolute right-0 mt-2 w-52 z-50 overflow-hidden">
                  {/* User Info Header */}
                  <div className="px-4 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                    <p className="text-sm font-semibold text-gray-800">{user?.name}</p>
                    <p className="text-xs text-indigo-500 capitalize mt-0.5">{user?.role}</p>
                  </div>
                  <div className="py-1.5">
                    <button
                      onClick={handleLogout}
                      className="profile-option w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-600 font-medium transition-all duration-150"
                    >
                      <LogOut className="h-4 w-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Navbar;