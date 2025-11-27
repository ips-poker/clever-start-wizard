import type { Config } from "tailwindcss";

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
			padding: {
				DEFAULT: '1rem',
				sm: '1.5rem',
				lg: '2rem'
			},
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
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
				chart: {
					"1": "hsl(var(--chart-1))",
					"2": "hsl(var(--chart-2))",
					"3": "hsl(var(--chart-3))",
					"4": "hsl(var(--chart-4))",
					"5": "hsl(var(--chart-5))",
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
				syndikate: {
					orange: "hsl(var(--syndikate-orange))",
					"orange-glow": "hsl(var(--syndikate-orange-glow))",
					red: "hsl(var(--syndikate-red))",
					"red-dark": "hsl(var(--syndikate-red-dark))",
					concrete: "hsl(var(--syndikate-concrete))",
					metal: "hsl(var(--syndikate-metal))",
					"metal-light": "hsl(var(--syndikate-metal-light))",
					rust: "hsl(var(--syndikate-rust))",
				},
			},
			backgroundImage: {
				"gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
				"gradient-conic": "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
				"gradient-industrial": "linear-gradient(135deg, hsl(var(--syndikate-concrete)), hsl(var(--syndikate-metal)))",
				"gradient-neon": "linear-gradient(135deg, hsl(var(--syndikate-orange)), hsl(var(--syndikate-red)))",
				"gradient-metal": "linear-gradient(180deg, hsl(var(--syndikate-metal)), hsl(var(--syndikate-concrete)))",
			},
			boxShadow: {
				"brutal": "0 10px 40px -15px rgba(0, 0, 0, 0.8)",
				"neon-orange": "0 0 30px hsla(var(--syndikate-orange), 0.5)",
				"neon-red": "0 0 30px hsla(var(--syndikate-red), 0.5)",
				"inset-brutal": "inset 0 2px 8px rgba(0, 0, 0, 0.5)",
			},
			fontFamily: {
				'sans': ['Roboto Condensed', 'sans-serif'],
				'display': ['Bebas Neue', 'Impact', 'sans-serif'],
			},
			fontSize: {
				'xs': ['0.814rem', { lineHeight: '1.1rem' }],
				'sm': ['0.968rem', { lineHeight: '1.375rem' }],
				'base': ['1.1rem', { lineHeight: '1.65rem' }],
				'lg': ['1.243rem', { lineHeight: '1.925rem' }],
				'xl': ['1.375rem', { lineHeight: '1.925rem' }],
				'2xl': ['1.65rem', { lineHeight: '2.2rem' }],
				'3xl': ['2.057rem', { lineHeight: '2.475rem' }],
				'4xl': ['2.75rem', { lineHeight: '2.75rem' }],
				'5xl': ['3.3rem', { lineHeight: '1' }],
				'6xl': ['4.125rem', { lineHeight: '1' }],
				'7xl': ['5.28rem', { lineHeight: '1' }],
				'8xl': ['6.6rem', { lineHeight: '1' }],
				'9xl': ['8.8rem', { lineHeight: '1' }],
			},
			fontWeight: {
				'normal': '400',
				'bold': '700',
				'black': '900',
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: "0" },
					to: { height: "var(--radix-accordion-content-height)" },
				},
				'accordion-up': {
					from: { height: "var(--radix-accordion-content-height)" },
					to: { height: "0" },
				},
				'neon-pulse': {
					"0%, 100%": {
						textShadow: "0 0 20px hsla(var(--syndikate-orange), 0.8), 0 0 40px hsla(var(--syndikate-orange), 0.4)",
					},
					"50%": {
						textShadow: "0 0 30px hsla(var(--syndikate-orange), 1), 0 0 60px hsla(var(--syndikate-orange), 0.6)",
					},
				},
				'glitch': {
					"0%, 100%": { transform: "translate(0)" },
					"20%": { transform: "translate(-2px, 2px)" },
					"40%": { transform: "translate(-2px, -2px)" },
					"60%": { transform: "translate(2px, 2px)" },
					"80%": { transform: "translate(2px, -2px)" },
				},
				'fade-in': {
					"0%": { opacity: "0", transform: "translateY(10px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
				'slide-up': {
					"0%": { opacity: "0", transform: "translateY(30px)" },
					"100%": { opacity: "1", transform: "translateY(0)" },
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
				'glitch': 'glitch 0.3s ease-in-out',
				'fade-in': 'fade-in 0.6s ease-out',
				'slide-up': 'slide-up 0.8s ease-out',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
