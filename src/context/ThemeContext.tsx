import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type ThemeName = "default" | "dark" | "unicorn" | "ocean" | "forest" | "sunset";

interface ThemeContextValue {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export const themes: Record<ThemeName, { name: string; emoji: string; description: string }> = {
  default: {
    name: "Classique",
    emoji: "☀️",
    description: "Thème clair par défaut"
  },
  dark: {
    name: "Sombre",
    emoji: "🌙",
    description: "Mode sombre élégant"
  },
  unicorn: {
    name: "Licorne Arc-en-ciel",
    emoji: "🦄",
    description: "Magique et coloré !"
  },
  ocean: {
    name: "Océan",
    emoji: "🌊",
    description: "Bleu profond apaisant"
  },
  forest: {
    name: "Forêt",
    emoji: "🌲",
    description: "Vert nature"
  },
  sunset: {
    name: "Coucher de soleil",
    emoji: "🌅",
    description: "Tons chauds orangés"
  }
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    const saved = localStorage.getItem("app-theme") as ThemeName;
    return saved && themes[saved] ? saved : "default";
  });

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem("app-theme", newTheme);
  };

  useEffect(() => {
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove("dark", "theme-unicorn", "theme-ocean", "theme-forest", "theme-sunset");
    
    // Apply the appropriate theme class
    if (theme === "dark") {
      root.classList.add("dark");
    } else if (theme !== "default") {
      root.classList.add(`theme-${theme}`);
    }
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
