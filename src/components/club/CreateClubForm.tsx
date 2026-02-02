import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Building2, Loader2, Sparkles } from "lucide-react";
import { SUBSCRIPTION_TIERS } from "@/types/subscription";

interface CreateClubFormProps {
  onSuccess?: () => void;
}

export function CreateClubForm({ onSuccess }: CreateClubFormProps) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: ""
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Введите название клуба");
      return;
    }

    setLoading(true);
    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        toast.error("Необходимо авторизоваться");
        return;
      }

      // Check if user has a player profile
      let { data: player, error: playerError } = await supabase
        .from("players")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      // Create player if not exists
      if (!player) {
        const { data: newPlayer, error: createPlayerError } = await supabase
          .from("players")
          .insert({
            name: user.email?.split("@")[0] || "Новый игрок",
            user_id: user.id,
            email: user.email
          })
          .select("id")
          .single();

        if (createPlayerError) {
          console.error("Create player error:", createPlayerError);
          throw new Error("Не удалось создать профиль игрока");
        }
        player = newPlayer;
      }

      // Create clan
      const { data: clan, error: clanError } = await supabase
        .from("clans")
        .insert({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          don_player_id: player.id,
          emblem_id: Math.floor(Math.random() * 10) + 1,
          seal_id: Math.floor(Math.random() * 10) + 1
        })
        .select("id")
        .single();

      if (clanError) {
        console.error("Create clan error:", clanError);
        throw new Error("Не удалось создать клуб");
      }

      // Add owner to clan_members
      const { error: memberError } = await supabase
        .from("clan_members")
        .insert({
          clan_id: clan.id,
          player_id: player.id,
          hierarchy_role: "don"
        });

      if (memberError) {
        console.error("Add member error:", memberError);
        // Non-critical, continue
      }

      // Create free subscription
      const freeTier = SUBSCRIPTION_TIERS.free;
      const { error: subError } = await supabase
        .from("club_subscriptions")
        .insert({
          clan_id: clan.id,
          plan: "free",
          max_tournaments: freeTier.limits.max_tournaments,
          max_players: freeTier.limits.max_players,
          max_staff: freeTier.limits.max_staff,
          max_online_tables: freeTier.limits.max_online_tables,
          features: freeTier.features,
          payment_status: "active",
          price_monthly: 0
        });

      if (subError) {
        console.error("Create subscription error:", subError);
        // Non-critical, continue
      }

      // Add to club_staff as owner
      const { error: staffError } = await supabase
        .from("club_staff")
        .insert({
          clan_id: clan.id,
          player_id: player.id,
          role: "owner",
          permissions: {
            manage_tournaments: true,
            manage_players: true,
            manage_staff: true,
            view_analytics: true
          },
          is_active: true
        });

      if (staffError) {
        console.error("Add staff error:", staffError);
        // Non-critical, continue
      }

      toast.success("Клуб успешно создан!");
      
      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ["user-club"] });
      
      onSuccess?.();
    } catch (error) {
      console.error("Create club error:", error);
      toast.error(error instanceof Error ? error.message : "Ошибка при создании клуба");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
          <Building2 className="w-8 h-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Создать клуб</CardTitle>
        <CardDescription>
          Создайте свой покерный клуб и начните проводить турниры
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название клуба *</Label>
            <Input
              id="name"
              placeholder="Например: Poker Masters"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              disabled={loading}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              placeholder="Расскажите о вашем клубе..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              disabled={loading}
              rows={3}
              maxLength={500}
            />
          </div>

          {/* Free plan info */}
          <div className="p-4 rounded-lg bg-muted/50 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-primary" />
              Бесплатный старт
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• До {SUBSCRIPTION_TIERS.free.limits.max_tournaments} турниров</li>
              <li>• До {SUBSCRIPTION_TIERS.free.limits.max_players} игроков</li>
              <li>• До {SUBSCRIPTION_TIERS.free.limits.max_staff} сотрудников</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Вы сможете перейти на платный план в любое время
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Создание...
              </>
            ) : (
              <>
                <Building2 className="w-4 h-4 mr-2" />
                Создать клуб
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
