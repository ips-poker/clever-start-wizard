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
        "fixed left-4 right-4 z-50 md:hidden transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}
      style={{ bottom: '16px' }}
    >
      <div className="flex items-center justify-center gap-2">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5 px-4 py-2 transition-all duration-300 group",
                "backdrop-blur-md bg-background/40 border border-border/30 rounded-lg",
                "hover:scale-105 hover:bg-background/60 hover:border-syndikate-orange/40",
                active && "bg-background/60 border-syndikate-orange/50"
              )}
              style={{
                boxShadow: active 
                  ? "0 4px 16px rgba(255, 90, 31, 0.25)" 
                  : "0 2px 8px rgba(0, 0, 0, 0.3)"
              }}
            >
              {/* Active indicator - top accent */}
              {active && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-syndikate-orange rounded-full" />
              )}
              
              {/* Icon */}
              <item.icon 
                className={cn(
                  "h-5 w-5 transition-all duration-300",
                  active 
                    ? "text-syndikate-orange drop-shadow-[0_0_8px_rgba(255,90,31,0.6)]" 
                    : "text-muted-foreground group-hover:text-syndikate-orange"
                )} 
                strokeWidth={active ? 2.5 : 2}
              />
              
              {/* Label */}
              <span className={cn(
                "text-[9px] font-semibold uppercase tracking-wide transition-all duration-300 font-mono whitespace-nowrap",
                active 
                  ? "text-syndikate-orange" 
                  : "text-muted-foreground group-hover:text-foreground"
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
