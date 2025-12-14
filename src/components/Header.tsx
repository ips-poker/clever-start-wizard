import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Menu, X, User, LogOut, Settings, Crown } from "lucide-react";
import syndikateLogo from "@/assets/syndikate-logo-main.png";
import { ClanNotificationBell } from "@/components/clan/ClanNotificationBell";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, isAuthenticated, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  const navItems = [
    { name: "Турниры", path: "/tournaments" },
    { name: "Рейтинг", path: "/rating" },
    { name: "Кланы", path: "/clans" },
    { name: "О клубе", path: "/about" },
    { name: "Галерея", path: "/gallery" },
  ];

  // Добавляем вкладку директора для админов
  const adminNavItems = isAdmin 
    ? [...navItems, { name: "Турнирный директор", path: "/director" }]
    : navItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <nav className="container mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-3 group"
          >
            <div className="relative">
              <div className="w-12 h-12 border-2 border-syndikate-orange bg-syndikate-metal brutal-border flex items-center justify-center transition-all group-hover:shadow-neon-orange p-1">
                <img src={syndikateLogo} alt="SYNDICATE Logo" className="w-full h-full object-contain" />
              </div>
              {/* Corner accents */}
              <div className="absolute -top-1 -left-1 w-3 h-3 border-l-2 border-t-2 border-syndikate-red opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -top-1 -right-1 w-3 h-3 border-r-2 border-t-2 border-syndikate-red opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -bottom-1 -left-1 w-3 h-3 border-l-2 border-b-2 border-syndikate-red opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-syndikate-red opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <span className="font-display text-2xl uppercase tracking-wider text-foreground">
                SYNDIKATE
              </span>
              <div className="h-[1px] w-0 group-hover:w-full bg-syndikate-orange transition-all duration-300" />
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {adminNavItems.map((item) => (
              <Link key={item.path} to={item.path}>
                <Button 
                  variant="ghost" 
                  className="uppercase tracking-wider font-bold text-sm hover:text-syndikate-orange hover:bg-syndikate-metal transition-all"
                >
                  {item.name}
                </Button>
              </Link>
            ))}
          </div>

          {/* Desktop Auth Buttons */}
          <div className="hidden md:flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                <ClanNotificationBell />
                {isAdmin && (
                  <Link to="/admin">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-syndikate-orange hover:bg-syndikate-metal"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Админ
                    </Button>
                  </Link>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-syndikate-orange text-syndikate-orange hover:bg-syndikate-metal"
                    >
                      <User className="h-4 w-4 mr-2" />
                      {user?.email?.split("@")[0] || "Профиль"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="h-4 w-4 mr-2" />
                        Мой профиль
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/director" className="cursor-pointer">
                        <Settings className="h-4 w-4 mr-2" />
                        Управление турнирами
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive">
                      <LogOut className="h-4 w-4 mr-2" />
                      Выйти
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <Link to="/auth">
                <Button 
                  size="sm"
                  className="bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase tracking-wider shadow-neon-orange"
                >
                  Войти
                </Button>
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 hover:bg-syndikate-metal rounded transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-syndikate-orange" />
            ) : (
              <Menu className="h-6 w-6 text-syndikate-orange" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-border animate-fade-in">
            {adminNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMenuOpen(false)}
              >
                <Button 
                  variant="ghost" 
                  className="w-full justify-start uppercase tracking-wider font-bold hover:text-syndikate-orange hover:bg-syndikate-metal"
                >
                  {item.name}
                </Button>
              </Link>
            ))}
            
            {isAuthenticated ? (
              <>
                <div className="flex items-center justify-between px-4 py-2">
                  <span className="text-sm text-muted-foreground">Уведомления</span>
                  <ClanNotificationBell />
                </div>
                {isAdmin && (
                  <Link to="/admin" onClick={() => setIsMenuOpen(false)}>
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start text-syndikate-orange"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Админ панель
                    </Button>
                  </Link>
                )}
                <Link to="/profile" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Профиль
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-destructive"
                  onClick={() => {
                    handleSignOut();
                    setIsMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Выйти
                </Button>
              </>
            ) : (
              <Link to="/auth" onClick={() => setIsMenuOpen(false)}>
                <Button 
                  className="w-full bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase"
                >
                  Войти
                </Button>
              </Link>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
