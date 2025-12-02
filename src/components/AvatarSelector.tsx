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
import pokerAvatar17 from "@/assets/avatars/poker-avatar-17.png";
import pokerAvatar18 from "@/assets/avatars/poker-avatar-18.png";
import pokerAvatar19 from "@/assets/avatars/poker-avatar-19.png";
import pokerAvatar20 from "@/assets/avatars/poker-avatar-20.png";
import pokerAvatar21 from "@/assets/avatars/poker-avatar-21.png";
import pokerAvatar22 from "@/assets/avatars/poker-avatar-22.png";
import pokerAvatar23 from "@/assets/avatars/poker-avatar-23.png";
import pokerAvatar24 from "@/assets/avatars/poker-avatar-24.png";

interface AvatarSelectorProps {
  onSelect: (avatarUrl: string) => void;
  onClose: () => void;
  playerId?: string; // Добавляем ID игрока для Telegram пользователей
}

const presetAvatars = [
  { id: "1", url: pokerAvatar1 },
  { id: "2", url: pokerAvatar2 },
  { id: "3", url: pokerAvatar3 },
  { id: "4", url: pokerAvatar4 },
  { id: "5", url: pokerAvatar5 },
  { id: "6", url: pokerAvatar6 },
  { id: "7", url: pokerAvatar7 },
  { id: "8", url: pokerAvatar8 },
  { id: "9", url: pokerAvatar9 },
  { id: "10", url: pokerAvatar10 },
  { id: "11", url: pokerAvatar11 },
  { id: "12", url: pokerAvatar12 },
  { id: "13", url: pokerAvatar13 },
  { id: "14", url: pokerAvatar14 },
  { id: "15", url: pokerAvatar15 },
  { id: "16", url: pokerAvatar16 },
  { id: "17", url: pokerAvatar17 },
  { id: "18", url: pokerAvatar18 },
  { id: "19", url: pokerAvatar19 },
  { id: "20", url: pokerAvatar20 },
  { id: "21", url: pokerAvatar21 },
  { id: "22", url: pokerAvatar22 },
  { id: "23", url: pokerAvatar23 },
  { id: "24", url: pokerAvatar24 },
];

export function AvatarSelector({ onSelect, onClose, playerId }: AvatarSelectorProps) {
  const { user } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  
  // Используем playerId если передан (для Telegram), иначе user?.id (для веб)
  const uploaderId = playerId || user?.id;

  const compressImage = async (file: File, targetSizeKB: number = 500): Promise<File> => {
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
          
          // Определяем качество в зависимости от размера исходного файла
          const fileSizeMB = file.size / (1024 * 1024);
          let quality = 0.85; // По умолчанию хорошее качество
          
          if (fileSizeMB > 10) {
            quality = 0.6; // Очень большие файлы (>10 МБ) - агрессивное сжатие
          } else if (fileSizeMB > 5) {
            quality = 0.7; // Большие файлы (>5 МБ) - среднее сжатие
          } else if (fileSizeMB > 2) {
            quality = 0.75; // Средние файлы (>2 МБ) - легкое сжатие
          }
          
          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                console.log('Image compressed:', {
                  originalSize: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
                  compressedSize: `${(blob.size / 1024).toFixed(2)} KB`,
                  quality: quality,
                  reduction: `${(((file.size - blob.size) / file.size) * 100).toFixed(1)}%`
                });
                resolve(compressedFile);
              } else {
                reject(new Error('Compression failed'));
              }
            },
            'image/jpeg',
            quality
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
      
      const files = event.target.files;
      if (!files || files.length === 0) {
        console.log('No files selected');
        setUploading(false);
        return;
      }

      let file = files[0];
      console.log('File selected:', { 
        name: file.name, 
        size: `${(file.size / (1024 * 1024)).toFixed(2)} MB`, 
        type: file.type 
      });
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        console.error('Invalid file type:', file.type);
        toast.error("Пожалуйста, выберите файл изображения");
        return;
      }

      // Compress image if larger than 500KB (агрессивное сжатие для всех файлов)
      if (file.size > 500 * 1024) {
        console.log('Compressing image, original size:', `${(file.size / (1024 * 1024)).toFixed(2)} MB`);
        toast.info("Сжимаем изображение...");
        file = await compressImage(file, 500);
        console.log('Image compressed, new size:', `${(file.size / 1024).toFixed(2)} KB`);
      }

      if (!uploaderId) {
        console.error('No uploader ID available');
        toast.error("Ошибка: не удалось определить пользователя");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${uploaderId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      
      console.log('Uploading avatar:', { uploaderId, fileName, fileSize: file.size });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('gallery')
        .upload(`avatars/${fileName}`, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error details:', {
          message: uploadError.message,
          name: uploadError.name,
          stack: uploadError.stack
        });
        
        // Более понятные сообщения об ошибках
        if (uploadError.message.includes('policy')) {
          toast.error("Ошибка доступа: необходима авторизация для загрузки фото");
        } else if (uploadError.message.includes('size')) {
          toast.error("Файл слишком большой. Попробуйте другое изображение");
        } else {
          toast.error(`Ошибка загрузки: ${uploadError.message}`);
        }
        throw uploadError;
      }

      console.log('File uploaded successfully:', uploadData);

      console.log('File uploaded successfully');

      const { data } = supabase.storage
        .from('gallery')
        .getPublicUrl(`avatars/${fileName}`);

      console.log('Public URL:', data.publicUrl);
      setSelectedAvatar(data.publicUrl);
      toast.success("Изображение загружено успешно!");
    } catch (error: any) {
      console.error('Error uploading file:', {
        error,
        message: error?.message,
        stack: error?.stack
      });
      
      if (error?.message?.includes('JWT')) {
        toast.error("Ошибка авторизации. Пожалуйста, войдите в систему");
      } else if (!error?.message?.includes('policy')) {
        // Не дублируем сообщение если уже показали ошибку политики выше
        toast.error(`Ошибка при загрузке файла: ${error?.message || 'Неизвестная ошибка'}`);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleSelectAvatar = () => {
    console.log('handleSelectAvatar called, selectedAvatar:', selectedAvatar);
    if (selectedAvatar) {
      console.log('Calling onSelect with:', selectedAvatar);
      onSelect(selectedAvatar);
      console.log('Calling onClose');
      onClose();
    } else {
      console.log('No avatar selected');
      toast.error("Пожалуйста, сначала выберите аватар");
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
                  onClick={() => {
                    console.log('Preset avatar clicked:', { id: avatar.id, url: avatar.url });
                    setSelectedAvatar(avatar.url);
                  }}
                >
                  <img
                    src={avatar.url}
                    alt="Poker avatar"
                    className="w-full aspect-square rounded-lg object-cover"
                  />
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
                  className="mt-2 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Выберите фото из галереи или сделайте новое. Большие файлы автоматически сжимаются.
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
            disabled={uploading}
          >
            Выбрать аватар
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}