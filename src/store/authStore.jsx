import { useState, useEffect } from "react";
import { AuthContext } from "../context/AuthContext";
import { getMe } from "../services/authService";
import { getWatchlist } from "../services/watchlistService";
import { getProgress } from "../services/progressService";
import { getSettings } from "../services/settingsService";
import { getNotifications } from "../services/notificationService";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [globalWatchlist, setGlobalWatchlist] = useState([]);
  const [globalProgress, setGlobalProgress] = useState([]);
  const [globalSettings, setGlobalSettings] = useState(null);
  const [globalNotifications, setGlobalNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const res = await getMe();
          if (res.success) {
            setUser(res.user);
            // Fetch watchlist immediately after user is set
            const wlRes = await getWatchlist();
            if (wlRes.success) {
              setGlobalWatchlist(wlRes.watchlist);
            }
            // Fetch progress
            const progRes = await getProgress();
            if (progRes.success) {
              setGlobalProgress(progRes.continueWatching);
            }
            // Fetch settings
            const settRes = await getSettings();
            if (settRes.success) {
              setGlobalSettings(settRes.settings);
            }

            // Fetch notifications
            const notifRes = await getNotifications();
            if (notifRes.success) {
              setGlobalNotifications(notifRes.notifications);
            }
          } else {
            localStorage.removeItem("token");
          }
        } catch (error) {
          console.error("Failed to fetch user", error);
          localStorage.removeItem("token");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const loginAuth = async (userData, token) => {
    localStorage.setItem("token", token);
    setUser(userData);
    
    // Fetch data immediately after manual login
    try {
      const wlRes = await getWatchlist();
      if (wlRes?.success) setGlobalWatchlist(wlRes.watchlist);
      
      const progRes = await getProgress();
      if (progRes?.success) setGlobalProgress(progRes.continueWatching);

      const settRes = await getSettings();
      if (settRes?.success) setGlobalSettings(settRes.settings);

      const notifRes = await getNotifications();
      if (notifRes?.success) setGlobalNotifications(notifRes.notifications);
    } catch (err) {
      console.error("Failed to fetch initial data on login", err);
    }
  };

  const logoutAuth = () => {
    localStorage.removeItem("token");
    setUser(null);
    setGlobalWatchlist([]);
    setGlobalProgress([]);
    setGlobalSettings(null);
    setGlobalNotifications([]);
  };

  return (
    <AuthContext.Provider value={{ user, loginAuth, logoutAuth, loading, globalWatchlist, setGlobalWatchlist, globalProgress, setGlobalProgress, globalSettings, setGlobalSettings, globalNotifications, setGlobalNotifications }}>
      {children}
    </AuthContext.Provider>
  );
};
