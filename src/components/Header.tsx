import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Spade, LogIn, Settings, LogOut, User, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { LogoProcessor } from "./LogoProcessor";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, userProfile, signOut, isAuthenticated, isAdmin } = useAuth();
  const location = useLocation();

  const navItems = [
    { name: "Главная", href: "/" },
    { name: "Турниры", href: "/tournaments" },
    { name: "Рейтинг", href: "/rating" },
    { name: "Галерея", href: "/gallery" },
    { name: "Блог", href: "/blog" },
    { name: "О нас", href: "/about" }
  ];

  const handleSignOut = async () => {
    await signOut();
    setIsMenuOpen(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Custom Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              {/* Custom logo with brand colors */}
              <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center shadow-elegant group-hover:shadow-gold transition-all duration-500 border border-poker-platinum/20 group-hover:border-poker-gold/40">
                <LogoProcessor 
                  originalSrc="/lovable-uploads/30d01ad9-7079-44b2-b8ef-44eb90d9e715.png"
                  alt="EPC Logo" 
                  className="w-8 h-8 object-contain group-hover:scale-110 transition-transform duration-300"
                  rounded={true}
                  radius={12}
                />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black text-poker-gold tracking-tight" style={{ fontFamily: 'Sintony, sans-serif' }}>
                EPC
              </span>
              <span className="text-xs text-muted-foreground -mt-1 font-medium tracking-wide" style={{ fontFamily: 'Sintony, sans-serif' }}>
                Event Poker Club
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-medium text-foreground hover:text-poker-steel transition-colors duration-300 relative group py-2"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-steel transition-all duration-300 group-hover:w-full rounded-full"></span>
              </Link>
            ))}
          </nav>

          {/* Auth Section */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/director">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="hover:bg-primary/10 hover:text-primary transition-all duration-300 font-medium"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Турнирный директор
                      </Button>
                    </Link>
                    <Link to="/admin">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="hover:bg-primary/10 hover:text-primary transition-all duration-300 font-medium"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Админ панель
                      </Button>
                    </Link>
                  </>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      {userProfile?.full_name || user?.email?.split('@')[0] || 'Пользователь'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem disabled>
                      <User className="w-4 h-4 mr-2" />
                      {user?.email}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <Link to="/profile">
                      <DropdownMenuItem>
                        <User className="w-4 h-4 mr-2" />
                        Личный кабинет
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="hover:bg-poker-steel/10 hover:text-poker-steel transition-all duration-300 font-medium">
                    <LogIn className="w-4 h-4 mr-2" />
                    Войти
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="bg-gradient-charcoal text-white hover:shadow-charcoal transition-all duration-300 font-semibold">
                    Регистрация
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-accent/10 rounded-lg transition-colors duration-300"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-background/95 backdrop-blur-sm border-b border-border/50 shadow-elegant">
            <nav className="flex flex-col p-6 space-y-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-sm font-medium text-foreground hover:text-poker-charcoal transition-colors duration-300 py-3 border-b border-border/30 last:border-b-0"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
              
              {isAuthenticated && isAdmin && (
                <>
                  <Link
                    to="/director"
                    className="text-sm font-medium text-foreground hover:text-poker-charcoal transition-colors duration-300 py-3 border-b border-border/30"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Trophy className="w-4 h-4 mr-2 inline" />
                    Турнирный директор
                  </Link>
                  <Link
                    to="/admin"
                    className="text-sm font-medium text-foreground hover:text-poker-charcoal transition-colors duration-300 py-3 border-b border-border/30"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4 mr-2 inline" />
                    Админ панель
                  </Link>
                </>
              )}
              
              <div className="pt-4 space-y-3">
                {isAuthenticated ? (
                  <>
                    <div className="text-sm text-muted-foreground mb-2">
                      {user?.email}
                    </div>
                    <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Личный кабинет
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start hover:bg-poker-accent/10">
                        <LogIn className="w-4 h-4 mr-2" />
                        Войти
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button size="sm" className="w-full bg-poker-charcoal text-poker-cream">
                        Регистрация
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}