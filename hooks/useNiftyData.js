"use client";

import { useState, useEffect } from "react";

export function useNiftyData() {
  const [nifty, setNifty] = useState({
    value: "—",
    change: "—",
    changePercent: "—",
    loading: true,
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    const fetchNifty = async () => {
      try {
        // 🔥 Google Script URL (same as login)
        const response = await fetch("https://script.google.com/macros/s/AKfycbxbQBH0UgP-thwCzJ1MRR7yeaTkkv9gKhxoJkRRurjz5fbUtQTe85wNwNBfT4j_xAgp/exec?action=getNifty");
        
        if (!response.ok) throw new Error("Failed to fetch");
        
        const data = await response.json();
        
        if (isMounted) {
          setNifty({
            value: data.value || "24,500",
            change: data.change || "+125",
            changePercent: data.changePercent || "+0.52%",
            loading: false,
            error: null,
          });
        }
      } catch (err) {
        console.log("Nifty: Using fallback data");
        if (isMounted) {
          setNifty({
            value: "24,500",
            change: "+125",
            changePercent: "+0.52%",
            loading: false,
            error: null,
          });
        }
      }
    };

    fetchNifty();
    
    // Har 30 seconds mein refresh karo (optional)
    const interval = setInterval(fetchNifty, 30000);
    
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return { nifty };
}