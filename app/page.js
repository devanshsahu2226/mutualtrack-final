"use client";

import { useState } from "react";
import { useAuth } from "./providers";
import { useTheme } from "@/contexts/ThemeProvider";
import { useNiftyData } from "../hooks/useNiftyData";
import { TrendingUp, Home, PieChart, Shield, Wallet, Star, ArrowUpRight, ArrowDownRight, ChevronRight, User, X, LogOut, Palette, ArrowLeft } from "lucide-react";
import Link from "next/link";

// ✅ TUMHARA GOOGLE SCRIPT URL (Hardcoded - turant kaam karega)
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbQBH0UgP-thwCzJ1MRR7yeaTkkv9gKhxoJkRRurjz5fbUtQTe85wNwNBfT4j_xAgp/exec";

// ✅ AuthForm Component (Login/Register)
function AuthForm({ isDark }) {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [userId, setUserId] = useState("");
  const [dob, setDob] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 🔥 CORS FIX: Content-Type text/plain use kar rahe hain
      const response = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ 
          action: isLogin ? "login" : "register", 
          userId, 
          password,
          dob: dob || ""
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      if (!data) {
        throw new Error("Empty response from server");
      }

      if (data.success) {
        if (isLogin) {
          showToast("✅ Login successful!");
          await login(userId, password); 
        } else {
          showToast("🎉 Account created! Please login.");
          setIsLogin(true);
        }
      } else {
        throw new Error(data.error || "Operation failed");
      }
    } catch (err) {
      console.error("Auth error:", err);
      showToast(err.message || "❌ Connection failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    // 🔥 Scroll Fix: overflow-hidden | Black Strip Fix: pt-[env(safe-area-inset-top)]
    <div className={`min-h-screen flex items-center justify-center p-6 font-sans ${isDark ? "bg-gray-900" : "bg-gray-50"} pt-[env(safe-area-inset-top)] overflow-hidden`}>
      
      {toast.show && (
        <div className={`fixed top-[env(safe-area-inset-top)] left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-full shadow-lg text-sm font-bold ${toast.type === "error" ? "bg-red-600 text-white" : "bg-emerald-600 text-white"}`}>
          {toast.message}
        </div>
      )}

      <div className={`${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"} w-full max-w-sm p-6 rounded-2xl shadow-xl border`}>
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-600/20">
            <TrendingUp size={28} className="text-white" />
          </div>
          {/* ✅ Font Color Fix: text-gray-900 for light, text-gray-100 for dark */}
          <h1 className={`text-2xl font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}>MutualTrack</h1>
          <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>{isLogin ? "Welcome back!" : "Create your portfolio"}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input type="text" placeholder="User ID" value={userId} onChange={(e) => setUserId(e.target.value)} required className={`w-full px-4 py-3.5 rounded-xl text-base outline-none focus:ring-2 focus:ring-emerald-500/30 border ${isDark ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500"}`} />
          {!isLogin && (
            <input type="date" placeholder="Date of Birth" value={dob} onChange={(e) => setDob(e.target.value)} required className={`w-full px-4 py-3.5 rounded-xl text-base outline-none focus:ring-2 focus:ring-emerald-500/30 border ${isDark ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500"}`} />
          )}
          <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={4} className={`w-full px-4 py-3.5 rounded-xl text-base outline-none focus:ring-2 focus:ring-emerald-500/30 border ${isDark ? "bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400" : "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500"}`} />
          <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-base hover:bg-emerald-700 disabled:opacity-50 transition shadow-lg shadow-emerald-600/20">
            {loading ? "Processing..." : isLogin ? "Login" : "Create Account"}
          </button>
        </form>
        <p className={`text-center text-sm mt-6 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button onClick={() => setIsLogin(!isLogin)} className="text-emerald-600 font-bold hover:underline">
            {isLogin ? "Register" : "Login"}
          </button>
        </p>
      </div>
    </div>
  );
}

// ✅ CategorySection Component
function CategorySection() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const categories = [
    { name: "Mutual Funds", icon: PieChart, color: "emerald", route: "/funds" },
    { name: "NPS", icon: Shield, color: "indigo", route: "/nps" },
    { name: "Fixed Deposits", icon: Wallet, color: "amber", route: "/fd" },
    { name: "Watchlist", icon: Star, color: "purple", route: "/watchlist" },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {categories.map((cat) => (
        <Link key={cat.name} href={cat.route} className={`${isDark ? "bg-gray-800 border-gray-700 hover:bg-gray-750" : "bg-white border-gray-100 hover:bg-gray-50"} p-5 rounded-2xl border shadow-sm transition-all active:scale-95 flex flex-col items-center gap-3`}>
          <div className={`p-3 rounded-full bg-${cat.color}-100 text-${cat.color}-600`}>
            <cat.icon size={24} />
          </div>
          <span className={`text-sm font-bold ${isDark ? "text-gray-200" : "text-gray-800"}`}>{cat.name}</span>
        </Link>
      ))}
    </div>
  );
}

// ✅ Main HomePage Component
export default function HomePage() {
  const { user, portfolio, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { nifty } = useNiftyData();
  const [showProfile, setShowProfile] = useState(false);
  const [profilePanel, setProfilePanel] = useState("main");

  const isDark = theme === "dark";

  if (!user) return <AuthForm isDark={isDark} />;

  return (
    // 🔥 Scroll Fix: overflow-hidden | Black Strip Fix: pt-[env(safe-area-inset-top)]
    <main className={`min-h-screen flex justify-center font-sans ${isDark ? "bg-gray-900 text-gray-100" : "bg-gray-50 text-gray-800"} pt-[env(safe-area-inset-top)] overflow-hidden`}>
      <div className="w-full max-w-[420px] flex flex-col relative min-h-screen">
        
        {/* Header */}
        <header className={`${isDark ? "bg-gray-800/90 border-gray-700" : "bg-white/90 border-gray-100"} backdrop-blur-md sticky top-0 z-20 border-b px-5 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2.5 rounded-xl shadow-lg shadow-emerald-600/20"><TrendingUp size={20} className="text-white" /></div>
            <div>
              <h1 className="text-xl font-bold leading-none">Dashboard</h1>
              <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>@{user.userId}</p>
            </div>
          </div>
          <button onClick={() => { setShowProfile(true); setProfilePanel("main"); }} className="p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-600">
            <User size={20} className={isDark ? "text-gray-300" : "text-gray-600"} />
          </button>
        </header>

        {/* Content Area (Only this part scrolls) */}
        <div className="flex-1 px-5 py-5 space-y-5 pb-32 overflow-y-auto">
          {/* Nifty Card */}
          <div className={`${!nifty.change.toString().includes("-") ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"} border rounded-2xl p-5 flex items-center justify-between`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${!nifty.change.toString().includes("-") ? "bg-emerald-100" : "bg-red-100"}`}>
                <TrendingUp size={20} className={!nifty.change.toString().includes("-") ? "text-emerald-700" : "text-red-700"} />
              </div>
              <div>
                <p className={`text-xs font-bold uppercase ${!nifty.change.toString().includes("-") ? "text-emerald-700" : "text-red-700"}`}>Nifty 50</p>
                <p className="font-bold text-lg">{nifty.loading ? "..." : nifty.value}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`flex items-center justify-end gap-1 font-bold text-sm ${!nifty.change.toString().includes("-") ? "text-emerald-700" : "text-red-700"}`}>
                {!nifty.change.toString().includes("-") ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                {nifty.loading ? "..." : nifty.change} pts
              </p>
              <p className="text-xs text-gray-500 mt-1">{nifty.changePercent}</p>
            </div>
          </div>
          {/* Categories */}
          <CategorySection />
        </div>

        {/* 🔥 Bottom Nav: Black Strip Fix pb-[env(safe-area-inset-bottom)] */}
        <nav className={`${isDark ? "bg-gray-800/90 border-gray-700" : "bg-white/90 border-gray-100"} backdrop-blur-md border-t fixed bottom-0 w-full max-w-[420px] flex justify-around py-4 pb-[env(safe-area-inset-bottom)] z-20`}>
          <Link href="/" className="flex flex-col items-center gap-1.5 text-emerald-600"><Home size={22} /><span className="text-xs font-bold">Home</span></Link>
          <Link href="/funds" className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-emerald-600 transition"><PieChart size={22} /><span className="text-xs font-medium">MF</span></Link>
          <Link href="/nps" className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-indigo-600 transition"><Shield size={22} /><span className="text-xs font-medium">NPS</span></Link>
          <Link href="/fd" className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-amber-600 transition"><Wallet size={22} /><span className="text-xs font-medium">FD</span></Link>
          <Link href="/watchlist" className="flex flex-col items-center gap-1.5 text-gray-400 hover:text-purple-600 transition"><Star size={22} /><span className="text-xs font-medium">List</span></Link>
        </nav>

        {/* Profile Modal */}
        {showProfile && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowProfile(false)}>
            <div className={`${isDark ? "bg-gray-800 text-gray-100" : "bg-white text-gray-800"} w-full max-w-[400px] md:rounded-2xl rounded-t-2xl p-6 shadow-2xl`} onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                {profilePanel !== "main" ? (
                  <button onClick={() => setProfilePanel("main")} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"><ArrowLeft size={20} /></button>
                ) : (
                  <h3 className="text-xl font-bold">Profile</h3>
                )}
                <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"><X size={20} /></button>
              </div>

              {profilePanel === "main" && (
                <div className="space-y-4">
                  <div className={`flex items-center gap-4 p-4 rounded-xl border ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-100"}`}>
                    <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-lg">{user.userId?.substring(0, 2).toUpperCase()}</div>
                    <div><p className="font-bold text-lg">@{user.userId}</p><p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>Member since 2024</p></div>
                  </div>
                  <button onClick={() => setProfilePanel("theme")} className={`w-full flex items-center justify-between p-4 rounded-xl border transition ${isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-100"}`}>
                    <div className="flex items-center gap-3"><Palette size={18} /><span className="text-base">App Theme</span></div><ChevronRight size={16} />
                  </button>
                  <button onClick={() => { logout(); setShowProfile(false); }} className="w-full flex items-center justify-center gap-2 p-4 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 font-bold text-base transition"><LogOut size={18} /> Logout</button>
                </div>
              )}

              {profilePanel === "theme" && (
                <div className="space-y-5">
                  <h4 className="text-lg font-bold">App Theme</h4>
                  <div className="grid grid-cols-3 gap-4">
                    {["light", "dark", "blue"].map((t) => (
                      <button key={t} onClick={() => setTheme(t)} className={`p-4 rounded-xl border-2 transition ${theme === t ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20" : isDark ? "border-gray-600 bg-gray-700" : "border-gray-200 bg-gray-50"}`}>
                        <div className={`w-10 h-10 rounded-full mx-auto mb-3 ${t === "light" ? "bg-gray-100" : t === "dark" ? "bg-gray-800" : "bg-blue-100"}`}></div>
                        <span className="text-sm font-bold capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}