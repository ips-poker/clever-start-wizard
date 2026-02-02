import { useState } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Plus, 
  UserPlus, 
  MoreVertical, 
  Search,
  Trophy,
  TrendingUp,
  Trash2,
  Loader2,
  Users,
  Mail,
  Phone
} from "lucide-react";
import { toast } from "sonner";

interface ClubPlayer {
  id: string;
  player_id: string;
  clan_id: string;
  hierarchy_role: string;
  joined_at: string;
  player: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
    games_played: number;
    wins: number;
    email: string | null;
    phone: string | null;
  } | null;
}

export function ClubPlayers() {
  const { club, isAdmin, canAddPlayer } = useClub();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  // Fetch club members
  const { data: players = [], isLoading } = useQuery({
    queryKey: ["club-players", club?.id],
    queryFn: async () => {
      if (!club?.id) return [];

      const { data, error } = await supabase
        .from('clan_members')
        .select(`
          id,
          player_id,
          clan_id,
          hierarchy_role,
          joined_at,
          player:players(
            id,
            name,
            avatar_url,
            elo_rating,
            games_played,
            wins,
            email,
            phone
          )
        `)
        .eq('clan_id', club.id)
        .order('joined_at', { ascending: false });

      if (error) throw error;
      return data as ClubPlayer[];
    },
    enabled: !!club?.id
  });

  // Create new player
  const createPlayer = useMutation({
    mutationFn: async (name: string) => {
      if (!club?.id) throw new Error("No club");

      // Create player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({ name })
        .select()
        .single();

      if (playerError) throw playerError;

      // Add to clan members
      const { error: memberError } = await supabase
        .from('clan_members')
        .insert({
          clan_id: club.id,
          player_id: player.id,
          hierarchy_role: 'member'
        });

      if (memberError) throw memberError;

      return player;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-players", club?.id] });
      queryClient.invalidateQueries({ queryKey: ["club-usage", club?.id] });
      setNewPlayerName("");
      setIsAddOpen(false);
      toast.success("Игрок добавлен");
    },
    onError: (error) => {
      console.error("Error creating player:", error);
      toast.error("Ошибка при добавлении игрока");
    }
  });

  // Remove player
  const removePlayer = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('clan_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["club-players", club?.id] });
      queryClient.invalidateQueries({ queryKey: ["club-usage", club?.id] });
      toast.success("Игрок удалён из клуба");
    },
    onError: (error) => {
      console.error("Error removing player:", error);
      toast.error("Ошибка при удалении");
    }
  });

  const filteredPlayers = players.filter(member => 
    member.player?.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Игроки клуба</h2>
          <p className="text-sm text-muted-foreground">
            {players.length} игроков
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск..."
              className="pl-9"
            />
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button disabled={!canAddPlayer}>
                <UserPlus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить игрока</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Input
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    placeholder="Имя игрока"
                  />
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => createPlayer.mutate(newPlayerName)}
                  disabled={!newPlayerName.trim() || createPlayer.isPending}
                >
                  {createPlayer.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Добавить игрока
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Players List */}
      {filteredPlayers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">
              {search ? "Игроки не найдены" : "Нет игроков"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {search 
                ? "Попробуйте изменить поисковый запрос" 
                : "Добавьте первых игроков в ваш клуб"
              }
            </p>
            {!search && (
              <Button onClick={() => setIsAddOpen(true)} disabled={!canAddPlayer}>
                <UserPlus className="w-4 h-4 mr-2" />
                Добавить игрока
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredPlayers.map((member) => (
            <Card key={member.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={member.player?.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {member.player?.name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">
                      {member.player?.name || 'Неизвестный'}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <TrendingUp className="w-3.5 h-3.5" />
                        {member.player?.elo_rating || 1000} ELO
                      </span>
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3.5 h-3.5" />
                        {member.player?.games_played || 0} игр
                      </span>
                      {member.player?.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {member.player.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="hidden sm:flex items-center gap-2">
                    <Badge variant="outline" className="bg-green-500/10 text-green-500">
                      {member.player?.wins || 0} побед
                    </Badge>
                  </div>

                  {/* Actions */}
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => removePlayer.mutate(member.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Удалить из клуба
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}