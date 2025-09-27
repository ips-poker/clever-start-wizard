import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2, Save, Eye, EyeOff, Loader2 } from "lucide-react";
import { CMSContent, PageInfo, ContentType } from "@/types/cms";
import { ContentStats } from "./ContentStats";

interface ContentPageEditorProps {
  page: PageInfo;
  pageContent: Record<string, CMSContent>;
  contentTypes: ContentType[];
  editingKeys: Set<string>;
  saving: boolean;
  onContentChange: (contentKey: string, value: string) => void;
  onToggleActive: (contentKey: string) => void;
  onStartEdit: (key: string) => void;
  onStopEdit: (key: string) => void;
  onDelete: (contentKey: string, id: string) => void;
  onSave: () => void;
  onAddNew: () => void;
  getStats: () => { total: number; active: number };
}

export function ContentPageEditor({
  page,
  pageContent,
  contentTypes,
  editingKeys,
  saving,
  onContentChange,
  onToggleActive,
  onStartEdit,
  onStopEdit,
  onDelete,
  onSave,
  onAddNew,
  getStats,
}: ContentPageEditorProps) {
  const contentItems = Object.entries(pageContent);
  const stats = getStats();
  const IconComponent = page.icon;

  const getContentTypeInfo = (type: string) => {
    return contentTypes.find(ct => ct.value === type) || contentTypes[0];
  };

  const renderContentValue = (item: CMSContent, isEditing: boolean) => {
    if (!isEditing) {
      if (item.content_type === 'html') {
        return (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: item.content_value || '' }}
          />
        );
      }
      
      if (item.content_type === 'json') {
        try {
          const parsed = JSON.parse(item.content_value || '{}');
          return (
            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
              {JSON.stringify(parsed, null, 2)}
            </pre>
          );
        } catch {
          return <span className="text-muted-foreground">Некорректный JSON</span>;
        }
      }

      return (
        <p className="text-sm">
          {item.content_value || <span className="text-muted-foreground">Пусто</span>}
        </p>
      );
    }

    if (item.content_type === 'html' || item.content_type === 'json') {
      return (
        <Textarea
          value={item.content_value || ''}
          onChange={(e) => onContentChange(item.content_key, e.target.value)}
          rows={6}
          className="font-mono text-sm"
        />
      );
    }

    return (
      <Input
        value={item.content_value || ''}
        onChange={(e) => onContentChange(item.content_key, e.target.value)}
      />
    );
  };

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${page.color} bg-current/10`}>
                <IconComponent className={`w-5 h-5 ${page.color}`} />
              </div>
              Контент страницы: {page.label}
            </CardTitle>
            <ContentStats stats={stats} label={page.label} />
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onAddNew}
              size="sm"
              variant="outline"
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Добавить элемент
            </Button>
            {stats.total > 0 && (
              <Button
                onClick={onSave}
                disabled={saving}
                size="sm"
                className="gap-2"
              >
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Сохранить
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {contentItems.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4">Нет элементов контента для этой страницы</p>
            <Button onClick={onAddNew} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Добавить первый элемент
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {contentItems.map(([contentKey, item]) => {
              const isEditing = editingKeys.has(`${page.value}-${contentKey}`);
              const typeInfo = getContentTypeInfo(item.content_type);
              const TypeIcon = typeInfo.icon;

              return (
                <Card key={contentKey} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono text-xs">
                          {contentKey}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <TypeIcon className={`w-3 h-3 ${typeInfo.color}`} />
                          {typeInfo.label}
                        </Badge>
                        <div className="flex items-center space-x-2">
                           <Switch
                             checked={item.is_active}
                             onCheckedChange={() => onToggleActive(contentKey)}
                           />
                          <span className="text-xs text-muted-foreground">
                            {item.is_active ? 'Активен' : 'Неактивен'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleActive(contentKey)}
                        >
                          {item.is_active ? (
                            <Eye className="w-4 h-4" />
                          ) : (
                            <EyeOff className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => isEditing ? onStopEdit(`${page.value}-${contentKey}`) : onStartEdit(`${page.value}-${contentKey}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm('Удалить этот элемент контента?')) {
                              onDelete(contentKey, item.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-lg p-3">
                      {renderContentValue(item, isEditing)}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      Обновлено: {new Date(item.updated_at).toLocaleString('ru-RU')}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}