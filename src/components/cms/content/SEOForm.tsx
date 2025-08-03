import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Save, X, Loader2 } from "lucide-react";

interface SEOFormProps {
  isOpen: boolean;
  isEditing: boolean;
  loading: boolean;
  pageOptions: Array<{ value: string; label: string; url: string }>;
  robotsOptions: Array<{ value: string; label: string }>;
  formData: {
    page_slug: string;
    meta_title: string;
    meta_description: string;
    meta_keywords: string;
    og_title: string;
    og_description: string;
    og_image: string;
    canonical_url: string;
    robots_meta: string;
  };
  onFormDataChange: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function SEOForm({
  isOpen,
  isEditing,
  loading,
  pageOptions,
  robotsOptions,
  formData,
  onFormDataChange,
  onSave,
  onCancel,
}: SEOFormProps) {
  if (!isOpen) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="w-5 h-5" />
          {isEditing ? 'Редактирование SEO данных' : 'Новые SEO данные'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Страница</Label>
            <Select 
              value={formData.page_slug} 
              onValueChange={(value) => onFormDataChange({ ...formData, page_slug: value })}
              disabled={isEditing}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите страницу" />
              </SelectTrigger>
              <SelectContent>
                {pageOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label} ({option.url})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Robots Meta</Label>
            <Select 
              value={formData.robots_meta} 
              onValueChange={(value) => onFormDataChange({ ...formData, robots_meta: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {robotsOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Основные мета-теги</h3>
          
          <div>
            <Label>Meta Title</Label>
            <Input
              value={formData.meta_title}
              onChange={(e) => onFormDataChange({ ...formData, meta_title: e.target.value })}
              placeholder="Заголовок страницы (60 символов)"
              maxLength={60}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {formData.meta_title.length}/60 символов
            </div>
          </div>

          <div>
            <Label>Meta Description</Label>
            <Textarea
              value={formData.meta_description}
              onChange={(e) => onFormDataChange({ ...formData, meta_description: e.target.value })}
              placeholder="Описание страницы (160 символов)"
              maxLength={160}
              rows={3}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {formData.meta_description.length}/160 символов
            </div>
          </div>

          <div>
            <Label>Meta Keywords</Label>
            <Input
              value={formData.meta_keywords}
              onChange={(e) => onFormDataChange({ ...formData, meta_keywords: e.target.value })}
              placeholder="ключевые, слова, через, запятую"
            />
          </div>

          <div>
            <Label>Canonical URL</Label>
            <Input
              value={formData.canonical_url}
              onChange={(e) => onFormDataChange({ ...formData, canonical_url: e.target.value })}
              placeholder="https://example.com/page"
            />
          </div>
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Open Graph</h3>
          
          <div>
            <Label>OG Title</Label>
            <Input
              value={formData.og_title}
              onChange={(e) => onFormDataChange({ ...formData, og_title: e.target.value })}
              placeholder="Заголовок для социальных сетей"
            />
          </div>

          <div>
            <Label>OG Description</Label>
            <Textarea
              value={formData.og_description}
              onChange={(e) => onFormDataChange({ ...formData, og_description: e.target.value })}
              placeholder="Описание для социальных сетей"
              rows={3}
            />
          </div>

          <div>
            <Label>OG Image</Label>
            <Input
              value={formData.og_image}
              onChange={(e) => onFormDataChange({ ...formData, og_image: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Отмена
          </Button>
          <Button onClick={onSave} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? 'Обновить' : 'Сохранить'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}