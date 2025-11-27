import { Home, Trophy, TrendingUp, UserPlus, User, Settings } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export function MobileBottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const { isAuthenticated, isAdmin } = useAuth();

  // Hide navigation in Telegram Mini App and on director/admin pages
  if (currentPath.startsWith('/telegram') || currentPath === '/director' || currentPath === '/admin') {
    return null;
  }

  useEffect(() => {
    const controlNavbar = () => {
      const currentScrollY = window.scrollY;
      
      // Show when at top or scrolling down, hide when scrolling up
      if (currentScrollY < 50) {
        setIsVisible(true);
      } else if (currentScrollY < lastScrollY) {
        setIsVisible(false);
      } else if (currentScrollY > lastScrollY) {
        setIsVisible(true);
      }
      
      setLastScrollY(currentScrollY);
    };

    // Throttle scroll events for better performance
    let timeoutId: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(controlNavbar, 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
    };
  }, [lastScrollY]);

  const navItems = [
    { title: "Главная", url: "/", icon: Home },
    { title: "Турниры", url: "/tournaments", icon: Trophy },
    { title: "Рейтинг", url: "/rating", icon: TrendingUp },
    isAuthenticated 
      ? { title: "Профиль", url: "/profile", icon: User }
      : { title: "Войти", url: "/auth", icon: UserPlus },
  ];

  // Добавляем директора для админов
  if (isAdmin && isAuthenticated) {
    navItems.splice(3, 0, { title: "Директор", url: "/director", icon: Settings });
  }

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <nav 
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 md:hidden transition-all duration-300 ease-in-out",
        "bg-background/95 backdrop-blur-xl border-t-2 border-syndikate-orange/50",
        "shadow-[0_-4px_20px_rgba(255,90,31,0.2)]",
        isVisible ? "translate-y-0" : "translate-y-full"
      )}
    >
      {/* Industrial texture overlay */}
      <div className="absolute inset-0 industrial-texture opacity-30 pointer-events-none" />
      
      {/* Top neon line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-syndikate-orange to-transparent opacity-80" />
      
      <div className="relative flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-2 py-2 transition-all duration-300 min-w-[60px] relative",
                "hover:scale-105",
                active && "scale-105"
              )}
            >
              {/* Background highlight for active */}
              {active && (
                <>
                  <div className="absolute inset-0 bg-syndikate-orange/10 brutal-border" />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-syndikate-orange shadow-neon-orange" />
                </>
              )}
              
              {/* Icon with glow effect */}
              <div className={cn(
                "relative transition-all duration-300",
                active && "animate-pulse"
              )}>
                <item.icon 
                  className={cn(
                    "h-5 w-5 transition-all duration-300 relative z-10",
                    active 
                      ? "text-syndikate-orange drop-shadow-[0_0_8px_rgba(255,90,31,0.8)]" 
                      : "text-muted-foreground"
                  )} 
                />
                {active && (
                  <div className="absolute inset-0 bg-syndikate-orange/20 blur-md rounded-full" />
                )}
              </div>
              
              {/* Label */}
              <span className={cn(
                "text-[9px] font-bold uppercase tracking-wider transition-all duration-300 relative z-10 font-mono",
                active 
                  ? "text-syndikate-orange" 
                  : "text-muted-foreground"
              )}>
                {item.title}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
