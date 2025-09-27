import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";

interface ImageUploaderProps {
  label: string;
  currentImageUrl?: string;
  onImageChange: (url: string) => void;
  folder?: string;
  placeholder?: string;
}

export function ImageUploader({ 
  label, 
  currentImageUrl, 
  onImageChange, 
  folder = "about", 
  placeholder = "Перетащите изображение или нажмите для выбора" 
}: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { toast } = useToast();

  const uploadImage = async (file: File) => {
    try {
      setUploading(true);

      // Проверяем тип файла
      if (!file.type.startsWith('image/')) {
        throw new Error('Пожалуйста, выберите изображение');
      }

      // Проверяем размер файла (максимум 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('Размер файла не должен превышать 5MB');
      }

      // Генерируем уникальное имя файла
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Загружаем файл в Supabase Storage
      const { data, error } = await supabase.storage
        .from('gallery')
        .upload(fileName, file);

      if (error) throw error;

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('gallery')
        .getPublicUrl(fileName);

      onImageChange(urlData.publicUrl);
      
      toast({
        title: "Успешно загружено",
        description: "Изображение добавлено",
      });
    } catch (error) {
      console.error('Ошибка загрузки:', error);
      toast({
        title: "Ошибка загрузки",
        description: error instanceof Error ? error.message : "Не удалось загрузить изображение",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      uploadImage(file);
    }
  };

  const removeImage = () => {
    onImageChange('');
  };

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      
      {/* URL Input */}
      <div className="flex gap-2">
        <Input
          value={currentImageUrl || ''}
          onChange={(e) => onImageChange(e.target.value)}
          placeholder="https://example.com/image.jpg или загрузите файл"
          className="flex-1"
        />
        {currentImageUrl && (
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={removeImage}
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Upload Area */}
      <Card className={`border-2 border-dashed transition-colors ${
        dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
      }`}>
        <CardContent className="p-6">
          <div
            className="text-center cursor-pointer"
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById(`file-${label}`)?.click()}
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Загрузка...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <Upload className="w-8 h-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">{placeholder}</p>
                <p className="text-xs text-muted-foreground">PNG, JPG, WEBP до 5MB</p>
              </div>
            )}
          </div>
          
          <input
            id={`file-${label}`}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />
        </CardContent>
      </Card>

      {/* Image Preview */}
      {currentImageUrl && (
        <div className="mt-4">
          <Label className="text-sm text-muted-foreground">Предварительный просмотр:</Label>
          <div className="mt-2 relative">
            <img
              src={currentImageUrl}
              alt="Preview"
              className="max-w-full h-32 object-cover rounded-lg border"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}