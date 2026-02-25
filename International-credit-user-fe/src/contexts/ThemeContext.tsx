import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, getStoredTheme, saveTheme, applyTheme, toggleTheme } from '@/utils/theme';
import { toast } from 'sonner';

interface ThemeContextType {
  theme: Theme;
  isDarkMode: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => getStoredTheme());

  // Apply theme to document when theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    saveTheme(newTheme);
    toast.success(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
  };

  const handleToggleTheme = () => {
    const newTheme = toggleTheme();
    setThemeState(newTheme);
    toast.success(`${newTheme === 'dark' ? 'Dark' : 'Light'} mode enabled`);
  };

  const value: ThemeContextType = {
    theme,
    isDarkMode: theme === 'dark',
    setTheme,
    toggleTheme: handleToggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
