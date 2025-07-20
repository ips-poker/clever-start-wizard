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
				poker: {
					charcoal: 'hsl(var(--poker-charcoal))',
					slate: 'hsl(var(--poker-slate))',
					steel: 'hsl(var(--poker-steel))',
					silver: 'hsl(var(--poker-silver))',
					platinum: 'hsl(var(--poker-platinum))',
					pearl: 'hsl(var(--poker-pearl))',
					gold: 'hsl(var(--poker-gold))',
					bronze: 'hsl(var(--poker-bronze))',
					accent: 'hsl(var(--poker-accent))',
					emerald: 'hsl(var(--poker-emerald))'
				}
			},
			backgroundImage: {
				'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
				'gradient-mesh': 'var(--gradient-mesh)',
				'gradient-glow': 'var(--gradient-glow)',
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-charcoal': 'var(--gradient-charcoal)',
				'gradient-steel': 'var(--gradient-steel)',
				'gradient-gold': 'var(--gradient-gold)',
				'gradient-emerald': 'var(--gradient-emerald)',
				'gradient-luxury': 'var(--gradient-luxury)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-overlay': 'var(--gradient-overlay)',
				'gradient-glass': 'var(--gradient-glass)',
				'gradient-shine': 'var(--gradient-shine)'
			},
			boxShadow: {
				'subtle': 'var(--shadow-subtle)',
				'card': 'var(--shadow-card)',
				'elegant': 'var(--shadow-elegant)',
				'charcoal': 'var(--shadow-charcoal)',
				'gold': 'var(--shadow-gold)',
				'emerald': 'var(--shadow-emerald)',
				'glow': 'var(--shadow-glow)',
				'floating': 'var(--shadow-floating)',
				'glass': 'var(--shadow-glass)',
				'neon': 'var(--shadow-neon)'
			},
			fontFamily: {
				'sans': ['Inter', 'sans-serif'],
				'serif': ['Playfair Display', 'serif']
			},
			fontWeight: {
				'light': 'var(--font-weight-light)',
				'normal': 'var(--font-weight-normal)',
				'medium': 'var(--font-weight-medium)',
				'semibold': 'var(--font-weight-semibold)',
				'bold': 'var(--font-weight-bold)',
				'black': 'var(--font-weight-black)'
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
				'float': {
					'0%, 100%': {
						transform: 'translateY(0px) rotate(0deg)',
					},
					'50%': {
						transform: 'translateY(-20px) rotate(180deg)',
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
				'slide-right': {
					'0%': {
						opacity: '0',
						transform: 'translateX(-30px)'
					},
					'100%': {
						opacity: '1',
						transform: 'translateX(0)'
					}
				},
				'scale-in': {
					'0%': {
						opacity: '0',
						transform: 'scale(0.9)'
					},
					'100%': {
						opacity: '1',
						transform: 'scale(1)'
					}
				},
				'glow': {
					'0%, 100%': {
						filter: 'brightness(1) drop-shadow(0 0 0px transparent)'
					},
					'50%': {
						filter: 'brightness(1.1) drop-shadow(0 0 20px hsl(var(--poker-gold) / 0.3))'
					}
				},
				'pulse-glow': {
					'0%, 100%': {
						boxShadow: '0 0 20px hsl(var(--poker-gold) / 0.2)'
					},
					'50%': {
						boxShadow: '0 0 40px hsl(var(--poker-gold) / 0.4)'
					}
				},
				'bounce-subtle': {
					'0%, 100%': {
						transform: 'translateY(0px)'
					},
					'50%': {
						transform: 'translateY(-5px)'
					}
				},
				'shimmer': {
					'0%': {
						transform: 'translateX(-100%)'
					},
					'100%': {
						transform: 'translateX(100%)'
					}
				},
				'glass-morph': {
					'0%, 100%': {
						backdropFilter: 'blur(10px) saturate(200%)',
						background: 'rgba(255, 255, 255, 0.1)'
					},
					'50%': {
						backdropFilter: 'blur(20px) saturate(250%)',
						background: 'rgba(255, 255, 255, 0.15)'
					}
				},
				'mesh-gradient': {
					'0%, 100%': { transform: 'rotate(0deg) scale(1)' },
					'33%': { transform: 'rotate(2deg) scale(1.02)' },
					'66%': { transform: 'rotate(-1deg) scale(0.98)' }
				},
				'neon-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 20px hsl(var(--poker-gold)), 0 0 40px hsl(var(--poker-gold)), 0 0 60px hsl(var(--poker-gold))'
					},
					'50%': {
						boxShadow: '0 0 10px hsl(var(--poker-gold)), 0 0 20px hsl(var(--poker-gold)), 0 0 30px hsl(var(--poker-gold))'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'float': 'float 6s ease-in-out infinite',
				'fade-in': 'fade-in 0.6s ease-out',
				'slide-up': 'slide-up 0.8s ease-out',
				'slide-right': 'slide-right 0.7s ease-out',
				'scale-in': 'scale-in 0.5s ease-out',
				'glow': 'glow 3s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
				'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
				'shimmer': 'shimmer 2s ease-in-out infinite',
				'glass-morph': 'glass-morph 4s ease-in-out infinite',
				'mesh-gradient': 'mesh-gradient 8s ease-in-out infinite',
				'neon-pulse': 'neon-pulse 2s ease-in-out infinite alternate'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
