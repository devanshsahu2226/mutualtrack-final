"use client";

import { useState, useEffect } from "react";
import { useAuth } from "../providers";
import { useNiftyData } from "../../hooks/useNiftyData";
import { useTheme } from "@/contexts/ThemeProvider";
import { TrendingUp, User, LogOut, Home, PieChart, Shield, Wallet, Star, ArrowUpRight, ArrowDownRight, Plus, X, RefreshCw, Edit3, Trash2, AlertTriangle, ArrowLeft, Lock, Mail, Palette, Send, ChevronRight, Loader2, ExternalLink } from "lucide-react";
import Link from "next/link";

const APPS_SCRIPT_URL = process.env.NEXT_PUBLIC_APPS_SCRIPT_URL;

export default function WatchlistPage() {
  const { user, portfolio, saveData, logout } = useAuth();
  const { nifty } = useNiftyData();
  const { theme, setTheme } = useTheme();
  
  const [watchlist, setWatchlist] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [formData, setFormData] = useState({ code: "", name: "", nav: "" });
  const [isFetching, setIsFetching] = useState(false);
  const [toast, setToast] = useState({ show: false, message: "", type: "success" });
  const [showProfile, setShowProfile] = useState(false);
  const [profilePanel, setProfilePanel] = useState('main');
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [contactMsg, setContactMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { if (portfolio?.watchlist) setWatchlist(portfolio.watchlist); }, [portfolio?.watchlist]);

  const showToast = (message, type = "success") => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const triggerSync = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('storage')); };

  const fetchFundDetails = async () => {
    const code = formData.code.trim();
    if (!code || code.length < 4) return;
    setIsFetching(true);
    try {
      const res = await fetch(`https://api.mfapi.in/mf/${code}`);
      const data = await res.json();
      if (data.meta && data.data?.length) {
        setFormData(prev => ({ ...prev, name: data.meta.scheme_name, nav: data.data[0].nav }));
        showToast("✅ Fund details fetched!");
      } else { showToast("⚠️ Fund Code nahi mila!", "error"); }
    } catch { showToast("🌐 Network error!", "error"); }
    finally { setIsFetching(false); }
  };

  const handleAdd = () => { setFormData({ code: "", name: "", nav: "" }); setShowModal(true); };
  const handleDeleteClick = (item) => { setItemToDelete(item); setShowDeleteModal(true); };
  
  const confirmDelete = async () => {
    if (itemToDelete) {
      const updated = watchlist.filter(f => f.id !== itemToDelete.id);
      await saveData('watchlist', updated);
      triggerSync();
      setShowDeleteModal(false); setItemToDelete(null); showToast("🗑️ Removed from watchlist.", "error");
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const newItem = {
      id: Date.now(),
      code: formData.code,
      name: formData.name,
      nav: parseFloat(formData.nav) || 0,
      addedAt: new Date().toISOString().split('T')[0]
    };
    const updated = [...watchlist, newItem];
    await saveData('watchlist', updated);
    triggerSync();
    showToast("🎉 Added to watchlist!");
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

  const isDark = theme === 'dark';
  const bgMain = isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800';
  const bgCard = isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';

  if (!user) return (
    <main className={`min-h-screen flex items-center justify-center p-4 font-sans ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'} p-5 rounded-2xl shadow-lg w-full max-w-sm border text-center`}>
        <p className={textMuted}>Please login to view watchlist</p>
        <Link href="/" className="text-emerald-600 font-bold mt-2 block">Go to Login</Link>
      </div>
    </main>
  );

  return (
    <main className={`min-h-screen flex justify-center font-sans select-none transition-colors duration-300 ${bgMain}`}>
      <div className="w-full md:max-w-[420px] h-full md:h-screen relative flex flex-col md:shadow-2xl md:border-x md:border-gray-200">
        {toast.show && (<div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[60] px-4 py-2 rounded-full shadow-lg text-xs font-medium ${toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>{toast.message}</div>)}

        {/* Header */}
        <div className={`${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-100'} backdrop-blur-md z-20 flex-shrink-0 border-b sticky top-0`}>
          <header className="px-3 py-2.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Link href="/" className="bg-purple-600 p-1.5 rounded-lg"><TrendingUp size={18} className="text-white"/></Link>
              <div><h1 className="text-base font-bold leading-none">Watchlist</h1><div className="flex items-center gap-1.5 mt-0.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span><span className={`text-[10px] font-medium truncate max-w-[120px] ${textMuted}`}>{user.userId}</span></div></div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => { setShowProfile(true); setProfilePanel('main'); }} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition active:scale-95 border border-gray-200 dark:border-gray-600"><User size={18} className={isDark ? 'text-gray-300' : 'text-gray-600'}/></button>
            </div>
          </header>
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
            <h2 className={`text-lg font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Tracked Funds ({watchlist.length})</h2>
            <button onClick={handleAdd} className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-full font-bold text-xs flex items-center gap-1 shadow-sm transition"><Plus size={14} /> Add Fund</button>
          </div>
          
          {watchlist.length === 0 ? (
            <div className="text-center py-10 select-none h-full flex flex-col items-center justify-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3"><Star size={32} className="text-purple-600" /></div>
              <p className={textMuted}>No funds tracked yet</p>
              <button onClick={handleAdd} className="mt-3 text-purple-600 text-sm font-bold hover:underline">+ Add to watchlist</button>
            </div>
          ) : (
            <div className="space-y-3 pb-24">
              {watchlist.map((item) => (
                <div key={item.id} className={`${bgCard} rounded-2xl p-4 shadow-sm border flex items-center justify-between transition-all duration-300`}>
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300`}>{item.code}</span>
                      <span className={`text-[9px] ${textMuted}`}>{item.addedAt}</span>
                    </div>
                    <h3 className={`font-bold text-sm leading-tight truncate ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{item.name}</h3>
                    <div className={`text-xs ${textMuted} mt-1`}>NAV: ₹{item.nav}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg transition"><ExternalLink size={16} /></button>
                    <button onClick={() => handleDeleteClick(item)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition"><Trash2 size={16} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <nav className={`${isDark ? 'bg-gray-800/90 border-gray-700' : 'bg-white/90 border-gray-100'} backdrop-blur-md border-t fixed bottom-0 w-full md:max-w-[420px] flex justify-around py-2.5 pb-4 z-20 select-none`}>
          <Link href="/" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-purple-600 transition"><Home size={18}/><span className="text-[10px] font-medium">Home</span></Link>
          <Link href="/funds" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-emerald-600 transition"><PieChart size={18}/><span className="text-[10px] font-medium">MF</span></Link>
          <Link href="/nps" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-indigo-600 transition"><Shield size={18}/><span className="text-[10px] font-medium">NPS</span></Link>
          <Link href="/fd" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-amber-600 transition"><Wallet size={18}/><span className="text-[10px] font-medium">FD</span></Link>
          <Link href="/watchlist" className="flex flex-col items-center gap-0.5 text-purple-600"><Star size={18}/><span className="text-[10px] font-bold">List</span></Link>
        </nav>

        {/* Add Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowModal(false)}>
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} w-full md:max-w-[400px] md:rounded-2xl rounded-t-2xl p-6 shadow-2xl`} onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-6"><h3 className="text-lg font-bold">Add to Watchlist</h3><button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"><X size={20} className={textMuted}/></button></div>
              <form onSubmit={handleSave} className="space-y-4">
                <div><label className={`block text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Fund Code</label><div className="relative"><input type="text" value={formData.code} onChange={(e) => setFormData({...formData, code: e.target.value})} onBlur={fetchFundDetails} placeholder="e.g. 122640" required className={`w-full pl-4 pr-10 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/30 transition ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} />{isFetching && <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 animate-spin" />}</div></div>
                <div><label className={`block text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Fund Name</label><input type="text" value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} placeholder="Auto-filled..." required className={`w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/30 transition ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} /></div>
                <div><label className={`block text-xs font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'} mb-1`}>Current NAV (₹)</label><input type="number" value={formData.nav} onChange={(e) => setFormData({...formData, nav: e.target.value})} placeholder="Auto-filled..." required step="0.01" className={`w-full px-4 py-3 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-500/30 transition ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'}`} /></div>
                <div className="flex gap-3 pt-2"><button type="button" onClick={() => setShowModal(false)} className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancel</button><button type="submit" className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl text-sm font-bold hover:bg-purple-700 transition shadow-lg shadow-purple-200">Add to List</button></div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && itemToDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-end md:items-center justify-center p-0 md:p-4" onClick={() => setShowDeleteModal(false)}>
            <div className={`${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} w-full md:max-w-[380px] md:rounded-2xl rounded-t-2xl p-6 shadow-2xl`} onClick={e => e.stopPropagation()}>
              <div className="flex justify-center mb-4"><div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center"><AlertTriangle size={32} className="text-red-600" /></div></div>
              <h3 className={`text-xl font-bold text-center mb-2 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Remove from Watchlist?</h3>
              <p className={`text-sm text-center mb-6 ${textMuted}`}>Kya aap <span className={`font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>"{itemToDelete.name}"</span> ko hatana chahte hain?</p>
              <div className="flex gap-3"><button onClick={() => setShowDeleteModal(false)} className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition ${isDark ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>No, Keep It</button><button onClick={confirmDelete} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition shadow-lg shadow-red-200 flex items-center justify-center gap-2"><Trash2 size={16} />Yes, Remove</button></div>
            </div>
          </div>
        )}

        {/* ✅ Profile Panel */}
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