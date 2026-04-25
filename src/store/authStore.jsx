import { useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { getMe } from "../services/authService";
import { getWatchlist } from "../services/watchlistService";
import { getProgress } from "../services/progressService";
import { getSettings } from "../services/settingsService";
import { getNotifications } from "../services/notificationService";

export const AuthProvider = ({ children }) => {
  // FIX 3: Instantly restore cached user from localStorage (no flicker on reload)
  const [user, setUser] = useState(() => {
    try {
      const cached = localStorage.getItem("cached_user");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [globalWatchlist, setGlobalWatchlist] = useState([]);
  const [globalProgress, setGlobalProgress] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [globalNotifications, setGlobalNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authToast, setAuthToast] = useState(null);

  const triggerAuthToast = (msg) => {
    setAuthToast(msg);
    setTimeout(() => setAuthToast(null), 4000);
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Step 1: Verify token with backend
      try {
        const res = await getMe();
        if (res.success) {
          setUser(res.user);
          // Cache user data for instant restore on next visit
          localStorage.setItem("cached_user", JSON.stringify(res.user));
        } else {
          // Backend explicitly said token is bad → clear everything
          localStorage.removeItem("token");
          localStorage.removeItem("cached_user");
          setUser(null);
        }
      } catch (error) {
        // FIX 1: Only delete token if backend EXPLICITLY returns 401 (token invalid)
        // Network errors, timeouts, cold starts should NOT log the user out
        const status = error?.response?.status;
        if (status === 401 || status === 403) {
          console.warn("Token invalid (401/403), logging out.");
          localStorage.removeItem("token");
          localStorage.removeItem("cached_user");
          setUser(null);
        } else {
          // Network error / timeout / cold start — keep user logged in with cached data
          console.warn("Auth check failed (network/timeout), keeping cached session.", error.message);
        }
      }

      // FIX 2: Secondary data fetches in separate try-catch blocks
      // If any of these fail, user stays logged in
      try {
        const wlRes = await getWatchlist();
        if (wlRes?.success) setGlobalWatchlist(wlRes.watchlist);
      } catch (e) { console.warn("Watchlist fetch failed on init:", e.message); }

      try {
        const progRes = await getProgress();
        if (progRes?.success) setGlobalProgress(progRes.continueWatching);
      } catch (e) { console.warn("Progress fetch failed on init:", e.message); }

      try {
        const settRes = await getSettings();
        if (settRes?.success) setGlobalSettings(settRes.settings);
      } catch (e) { console.warn("Settings fetch failed on init:", e.message); }

      try {
        const notifRes = await getNotifications();
        if (notifRes?.success) setGlobalNotifications(notifRes.notifications);
      } catch (e) { console.warn("Notifications fetch failed on init:", e.message); }

      setLoading(false);
    };

    initAuth();
  }, []);

  const loginAuth = async (userData, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("cached_user", JSON.stringify(userData));
    setUser(userData);
    triggerAuthToast("You have signed in successfully");
    
    // Fetch data immediately after manual login (each in its own try-catch)
    try {
      const wlRes = await getWatchlist();
      if (wlRes?.success) setGlobalWatchlist(wlRes.watchlist);
    } catch (e) { console.warn("Watchlist fetch failed on login:", e.message); }

    try {
      const progRes = await getProgress();
      if (progRes?.success) setGlobalProgress(progRes.continueWatching);
    } catch (e) { console.warn("Progress fetch failed on login:", e.message); }

    try {
      const settRes = await getSettings();
      if (settRes?.success) setGlobalSettings(settRes.settings);
    } catch (e) { console.warn("Settings fetch failed on login:", e.message); }

    try {
      const notifRes = await getNotifications();
      if (notifRes?.success) setGlobalNotifications(notifRes.notifications);
    } catch (e) { console.warn("Notifications fetch failed on login:", e.message); }
  };

  const logoutAuth = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("cached_user");
    setUser(null);
    setGlobalWatchlist([]);
    setGlobalProgress([]);
    setGlobalSettings(null);
    setGlobalNotifications([]);
  };

  return (
    <AuthContext.Provider value={{ user, loginAuth, logoutAuth, loading, globalWatchlist, setGlobalWatchlist, globalProgress, setGlobalProgress, globalSettings, setGlobalSettings, globalNotifications, setGlobalNotifications, authToast, triggerAuthToast }}>
      {children}
    </AuthContext.Provider>
  );
};
