import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Theme = "dark" | "light";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const STORAGE_KEY = "jocta_theme";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getInitialTheme(): Theme {
  if (typeof window === "undefined") {
    return "dark"; // Dark mode is default
  }
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {
    // Ignore localStorage access errors
  }
  // Default setting when the ecommerce is accessed is dark mode
  return "dark";
}

function applyThemeToDom(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;

  if (theme === "dark") {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
    if (body) {
      body.classList.add("dark");
      body.classList.remove("light");
      body.setAttribute("data-theme", "dark");
    }
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    if (body) {
      body.classList.remove("dark");
      body.classList.add("light");
      body.setAttribute("data-theme", "light");
    }
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const initial = getInitialTheme();
    applyThemeToDom(initial);
    return initial;
  });

  useEffect(() => {
    applyThemeToDom(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore localStorage write errors
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyThemeToDom(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore
      }
      return next;
    });
  };

  const setTheme = (next: Theme) => {
    applyThemeToDom(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore
    }
    setThemeState(next);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
        toggleTheme,
        setTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
