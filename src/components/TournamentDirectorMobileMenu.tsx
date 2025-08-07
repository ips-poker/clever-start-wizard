import React from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Users, Mic, TrendingUp, CheckCircle, RefreshCw, BarChart3, Target } from "lucide-react";

interface TournamentDirectorMobileMenuProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TournamentDirectorMobileMenu({ activeTab, onTabChange }: TournamentDirectorMobileMenuProps) {
  const mobileOnlyTabs = [
    { value: "players", label: "Игроки", icon: Users },
    { value: "voice", label: "Голосовое управление", icon: Mic },
    { value: "ratings", label: "Рейтинги", icon: TrendingUp },
    { value: "results", label: "Результаты", icon: CheckCircle },
    { value: "sync", label: "Синхронизация", icon: RefreshCw },
    { value: "analysis", label: "Анализ турнира", icon: BarChart3 },
    { value: "rating-test", label: "Тест рейтингов", icon: Target },
  ];

  return (
    <div className="lg:hidden fixed top-20 right-4 z-50">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="bg-background/95 backdrop-blur">
            <Menu className="h-4 w-4" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle>Дополнительные функции</SheetTitle>
            <SheetDescription>
              Выберите дополнительную функцию турнирного директора
            </SheetDescription>
          </SheetHeader>
          
          <div className="grid gap-2 pt-6">
            {mobileOnlyTabs.map((tab) => (
              <Button
                key={tab.value}
                variant={activeTab === tab.value ? "default" : "ghost"}
                className="justify-start gap-3 h-12"
                onClick={() => onTabChange(tab.value)}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </Button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}