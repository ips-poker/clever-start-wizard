import { useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Save, Trash2, Loader2 } from "lucide-react";

export function ClubSettings() {
  const { club } = useClub();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: club?.name || "",
    description: club?.description || ""
  });

  const handleSave = async () => {
    if (!club) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clans')
        .update({
          name: formData.name,
          description: formData.description
        })
        .eq('id', club.id);

      if (error) throw error;
      toast.success("Настройки сохранены");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!club) return;
    
    try {
      const { error } = await supabase
        .from('clans')
        .delete()
        .eq('id', club.id);

      if (error) throw error;
      toast.success("Клуб удалён");
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting club:", error);
      toast.error("Ошибка при удалении клуба");
    }
  };

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Основная информация</CardTitle>
          <CardDescription>
            Настройки профиля клуба
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Название клуба</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Название вашего клуба"
            />
          </div>

          <div className="space-y-2">
            <Label>Описание</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Описание клуба..."
              rows={4}
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Сохранить
          </Button>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Опасная зона</CardTitle>
          <CardDescription>
            Необратимые действия
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить клуб
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить клуб?</AlertDialogTitle>
                <AlertDialogDescription>
                  Это действие необратимо. Будут удалены все данные клуба, 
                  включая турниры, персонал и подписку.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive">
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
