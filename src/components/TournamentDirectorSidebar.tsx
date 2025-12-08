import { 
  Home,
  BarChart3,
  Trophy,
  Settings,
  Users,
  TrendingUp,
  FileText,
  Activity,
  TestTube,
  ArrowLeft,
  Mic,
  Globe,
  Calculator,
  Gamepad2,
  CreditCard
} from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const tournamentSections = [
  {
    label: "Управление турнирами",
    items: [
      { title: "Обзор", id: "overview", icon: BarChart3 },
      { title: "Турниры", id: "tournaments", icon: Trophy },
      { title: "Управление", id: "control", icon: Settings },
      { title: "Игроки", id: "players", icon: Users },
      { title: "Голосовое управление", id: "voice", icon: Mic },
    ]
  },
  {
    label: "Онлайн-покер",
    items: [
      { title: "Управление", id: "online-poker", icon: Gamepad2 },
    ]
  },
  {
    label: "Анализ и результаты",
    items: [
      { title: "Рейтинги", id: "ratings", icon: TrendingUp },
      { title: "Результаты", id: "results", icon: FileText },
      { title: "Анализ турнира", id: "analysis", icon: Calculator },
      { title: "Синхронизация", id: "sync", icon: Activity },
      { title: "Тест рейтингов", id: "rating-test", icon: TestTube },
    ]
  }
];

type Tournament = {
  id: string;
  name: string;
  status: string;
};

interface TournamentDirectorSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  selectedTournament?: Tournament | null;
}

export function TournamentDirectorSidebar({ activeTab, onTabChange, selectedTournament }: TournamentDirectorSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();

  const isActive = (tabId: string) => activeTab === tabId;

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="bg-background">
        {/* Navigation Buttons */}
        <div className="p-2 space-y-2 border-b border-border/40">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <Globe className="h-4 w-4" />
            {!collapsed && <span>На главную</span>}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/admin')}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>В админку</span>}
          </Button>
        </div>

        {/* Active Tournament Info */}
        {selectedTournament && !collapsed && (
          <div className="p-3 border-b border-border/40">
            <div className="text-xs text-muted-foreground mb-2">Активный турнир</div>
            <div className="space-y-2">
              <div className="text-sm font-medium truncate">{selectedTournament.name}</div>
              <Badge 
                variant={selectedTournament.status === 'running' ? 'default' : 'secondary'}
                className="text-xs w-fit"
              >
                {selectedTournament.status === 'running' ? 'Запущен' : 
                 selectedTournament.status === 'pending' ? 'Ожидание' : 'Завершен'}
              </Badge>
            </div>
          </div>
        )}

        {tournamentSections.map((section) => (
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
                        onClick={() => onTabChange(item.id)}
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