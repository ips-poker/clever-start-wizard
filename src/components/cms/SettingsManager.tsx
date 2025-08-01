import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Settings, Plus, Edit, Save, X, Mail, Phone, Globe, Palette, Image } from "lucide-react";

interface CMSSettings {
  id: string;
  setting_key: string;
  setting_value: string | null;
  setting_type: string;
  category: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

interface SettingsForm {
  setting_key: string;
  setting_value: string;
  setting_type: string;
  category: string;
  description: string;
  is_public: boolean;
}

export function SettingsManager() {
  const [settings, setSettings] = useState<CMSSettings[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<SettingsForm>({
    setting_key: '',
    setting_value: '',
    setting_type: 'text',
    category: 'general',
    description: '',
    is_public: true
  });

  const { toast } = useToast();

  const categories = [
    { value: 'general', label: 'Общие', icon: Settings },
    { value: 'contact', label: 'Контакты', icon: Mail },
    { value: 'social', label: 'Социальные сети', icon: Globe },
    { value: 'branding', label: 'Брендинг', icon: Palette },
  ];

  const settingTypes = [
    { value: 'text', label: 'Текст' },
    { value: 'number', label: 'Число' },
    { value: 'boolean', label: 'Логический' },
    { value: 'json', label: 'JSON' },
    { value: 'image', label: 'Изображение' },
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_settings')
        .select('*')
        .order('category', { ascending: true })
        .order('setting_key', { ascending: true });

      if (error) throw error;
      setSettings(data || []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить настройки",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (id?: string) => {
    try {
      if (id) {
        // Update existing
        const { error } = await supabase
          .from('cms_settings')
          .update(formData)
          .eq('id', id);

        if (error) throw error;
        setEditingId(null);
      } else {
        // Create new
        const { error } = await supabase
          .from('cms_settings')
          .insert([formData]);

        if (error) throw error;
        setShowAddForm(false);
      }

      await fetchSettings();
      resetForm();
      toast({
        title: "Успешно",
        description: id ? "Настройка обновлена" : "Настройка создана",
      });
    } catch (error) {
      console.error('Error saving setting:', error);
      toast({
        title: "Ошибка",
        description: error.message.includes('duplicate') 
          ? "Настройка с таким ключом уже существует" 
          : "Не удалось сохранить настройку",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Вы уверены, что хотите удалить эту настройку?')) return;

    try {
      const { error } = await supabase
        .from('cms_settings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchSettings();
      toast({
        title: "Успешно",
        description: "Настройка удалена",
      });
    } catch (error) {
      console.error('Error deleting setting:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить настройку",
        variant: "destructive",
      });
    }
  };

  const startEdit = (item: CMSSettings) => {
    setFormData({
      setting_key: item.setting_key,
      setting_value: item.setting_value || '',
      setting_type: item.setting_type,
      category: item.category,
      description: item.description || '',
      is_public: item.is_public,
    });
    setEditingId(item.id);
  };

  const resetForm = () => {
    setFormData({
      setting_key: '',
      setting_value: '',
      setting_type: 'text',
      category: 'general',
      description: '',
      is_public: true
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    resetForm();
  };

  const renderSettingValue = (setting: CMSSettings) => {
    switch (setting.setting_type) {
      case 'boolean':
        return (
          <Badge variant={setting.setting_value === 'true' ? "default" : "secondary"}>
            {setting.setting_value === 'true' ? 'Включено' : 'Выключено'}
          </Badge>
        );
      case 'image':
        return setting.setting_value ? (
          <div className="flex items-center gap-2">
            <img 
              src={setting.setting_value} 
              alt={setting.setting_key}
              className="w-8 h-8 object-cover rounded"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
              }}
            />
            <span className="text-sm text-muted-foreground">{setting.setting_value}</span>
          </div>
        ) : (
          <span className="text-muted-foreground">Не установлено</span>
        );
      case 'json':
        return (
          <pre className="text-xs bg-muted/50 p-2 rounded font-mono max-w-xs overflow-hidden">
            {setting.setting_value || '{}'}
          </pre>
        );
      default:
        return (
          <span className="font-mono text-sm">
            {setting.setting_value || <span className="text-muted-foreground">Не установлено</span>}
          </span>
        );
    }
  };

  const renderFormInput = () => {
    switch (formData.setting_type) {
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Switch
              checked={formData.setting_value === 'true'}
              onCheckedChange={(checked) => setFormData({ ...formData, setting_value: checked.toString() })}
            />
            <Label>Включено</Label>
          </div>
        );
      case 'number':
        return (
          <Input
            type="number"
            value={formData.setting_value}
            onChange={(e) => setFormData({ ...formData, setting_value: e.target.value })}
          />
        );
      case 'json':
        return (
          <Textarea
            value={formData.setting_value}
            onChange={(e) => setFormData({ ...formData, setting_value: e.target.value })}
            rows={5}
            placeholder='{"key": "value"}'
            className="font-mono"
          />
        );
      default:
        return (
          <Input
            value={formData.setting_value}
            onChange={(e) => setFormData({ ...formData, setting_value: e.target.value })}
            placeholder="Значение настройки"
          />
        );
    }
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter(setting => setting.category === category);
  };

  if (loading) {
    return <div className="flex items-center justify-center p-8">Загрузка...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Настройки сайта</h2>
          <p className="text-muted-foreground">Управление общими настройками и конфигурацией</p>
        </div>
        <Button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2"
        >
          <Plus size={16} />
          Добавить настройку
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Новая настройка</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="setting_key">Ключ настройки</Label>
                <Input
                  id="setting_key"
                  value={formData.setting_key}
                  onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
                  placeholder="site_title, contact_email, etc."
                />
              </div>

              <div>
                <Label htmlFor="category">Категория</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="setting_type">Тип значения</Label>
                <Select
                  value={formData.setting_type}
                  onValueChange={(value) => setFormData({ ...formData, setting_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {settingTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_public"
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
                <Label htmlFor="is_public">Публичная</Label>
              </div>
            </div>

            <div>
              <Label htmlFor="description">Описание</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Описание назначения настройки"
              />
            </div>

            <div>
              <Label htmlFor="setting_value">Значение</Label>
              {renderFormInput()}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={cancelEdit}>
                <X size={16} className="mr-2" />
                Отмена
              </Button>
              <Button onClick={() => handleSave()}>
                <Save size={16} className="mr-2" />
                Сохранить
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings by Category */}
      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <TabsTrigger key={category.value} value={category.value} className="flex items-center gap-2">
                <Icon size={16} />
                {category.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {categories.map((category) => (
          <TabsContent key={category.value} value={category.value} className="space-y-4">
            {getSettingsByCategory(category.value).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <category.icon className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Нет настроек в категории "{category.label}"</h3>
                  <p className="text-muted-foreground mb-4">Добавьте первую настройку для этой категории</p>
                  <Button 
                    onClick={() => {
                      setFormData({ ...formData, category: category.value });
                      setShowAddForm(true);
                    }}
                  >
                    <Plus size={16} className="mr-2" />
                    Добавить настройку
                  </Button>
                </CardContent>
              </Card>
            ) : (
              getSettingsByCategory(category.value).map((setting) => (
                <Card key={setting.id}>
                  <CardContent className="p-6">
                    {editingId === setting.id ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Ключ настройки</Label>
                            <Input
                              value={formData.setting_key}
                              onChange={(e) => setFormData({ ...formData, setting_key: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label>Категория</Label>
                            <Select
                              value={formData.category}
                              onValueChange={(value) => setFormData({ ...formData, category: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {categories.map((cat) => (
                                  <SelectItem key={cat.value} value={cat.value}>
                                    {cat.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label>Тип значения</Label>
                            <Select
                              value={formData.setting_type}
                              onValueChange={(value) => setFormData({ ...formData, setting_type: value })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {settingTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={formData.is_public}
                              onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                            />
                            <Label>Публичная</Label>
                          </div>
                        </div>

                        <div>
                          <Label>Описание</Label>
                          <Input
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          />
                        </div>

                        <div>
                          <Label>Значение</Label>
                          {renderFormInput()}
                        </div>

                        <div className="flex justify-end gap-2">
                          <Button variant="outline" onClick={cancelEdit}>
                            <X size={16} className="mr-2" />
                            Отмена
                          </Button>
                          <Button onClick={() => handleSave(setting.id)}>
                            <Save size={16} className="mr-2" />
                            Сохранить
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs">
                                {setting.setting_key}
                              </Badge>
                              <Badge variant={setting.is_public ? "default" : "secondary"}>
                                {setting.is_public ? "Публичная" : "Приватная"}
                              </Badge>
                              <Badge variant="outline">
                                {settingTypes.find(t => t.value === setting.setting_type)?.label}
                              </Badge>
                            </div>
                            
                            {setting.description && (
                              <p className="text-sm text-muted-foreground">{setting.description}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => startEdit(setting)}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(setting.id)}
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4">
                          <div className="text-sm">
                            <strong>Значение:</strong>
                            <div className="mt-1">
                              {renderSettingValue(setting)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}