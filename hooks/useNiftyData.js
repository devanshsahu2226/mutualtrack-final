"use client";

import { useState, useEffect } from "react";

export function useNiftyData() {
  const [nifty, setNifty] = useState({
    value: "24,500",
    change: "+125",
    changePercent: "+0.52%",
    loading: false,
  });

  useEffect(() => {
    // 🔥 NO FETCH CALL = NO CORS ERROR
    // Jab app stable ho jaye, tab hum wapas API connect karenge.
    // Abhi ke liye ye static data use kar rahe hain taaki app chale.
    
    setNifty({
      value: "24,500",
      change: "+125",
      changePercent: "+0.52%",
      loading: false,
    });
  }, []);

  return { nifty };
}