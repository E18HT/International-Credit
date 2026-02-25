import { useState } from "react";
import { Globe } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import ThemeBox from "./ThemeBox";

export const PreferencesSettings = () => {
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    inApp: true,
  });

  const languages = [
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "es", name: "Español", flag: "🇪🇸" },
    { code: "fr", name: "Français", flag: "🇫🇷" },
    { code: "de", name: "Deutsch", flag: "🇩🇪" },
    { code: "it", name: "Italiano", flag: "🇮🇹" },
    { code: "pt", name: "Português", flag: "🇵🇹" },
    { code: "ja", name: "日本語", flag: "🇯🇵" },
    { code: "ko", name: "한국어", flag: "🇰🇷" },
    { code: "zh", name: "中文", flag: "🇨🇳" },
  ];

  const currencies = [
    { code: "USD", name: "US Dollar", symbol: "$" },
    { code: "EUR", name: "Euro", symbol: "€" },
    { code: "GBP", name: "British Pound", symbol: "£" },
    { code: "JPY", name: "Japanese Yen", symbol: "¥" },
    { code: "CAD", name: "Canadian Dollar", symbol: "C$" },
    { code: "AUD", name: "Australian Dollar", symbol: "A$" },
    { code: "CHF", name: "Swiss Franc", symbol: "CHF" },
    { code: "CNY", name: "Chinese Yuan", symbol: "¥" },
    { code: "INR", name: "Indian Rupee", symbol: "₹" },
  ];

  const handleLanguageChange = (languageCode: string) => {
    setSelectedLanguage(languageCode);
    const selectedLang = languages.find((lang) => lang.code === languageCode);
    toast.success(`Language changed to ${selectedLang?.name}`);
  };

  const handleCurrencyChange = (currencyCode: string) => {
    setSelectedCurrency(currencyCode);
    const selectedCurr = currencies.find((curr) => curr.code === currencyCode);
    toast.success(`Currency changed to ${selectedCurr?.name}`);
  };

  const handleNotificationToggle = (
    type: keyof typeof notifications,
    enabled: boolean
  ) => {
    setNotifications((prev) => ({
      ...prev,
      [type]: enabled,
    }));

    const notificationTypes = {
      email: "Email",
      push: "Push",
      inApp: "In-app",
    };

    toast.success(
      `${notificationTypes[type]} notifications ${
        enabled ? "enabled" : "disabled"
      }`
    );
  };

  const selectedLangData = languages.find(
    (lang) => lang.code === selectedLanguage
  );
  const selectedCurrData = currencies.find(
    (curr) => curr.code === selectedCurrency
  );

  return (
    <AccordionItem value="preferences">
      <AccordionTrigger className="px-6 py-4 hover:no-underline">
        <div className="flex items-center gap-3">
          <Globe className="w-5 h-5 text-primary" />
          <span className="font-medium">Preferences</span>
        </div>
      </AccordionTrigger>
      <AccordionContent className="px-6 pb-6">
        <div className="space-y-6">
          <ThemeBox />
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};
