// hooks/useCloudSync.js
import { useState, useCallback } from "react";
import { loadPortfolio, savePortfolio } from "../lib/googleSheetsApi";

export function useCloudSync() {
  const [username, setUsername] = useState("");
  const [portfolio, setPortfolio] = useState(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // ☁️ Cloud se Data Load Karna
  const loadPortfolioById = useCallback(async (userId) => {
    setLoading(true);
    const data = await loadPortfolio(userId);
    
    if (data) {
      setPortfolio(data);
      // 💾 Local Backup (Offline support ke liye)
      localStorage.setItem('mutualFunds', JSON.stringify(data.funds || []));
      localStorage.setItem('npsData', JSON.stringify(data.nps || []));
      localStorage.setItem('fdData', JSON.stringify(data.fd || []));
    } else {
      // Naya user → Empty portfolio create karo
      setPortfolio({ funds: [], nps: [], fd: [] });
    }
    
    setUsername(userId);
    setLoading(false);
  }, []);

  // 💾 Cloud + Local Dono Jagah Save Karna
  const saveData = useCallback(async (key, value) => {
    if (!username) return false;
    
    setSyncing(true);
    const updatedPortfolio = { ...portfolio, [key]: value };
    
    // Pehle Cloud pe bhejo
    const success = await savePortfolio(username, updatedPortfolio);
    
    if (success) {
      setPortfolio(updatedPortfolio);
      // 💾 Local backup update karo
      localStorage.setItem('mutualFunds', JSON.stringify(updatedPortfolio.funds || []));
      localStorage.setItem('npsData', JSON.stringify(updatedPortfolio.nps || []));
      localStorage.setItem('fdData', JSON.stringify(updatedPortfolio.fd || []));
    }
    
    setSyncing(false);
    return success;
  }, [username, portfolio]);

  // 🔄 Account Switch / Logout
  const switchAccount = () => {
    setUsername("");
    setPortfolio(null);
  };

  return { 
    username, 
    portfolio, 
    loading, 
    syncing,
    loadPortfolioById, 
    saveData, 
    switchAccount 
  };
}