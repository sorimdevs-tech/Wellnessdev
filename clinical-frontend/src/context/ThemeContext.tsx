import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { fetchAPI } from "../services/api";

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  syncThemeWithBackend: () => Promise<void>;
}

interface SettingsResponse {
  preferences?: {
    theme?: string;
  };
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Track if we've synced with backend
  const hasSyncedRef = useRef(false);
  
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== "undefined") {
      return (
        localStorage.getItem("theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
      );
    }
    return "light";
  });

  // Sync theme from backend on login - backend is the source of truth
  const syncThemeWithBackend = async () => {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.log("No auth token found, skipping theme sync");
        return;
      }
      
      console.log("Syncing theme from backend...");
      const settings = await fetchAPI<SettingsResponse>("/settings");
      if (settings?.preferences?.theme) {
        console.log("Backend theme:", settings.preferences.theme);
        setThemeState(settings.preferences.theme);
        localStorage.setItem("theme", settings.preferences.theme);
        hasSyncedRef.current = true;
      }
    } catch (error) {
      console.log("Could not sync theme from backend:", error);
    }
  };

  // Save theme to backend when it changes
  const setTheme = async (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    
    // Try to save to backend
    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        await fetchAPI("/settings", {
          method: "PUT",
          body: JSON.stringify({
            preferences: {
              theme: newTheme
            }
          })
        });
      }
    } catch (error) {
      console.log("Could not save theme to backend:", error);
    }
  };

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement;
    const body = document.body;
    const appDiv = document.getElementById("app");
    
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme === "light") {
      root.classList.remove("dark");
    } else if (theme === "auto") {
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }
    
    // Remove 'dark' from body and #app if present (Tailwind expects only on <html>)
    body.classList.remove("dark");
    if (appDiv) appDiv.classList.remove("dark");
  }, [theme]);

  // Sync theme on mount and when storage changes (for cross-tab sync)
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (token) {
      syncThemeWithBackend();
    }

    // Listen for storage events (when another tab changes localStorage)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "authToken" && e.newValue) {
        // User logged in from another tab
        syncThemeWithBackend();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Also create a custom event listener so UserContext can trigger theme sync
  useEffect(() => {
    const handleUserLogin = () => {
      syncThemeWithBackend();
    };

    window.addEventListener("user-logged-in", handleUserLogin);
    return () => window.removeEventListener("user-logged-in", handleUserLogin);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, syncThemeWithBackend }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
