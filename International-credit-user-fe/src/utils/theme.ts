/**
 * Theme utility functions for managing dark/light mode
 */

export type Theme = "light" | "dark";

const THEME_STORAGE_KEY = "theme";

/**
 * Get the current theme from localStorage
 */
export const getStoredTheme = (): Theme => {
  if (typeof window === "undefined") return "light";

  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : "light";
};

/**
 * Save theme to localStorage
 */
export const saveTheme = (theme: Theme): void => {
  if (typeof window === "undefined") return;
  localStorage.setItem(THEME_STORAGE_KEY, theme);
};

/**
 * Apply theme to the document root
 */
export const applyTheme = (theme: Theme): void => {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else {
    root.classList.remove("dark");
  }
};

/**
 * Initialize theme on app startup
 * This should be called before React renders to prevent flash
 */
export const initializeTheme = (): void => {
  const theme = getStoredTheme();
  applyTheme(theme);
};

/**
 * Toggle between light and dark themes
 */
export const toggleTheme = (): Theme => {
  const currentTheme = getStoredTheme();
  const newTheme = currentTheme === "dark" ? "light" : "dark";

  saveTheme(newTheme);
  applyTheme(newTheme);

  return newTheme;
};
