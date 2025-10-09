import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Spade, LogIn, Settings, LogOut, User, Trophy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
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
    <header className="fixed top-0 w-full z-50 bg-gradient-to-br from-slate-900/95 via-black/98 to-slate-800/95 backdrop-blur-xl border-b border-white/10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16 relative z-10">
          {/* Enhanced Logo with glow effect */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-16 h-16 flex items-center justify-center group-hover:scale-110 transition-all duration-500 relative">
                {/* Glow effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-amber-600/20 rounded-2xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                <div className="relative bg-gradient-to-br from-white via-gray-50 to-gray-100 rounded-2xl p-2 shadow-lg group-hover:shadow-amber-500/20 transition-shadow duration-300 ring-1 ring-white/20 group-hover:ring-amber-400/30">
                  <img 
                    src="/lovable-uploads/a689ff05-9338-4573-bd08-aa9486811d3f.png" 
                    alt="Poker Club Logo" 
                    className="w-10 h-10 object-contain transition-transform duration-300"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-light text-white tracking-tight group-hover:text-amber-100 transition-colors duration-300">
                EPC
              </span>
              <span className="text-sm text-white/70 -mt-1 font-light tracking-widest uppercase group-hover:text-amber-200 transition-colors duration-300">
                EVENT POKER CLUB
              </span>
              <div className="h-0.5 w-8 bg-gradient-to-r from-amber-400 to-amber-600 mt-1 group-hover:w-12 transition-all duration-500"></div>
            </div>
          </Link>

          {/* Enhanced Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className="text-sm font-medium text-white/90 hover:text-amber-400 transition-all duration-300 relative group py-2 px-1"
              >
                {item.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300 group-hover:w-full rounded-full"></span>
                <span className="absolute inset-0 bg-amber-400/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></span>
              </Link>
            ))}
          </nav>

          {/* Enhanced Auth Section */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {isAdmin && (
                  <>
                    <Link to="/director">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-white/90 hover:bg-amber-400/20 hover:text-amber-400 transition-all duration-300 font-medium border border-white/20 hover:border-amber-400/30 backdrop-blur-sm"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Турнирный директор
                      </Button>
                    </Link>
                    <Link to="/admin">
                      <Button 
                        size="sm" 
                        className="bg-white/5 border-2 border-amber-400/30 text-amber-400 hover:bg-amber-400/10 hover:border-amber-400/50 backdrop-blur-xl transition-all duration-300 font-medium"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        Админ панель
                      </Button>
                    </Link>
                  </>
                )}
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="flex items-center gap-2 text-white/90 hover:bg-amber-400/20 hover:text-amber-400 transition-all duration-300 border border-white/20 hover:border-amber-400/30 backdrop-blur-sm">
                      <User className="w-4 h-4" />
                      {userProfile?.full_name || user?.email?.split('@')[0] || 'Пользователь'}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-slate-900/95 border-white/20 backdrop-blur-xl">
                    <DropdownMenuItem disabled className="text-white/70">
                      <User className="w-4 h-4 mr-2" />
                      {user?.email}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-white/20" />
                    <Link to="/profile">
                      <DropdownMenuItem className="text-white/90 hover:bg-amber-400/20 hover:text-amber-400">
                        <User className="w-4 h-4 mr-2" />
                        Личный кабинет
                      </DropdownMenuItem>
                    </Link>
                    <DropdownMenuItem onClick={handleSignOut} className="text-white/90 hover:bg-amber-400/20 hover:text-amber-400">
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <>
                <Link to="/auth">
                  <Button variant="ghost" size="sm" className="text-white/90 hover:bg-amber-400/20 hover:text-amber-400 transition-all duration-300 font-medium border border-white/20 hover:border-amber-400/30 backdrop-blur-sm">
                    <LogIn className="w-4 h-4 mr-2" />
                    Войти
                  </Button>
                </Link>
                <Link to="/auth">
                  <Button size="sm" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold transition-all duration-300 shadow-lg hover:shadow-amber-500/30">
                    Регистрация
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Enhanced Mobile Menu Button */}
          <button
            className="md:hidden p-2 hover:bg-amber-400/20 rounded-lg transition-all duration-300 border border-white/20 hover:border-amber-400/40 backdrop-blur-sm"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="w-6 h-6 text-white" />
            ) : (
              <Menu className="w-6 h-6 text-white" />
            )}
          </button>
        </div>

        {/* Enhanced Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden absolute top-16 left-0 right-0 bg-gradient-to-br from-slate-900/98 via-black/98 to-slate-800/98 backdrop-blur-xl border-b border-white/10 shadow-2xl">{/* Decorative elements */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-5">
              <div className="absolute top-2 left-4 text-amber-400/30 text-2xl animate-pulse">♠</div>
              <div className="absolute top-4 right-6 text-amber-400/20 text-xl animate-bounce-subtle">♣</div>
            </div>
            <nav className="flex flex-col p-6 space-y-4 relative z-10">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className="text-sm font-medium text-white/90 hover:text-amber-400 transition-all duration-300 py-3 px-3 rounded-lg hover:bg-amber-400/10 border-b border-white/10 last:border-b-0 group"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-1 h-6 bg-amber-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    {item.name}
                  </div>
                </Link>
              ))}
              
              {isAuthenticated && isAdmin && (
                <>
                  <div className="border-t border-white/20 pt-4">
                    <p className="text-xs text-white/60 uppercase tracking-wider mb-3 px-3">Управление</p>
                    <Link
                      to="/director"
                      className="text-sm font-medium text-white/90 hover:text-amber-400 transition-all duration-300 py-3 px-3 rounded-lg hover:bg-amber-400/10 group flex items-center gap-3"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Trophy className="w-4 h-4" />
                      Турнирный директор
                    </Link>
                    <Link
                      to="/admin"
                      className="text-sm font-medium text-white/90 hover:text-amber-400 transition-all duration-300 py-3 px-3 rounded-lg hover:bg-amber-400/10 group flex items-center gap-3"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4" />
                      Админ панель
                    </Link>
                  </div>
                </>
              )}
              
              <div className="pt-4 space-y-3 border-t border-white/20">
                {isAuthenticated ? (
                  <>
                    <div className="text-sm text-white/60 mb-2 px-3">
                      {user?.email}
                    </div>
                    <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full justify-start text-white/90 hover:bg-amber-400/20 hover:text-amber-400 transition-all duration-300 border border-white/20 hover:border-amber-400/30"
                      >
                        <User className="w-4 h-4 mr-2" />
                        Личный кабинет
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="w-full justify-start text-white/90 hover:bg-amber-400/20 hover:text-amber-400 transition-all duration-300 border border-white/20 hover:border-amber-400/30"
                      onClick={handleSignOut}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Выйти
                    </Button>
                  </>
                ) : (
                  <>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" size="sm" className="w-full justify-start text-white/90 hover:bg-amber-400/20 hover:text-amber-400 transition-all duration-300 border border-white/20 hover:border-amber-400/30">
                        <LogIn className="w-4 h-4 mr-2" />
                        Войти
                      </Button>
                    </Link>
                    <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                      <Button size="sm" className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold shadow-lg hover:shadow-amber-500/30">
                        Регистрация
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
        
        {/* Animated decorative line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-400/30 to-transparent"></div>
      </div>
    </header>
  );
}