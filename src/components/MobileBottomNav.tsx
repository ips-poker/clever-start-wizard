import { Home, Trophy, TrendingUp, UserPlus } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = [
    { title: "Главная", url: "/", icon: Home },
    { title: "Турниры", url: "/tournaments", icon: Trophy },
    { title: "Рейтинг", url: "/rating", icon: TrendingUp },
    { title: "Войти", url: "/auth", icon: UserPlus },
  ];

  const isActive = (path: string) => {
    if (path === "/") return currentPath === "/";
    return currentPath.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900/95 backdrop-blur-xl border-t border-amber-400/20 md:hidden">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const active = isActive(item.url);
          return (
            <Link
              key={item.url}
              to={item.url}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-xl transition-all duration-300 min-w-[70px]",
                active
                  ? "bg-amber-400/20 text-amber-400"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              )}
            >
              <item.icon 
                className={cn(
                  "h-5 w-5 transition-transform duration-300",
                  active && "scale-110"
                )} 
              />
              <span className="text-[10px] font-medium">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
