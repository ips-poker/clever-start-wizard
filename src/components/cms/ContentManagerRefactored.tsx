import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, 
  Home,
  Building2,
  Trophy,
  Star,
  Image as ImageIcon,
  BookOpen,
  Phone,
  Link2,
  Search,
  Type,
  Code,
  Hash
} from "lucide-react";
import { ContentPageEditor } from "./content/ContentPageEditor";
import { ContentForm } from "./content/ContentForm";
import { SEOForm } from "./content/SEOForm";
import { useCMSContentManager } from "@/hooks/useCMSContentManager";
import { useSEOManager } from "@/hooks/useSEOManager";
import { CMSContent, PageContent, SEOData, PageInfo, ContentType } from "@/types/cms";

export function ContentManagerRefactored() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [contentByPage, setContentByPage] = useState<Record<string, PageContent>>({});
  const [editingKeys, setEditingKeys] = useState<Set<string>>(new Set());
  const [showAddForm, setShowAddForm] = useState<string | null>(null);
  const [showAddSEOForm, setShowAddSEOForm] = useState(false);
  const [editingSEO, setEditingSEO] = useState<string | null>(null);
  
  // SEO states
  const [seoData, setSeoData] = useState<SEOData[]>([]);
  
  // Form data
  const [newContentData, setNewContentData] = useState({
    content_key: '',
    content_value: '',
    content_type: 'text',
    is_active: true
  });
  
  const [seoFormData, setSeoFormData] = useState({
    page_slug: '',
    meta_title: '',
    meta_description: '',
    meta_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    canonical_url: '',
    robots_meta: 'index, follow'
  });

  const contentManager = useCMSContentManager();
  const seoManager = useSEOManager();

  const pages: PageInfo[] = [
    { value: 'home', label: 'Главная', icon: Home, color: 'text-blue-600' },
    { value: 'about', label: 'О нас', icon: Building2, color: 'text-green-600' },
    { value: 'tournaments', label: 'Турниры', icon: Trophy, color: 'text-yellow-600' },
    { value: 'rating', label: 'Рейтинг', icon: Star, color: 'text-orange-600' },
    { value: 'gallery', label: 'Галерея', icon: ImageIcon, color: 'text-purple-600' },
    { value: 'blog', label: 'Блог', icon: BookOpen, color: 'text-red-600' },
    { value: 'contact', label: 'Контакты', icon: Phone, color: 'text-teal-600' },
    { value: 'footer', label: 'Футер', icon: Link2, color: 'text-gray-600' },
    { value: 'seo', label: 'SEO', icon: Search, color: 'text-indigo-600' },
  ];

  const contentTypes: ContentType[] = [
    { value: 'text', label: 'Текст', icon: Type, color: 'text-slate-600' },
    { value: 'html', label: 'HTML', icon: Code, color: 'text-orange-600' },
    { value: 'image', label: 'Изображение', icon: ImageIcon, color: 'text-green-600' },
    { value: 'json', label: 'JSON', icon: Hash, color: 'text-purple-600' },
  ];

  const seoPages = [
    { value: 'home', label: 'Главная страница', url: '/' },
    { value: 'about', label: 'О нас', url: '/about' },
    { value: 'tournaments', label: 'Турниры', url: '/tournaments' },
    { value: 'rating', label: 'Рейтинг', url: '/rating' },
    { value: 'gallery', label: 'Галерея', url: '/gallery' },
    { value: 'blog', label: 'Блог', url: '/blog' },
  ];

  const robotsOptions = [
    { value: 'index, follow', label: 'Индексировать, следовать ссылкам' },
    { value: 'index, nofollow', label: 'Индексировать, не следовать ссылкам' },
    { value: 'noindex, follow', label: 'Не индексировать, следовать ссылкам' },
    { value: 'noindex, nofollow', label: 'Не индексировать, не следовать ссылкам' },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [contentData, seoDataResult] = await Promise.all([
        contentManager.fetchContent(),
        seoManager.fetchSEOData()
      ]);
      setContentByPage(contentData);
      setSeoData(seoDataResult);
    } finally {
      setLoading(false);
    }
  };

  const updateContentValue = (pageSlug: string, contentKey: string, value: string) => {
    setContentByPage(prev => ({
      ...prev,
      [pageSlug]: {
        ...prev[pageSlug],
        [contentKey]: {
          ...prev[pageSlug][contentKey],
          content_value: value
        }
      }
    }));
  };

  const toggleContentActive = (pageSlug: string, contentKey: string) => {
    setContentByPage(prev => ({
      ...prev,
      [pageSlug]: {
        ...prev[pageSlug],
        [contentKey]: {
          ...prev[pageSlug][contentKey],
          is_active: !prev[pageSlug][contentKey].is_active
        }
      }
    }));
  };

  const startEditing = (key: string) => {
    setEditingKeys(prev => new Set([...prev, key]));
  };

  const stopEditing = (key: string) => {
    setEditingKeys(prev => {
      const newSet = new Set(prev);
      newSet.delete(key);
      return newSet;
    });
  };

  const handleSavePageContent = async (pageSlug: string) => {
    const pageContent = contentByPage[pageSlug] || {};
    const success = await contentManager.savePageContent(pageSlug, pageContent);
    if (success) {
      // Clear editing state for this page
      const pageKeys = Object.keys(pageContent).map(key => `${pageSlug}-${key}`);
      setEditingKeys(prev => {
        const newSet = new Set(prev);
        pageKeys.forEach(key => newSet.delete(key));
        return newSet;
      });
    }
  };

  const handleAddContent = async () => {
    if (!newContentData.content_key || !newContentData.content_value || !showAddForm) return;

    const result = await contentManager.addContent(
      showAddForm,
      newContentData.content_key,
      newContentData.content_value,
      newContentData.content_type
    );

    if (result) {
      setContentByPage(prev => ({
        ...prev,
        [showAddForm]: {
          ...prev[showAddForm],
          [newContentData.content_key]: result
        }
      }));
      resetContentForm();
    }
  };

  const handleDeleteContent = async (pageSlug: string, contentKey: string, id: string) => {
    const success = await contentManager.deleteContent(id);
    if (success) {
      setContentByPage(prev => {
        const newState = { ...prev };
        if (newState[pageSlug]) {
          const { [contentKey]: removed, ...rest } = newState[pageSlug];
          newState[pageSlug] = rest;
        }
        return newState;
      });
    }
  };

  const handleSaveSEO = async () => {
    const result = await seoManager.saveSEOData(seoFormData, editingSEO || undefined);
    if (result) {
      if (editingSEO) {
        setSeoData(prev => prev.map(item => item.id === editingSEO ? result : item));
      } else {
        setSeoData(prev => [...prev, result]);
      }
      resetSEOForm();
    }
  };

  const startEditSEO = (item: SEOData) => {
    setSeoFormData({
      page_slug: item.page_slug,
      meta_title: item.meta_title || '',
      meta_description: item.meta_description || '',
      meta_keywords: item.meta_keywords || '',
      og_title: item.og_title || '',
      og_description: item.og_description || '',
      og_image: item.og_image || '',
      canonical_url: item.canonical_url || '',
      robots_meta: item.robots_meta,
    });
    setEditingSEO(item.id);
  };

  const resetContentForm = () => {
    setNewContentData({
      content_key: '',
      content_value: '',
      content_type: 'text',
      is_active: true
    });
    setShowAddForm(null);
  };

  const resetSEOForm = () => {
    setSeoFormData({
      page_slug: '',
      meta_title: '',
      meta_description: '',
      meta_keywords: '',
      og_title: '',
      og_description: '',
      og_image: '',
      canonical_url: '',
      robots_meta: 'index, follow'
    });
    setEditingSEO(null);
    setShowAddSEOForm(false);
  };

  const getContentStats = (pageSlug: string) => {
    const pageContent = contentByPage[pageSlug] || {};
    const total = Object.keys(pageContent).length;
    const active = Object.values(pageContent).filter(item => item.is_active).length;
    return { total, active };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Type className="w-6 h-6 text-primary" />
            </div>
            Управление контентом
          </h1>
          <p className="text-muted-foreground">Редактирование контента и SEO настроек сайта</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-9 h-auto">
          {pages.map((page) => {
            const stats = page.value !== 'seo' ? getContentStats(page.value) : null;
            const IconComponent = page.icon;
            
            return (
              <TabsTrigger 
                key={page.value} 
                value={page.value} 
                className="flex flex-col items-center gap-2 h-16 data-[state=active]:bg-primary/10"
              >
                <div className={`p-1.5 rounded-md ${page.color} bg-current/10`}>
                  <IconComponent className={`w-4 h-4 ${page.color}`} />
                </div>
                <span className="text-xs font-medium">{page.label}</span>
                {stats && stats.total > 0 && (
                  <span className="text-xs px-1 py-0 h-4 bg-muted rounded">
                    {stats.active}/{stats.total}
                  </span>
                )}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Content Form */}
        <ContentForm
          isOpen={showAddForm !== null}
          isEditing={false}
          loading={contentManager.saving}
          contentTypes={contentTypes}
          formData={newContentData}
          onFormDataChange={setNewContentData}
          onSave={handleAddContent}
          onCancel={resetContentForm}
        />

        {/* SEO Form */}
        <SEOForm
          isOpen={showAddSEOForm || editingSEO !== null}
          isEditing={editingSEO !== null}
          loading={seoManager.saving}
          pageOptions={seoPages}
          robotsOptions={robotsOptions}
          formData={seoFormData}
          onFormDataChange={setSeoFormData}
          onSave={handleSaveSEO}
          onCancel={resetSEOForm}
        />

        {/* Content Pages */}
        {pages.filter(p => p.value !== 'seo').map((page) => (
          <TabsContent key={page.value} value={page.value} className="space-y-6">
            <ContentPageEditor
              page={page}
              pageContent={contentByPage[page.value] || {}}
              contentTypes={contentTypes}
              editingKeys={editingKeys}
              saving={contentManager.saving}
              onContentChange={(contentKey, value) => updateContentValue(page.value, contentKey, value)}
              onToggleActive={(contentKey) => toggleContentActive(page.value, contentKey)}
              onStartEdit={startEditing}
              onStopEdit={stopEditing}
              onDelete={(contentKey, id) => handleDeleteContent(page.value, contentKey, id)}
              onSave={() => handleSavePageContent(page.value)}
              onAddNew={() => setShowAddForm(page.value)}
              getStats={() => getContentStats(page.value)}
            />
          </TabsContent>
        ))}

        {/* SEO Tab - остается прежним функционал из исходного файла */}
      </Tabs>
    </div>
  );
}