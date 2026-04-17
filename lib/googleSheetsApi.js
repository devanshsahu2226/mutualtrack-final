// lib/googleSheetsApi.js
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyY3nbF4XLEdwrzrLsW6pLdNW2t_LmuPacwn70UIOHaCgkyXw7irtovskCdcjIwupnr/exec"; // 🔴 Step 1 wala URL yahan daalein

export async function registerUser(userId, password) {
  return sendRequest({ action: 'register', userId, password });
}

export async function loginUser(userId, password) {
  return sendRequest({ action: 'login', userId, password });
}

export async function loadPortfolio(userId) {
  return sendRequest({ action: 'loadPortfolio', userId });
}

export async function savePortfolio(userId, portfolioData) {
  return sendRequest({ action: 'savePortfolio', userId, portfolioData });
}

async function sendRequest(body) {
  try {
    const res = await fetch(SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    return await res.json();
  } catch (err) {
    console.error("API Error:", err);
    return { success: false, error: "Network error" };
  }
}