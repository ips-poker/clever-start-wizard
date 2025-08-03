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
];

export function AvatarSelector({ onSelect, onClose }: AvatarSelectorProps) {
  const { user } = useAuth();
  const [selectedAvatar, setSelectedAvatar] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast("Пожалуйста, выберите файл изображения");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast("Размер файла не должен превышать 5MB");
        return;
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
      toast("Изображение загружено успешно!");
    } catch (error) {
      console.error('Error uploading file:', error);
      toast("Ошибка при загрузке файла");
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
            
            <div className="grid grid-cols-3 gap-4">
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
                  Поддерживаются форматы: JPG, PNG, GIF. Максимальный размер: 5MB
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