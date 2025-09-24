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
					'red': 'hsl(var(--poker-red))',
					'red-dark': 'hsl(var(--poker-red-dark))',
					'red-light': 'hsl(var(--poker-red-light))',
					'gold': 'hsl(var(--poker-gold))',
					'green': 'hsl(var(--poker-green))',
					'gray': 'hsl(var(--poker-gray))',
					'gray-light': 'hsl(var(--poker-gray-light))',
					'gray-dark': 'hsl(var(--poker-gray-dark))',
					'diamond': 'hsl(var(--poker-diamond))',
					'emerald': 'hsl(var(--poker-emerald))'
				},
				f1: {
					'red': 'hsl(var(--f1-red))',
					'red-dark': 'hsl(var(--f1-red-dark))',
					'red-light': 'hsl(var(--f1-red-light))',
					'silver': 'hsl(var(--f1-silver))',
					'gold': 'hsl(var(--f1-gold))',
					'carbon': 'hsl(var(--f1-carbon))',
					'carbon-light': 'hsl(var(--f1-carbon-light))'
				},
				aesthetic: {
					'crimson': 'hsl(var(--crimson))',
					'crimson-light': 'hsl(var(--crimson-light))',
					'crimson-dark': 'hsl(var(--crimson-dark))',
					'platinum': 'hsl(var(--platinum))',
					'gold': 'hsl(var(--gold))',
					'rose-gold': 'hsl(var(--rose-gold))',
					'obsidian': 'hsl(var(--obsidian))',
					'obsidian-light': 'hsl(var(--obsidian-light))',
					'pearl': 'hsl(var(--pearl))',
					'sapphire': 'hsl(var(--sapphire))',
					'emerald': 'hsl(var(--emerald))',
					'amethyst': 'hsl(var(--amethyst))'
				}
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-card': 'var(--gradient-card)',
				'gradient-accent': 'var(--gradient-accent)',
				'gradient-success': 'var(--gradient-success)',
				'gradient-glass': 'var(--gradient-glass)',
				'gradient-border': 'var(--gradient-border)',
				'gradient-button': 'var(--gradient-button)',
				'gradient-surface': 'var(--gradient-surface)',
				'gradient-poker-red': 'var(--gradient-poker-red)',
				'gradient-poker-dark': 'var(--gradient-poker-dark)',
				'gradient-poker-card': 'var(--gradient-poker-card)',
				'gradient-poker-accent': 'var(--gradient-poker-accent)',
				'gradient-f1-red': 'var(--gradient-f1-red)',
				'gradient-carbon': 'var(--gradient-carbon)',
				'gradient-racing': 'var(--gradient-racing)',
				'gradient-neon': 'var(--gradient-neon)',
				'gradient-speed': 'var(--gradient-speed)',
				'gradient-diamond': 'var(--gradient-diamond)',
				'gradient-crimson': 'var(--gradient-crimson)',
				'gradient-luxury': 'var(--gradient-luxury)',
				'gradient-royal': 'var(--gradient-royal)',
				'gradient-shimmer': 'var(--gradient-shimmer)',
				'gradient-aurora': 'var(--gradient-aurora)'
			},
			boxShadow: {
				'minimal': 'var(--shadow-minimal)',
				'subtle': 'var(--shadow-subtle)',
				'card': 'var(--shadow-card)',
				'elevated': 'var(--shadow-elevated)',
				'floating': 'var(--shadow-floating)',
				'dramatic': 'var(--shadow-dramatic)',
				'accent': 'var(--shadow-accent)',
				'success': 'var(--shadow-success)',
				'inset': 'var(--shadow-inset)',
				'soft': 'var(--shadow-soft)',
				'medium': 'var(--shadow-medium)',
				'strong': 'var(--shadow-strong)',
				'crimson': 'var(--shadow-crimson)',
				'gold': 'var(--shadow-gold)',
				'glow': 'var(--shadow-glow)'
			},
			fontFamily: {
				'sinkin': ['Work Sans', 'sans-serif'],
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
				'racing-pulse': {
					'0%, 100%': {
						transform: 'scale(1)',
						boxShadow: '0 0 0 0 hsl(var(--f1-red) / 0.7)'
					},
					'50%': {
						transform: 'scale(1.05)',
						boxShadow: '0 0 20px 10px hsl(var(--f1-red) / 0)'
					}
				},
				'neon-glow': {
					'0%, 100%': {
						textShadow: '0 0 5px hsl(var(--neon-cyan)), 0 0 10px hsl(var(--neon-cyan)), 0 0 15px hsl(var(--neon-cyan))'
					},
					'50%': {
						textShadow: '0 0 10px hsl(var(--neon-purple)), 0 0 20px hsl(var(--neon-purple)), 0 0 30px hsl(var(--neon-purple))'
					}
				},
				'speed-lines': {
					'0%': {
						transform: 'translateX(-100%) skewX(-15deg)',
						opacity: '0'
					},
					'50%': {
						transform: 'translateX(0%) skewX(-15deg)',
						opacity: '1'
					},
					'100%': {
						transform: 'translateX(100%) skewX(-15deg)',
						opacity: '0'
					}
				},
				'luxury-glow': {
					'0%, 100%': {
						textShadow: '0 0 10px hsl(var(--gold)), 0 0 20px hsl(var(--gold)), 0 0 30px hsl(var(--gold))',
						transform: 'scale(1)'
					},
					'50%': {
						textShadow: '0 0 20px hsl(var(--rose-gold)), 0 0 30px hsl(var(--rose-gold)), 0 0 40px hsl(var(--rose-gold))',
						transform: 'scale(1.02)'
					}
				},
				'elegant-float': {
					'0%, 100%': {
						transform: 'translateY(0px) rotate(0deg)',
						filter: 'brightness(1)'
					},
					'50%': {
						transform: 'translateY(-8px) rotate(1deg)',
						filter: 'brightness(1.1)'
					}
				},
				'shimmer-pass': {
					'0%': {
						transform: 'translateX(-100%)',
						opacity: '0'
					},
					'50%': {
						opacity: '1'
					},
					'100%': {
						transform: 'translateX(100%)',
						opacity: '0'
					}
				},
				'premium-pulse': {
					'0%, 100%': {
						boxShadow: '0 0 0 0 hsl(var(--crimson) / 0.7)',
						transform: 'scale(1)'
					},
					'50%': {
						boxShadow: '0 0 20px 10px hsl(var(--crimson) / 0)',
						transform: 'scale(1.03)'
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
				'racing-pulse': 'racing-pulse 1.5s ease-in-out infinite',
				'neon-glow': 'neon-glow 2s ease-in-out infinite alternate',
				'speed-lines': 'speed-lines 0.8s ease-out infinite',
				'f1-entrance': 'f1-entrance 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
				'luxury-glow': 'luxury-glow 3s ease-in-out infinite',
				'elegant-float': 'elegant-float 4s ease-in-out infinite',
				'shimmer-pass': 'shimmer-pass 2s ease-in-out infinite',
				'premium-pulse': 'premium-pulse 2s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
