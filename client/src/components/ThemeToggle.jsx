import React, { useEffect, useState } from "react";
import { FiMoon, FiSun } from "react-icons/fi";
import { useAuth } from "../context/useAuth";
import { api } from "../lib/api";

const ThemeToggle = () => {
  const { user, updateUser } = useAuth();

  // 1. Initialize state from localStorage or system preference
  const [theme, setTheme] = useState(() => {
    if (typeof window !== "undefined" && localStorage.getItem("theme")) {
      return localStorage.getItem("theme");
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  // 2. Sync theme when updated from settings or other pages
  useEffect(() => {
    const handleThemeChange = (e) => {
      setTheme(e.detail);
    };
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  // 3. Apply theme to HTML tag
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
      root.setAttribute("data-theme", "dark");
    } else {
      root.classList.remove("dark");
      root.setAttribute("data-theme", "light");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = async () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    window.dispatchEvent(new CustomEvent('theme-change', { detail: nextTheme }));

    if (user) {
      try {
        await api.put('/api/auth/update-me', { preferredTheme: nextTheme });
        updateUser({ preferredTheme: nextTheme });
      } catch (err) {
        console.error("Failed to update theme on server:", err);
      }
    }
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full bg-glass-surface shadow-lg backdrop-blur-md
                 text-secondary hover:text-accent hover:border-accent transition-all duration-300
                 flex items-center justify-center group"
      aria-label="Toggle Theme"
    >
      {theme === "dark" ? (
        <FiMoon className="text-xl group-hover:rotate-12 transition-transform" />
      ) : (
        <FiSun className="text-xl group-hover:rotate-90 transition-transform" />
      )}
    </button>
  );
};

export default ThemeToggle;
