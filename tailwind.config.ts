import type { Config } from "tailwindcss";
import { fontFamily } from "tailwindcss/defaultTheme";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", ...fontFamily.sans],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // IPS Poker Luxury Casino Design System
        poker: {
          gold: "hsl(var(--poker-gold))",
          "gold-light": "hsl(var(--poker-gold-light))",
          "gold-dark": "hsl(var(--poker-gold-dark))",
          charcoal: "hsl(var(--poker-charcoal))",
          "charcoal-light": "hsl(var(--poker-charcoal-light))",
          steel: "hsl(var(--poker-steel))",
          "steel-light": "hsl(var(--poker-steel-light))",
          platinum: "hsl(var(--poker-platinum))",
          cream: "hsl(var(--poker-cream))",
          emerald: "hsl(var(--poker-emerald))",
          ruby: "hsl(var(--poker-ruby))",
          sapphire: "hsl(var(--poker-sapphire))",
          surface: "hsl(var(--poker-surface))",
          "surface-elevated": "hsl(var(--poker-surface-elevated))",
          border: "hsl(var(--poker-border))",
          "border-gold": "hsl(var(--poker-border-gold))",
          "text-primary": "hsl(var(--poker-text-primary))",
          "text-secondary": "hsl(var(--poker-text-secondary))",
          "text-muted": "hsl(var(--poker-text-muted))",
        },
      },
      backgroundImage: {
        // Luxury Casino gradients using CSS variables
        "gradient-gold": "var(--gradient-gold)",
        "gradient-charcoal": "var(--gradient-charcoal)",
        "gradient-steel": "var(--gradient-steel)",
        "gradient-royal": "var(--gradient-royal)",
        "gradient-emerald": "var(--gradient-emerald)",
        "gradient-hero": "var(--gradient-hero)", 
        "gradient-card": "var(--gradient-card)",
        "gradient-accent": "var(--gradient-accent)",
        "gradient-glass": "var(--gradient-glass)",
        "gradient-border": "var(--gradient-border)",
        "gradient-surface": "var(--gradient-surface)",
      },
      boxShadow: {
        // Luxury Casino shadows using CSS variables
        "minimal": "var(--shadow-minimal)",
        "subtle": "var(--shadow-subtle)",
        "card": "var(--shadow-card)",
        "elevated": "var(--shadow-elevated)", 
        "floating": "var(--shadow-floating)",
        "dramatic": "var(--shadow-dramatic)",
        "gold": "var(--shadow-gold)",
        "gold-intense": "var(--shadow-gold-intense)",
        "emerald": "var(--shadow-emerald)",
        "elegant": "var(--shadow-elegant)",
        "inset": "var(--shadow-inset)",
      },
      fontWeight: {
        "light": "var(--font-weight-light)",
        "normal": "var(--font-weight-normal)",
        "medium": "var(--font-weight-medium)",
        "semibold": "var(--font-weight-semibold)",
        "bold": "var(--font-weight-bold)",
        "black": "var(--font-weight-black)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": {
            opacity: "0",
            transform: "translateY(10px)"
          },
          "100%": {
            opacity: "1", 
            transform: "translateY(0)"
          }
        },
        "fade-out": {
          "0%": {
            opacity: "1",
            transform: "translateY(0)"
          },
          "100%": {
            opacity: "0",
            transform: "translateY(10px)"
          }
        },
        "scale-in": {
          "0%": {
            transform: "scale(0.95)",
            opacity: "0"
          },
          "100%": {
            transform: "scale(1)",
            opacity: "1"
          }
        },
        "scale-out": {
          from: { transform: "scale(1)", opacity: "1" },
          to: { transform: "scale(0.95)", opacity: "0" }
        },
        "slide-in-right": {
          "0%": { transform: "translateX(100%)" },
          "100%": { transform: "translateX(0)" }
        },
        "slide-out-right": {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(100%)" }
        },
        "slide-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(30px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)"
          }
        },
        "slide-right": {
          "0%": {
            opacity: "0",
            transform: "translateX(-30px)"
          },
          "100%": {
            opacity: "1",
            transform: "translateX(0)"
          }
        },
        "float": {
          "0%, 100%": {
            transform: "translateY(0px)"
          },
          "50%": {
            transform: "translateY(-10px)"
          }
        },
        "glow": {
          "0%, 100%": {
            filter: "brightness(1)"
          },
          "50%": {
            filter: "brightness(1.1)"
          }
        },
        "pulse-glow": {
          "0%, 100%": {
            boxShadow: "0 0 20px hsl(var(--poker-accent) / 0.2)"
          },
          "50%": {
            boxShadow: "0 0 40px hsl(var(--poker-accent) / 0.4)"
          }
        },
        "shimmer": {
          "0%": {
            transform: "translateX(-100%)"
          },
          "100%": {
            transform: "translateX(100%)"
          }
        }
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
        "fade-out": "fade-out 0.3s ease-out", 
        "scale-in": "scale-in 0.2s ease-out",
        "scale-out": "scale-out 0.2s ease-out",
        "slide-in-right": "slide-in-right 0.3s ease-out",
        "slide-out-right": "slide-out-right 0.3s ease-out",
        "slide-up": "slide-up 0.8s ease-out",
        "slide-right": "slide-right 0.7s ease-out",
        "float": "float 6s ease-in-out infinite",
        "glow": "glow 3s ease-in-out infinite",
        "pulse-glow": "pulse-glow 2s ease-in-out infinite",
        "shimmer": "shimmer 2s ease-in-out infinite",
        "enter": "fade-in 0.3s ease-out, scale-in 0.2s ease-out",
        "exit": "fade-out 0.3s ease-out, scale-out 0.2s ease-out"
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;