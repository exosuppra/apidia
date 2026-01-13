import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme, themes, ThemeName } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <span className="text-lg">{themes[theme].emoji}</span>
          <Palette className="w-4 h-4" />
          <span className="hidden sm:inline">Thème</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {(Object.keys(themes) as ThemeName[]).map((themeKey) => (
          <DropdownMenuItem
            key={themeKey}
            onClick={() => setTheme(themeKey)}
            className={cn(
              "flex items-center gap-3 cursor-pointer",
              theme === themeKey && "bg-primary/10"
            )}
          >
            <span className="text-xl">{themes[themeKey].emoji}</span>
            <div className="flex flex-col">
              <span className="font-medium">{themes[themeKey].name}</span>
              <span className="text-xs text-muted-foreground">
                {themes[themeKey].description}
              </span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
