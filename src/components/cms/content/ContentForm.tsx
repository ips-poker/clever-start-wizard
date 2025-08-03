import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Save, X, Loader2 } from "lucide-react";
import { ContentType } from "@/types/cms";

interface ContentFormProps {
  isOpen: boolean;
  isEditing: boolean;
  loading: boolean;
  contentTypes: ContentType[];
  formData: {
    content_key: string;
    content_value: string;
    content_type: string;
    is_active: boolean;
  };
  onFormDataChange: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
}

export function ContentForm({
  isOpen,
  isEditing,
  loading,
  contentTypes,
  formData,
  onFormDataChange,
  onSave,
  onCancel,
}: ContentFormProps) {
  if (!isOpen) return null;

  const renderValueInput = () => {
    switch (formData.content_type) {
      case 'html':
        return (
          <Textarea
            value={formData.content_value}
            onChange={(e) => onFormDataChange({ ...formData, content_value: e.target.value })}
            placeholder="HTML контент..."
            rows={6}
            className="font-mono text-sm"
          />
        );
      case 'json':
        return (
          <Textarea
            value={formData.content_value}
            onChange={(e) => onFormDataChange({ ...formData, content_value: e.target.value })}
            placeholder='{"key": "value"}'
            rows={6}
            className="font-mono text-sm"
          />
        );
      default:
        return (
          <Input
            value={formData.content_value}
            onChange={(e) => onFormDataChange({ ...formData, content_value: e.target.value })}
            placeholder="Значение контента"
          />
        );
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {isEditing ? 'Редактирование контента' : 'Новый элемент контента'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label>Ключ контента</Label>
            <Input
              value={formData.content_key}
              onChange={(e) => onFormDataChange({ ...formData, content_key: e.target.value })}
              placeholder="header_title, hero_description..."
              disabled={isEditing}
            />
          </div>
          <div>
            <Label>Тип контента</Label>
            <Select 
              value={formData.content_type} 
              onValueChange={(value) => onFormDataChange({ ...formData, content_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {contentTypes.map((type) => {
                  const IconComponent = type.icon;
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-4 h-4 ${type.color}`} />
                        {type.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Значение</Label>
          {renderValueInput()}
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            checked={formData.is_active}
            onCheckedChange={(checked) => onFormDataChange({ ...formData, is_active: checked })}
          />
          <Label>Активный</Label>
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