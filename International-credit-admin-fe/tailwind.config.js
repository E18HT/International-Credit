/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "Helvetica Neue", "Arial", "sans-serif"],
        inter: ["Inter", "Segoe UI", "Roboto", "sans-serif"],
        mono: ["JetBrains Mono", "Monaco", "Consolas", "monospace"],
      },
      fontSize: {
        "display-lg": ["48px", { lineHeight: "56px", letterSpacing: "-0.5px" }],
        "display-md": ["36px", { lineHeight: "44px", letterSpacing: "-0.5px" }],
        "heading-1": ["28px", { lineHeight: "36px", letterSpacing: "-0.3px" }],
        "heading-2": ["24px", { lineHeight: "32px", letterSpacing: "-0.3px" }],
        "heading-3": ["20px", { lineHeight: "28px", letterSpacing: "-0.3px" }],
        "body-lg": ["18px", { lineHeight: "28px", letterSpacing: "0px" }],
        body: ["16px", { lineHeight: "24px", letterSpacing: "0px" }],
        "body-sm": ["14px", { lineHeight: "20px", letterSpacing: "0px" }],
        caption: ["12px", { lineHeight: "16px", letterSpacing: "0.5px" }],
        button: ["16px", { lineHeight: "24px", letterSpacing: "0px" }],
      },
      fontWeight: {
        regular: "400",
        medium: "500",
        semibold: "600",
        bold: "700",
      },
      spacing: {
        0.5: "2px",
        1: "4px",
        1.5: "6px",
        2: "8px",
        2.5: "10px",
        3: "12px",
        3.5: "14px",
        4: "16px",
        5: "20px",
        6: "24px",
        7: "28px",
        8: "32px",
        9: "36px",
        10: "40px",
        11: "44px",
        12: "48px",
        14: "56px",
        16: "64px",
        18: "72px",
        20: "80px",
        24: "96px",
        28: "112px",
        32: "128px",
        36: "144px",
        40: "160px",
        44: "176px",
        48: "192px",
        52: "208px",
        56: "224px",
        60: "240px",
        64: "256px",
        72: "288px",
        80: "320px",
        96: "384px",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      colors: {
        // IC Brand Colors
        "ic-blue": "#1E3A8A",
        "ic-blue-light": "#1E40AF",
        "ic-blue-lighter": "#3B82F6",
        "ic-gold": "#F59E0B",
        "ic-gold-light": "#FCD34D",

        // Grayscale Palette
        "gray-50": "#F9FAFB",
        "gray-100": "#F3F4F6",
        "gray-200": "#E5E7EB",
        "gray-300": "#D1D5DB",
        "gray-400": "#9CA3AF",
        "gray-500": "#6B7280",
        "gray-600": "#4B5563",
        "gray-700": "#374151",
        "gray-800": "#1F2937",
        "gray-900": "#111827",

        // Semantic Colors
        success: "#10B981",
        warning: "#F59E0B",
        error: "#EF4444",
        info: "#3B82F6",

        // Legacy shadcn colors for compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },
      keyframes: {
        "accordion-down": {
          from: {
            height: "0",
          },
          to: {
            height: "var(--radix-accordion-content-height)",
          },
        },
        "accordion-up": {
          from: {
            height: "var(--radix-accordion-content-height)",
          },
          to: {
            height: "0",
          },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
