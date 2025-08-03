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
  Mic
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
    label: "Анализ и результаты",
    items: [
      { title: "Рейтинги", id: "ratings", icon: TrendingUp },
      { title: "Результаты", id: "results", icon: FileText },
      { title: "Синхронизация", id: "sync", icon: Activity },
      { title: "Тест рейтингов", id: "rating-test", icon: TestTube },
    ]
  }
];

interface TournamentDirectorSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TournamentDirectorSidebar({ activeTab, onTabChange }: TournamentDirectorSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isActive = (tabId: string) => activeTab === tabId;

  const handleBackToAdmin = () => {
    window.location.href = '/admin';
  };

  return (
    <Sidebar className={collapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />
      
      <SidebarContent className="bg-background">
        {/* Back to Admin Button */}
        <div className="p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackToAdmin}
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {!collapsed && <span>Вернуться в админку</span>}
          </Button>
        </div>

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