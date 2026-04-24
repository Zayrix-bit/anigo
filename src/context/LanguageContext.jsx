import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "../hooks/useAuth";

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const { globalSettings } = useAuth();

  // Local language state (for guest users or manual navbar toggle)
  const [localLanguage, setLocalLanguage] = useState(() => {
    return localStorage.getItem("anime_language") || "EN";
  });

  // Derived: globalSettings takes priority when available, local toggle is fallback
  const language = globalSettings?.titleLanguage || localLanguage;

  // Persist to localStorage whenever effective language changes
  useEffect(() => {
    localStorage.setItem("anime_language", language);
  }, [language]);

  const toggleLanguage = useCallback(() => {
    setLocalLanguage(prev => (prev === "EN" ? "JP" : "EN"));
  }, []);

  const setEN = useCallback(() => setLocalLanguage("EN"), []);
  const setJP = useCallback(() => setLocalLanguage("JP"), []);

  const getTitle = useCallback((titleObj) => {
    if (!titleObj) return "Unknown Title";
    if (language === "EN") {
      return titleObj.english || titleObj.romaji || titleObj.native || "Unknown Title";
    } else {
      // JP toggle now prioritizes Romaji (Japenglish) instead of Pure Japanese characters
      return titleObj.romaji || titleObj.english || titleObj.native || "Unknown Title";
    }
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage, setEN, setJP, getTitle }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  return useContext(LanguageContext);
}
