"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../providers";
import { useNiftyData } from "../../hooks/useNiftyData";
import { useTheme } from "@/contexts/ThemeProvider"; // ✅ Global Theme Import
import { 
  ArrowUpRight, ArrowDownRight, Plus, X, RefreshCw, Edit3, Trash2,
  TrendingUp, User, LogOut, Home, PieChart, Shield, Wallet, Star, 
  Building2, AlertTriangle, Loader2, Check, ArrowLeft, Lock, Mail, Palette, Send, ChevronRight
} from "lucide-react";
import Link from "next/link";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

const NPS_SCHEME_DB = {
  "SM001003": { name: "Scheme E (Equity)", defaultNav: 51.837 },
  "SM001004": { name: "Scheme C (Corporate Bond)", defaultNav: 45.206 },
  "SM001005": { name: "Scheme G (Govt Securities)", defaultNav: 40.800 },
  "E": { name: "Scheme E (Equity)", defaultNav: 51.837 },
  "C": { name: "Scheme C (Corporate Bond)", defaultNav: 45.206 },
  "G": { name: "Scheme G (Govt Securities)", defaultNav: 40.800 }
};

const SCHEME_INFO = {
  'E': { color: '#3b82f6', label: 'Equity' },
  'C': { color: '#f59e0b', label: 'Corporate Bond' },
  'G': { color: '#10b981', label: 'Govt Securities' }
};

const fetchNAVFromAPI = async (fundCode) => {
  const code = fundCode.toUpperCase().trim();
  const endpoints = [
    `https://arthgyaan.com/api/nps/${code.toLowerCase()}/nav.json`,
    `https://arthgyaan.com/api/nps/${code.replace('SM', '').toLowerCase()}/nav.json`,
    `https://api.mfapi.in/mf/${code}`,
  ];

  for (const url of endpoints) {
    try {
      const response = await fetch(url, { method: 'GET', headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(5000) });
      if (response.ok) {
        const data = await response.json();
        if (data.nav !== undefined) return { nav: parseFloat(data.nav), date: data.date || new Date().toISOString().split('T')[0], source: 'Arthgyaan', success: true };
        if (data.data?.[0]?.nav !== undefined) return { nav: parseFloat(data.data[0].nav), date: data.data[0].date || new Date().toISOString().split('T')[0], source: 'MF API', success: true };
      }
    } catch (error) { console.warn(`API failed: ${url}`, error); }
  }

  const schemeData = NPS_SCHEME_DB[code];
  return schemeData 
    ? { nav: schemeData.defaultNav, date: 'N/A', source: 'Local Fallback', success: false, message: 'Live NAV fetch nahi ho saka. Default value use ki gayi.' }
    : { nav: null, date: null, source: 'None', success: false, message: 'NAV fetch nahi ho saka.' };
};

export default function NPSPage() {
  const { user, portfolio, loading: authLoading, saveData, logout } = useAuth();
  const { nifty } = useNiftyData();
  const { theme, setTheme } = useTheme(); // ✅ Theme from Context
  
  const [npsData, setNpsData] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingPortfolio, setEditingPortfolio] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [portfolioToDelete, setPortfolioToDelete] = useState(null);
  
  const [portfolioInvested, setPortfolioInvested] = useState("");
  const [schemeEntries, setSchemeEntries] = useState({
    E: { code: "", units: "", nav: "", name: "Scheme E (Equity)" },
    C: { code: "", units: "", nav: "", name: "Scheme C (Corporate Bond)" },
    G: { code: "", units: "", nav: "", name: "Scheme G (Govt Securities)" }
  });
  const [loadingNav, setLoadingNav] = useState({ E: false, C: false, G: false });
  const [navFetchStatus, setNavFetchStatus] = useState({ E: null, C: null, G: null });

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [showProfile, setShowProfile] = useState(false);
  const [profilePanel, setProfilePanel] = useState('main');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync local state with global portfolio
  useEffect(() => { if (portfolio?.nps) setNpsData(portfolio.nps); }, [portfolio?.nps]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const triggerSync = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage')); };

  // Calculations
  const totalInvested = npsData.reduce((sum, p) => sum + ((p?.invested) ?? 0), 0);
  const totalCurrent = npsData.reduce((sum, p) => sum + ((p?.schemes) || []).reduce((s, scheme) => s + ((scheme?.value) ?? 0), 0), 0);
  const totalPnL = totalCurrent - totalInvested;
  const pnlPercent = totalInvested > 0 ? ((totalPnL / totalInvested) * 100).toFixed(2) : "0.00";

  // Refresh NPS NAVs Only
  const performRefresh = async () => {
    setIsRefreshing(true);
    try {
      const updatedNpsData = await Promise.all((npsData || []).map(async (portfolio) => {
        const updatedSchemes = await Promise.all((portfolio.schemes || []).map(async (scheme) => {
          try {
            const result = await fetchNAVFromAPI(scheme.code);
            if (result.success && result.nav) {
              return { ...scheme, nav: result.nav, value: (scheme.units || 0) * result.nav, lastUpdated: result.date };
            }
            return scheme;
          } catch { return scheme; }
        }));
        return { ...portfolio, schemes: updatedSchemes };
      }));

      await saveData('nps', updatedNpsData);
      triggerSync();
      showToast("✅ NPS NAVs refreshed!");
    } catch (error) { console.error('Refresh error:', error); }
    finally { await new Promise(res => setTimeout(res, 800)); setIsRefreshing(false); }
  };

  const fetchSchemeNav = async (type, code) => {
    if (!code || code.length < 4) return;
    setLoadingNav(prev => ({ ...prev, [type]: true }));
    setNavFetchStatus(prev => ({ ...prev, [type]: 'loading' }));
    try {
      const result = await fetchNAVFromAPI(code);
      if (result.success && result.nav) {
        setSchemeEntries(prev => ({ ...prev, [type]: { ...prev[type], nav: result.nav, lastUpdated: result.date, navSource: result.source } }));
        setNavFetchStatus(prev => ({ ...prev, [type]: 'success' }));
      } else {
        setSchemeEntries(prev => ({ ...prev, [type]: { ...prev[type], nav: result.nav || prev[type].nav || 0, lastUpdated: result.date, navSource: result.source } }));
        setNavFetchStatus(prev => ({ ...prev, [type]: result.nav ? 'fallback' : 'error' }));
      }
    } finally { setLoadingNav(prev => ({ ...prev, [type]: false })); }
  };

  const handleSchemeChange = (type, field, value) => {
    setSchemeEntries(prev => ({ ...prev, [type]: { ...prev[type], [field]: value } }));
    if (field === 'code') fetchSchemeNav(type, value);
  };

  const isFormValid = () => {
    return portfolioInvested && parseFloat(portfolioInvested) > 0 &&
           schemeEntries.E.code && schemeEntries.E.units && schemeEntries.E.nav &&
           schemeEntries.C.code && schemeEntries.C.units && schemeEntries.C.nav &&
           schemeEntries.G.code && schemeEntries.G.units && schemeEntries.G.nav;
  };

  const handleAdd = () => {
    setEditingPortfolio(null); setPortfolioInvested("");
    setSchemeEntries({
      E: { code: "SM001003", units: "", nav: "", name: "Scheme E (Equity)" },
      C: { code: "SM001004", units: "", nav: "", name: "Scheme C (Corporate Bond)" },
      G: { code: "SM001005", units: "", nav: "", name: "Scheme G (Govt Securities)" }
    });
    setShowModal(true);
  };

  const handleEdit = (portfolio) => {
    setEditingPortfolio(portfolio); setPortfolioInvested((portfolio?.invested ?? "").toString());
    const entries = { E: {}, C: {}, G: {} };
    (portfolio?.schemes || []).forEach(scheme => {
      const type = scheme.code?.includes('003') ? 'E' : scheme.code?.includes('004') ? 'C' : 'G';
      entries[type] = { code: scheme.code, units: (scheme.units ?? "").toString(), nav: scheme.nav, name: scheme.name };
    });
    setSchemeEntries(entries); setShowModal(true);
  };

  const handleDeleteClick = (portfolio) => { setPortfolioToDelete(portfolio); setShowDeleteModal(true); };
  
  const confirmDelete = async () => {
    if (portfolioToDelete) {
      const updated = npsData.filter(p => p.id !== portfolioToDelete.id);
      await saveData('nps', updated);
      triggerSync();
      setShowDeleteModal(false); setPortfolioToDelete(null); showToast("🗑️ Portfolio deleted.", "error");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const schemes = ['E', 'C', 'G'].map(type => ({
      id: `${Date.now()}-${type}`, code: schemeEntries[type].code, name: schemeEntries[type].name,
      nav: parseFloat(schemeEntries[type].nav) || 0, units: parseFloat(schemeEntries[type].units) || 0,
      value: (parseFloat(schemeEntries[type].units) || 0) * (parseFloat(schemeEntries[type].nav) || 0)
    }));

    if (editingPortfolio) {
      const updated = npsData.map(p => p.id === editingPortfolio.id ? { ...p, invested: parseFloat(portfolioInvested) || 0, schemes } : p);
      await saveData('nps', updated);
      triggerSync(); showToast("✅ Portfolio updated!");
    } else {
      const newPortfolio = { id: Date.now().toString(), portfolioName: `NPS Portfolio`, addedDate: new Date().toLocaleDateString('en-GB'), invested: parseFloat(portfolioInvested) || 0, schemes };
      await saveData('nps', [...npsData, newPortfolio]);
      triggerSync(); showToast("🎉 New Portfolio added!");
    }
    setShowModal(false);
  };

  const handleChangePassword = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', body: JSON.stringify({ action: 'changePassword', userId: user.userId, oldPassword: oldPass, newPassword: newPass }) });
      const data = await res.json();
      if (data.success) { showToast(data.message); setOldPass(''); setNewPass(''); setProfilePanel('main'); }
      else showToast(data.error, 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setIsSubmitting(false); }
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault(); setIsSubmitting(true);
    try {
      const res = await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'cors', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ action: 'submitContact', userId: user.userId, message: contactMsg }) });
      const text = await res.text();
      const data = JSON.parse(text);
      if (data.success) { showToast(data.message); setContactMsg(''); setProfilePanel('main'); }
      else showToast(data.error || 'Failed', 'error');
    } catch { showToast('Network error', 'error'); }
    finally { setIsSubmitting(false); }
  };

  // Theme Classes
  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800';
  const bgCard = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  if (!user) return (
    <main className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} p-5 rounded-2xl shadow-lg w-full max-w-sm border text-center`}>
        <p className={textMuted}>Please login to view NPS</p>
        <Link href="/" className="text-emerald-600 font-bold mt-2 block">Go to Login</Link>
      </div>
    </main>
  );

  return (
    <main className={`min-h-screen flex justify-center font-sans select-none transition-colors duration-300 ${bgMain}`}>
      <div className="w-full md:max-w-[420px] h-full md:h-screen relative flex flex-col md:shadow-2xl md:border-x md:border-gray-200">
        
        {/* Toast */}
        {toast.show && (<div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full shadow-lg text-xs font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.message}</div>)}

        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-100'} backdrop-blur-md z-20 flex-shrink-0 border-b sticky top-0`}>
          <header className="px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="bg-indigo-600 p-1.5 rounded-lg"><TrendingUp size={18} className="text-white"/></Link>
              <div><h1 className="text-base font-bold leading-none">My NPS</h1><div className="flex items-center gap-1.5 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span className={`text-[10px] font-medium truncate max-w-[120px] ${textMuted}`}>{user.userId}</span></div></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowProfile(true); setProfilePanel('main'); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95 border border-gray-200 dark:border-gray-600"><User size={18} className={isDark ? 'text-gray-300' : 'text-gray-600'}/></button>
            </div>
          </header>
          
          {/* Nifty Ticker */}
          <div className="px-3 pb-2.5">
            <div className={`flex items-center justify-between rounded-xl p-2.5 border ${!nifty.change.toString().includes('-') ? 'bg-emerald-50/50 border-emerald-100' : 'bg-red-50/50 border-red-100'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${!nifty.change.toString().includes('-') ? 'bg-emerald-100' : 'bg-red-100'}`}><TrendingUp size={14} className={!nifty.change.toString().includes('-') ? 'text-emerald-700' : 'text-red-700'}/></div>
                <div><div className={`text-[9px] font-bold uppercase tracking-wide ${!nifty.change.toString().includes('-') ? 'text-emerald-700' : 'text-red-700'}`}>Nifty 50</div><div className="font-semibold text-sm leading-none mt-0.5">{nifty.loading ? "..." : nifty.value}</div></div>
              </div>
              <div className="text-right px-2 py-1 rounded-lg bg-white/70"><div className={`flex items-center gap-0.5 font-bold text-xs ${!nifty.change.toString().includes('-') ? 'text-emerald-700' : 'text-red-700'}`}>{!nifty.change.toString().includes('-') ? <ArrowUpRight size={12} className="rotate-45"/> : <ArrowDownRight size={12}/>}<span>{nifty.change}</span></div><div className="text-[9px] text-gray-500 mt-0.5">{nifty.changePercent}</div></div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto pb-20 px-3 pt-3 space-y-3 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>NPS Accounts ({npsData.length})</h2>
            <button onClick={performRefresh} disabled={isRefreshing} className="p-2 bg-gray-100 dark:bg-gray-700 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 disabled:opacity-50 transition"><RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} /></button>
          </div>
          
          {npsData.length === 0 ? (
            <div className="text-center py-10 select-none h-full flex flex-col items-center justify-center">
              <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"><Building2 size={32} className="text-indigo-600" /></div>
              <p className={textMuted}>No NPS accounts yet</p>
              <button onClick={handleAdd} className="mt-3 text-indigo-600 text-sm font-bold hover:underline">+ Add your first account</button>
            </div>
          ) : (
            <div className="space-y-4 pb-24">
              {npsData.map((portfolio, index) => {
                const portfolioValue = (portfolio?.schemes || []).reduce((sum, s) => sum + ((s?.value) ?? 0), 0);
                const portfolioPnL = portfolioValue - ((portfolio?.invested) ?? 0);
                const portfolioPnlPercent = ((portfolio?.invested) ?? 0) > 0 ? ((portfolioPnL / portfolio.invested) * 100).toFixed(2) : "0.00";
                
                return (
                  <div key={portfolio?.id} className={`${bgCard} rounded-2xl border overflow-hidden shadow-sm transition-all duration-300`}>
                    <div className="p-4 flex items-center justify-between border-b ${isDark ? 'border-gray-700' : 'border-gray-100'}">
                      <div className="flex items-center gap-3">
                        <div className="bg-indigo-100 p-2.5 rounded-xl"><Building2 size={24} className="text-indigo-600" /></div>
                        <div><div className={`text-[10px] text-indigo-600 font-semibold uppercase tracking-wide`}>National Pension System</div><h3 className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{portfolio?.portfolioName || 'NPS Portfolio'}</h3><div className={`text-[10px] ${textMuted}`}>Added {portfolio?.addedDate} • Invested ₹{((portfolio?.invested) ?? 0).toLocaleString('en-IN')}</div></div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => handleEdit(portfolio)} className="p-1.5 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition"><Edit3 size={16} /></button>
                        <button onClick={() => handleDeleteClick(portfolio)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className={`divide-y ${isDark ? 'divide-gray-700' : 'divide-gray-100'}`}>
                      {(portfolio?.schemes || []).map((scheme) => {
                        const schemeType = scheme?.code?.includes('003') ? 'E' : scheme?.code?.includes('004') ? 'C' : 'G';
                        const schemeValue = scheme?.value ?? 0;
                        const schemeInvested = schemeValue / 1.2013;
                        const pnlPercent = schemeInvested > 0 ? (((schemeValue - schemeInvested) / schemeInvested) * 100).toFixed(2) : "0.00";
                        return (
                          <div key={scheme?.id} className={`p-4 ${isDark ? 'hover:bg-gray-700/50' : 'hover:bg-gray-50'} transition-colors`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-3 flex-1">
                                <div className={`w-1.5 h-10 ${SCHEME_INFO[schemeType]?.color || '#6366f1'} rounded-full`}></div>
                                <div className="flex-1 min-w-0"><h4 className={`font-bold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'} truncate`}>{scheme?.name || 'Scheme'}</h4><div className={`text-[10px] ${textMuted}`}>Code: {scheme?.code} • NAV: ₹{scheme?.nav}</div></div>
                              </div>
                              <div className="text-right"><div className={`font-bold text-sm ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>₹{schemeValue.toLocaleString('en-IN')}</div><div className={`text-[10px] text-emerald-600 font-bold flex items-center gap-0.5 justify-end`}><ArrowUpRight size={10} /> +{pnlPercent}%</div></div>
                            </div>
                            <div className={`pl-4.5 text-[11px] ${textMuted}`}>Units: <span className={`font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{(scheme?.units ?? 0).toFixed(3)}</span></div>
                          </div>
                        );
                      })}
                    </div>
                    <div className={`${isDark ? 'bg-indigo-900/20' : 'bg-indigo-50/50'} px-4 py-3 flex items-center justify-between border-t ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <span className={`text-[10px] text-indigo-600 font-semibold uppercase`}>Portfolio P&L</span>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs font-bold ${portfolioPnL >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{portfolioPnL >= 0 ? '+' : ''}₹{portfolioPnL.toLocaleString('en-IN', {maximumFractionDigits: 0})}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${portfolioPnL >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{portfolioPnlPercent}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <nav className={`${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-100'} backdrop-blur-md border-t fixed bottom-0 w-full md:max-w-[420px] flex justify-around py-2.5 pb-4 z-20 select-none`}>
          <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-indigo-600 transition"><Home size={18}/><span className="text-[10px] font-medium">Home</span></Link>
          <Link href="/funds" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-indigo-600 transition"><PieChart size={18}/><span className="text-[10px] font-medium">MF</span></Link>
          <Link href="/nps" className="flex flex-col items-center gap-0.5 text-indigo-600"><Shield size={18}/><span className="text-[10px] font-bold">NPS</span></Link>
          <Link href="/fd" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-indigo-600 transition"><Wallet size={18}/><span className="text-[10px] font-medium">FD</span></Link>
          <Link href="/watchlist" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-indigo-600 transition"><Star size={18}/><span className="text-[10px] font-medium">List</span></Link>
        </nav>

        {/* Add/Edit Modal */}
        {showModal && (
           <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowModal(false)}>
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} w-full md:max-w-[420px] md:rounded-2xl rounded-t-2xl p-6 max-h-[90vh] overflow-y-auto shadow-2xl`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold">{editingPortfolio ? 'Edit NPS Account' : 'Add NPS Account'}</h3>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"><X size={20} className={textMuted} /></button>
              </div>
              <form onSubmit={handleSave} className="space-y-5">
                <div className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                  <label className={`block text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-2 flex items-center gap-2`}><span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">1</span>Portfolio Invested Amount (₹)</label>
                  <input type="number" value={portfolioInvested} onChange={(e) => setPortfolioInvested(e.target.value)} placeholder="e.g. 30700" required step="0.01" className={`w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} />
                </div>
                <div className="space-y-4">
                  <label className={`block text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} flex items-center gap-2`}><span className="w-5 h-5 bg-indigo-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">2</span>Scheme Details (All 3 Mandatory)</label>
                  {['E', 'C', 'G'].map((type) => (
                    <div key={type} className={`${isDark ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-xl border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-8 ${SCHEME_INFO[type]?.color || '#6366f1'} rounded-full`}></div>
                        <span className={`text-sm font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>Scheme {type} ({SCHEME_INFO[type]?.label || ''})</span>
                        {navFetchStatus[type] === 'success' && <Check size={14} className="text-emerald-500 ml-auto" />}
                        {navFetchStatus[type] === 'fallback' && <span className="text-[10px] text-amber-600 ml-auto">⚠️ Default</span>}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div><label className={`block text-[10px] ${textMuted} mb-1`}>Scheme Code</label><div className="relative"><input type="text" value={schemeEntries[type]?.code || ""} onChange={(e) => handleSchemeChange(type, 'code', e.target.value)} placeholder={`SM00100${type === 'E' ? '3' : type === 'C' ? '4' : '5'}`} className={`w-full pl-3 pr-10 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} />{loadingNav[type] && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-600 animate-spin" />}</div></div>
                        <div><label className={`block text-[10px] ${textMuted} mb-1`}>Units</label><input type="number" value={schemeEntries[type]?.units || ""} onChange={(e) => handleSchemeChange(type, 'units', e.target.value)} placeholder="298.033" step="0.001" className={`w-full px-3 py-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500/30 transition ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} /></div>
                      </div>
                      {schemeEntries[type]?.nav && (<div className={`mt-2 p-2 rounded-lg border transition-all duration-300 ${navFetchStatus[type] === 'success' ? (isDark ? 'bg-emerald-900/30 border-emerald-800' : 'bg-emerald-50 border-emerald-100') : (isDark ? 'bg-amber-900/30 border-amber-800' : 'bg-amber-50 border-amber-100')}`}><div className="flex items-center justify-between"><span className={`text-[10px] font-semibold ${navFetchStatus[type] === 'success' ? 'text-emerald-600' : 'text-amber-600'}`}>{navFetchStatus[type] === 'success' ? '✅ Live NAV:' : '⚠️ Default NAV:'}</span><span className={`text-sm font-bold ${isDark ? 'text-indigo-300' : 'text-indigo-700'}`}>₹{schemeEntries[type].nav}</span></div></div>)}
                    </div>
                  ))}
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancel</button>
                  <button type="submit" disabled={!isFormValid()} className={`flex-1 px-4 py-3 font-bold rounded-xl text-sm shadow-lg transition-all flex items-center justify-center gap-2 ${isFormValid() ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' : (isDark ? 'bg-gray-700 text-gray-400' : 'bg-gray-200 text-gray-400')} cursor-not-allowed`}>{editingPortfolio ? 'Update Account' : 'Create NPS Account'}</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && portfolioToDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowDeleteModal(false)}>
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} w-full md:max-w-[380px] md:rounded-2xl rounded-t-2xl p-6 shadow-2xl`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-center mb-4"><div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center"><AlertTriangle size={32} className="text-red-600" /></div></div>
              <h3 className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Delete NPS Portfolio?</h3>
              <p className={`text-sm text-center mb-6 ${textMuted}`}>Kya aap sach mein <span className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>"{portfolioToDelete?.portfolioName}"</span> ko delete karna chahte hain?</p>
              <div className="flex gap-3"><button onClick={() => setShowDeleteModal(false)} className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancel</button><button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition shadow-lg shadow-red-200">Yes, Delete</button></div>
            </div>
          </div>
        )}

        {/* ✅ Profile Panel (Same as Home Page) */}
        {showProfile && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowProfile(false)}>
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} w-full md:max-w-[400px] md:rounded-2xl rounded-t-2xl p-5 shadow-2xl`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5">
                {profilePanel !== 'main' ? <button onClick={() => setProfilePanel('main')} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"><ArrowLeft size={20} className={isDark ? 'text-gray-300' : 'text-gray-600'}/></button> : <h3 className="text-lg font-bold">Profile</h3>}
                <button onClick={() => setShowProfile(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"><X size={20} className={textMuted}/></button>
              </div>
              
              {profilePanel === 'main' ? (
                <div className="space-y-4">
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-700 font-bold text-sm">{user.userId?.substring(0,2).toUpperCase()}</div>
                    <div><div className="font-semibold">@{user.userId}</div><div className={`text-xs ${textMuted}`}>Member since 2024</div></div>
                  </div>
                  <div className="space-y-2 pt-2">
                    <button onClick={() => setProfilePanel('password')} className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                      <div className="flex items-center gap-3"><Lock size={18} className={textMuted}/><span className="text-sm font-medium">Change Password</span></div><ChevronRight size={16} className={textMuted}/>
                    </button>
                    <button onClick={() => setProfilePanel('theme')} className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                      <div className="flex items-center gap-3"><Palette size={18} className={textMuted}/><span className="text-sm font-medium">App Theme</span></div><ChevronRight size={16} className={textMuted}/>
                    </button>
                    <button onClick={() => setProfilePanel('contact')} className={`w-full flex items-center justify-between p-3 rounded-xl border transition ${isDark ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'bg-gray-50 border-gray-100 hover:bg-gray-100'}`}>
                      <div className="flex items-center gap-3"><Mail size={18} className={textMuted}/><span className="text-sm font-medium">Contact Us</span></div><ChevronRight size={16} className={textMuted}/>
                    </button>
                    <button onClick={() => { logout(); setShowProfile(false); }} className="w-full flex items-center justify-center gap-2 p-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl border border-red-100 font-semibold text-sm transition"><LogOut size={16}/> Logout</button>
                  </div>
                </div>
              ) : profilePanel === 'password' ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <h4 className="font-bold text-base">Change Password</h4>
                  <input type="password" placeholder="Current Password" value={oldPass} onChange={e => setOldPass(e.target.value)} required className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}/>
                  <input type="password" placeholder="New Password (min 4 chars)" value={newPass} onChange={e => setNewPass(e.target.value)} required minLength={4} className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}/>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition">{isSubmitting ? 'Updating...' : 'Update Password'}</button>
                </form>
              ) : profilePanel === 'contact' ? (
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <h4 className="font-bold text-base">Contact Support</h4>
                  <textarea placeholder="Describe your issue..." value={contactMsg} onChange={e => setContactMsg(e.target.value)} required minLength={5} rows={4} className={`w-full px-3 py-2.5 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 resize-none ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`}/>
                  <button type="submit" disabled={isSubmitting} className="w-full bg-emerald-600 text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2">{isSubmitting ? 'Sending...' : <><Send size={16}/> Send Message</>}</button>
                </form>
              ) : profilePanel === 'theme' ? (
                <div className="space-y-4">
                  <h4 className="font-bold text-base">App Theme</h4>
                  <div className="grid grid-cols-3 gap-3">
                    {['light', 'dark', 'blue'].map(t => (
                      <button key={t} onClick={() => setTheme(t)} className={`p-3 rounded-xl border-2 transition ${theme === t ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' : isDark ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-full mx-auto mb-2 ${t === 'light' ? 'bg-gray-100' : t === 'dark' ? 'bg-gray-800' : 'bg-blue-100'}`}></div>
                        <span className="text-xs font-semibold capitalize">{t}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}