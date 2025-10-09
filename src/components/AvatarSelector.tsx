import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

// Import poker avatars
import pokerAvatar1 from "@/assets/avatars/poker-avatar-1.png";
import pokerAvatar2 from "@/assets/avatars/poker-avatar-2.png";
import pokerAvatar3 from "@/assets/avatars/poker-avatar-3.png";
import pokerAvatar4 from "@/assets/avatars/poker-avatar-4.png";
import pokerAvatar5 from "@/assets/avatars/poker-avatar-5.png";
import pokerAvatar6 from "@/assets/avatars/poker-avatar-6.png";
import pokerAvatar7 from "@/assets/avatars/poker-avatar-7.png";
import pokerAvatar8 from "@/assets/avatars/poker-avatar-8.png";
import pokerAvatar9 from "@/assets/avatars/poker-avatar-9.png";
import pokerAvatar10 from "@/assets/avatars/poker-avatar-10.png";
import pokerAvatar11 from "@/assets/avatars/poker-avatar-11.png";
import pokerAvatar12 from "@/assets/avatars/poker-avatar-12.png";
import pokerAvatar13 from "@/assets/avatars/poker-avatar-13.png";
import pokerAvatar14 from "@/assets/avatars/poker-avatar-14.png";
import pokerAvatar15 from "@/assets/avatars/poker-avatar-15.png";
import pokerAvatar16 from "@/assets/avatars/poker-avatar-16.png";

interface AvatarSelectorProps {
  onSelect: (avatarUrl: string) => void;
  onClose: () => void;
}

const presetAvatars = [
  { id: "1", url: pokerAvatar1, name: "Профессионал" },
  { id: "2", url: pokerAvatar2, name: "Леди удачи" },
  { id: "3", url: pokerAvatar3, name: "Борода" },
  { id: "4", url: pokerAvatar4, name: "Мистер X" },
  { id: "5", url: pokerAvatar5, name: "Джентльмен" },
  { id: "6", url: pokerAvatar6, name: "Новичок" },
  { id: "7", url: pokerAvatar7, name: "Акула" },
  { id: "8", url: pokerAvatar8, name: "Лев" },
  { id: "9", url: pokerAvatar9, name: "Тигр" },
  { id: "10", url: pokerAvatar10, name: "Рыбка" },
  { id: "11", url: pokerAvatar11, name: "Босс" },
  { id: "12", url: pokerAvatar12, name: "Дама" },
  { id: "13", url: pokerAvatar13, name: "Бульдог" },
  { id: "14", url: pokerAvatar14, name: "Лис" },
  { id: "15", url: pokerAvatar15, name: "Сова" },
  { id: "16", url: pokerAvatar16, name: "Енот" },
];

export function AvatarSelector({ onSelect, onClose }: AvatarSelectorProps) {
  const { user } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          // Максимальный размер 800x800 для аватаров
          let width = img.width;
          let height = img.height;
          const maxSize = 800;
          
          if (width > height) {
            if (width > maxSize) {
              height *= maxSize / width;
              width = maxSize;
            }
          } else {
            if (height > maxSize) {
              width *= maxSize / height;
              height = maxSize;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      let file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error("Пожалуйста, выберите файл изображения");
        return;
      }

      // Compress image if larger than 500KB
      if (file.size > 500 * 1024) {
        toast.info("Сжимаем изображение...");
        file = await compressImage(file);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(`avatars/${fileName}`, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage
        .from('gallery')
        .getPublicUrl(`avatars/${fileName}`);

      setSelectedAvatar(data.publicUrl);
      toast.success("Изображение загружено успешно!");
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error("Ошибка при загрузке файла");
    } finally {
      setUploading(false);
    }
  };

  const handleSelectAvatar = () => {
    if (selectedAvatar) {
      onSelect(selectedAvatar);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Выбор аватара
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="preset" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="preset">Готовые аватары</TabsTrigger>
            <TabsTrigger value="upload">Загрузить свой</TabsTrigger>
          </TabsList>

          <TabsContent value="preset" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Выберите один из готовых покерных аватаров
            </p>
            
            <div className="grid grid-cols-4 gap-3 max-h-96 overflow-y-auto">
              {presetAvatars.map((avatar) => (
                <div
                  key={avatar.id}
                  className={`cursor-pointer rounded-lg border-2 p-2 transition-all hover:shadow-md ${
                    selectedAvatar === avatar.url
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setSelectedAvatar(avatar.url)}
                >
                  <img
                    src={avatar.url}
                    alt={avatar.name}
                    className="w-full aspect-square rounded-lg object-cover"
                  />
                  <p className="text-center text-sm font-medium mt-2">{avatar.name}</p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="avatar-upload">Загрузить изображение</Label>
                <Input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mt-2"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Поддерживаются форматы: JPG, PNG, GIF. Большие изображения автоматически сжимаются.
                </p>
              </div>

              {selectedAvatar && selectedAvatar.includes('supabase') && (
                <div className="border rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">Предварительный просмотр:</p>
                  <img
                    src={selectedAvatar}
                    alt="Uploaded avatar"
                    className="w-32 h-32 rounded-lg object-cover mx-auto"
                  />
                </div>
              )}

              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Загрузка изображения...
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="outline" onClick={onClose}>
            Отмена
          </Button>
          <Button 
            onClick={handleSelectAvatar} 
            disabled={!selectedAvatar || uploading}
          >
            Выбрать аватар
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}