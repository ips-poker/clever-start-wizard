import { Button } from "@/components/ui/button";
import { Spade, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { name: "Главная", href: "/" },
    { name: "Турниры", href: "/tournaments" },
    { name: "Рейтинг", href: "/ratings" },
    { name: "Галерея", href: "/gallery" },
    { name: "Блог", href: "/blog" },
    { name: "О нас", href: "/about" }
  ];

  return (
    <header className="fixed top-0 w-full z-50 bg-background/90 backdrop-blur-xl border-b border-border/50 shadow-glass">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-18">
          {/* Modern Logo */}
          <Link to="/" className="flex items-center space-x-4 group">
            <div className="relative">
              {/* Modern poker chip with gradient and glow */}
              <div className="w-14 h-14 bg-gradient-amethyst rounded-2xl flex items-center justify-center shadow-glow-amethyst group-hover:scale-110 group-hover:rotate-12 transition-all duration-500 relative overflow-hidden">
                {/* Inner gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
                {/* Poker spade icon */}
                <Spade className="w-7 h-7 text-white relative z-10" />
                {/* Decorative elements */}
                <div className="absolute top-1 right-1 w-2 h-2 bg-poker-gold rounded-full"></div>
                <div className="absolute bottom-1 left-1 w-1.5 h-1.5 bg-white/60 rounded-full"></div>
              </div>
              {/* Floating gold accent */}
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-gold rounded-full border-2 border-white shadow-glow-gold animate-pulse"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-bold bg-gradient-to-r from-poker-amethyst to-poker-sapphire bg-clip-text text-transparent tracking-tight">
                IPS
              </span>
              <span className="text-xs text-muted-foreground -mt-1 font-medium tracking-wide">
                International Poker Style
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-medium text-foreground hover:text-poker-amethyst transition-all duration-300 relative group py-2"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-amethyst transition-all duration-300 group-hover:w-full rounded-full"></span>
              </Link>
            ))}
          </nav>

          {/* Modern Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            <Button variant="ghost" size="sm" className="hover:bg-poker-amethyst/10 hover:text-poker-amethyst transition-all duration-300">
              Войти
            </Button>
            <Button size="sm" className="bg-gradient-amethyst text-white hover:shadow-glow-amethyst transition-all duration-300 font-medium">
              Регистрация
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-poker-amethyst/10 rounded-lg transition-colors duration-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Enhanced Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-18 left-0 right-0 bg-background/95 backdrop-blur-xl border-b border-border/50 shadow-float">
            <nav className="flex flex-col p-6 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-sm font-medium text-foreground hover:text-poker-amethyst transition-colors duration-300 py-3 border-b border-border/30 last:border-b-0"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              <div className="pt-4 space-y-3">
                <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-poker-amethyst/10">
                  Войти
                </Button>
                <Button size="sm" className="w-full bg-gradient-amethyst text-white">
                  Регистрация
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}