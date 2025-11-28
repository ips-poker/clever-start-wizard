import { 
  Home, 
  Settings, 
  Image, 
  FileText, 
  Search, 
  Users, 
  Trophy,
  BarChart3,
  Palette,
  Globe,
  Database,
  Shield,
  Download,
  Zap,
  TrendingUp,
  Activity,
  MessageSquare,
  Receipt,
  Send
} from "lucide-react";
import { NavLink } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

const adminSections = [
  {
    label: "Обзор",
    items: [
      { title: "Дашборд", id: "dashboard", icon: BarChart3 },
      { title: "Аналитика", id: "analytics", icon: TrendingUp },
      { title: "Производительность", id: "performance", icon: Activity },
      { title: "Безопасность", id: "security", icon: Shield },
      { title: "Быстрая настройка", id: "quick-setup", icon: Zap },
    ]
  },
  {
    label: "Контент",
    items: [
      { title: "Главная страница", id: "home-editor", icon: Home },
      { title: "О нас", id: "about-editor", icon: Users },
      { title: "Блог", id: "blog-editor", icon: FileText },
      { title: "Отзывы", id: "testimonials", icon: MessageSquare },
      { title: "Контакты и футер", id: "contact-footer", icon: FileText },
      { title: "Галерея", id: "gallery", icon: Image },
      { title: "Медиабиблиотека", id: "media", icon: Image },
      { title: "Управление контентом", id: "content", icon: Database },
      { title: "Расширенный контент", id: "advanced-content", icon: FileText },
    ]
  },
  {
    label: "Турниры",
    items: [
      { title: "Турниры", id: "tournaments", icon: Trophy },
      { title: "Игроки", id: "players", icon: Users },
      { title: "Приглашения", id: "invitations", icon: FileText },
    ]
  },
  {
    label: "Автоматизация",
    items: [
      { title: "Воркфлоу", id: "workflows", icon: Zap },
      { title: "Интеграции", id: "integrations", icon: Globe },
      { title: "Telegram Bot", id: "telegram-config", icon: Send },
      { title: "Orange Data", id: "orange-data", icon: Receipt },
    ]
  },
  {
    label: "Настройки",
    items: [
      { title: "SEO", id: "seo", icon: Search },
      { title: "Оптимизация изображений", id: "image-optimizer", icon: Image },
      { title: "Настройки сайта", id: "settings", icon: Settings },
      { title: "Файлы", id: "files", icon: Database },
      { title: "Тест БД (прокси)", id: "database-test", icon: Database },
      { title: "Бэкап", id: "backup", icon: Download },
      { title: "Умные бэкапы", id: "smart-backup", icon: Database },
      { title: "Расширенная производительность", id: "enhanced-performance", icon: Activity },
    ]
  }
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (tabId: string) => activeTab === tabId;

  const handleNavigation = (itemId: string) => {
    // Если это турниры - переходим на отдельную страницу
    if (itemId === 'tournaments') {
      window.location.href = '/director';
      return;
    }
    
    // Для всех остальных - используем callback для смены вкладки
    onTabChange(itemId);
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="bg-background">
        {adminSections.map((section) => (
          <SidebarGroup key={section.label}>
            <SidebarGroupLabel className="text-sm font-medium text-muted-foreground">
              {!collapsed && section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {section.items.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton 
                      asChild
                      className={isActive(item.id) ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted/50"}
                    >
                      <button
                        onClick={() => handleNavigation(item.id)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left"
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        {!collapsed && <span className="truncate">{item.title}</span>}
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}