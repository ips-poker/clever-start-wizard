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
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				'luxury-display': ['Playfair Display', 'serif'],
				'luxury-body': ['Inter', 'sans-serif'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				luxury: {
					charcoal: 'hsl(var(--luxury-charcoal))',
					'charcoal-light': 'hsl(var(--luxury-charcoal-light))',
					silver: 'hsl(var(--luxury-silver))',
					platinum: 'hsl(var(--luxury-platinum))',
					pearl: 'hsl(var(--luxury-pearl))',
					graphite: 'hsl(var(--luxury-graphite))',
					steel: 'hsl(var(--luxury-steel))',
					smoke: 'hsl(var(--luxury-smoke))',
					accent: 'hsl(var(--luxury-accent))',
					'accent-light': 'hsl(var(--luxury-accent-light))',
					gold: 'hsl(var(--luxury-gold))',
					'gold-light': 'hsl(var(--luxury-gold-light))'
				},
				poker: {
					primary: 'hsl(var(--poker-primary))',
					'primary-light': 'hsl(var(--poker-primary-light))',
					secondary: 'hsl(var(--poker-secondary))',
					accent: 'hsl(var(--poker-accent))',
					'accent-light': 'hsl(var(--poker-accent-light))',
					success: 'hsl(var(--poker-success))',
					warning: 'hsl(var(--poker-warning))',
					error: 'hsl(var(--poker-error))',
					surface: 'hsl(var(--poker-surface))',
					'surface-elevated': 'hsl(var(--poker-surface-elevated))',
					border: 'hsl(var(--poker-border))',
					'text-primary': 'hsl(var(--poker-text-primary))',
					'text-secondary': 'hsl(var(--poker-text-secondary))',
					'text-muted': 'hsl(var(--poker-text-muted))',
					gold: 'hsl(var(--poker-gold))'
				}
			},
			backgroundImage: {
				'gradient-luxury-main': 'var(--gradient-luxury-main)',
				'gradient-luxury-card': 'var(--gradient-luxury-card)',
				'gradient-luxury-accent': 'var(--gradient-luxury-accent)',
				'gradient-luxury-gold': 'var(--gradient-luxury-gold)',
				'gradient-luxury-charcoal': 'var(--gradient-luxury-charcoal)',
				'gradient-luxury-platinum': 'var(--gradient-luxury-platinum)',
				'gradient-luxury-surface': 'var(--gradient-luxury-surface)',
				'gradient-luxury-glass': 'var(--gradient-luxury-glass)',
				'gradient-primary': 'var(--gradient-luxury-main)',
				'gradient-hero': 'var(--gradient-luxury-platinum)',
				'gradient-card': 'var(--gradient-luxury-card)',
				'gradient-accent': 'var(--gradient-luxury-accent)',
				'gradient-surface': 'var(--gradient-luxury-surface)'
			},
			boxShadow: {
				'luxury-subtle': 'var(--shadow-luxury-subtle)',
				'luxury-soft': 'var(--shadow-luxury-soft)',
				'luxury-elegant': 'var(--shadow-luxury-elegant)',
				'luxury-dramatic': 'var(--shadow-luxury-dramatic)',
				'luxury-floating': 'var(--shadow-luxury-floating)',
				'luxury-gold': 'var(--shadow-luxury-gold)',
				'luxury-accent': 'var(--shadow-luxury-accent)',
				'luxury-inset': 'var(--shadow-luxury-inset)',
				'luxury-border': 'var(--shadow-luxury-border)',
				'elegant': 'var(--shadow-luxury-elegant)',
				'dramatic': 'var(--shadow-luxury-dramatic)'
			},
			fontWeight: {
				'light': '300',
				'normal': '400',
				'medium': '500',
				'semibold': '600',
				'bold': '700',
				'black': '900'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'luxury-float': {
					'0%, 100%': {
						transform: 'translateY(0px)',
						filter: 'brightness(1)'
					},
					'50%': {
						transform: 'translateY(-8px)',
						filter: 'brightness(1.05)'
					}
				},
				'luxury-pulse': {
					'0%, 100%': {
						opacity: '1',
						transform: 'scale(1)'
					},
					'50%': {
						opacity: '0.9',
						transform: 'scale(1.02)'
					}
				},
				'luxury-glow': {
					'0%, 100%': {
						boxShadow: '0 0 20px hsl(45 100% 50% / 0.1)'
					},
					'50%': {
						boxShadow: '0 0 40px hsl(45 100% 50% / 0.2)'
					}
				},
				'fade-in': {
					'0%': {
						opacity: '0',
						transform: 'translateY(20px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'slide-up': {
					'0%': {
						opacity: '0',
						transform: 'translateY(30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateY(0)'
					}
				},
				'scale-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.95)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'luxury-float': 'luxury-float 4s ease-in-out infinite',
				'luxury-pulse': 'luxury-pulse 3s ease-in-out infinite',
				'luxury-glow': 'luxury-glow 2s ease-in-out infinite',
				'fade-in': 'fade-in 0.6s ease-out',
				'slide-up': 'slide-up 0.8s ease-out',
				'scale-in': 'scale-in 0.5s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;