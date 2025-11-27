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
        "fixed bottom-4 left-4 right-4 z-50 md:hidden transition-all duration-300 ease-in-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-20 opacity-0 pointer-events-none"
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 p-3 transition-all duration-300 group",
                "brutal-metal brutal-border rounded-xl",
                "hover:scale-110 hover:-translate-y-1",
                active && "scale-105"
              )}
              style={{
                boxShadow: active 
                  ? "0 8px 24px rgba(255, 90, 31, 0.4), 0 0 40px rgba(255, 90, 31, 0.3)" 
                  : "0 4px 12px rgba(0, 0, 0, 0.5)"
              }}
            >
              {/* Industrial texture overlay */}
              <div className="absolute inset-0 industrial-texture opacity-20 pointer-events-none rounded-xl" />
              
              {/* Active indicator - top neon line */}
              {active && (
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-syndikate-orange shadow-neon-orange animate-pulse" />
              )}
              
              {/* Corner brackets for active state */}
              {active && (
                <>
                  <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-syndikate-orange" />
                  <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-syndikate-orange" />
                  <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-syndikate-orange" />
                  <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-syndikate-orange" />
                </>
              )}
              
              {/* Icon with glow */}
              <div className={cn(
                "relative transition-all duration-300 z-10",
                active && "drop-shadow-[0_0_12px_rgba(255,90,31,0.9)]"
              )}>
                <item.icon 
                  className={cn(
                    "h-6 w-6 transition-all duration-300",
                    active 
                      ? "text-syndikate-orange scale-110" 
                      : "text-foreground group-hover:text-syndikate-orange"
                  )} 
                  strokeWidth={active ? 2.5 : 2}
                />
                
                {/* Icon glow background */}
                {active && (
                  <div className="absolute inset-0 bg-syndikate-orange/30 blur-xl rounded-full scale-150" />
                )}
              </div>
              
              {/* Label */}
              <span className={cn(
                "text-[8px] font-bold uppercase tracking-wider transition-all duration-300 z-10 font-mono whitespace-nowrap",
                active 
                  ? "text-syndikate-orange" 
                  : "text-muted-foreground group-hover:text-syndikate-orange"
              )}>
                {item.title}
              </span>
              
              {/* Hover glow effect */}
              <div className="absolute inset-0 bg-syndikate-orange/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl" />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
