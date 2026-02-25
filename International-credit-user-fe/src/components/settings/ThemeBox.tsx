import React from "react";
import { Moon, Sun, Monitor } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { useTheme } from "@/contexts/ThemeContext";

const ThemeBox = () => {
  const { isDarkMode, setTheme } = useTheme();

  const handleThemeToggle = (enabled: boolean) => {
    setTheme(enabled ? "dark" : "light");
  };
  return (
    <div className="space-y-4">
      {/* <div className="flex items-center gap-2">
        {isDarkMode ? (
          <Moon className="w-4 h-4 text-muted-foreground" />
        ) : (
          <Sun className="w-4 h-4 text-muted-foreground" />
        )}
        <h3 className="font-medium">Appearance</h3>
      </div> */}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-500" />
            <span className="text-sm">Light</span>
          </div>
          <Switch checked={isDarkMode} onCheckedChange={handleThemeToggle} />
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-slate-600" />
            <span className="text-sm">Dark</span>
          </div>
        </div>
      </div>

      <Card className="p-3 bg-muted/30">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Current theme: {isDarkMode ? "Dark Mode" : "Light Mode"}
          </span>
        </div>
      </Card>
    </div>
  );
};

export default ThemeBox;
