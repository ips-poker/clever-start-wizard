import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { 
  Upload, X, Loader2, Search, Grid3X3,
  Trophy, Users, Star, Shield, Target, Heart, Zap, Globe, Award, Clock, CheckCircle,
  TrendingUp, Eye, ThumbsUp, Coins, Gift, Crown, Settings, Play, Pause, FastForward,
  BarChart3, PieChart, Activity, Briefcase, Book, GraduationCap, Lightbulb, Coffee
} from "lucide-react";

interface IconSelectorProps {
  label: string;
  currentIcon?: string;
  onIconChange: (iconName: string) => void;
  placeholder?: string;
}

// Популярные иконки для покерного сайта
const popularIcons = [
  { name: 'Trophy', icon: Trophy, category: 'Достижения' },
  { name: 'Users', icon: Users, category: 'Сообщество' },
  { name: 'Star', icon: Star, category: 'Рейтинг' },
  { name: 'Shield', icon: Shield, category: 'Безопасность' },
  { name: 'Target', icon: Target, category: 'Цели' },
  { name: 'Heart', icon: Heart, category: 'Эмоции' },
  { name: 'Zap', icon: Zap, category: 'Энергия' },
  { name: 'Globe', icon: Globe, category: 'Международный' },
  { name: 'Award', icon: Award, category: 'Награды' },
  { name: 'Clock', icon: Clock, category: 'Время' },
  { name: 'CheckCircle', icon: CheckCircle, category: 'Успех' },
  { name: 'TrendingUp', icon: TrendingUp, category: 'Рост' },
  { name: 'Eye', icon: Eye, category: 'Наблюдение' },
  { name: 'ThumbsUp', icon: ThumbsUp, category: 'Одобрение' },
  { name: 'Coins', icon: Coins, category: 'Деньги' },
  { name: 'Gift', icon: Gift, category: 'Подарки' },
  { name: 'Crown', icon: Crown, category: 'Лидерство' },
  { name: 'Settings', icon: Settings, category: 'Настройки' },
  { name: 'Play', icon: Play, category: 'Действие' },
  { name: 'Pause', icon: Pause, category: 'Пауза' },
  { name: 'FastForward', icon: FastForward, category: 'Скорость' },
  { name: 'BarChart3', icon: BarChart3, category: 'Статистика' },
  { name: 'PieChart', icon: PieChart, category: 'Аналитика' },
  { name: 'Activity', icon: Activity, category: 'Активность' },
  { name: 'Briefcase', icon: Briefcase, category: 'Бизнес' },
  { name: 'Book', icon: Book, category: 'Обучение' },
  { name: 'GraduationCap', icon: GraduationCap, category: 'Образование' },
  { name: 'Lightbulb', icon: Lightbulb, category: 'Идеи' },
  { name: 'Coffee', icon: Coffee, category: 'Комфорт' }
];

export function IconSelector({ label, currentIcon, onIconChange, placeholder = "Выберите иконку" }: IconSelectorProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Все");
  const { toast } = useToast();

  const categories = ['Все', ...Array.from(new Set(popularIcons.map(icon => icon.category)))];
  
  const filteredIcons = popularIcons.filter(icon => {
    const matchesSearch = icon.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         icon.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Все" || icon.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCurrentIcon = () => {
    const iconData = popularIcons.find(icon => icon.name === currentIcon);
    return iconData?.icon;
  };

  const CurrentIcon = getCurrentIcon();

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      <div className="flex gap-2">
        <Input
          value={currentIcon || ''}
          onChange={(e) => onIconChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
        />
        
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              {CurrentIcon ? <CurrentIcon className="w-4 h-4" /> : <Grid3X3 className="w-4 h-4" />}
            </Button>
          </DialogTrigger>
          
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Выберите иконку</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Search and Filter */}
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Поиск иконок..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      variant={selectedCategory === category ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedCategory(category)}
                      className="whitespace-nowrap"
                    >
                      {category}
                    </Button>
                  ))}
                </div>
              </div>
              
              {/* Icons Grid */}
              <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
                {filteredIcons.map((iconData) => {
                  const IconComponent = iconData.icon;
                  const isSelected = currentIcon === iconData.name;
                  
                  return (
                    <Button
                      key={iconData.name}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      className="h-12 w-12 p-0 flex flex-col items-center justify-center"
                      onClick={() => {
                        onIconChange(iconData.name);
                        toast({
                          title: "Иконка выбрана",
                          description: `${iconData.name} (${iconData.category})`,
                        });
                      }}
                      title={`${iconData.name} - ${iconData.category}`}
                    >
                      <IconComponent className="w-5 h-5" />
                    </Button>
                  );
                })}
              </div>
              
              {filteredIcons.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Grid3X3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Иконки не найдены</p>
                  <p className="text-sm">Попробуйте изменить поисковый запрос</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {currentIcon && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => onIconChange('')}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Current Icon Preview */}
      {currentIcon && CurrentIcon && (
        <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
          <CurrentIcon className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">{currentIcon}</span>
          <Badge variant="outline" className="text-xs">
            {popularIcons.find(icon => icon.name === currentIcon)?.category}
          </Badge>
        </div>
      )}
    </div>
  );
}