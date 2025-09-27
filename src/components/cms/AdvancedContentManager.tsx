import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Calendar, 
  Eye, 
  Edit, 
  Copy, 
  Archive, 
  RotateCcw,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Globe,
  Users,
  History,
  Target
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ContentVersion {
  id: string;
  content_id: string;
  version: number;
  title: string;
  content: string;
  created_at: string;
  created_by: string;
  status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
  changes_summary?: string;
}

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: 'draft' | 'review' | 'approved' | 'published' | 'scheduled' | 'archived';
  author: string;
  created_at: string;
  updated_at: string;
  published_at?: string;
  scheduled_at?: string;
  category: string;
  tags: string[];
  seo_title?: string;
  seo_description?: string;
  featured_image?: string;
  versions: ContentVersion[];
  current_version: number;
}

interface WorkflowRule {
  id: string;
  name: string;
  conditions: any;
  actions: any;
  enabled: boolean;
}

export function AdvancedContentManager() {
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [workflowRules, setWorkflowRules] = useState<WorkflowRule[]>([]);
  const [showScheduler, setShowScheduler] = useState(false);

  const { toast } = useToast();

  const statuses = [
    { value: 'draft', label: 'Черновик', color: 'bg-gray-100 text-gray-800' },
    { value: 'review', label: 'На рассмотрении', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'approved', label: 'Утверждено', color: 'bg-green-100 text-green-800' },
    { value: 'published', label: 'Опубликовано', color: 'bg-blue-100 text-blue-800' },
    { value: 'scheduled', label: 'Запланировано', color: 'bg-purple-100 text-purple-800' },
    { value: 'archived', label: 'Архив', color: 'bg-red-100 text-red-800' },
  ];

  const categories = [
    'blog', 'news', 'pages', 'tournaments', 'announcements', 'guides'
  ];

  useEffect(() => {
    fetchContents();
    fetchWorkflowRules();
  }, []);

  const fetchContents = async () => {
    try {
      // Mock data - in real implementation, fetch from database
      const mockContents: ContentItem[] = [
        {
          id: '1',
          title: 'Главная страница',
          slug: 'homepage',
          content: 'Добро пожаловать на наш покерный сайт...',
          status: 'published',
          author: 'admin@example.com',
          created_at: new Date(Date.now() - 86400000).toISOString(),
          updated_at: new Date(Date.now() - 3600000).toISOString(),
          published_at: new Date(Date.now() - 3600000).toISOString(),
          category: 'pages',
          tags: ['main', 'welcome'],
          seo_title: 'Покерный клуб - Главная',
          seo_description: 'Добро пожаловать в наш покерный клуб',
          featured_image: '/assets/poker-hero.jpg',
          current_version: 3,
          versions: [
            {
              id: 'v1',
              content_id: '1',
              version: 1,
              title: 'Главная страница',
              content: 'Первая версия контента...',
              created_at: new Date(Date.now() - 259200000).toISOString(),
              created_by: 'admin@example.com',
              status: 'archived',
              changes_summary: 'Первоначальная версия'
            },
            {
              id: 'v2',
              content_id: '1',
              version: 2,
              title: 'Главная страница',
              content: 'Обновленная версия...',
              created_at: new Date(Date.now() - 172800000).toISOString(),
              created_by: 'admin@example.com',
              status: 'archived',
              changes_summary: 'Добавлены новые секции'
            },
            {
              id: 'v3',
              content_id: '1',
              version: 3,
              title: 'Главная страница',
              content: 'Текущая версия контента...',
              created_at: new Date(Date.now() - 3600000).toISOString(),
              created_by: 'admin@example.com',
              status: 'published',
              changes_summary: 'Обновлен дизайн и текст'
            }
          ]
        },
        {
          id: '2',
          title: 'Анонс турнира',
          slug: 'tournament-announcement',
          content: 'Новый турнир уже скоро...',
          status: 'scheduled',
          author: 'editor@example.com',
          created_at: new Date(Date.now() - 43200000).toISOString(),
          updated_at: new Date(Date.now() - 1800000).toISOString(),
          scheduled_at: new Date(Date.now() + 86400000).toISOString(),
          category: 'tournaments',
          tags: ['tournament', 'announcement'],
          seo_title: 'Анонс нового турнира',
          current_version: 1,
          versions: []
        }
      ];

      setContents(mockContents);
    } catch (error) {
      console.error('Error fetching contents:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить контент",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkflowRules = async () => {
    // Mock workflow rules
    const mockRules: WorkflowRule[] = [
      {
        id: '1',
        name: 'Автопубликация блога',
        conditions: { category: 'blog', status: 'approved' },
        actions: { publish: true, notify_subscribers: true },
        enabled: true
      },
      {
        id: '2',
        name: 'Уведомление о новых турнирах',
        conditions: { category: 'tournaments', status: 'published' },
        actions: { send_email: true, post_social: true },
        enabled: true
      }
    ];
    setWorkflowRules(mockRules);
  };

  const filteredContents = contents.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         content.content.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || content.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || content.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusBadge = (status: string) => {
    const statusInfo = statuses.find(s => s.value === status);
    return (
      <Badge className={statusInfo?.color}>
        {statusInfo?.label}
      </Badge>
    );
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft': return <Edit className="w-4 h-4 text-gray-500" />;
      case 'review': return <Eye className="w-4 h-4 text-yellow-500" />;
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'published': return <Globe className="w-4 h-4 text-blue-500" />;
      case 'scheduled': return <Clock className="w-4 h-4 text-purple-500" />;
      case 'archived': return <Archive className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const createVersion = async (contentId: string, changes: string) => {
    try {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;

      const newVersion: ContentVersion = {
        id: `v${content.current_version + 1}`,
        content_id: contentId,
        version: content.current_version + 1,
        title: content.title,
        content: content.content,
        created_at: new Date().toISOString(),
        created_by: 'current_user@example.com',
        status: 'draft',
        changes_summary: changes
      };

      const updatedContent = {
        ...content,
        current_version: newVersion.version,
        versions: [...content.versions, newVersion]
      };

      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));

      toast({
        title: "Версия создана",
        description: `Создана версия ${newVersion.version}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать версию",
        variant: "destructive",
      });
    }
  };

  const revertToVersion = async (contentId: string, version: number) => {
    try {
      const content = contents.find(c => c.id === contentId);
      if (!content) return;

      const targetVersion = content.versions.find(v => v.version === version);
      if (!targetVersion) return;

      const updatedContent = {
        ...content,
        content: targetVersion.content,
        title: targetVersion.title,
        updated_at: new Date().toISOString(),
        status: 'draft' as const
      };

      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));

      toast({
        title: "Версия восстановлена",
        description: `Восстановлена версия ${version}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось восстановить версию",
        variant: "destructive",
      });
    }
  };

  const scheduleContent = async (contentId: string, scheduledDate: string) => {
    try {
      const updatedContent = contents.find(c => c.id === contentId);
      if (!updatedContent) return;

      updatedContent.status = 'scheduled';
      updatedContent.scheduled_at = scheduledDate;

      setContents(prev => prev.map(c => c.id === contentId ? updatedContent : c));

      toast({
        title: "Контент запланирован",
        description: `Публикация запланирована на ${new Date(scheduledDate).toLocaleString('ru-RU')}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось запланировать публикацию",
        variant: "destructive",
      });
    }
  };

  if (loading) return <div className="flex items-center justify-center p-8">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Расширенное управление контентом
          </h2>
          <p className="text-muted-foreground">Версионность, планировщик публикаций и workflow</p>
        </div>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Создать контент
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Поиск по контенту..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Статус" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все статусы</SelectItem>
                {statuses.map(status => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Категория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все категории</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category} value={category}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Content List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Контент ({filteredContents.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {filteredContents.map((content) => (
                <div 
                  key={content.id} 
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedContent?.id === content.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedContent(content)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(content.status)}
                        <h4 className="font-medium text-sm">{content.title}</h4>
                        {getStatusBadge(content.status)}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {content.content.substring(0, 100)}...
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <span>v{content.current_version}</span>
                        <span>•</span>
                        <span>{content.category}</span>
                        <span>•</span>
                        <span>{new Date(content.updated_at).toLocaleDateString('ru-RU')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Content Details */}
        {selectedContent && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5" />
                {selectedContent.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="content" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="content">Контент</TabsTrigger>
                  <TabsTrigger value="versions">Версии</TabsTrigger>
                  <TabsTrigger value="schedule">Планировщик</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4">
                  <div>
                    <Label>Заголовок</Label>
                    <Input value={selectedContent.title} readOnly />
                  </div>
                  <div>
                    <Label>Контент</Label>
                    <Textarea 
                      value={selectedContent.content.substring(0, 200) + '...'} 
                      readOnly 
                      rows={4}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <Edit className="w-4 h-4 mr-2" />
                      Редактировать
                    </Button>
                    <Button size="sm" variant="outline">
                      <Copy className="w-4 h-4 mr-2" />
                      Дублировать
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => createVersion(selectedContent.id, 'Новые изменения')}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Создать версию
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="versions" className="space-y-4">
                  <div className="text-sm text-muted-foreground mb-3">
                    Текущая версия: {selectedContent.current_version}
                  </div>
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {selectedContent.versions.map((version) => (
                      <div key={version.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="flex items-center gap-2">
                            <History className="w-4 h-4" />
                            <span className="font-medium">Версия {version.version}</span>
                            {version.version === selectedContent.current_version && (
                              <Badge variant="default" className="text-xs">Текущая</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {version.changes_summary} • {new Date(version.created_at).toLocaleDateString('ru-RU')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Eye className="w-3 h-3" />
                          </Button>
                          {version.version !== selectedContent.current_version && (
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => revertToVersion(selectedContent.id, version.version)}
                            >
                              <RotateCcw className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="schedule" className="space-y-4">
                  <div>
                    <Label>Статус публикации</Label>
                    <div className="mt-2">
                      {getStatusBadge(selectedContent.status)}
                    </div>
                  </div>
                  
                  {selectedContent.status === 'scheduled' && (
                    <div>
                      <Label>Запланировано на</Label>
                      <Input 
                        type="datetime-local" 
                        value={selectedContent.scheduled_at?.slice(0, 16)} 
                        readOnly 
                      />
                    </div>
                  )}

                  <div>
                    <Label>Запланировать публикацию</Label>
                    <div className="flex gap-2 mt-2">
                      <Input 
                        type="datetime-local" 
                        className="flex-1"
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      <Button size="sm">
                        <Clock className="w-4 h-4 mr-2" />
                        Запланировать
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4">
                  <div>
                    <Label>SEO заголовок</Label>
                    <Input value={selectedContent.seo_title || ''} readOnly />
                  </div>
                  <div>
                    <Label>SEO описание</Label>
                    <Textarea value={selectedContent.seo_description || ''} readOnly rows={3} />
                  </div>
                  <div>
                    <Label>Изображение для соцсетей</Label>
                    <Input value={selectedContent.featured_image || ''} readOnly />
                  </div>
                  <div>
                    <Label>Теги</Label>
                    <div className="flex gap-1 mt-2">
                      {selectedContent.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Workflow Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Правила автоматизации
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workflowRules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium">{rule.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    Автоматическое выполнение действий при соблюдении условий
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={rule.enabled} />
                  <Button variant="ghost" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}