// ─── src/context/ThemeContext.jsx ────────────────────────────────────────────
// Gestion centralisée du thème jour/nuit
// • Persiste dans localStorage sous la clé "driveparc_theme"
// • Applique data-theme="dark|light" sur <html> au chargement ET à chaque changement
// • Réagit à la préférence système si aucune préférence sauvegardée
// ──────────────────────────────────────────────────────────────────────────────
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({
  darkMode: false,
  toggleTheme: () => {},
  setDarkMode: () => {},
});

export function ThemeProvider({ children }) {
  const [darkMode, setDarkModeState] = useState(() => {
    // 1. Lire la préférence sauvegardée
    const stored = localStorage.getItem("driveparc_theme");
    if (stored) return stored === "dark";
    // 2. Sinon suivre la préférence système
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  // Appliquer sur <html> à chaque changement
  useEffect(() => {
    const theme = darkMode ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("driveparc_theme", theme);
  }, [darkMode]);

  // Écouter les changements de préférence système (si pas de préférence sauvegardée)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      if (!localStorage.getItem("driveparc_theme")) {
        setDarkModeState(e.matches);
      }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const setDarkMode = (isDark) => {
    setDarkModeState(isDark);
    // useEffect s'occupe du reste
  };

  const toggleTheme = () => setDarkMode(!darkMode);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

// ──────────────────────────────────────────────────────────────────────────────
// UTILISATION :
//
// 1. Dans src/index.js ou App.jsx, entourer l'app :
//    import { ThemeProvider } from "./context/ThemeContext";
//    <ThemeProvider><App /></ThemeProvider>
//
// 2. Dans DashboardPersonnel.jsx, remplacer le useState darkMode par :
//    import { useTheme } from "../context/ThemeContext";
//    const { darkMode, setDarkMode } = useTheme();
//    // Supprimer le useState darkMode et le handleThemeChange local
//    // Passer à TabParametres :
//    <TabParametres darkMode={darkMode} onThemeChange={setDarkMode} ... />
//
// 3. Dans DashboardGestionnaire.jsx, idem si tu veux le même thème partout.
// ──────────────────────────────────────────────────────────────────────────────