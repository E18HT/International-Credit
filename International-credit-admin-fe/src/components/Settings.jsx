import React from "react";
import { Palette, Moon, Sun } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import Layout from "./Layout/Layout";
import { useTheme } from "./ThemeProvider";
import TwoFactorAuth from "./TwoFactorAuth";
import Notification from "./Settings/Notification";

const Settings = () => {
  const { theme, setTheme } = useTheme();

  const handleThemeToggle = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <Layout title="Settings" ButtonComponent={<></>}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TwoFactorAuth />
        <Card className="border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center font-poppins font-semibold text-gray-800 dark:text-gray-100">
              <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center mr-3">
                <Palette className="h-4 w-4 text-success" />
              </div>
              Appearance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    theme === "dark" ? "bg-blue-100" : "bg-gray-100"
                  }`}
                >
                  {theme === "dark" ? (
                    <Moon className="h-3 w-3 text-blue-600" />
                  ) : (
                    <Sun className="h-3 w-3 text-yellow-600" />
                  )}
                </div>
                <div>
                  <Label className="text-body-sm font-inter font-medium text-gray-700 dark:text-gray-200">
                    {theme === "dark" ? "Dark Mode" : "Light Mode"}
                  </Label>
                  <p className="text-caption text-gray-500 font-inter">
                    {theme === "dark"
                      ? "Switch to light theme"
                      : "Switch to dark theme"}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === "dark"}
                onCheckedChange={handleThemeToggle}
              />
            </div>
          </CardContent>
        </Card>

        <Notification />
      </div>
    </Layout>
  );
};

export default Settings;
