// hooks/useNiftyData.js
"use client";

import { useState, useEffect } from "react";

// 🔴 Apna copied Web App URL yahan paste karo
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxbQBH0UgP-thwCzJ1MRR7yeaTkkv9gKhxoJkRRurjz5fbUtQTe85wNwNBfT4j_xAgp/exec";

export function useNiftyData() {
  const [nifty, setNifty] = useState({
    value: "24,010.35",
    change: "+275.50",
    changePercent: "+1.16%",
    lastUpdated: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    loading: false
  });

  useEffect(() => {
    // Agar URL paste nahi kiya, toh fetch mat karo
    if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL.includes("PASTE_YOUR_COPIED_URL_HERE")) return;

    const fetchNifty = async () => {
      try {
        setNifty(prev => ({ ...prev, loading: true }));
        
        const res = await fetch(`${APPS_SCRIPT_URL}?action=getNifty`);
        const json = await res.json();

        if (json.success && json.data) {
          setNifty({
            value: parseFloat(json.data.value).toFixed(2),
            change: json.data.change >= 0 ? `+${parseFloat(json.data.change).toFixed(2)}` : parseFloat(json.data.change).toFixed(2),
            changePercent: `${json.data.changePercent >= 0 ? '+' : ''}${parseFloat(json.data.changePercent).toFixed(2)}%`,
            lastUpdated: json.data.lastUpdated || new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            loading: false
          });
        } else {
          setNifty(prev => ({ ...prev, loading: false }));
        }
      } catch (err) {
        console.error("Nifty fetch error:", err);
        setNifty(prev => ({ ...prev, loading: false }));
      }
    };

    fetchNifty(); // Pehli baar fetch
    const interval = setInterval(fetchNifty, 60000); // Har 60 sec update
    return () => clearInterval(interval);
  }, []);

  return { nifty };
}