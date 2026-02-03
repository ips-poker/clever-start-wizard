import { useState, useEffect, useCallback } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { ClubTournamentPlayers } from "./ClubTournamentPlayers";
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
  Phone,
  Upload,
  ChevronRight,
  PlayCircle,
  Clock,
  CheckCircle,
  Grid3X3
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_players: number;
  starting_chips: number;
  players_per_table?: number;
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
  reentry_chips?: number;
  additional_chips?: number;
  rebuy_chips?: number;
  addon_chips?: number;
  rebuy_cost?: number;
  addon_cost?: number;
  current_level?: number;
  reentry_end_level?: number;
  additional_level?: number;
  start_time: string;
}

export function ClubPlayers() {
  const { club, isAdmin, canAddPlayer } = useClub();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [bulkPlayersList, setBulkPlayersList] = useState("");
  const [activeTab, setActiveTab] = useState("club");
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [selectedTournamentId, setSelectedTournamentId] = useState<string>("");

  // Fetch club members
  const { data: players = [], isLoading: playersLoading, refetch: refetchPlayers } = useQuery({
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

  // Fetch active tournaments
  const { data: tournaments = [], isLoading: tournamentsLoading } = useQuery({
    queryKey: ["club-active-tournaments", club?.id],
    queryFn: async () => {
      if (!club?.id) return [];

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('clan_id', club.id)
        .in('status', ['scheduled', 'registration', 'running', 'paused'])
        .order('start_time', { ascending: true });

      if (error) throw error;
      return data as Tournament[];
    },
    enabled: !!club?.id
  });

  // Realtime subscription for players
  useEffect(() => {
    if (!club?.id) return;

    console.log('🔌 Setting up realtime for club players:', club.id);

    const channel = supabase
      .channel(`club_players_realtime_${club.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clan_members',
          filter: `clan_id=eq.${club.id}`
        },
        () => {
          console.log('📡 Club members changed');
          refetchPlayers();
        }
      )
      .subscribe((status) => {
        console.log('📡 Club players channel:', status);
      });

    return () => {
      console.log('🔌 Cleaning up club players realtime');
      supabase.removeChannel(channel);
    };
  }, [club?.id, refetchPlayers]);

  // When tournament is selected from dropdown
  useEffect(() => {
    if (selectedTournamentId) {
      const tournament = tournaments.find(t => t.id === selectedTournamentId);
      if (tournament) {
        setSelectedTournament(tournament);
        setActiveTab("tournament");
      }
    }
  }, [selectedTournamentId, tournaments]);

  // Create new player
  const createPlayer = useMutation({
    mutationFn: async (name: string) => {
      if (!club?.id) throw new Error("No club");

      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({ 
          name,
          email: `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
          elo_rating: 100
        })
        .select()
        .single();

      if (playerError) throw playerError;

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

  // Bulk create players
  const bulkCreatePlayers = useMutation({
    mutationFn: async (names: string[]) => {
      if (!club?.id) throw new Error("No club");

      let created = 0;
      let failed = 0;

      for (const name of names) {
        try {
          // Check if player exists
          let { data: existingPlayer } = await supabase
            .from('players')
            .select('id')
            .eq('name', name.trim())
            .single();

          let playerId;

          if (!existingPlayer) {
            const { data: newPlayer, error: createError } = await supabase
              .from('players')
              .insert({ 
                name: name.trim(),
                email: `${name.trim().toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
                elo_rating: 100
              })
              .select()
              .single();

            if (createError) {
              failed++;
              continue;
            }
            playerId = newPlayer.id;
          } else {
            playerId = existingPlayer.id;
          }

          // Check if already in clan
          const { data: existingMember } = await supabase
            .from('clan_members')
            .select('id')
            .eq('clan_id', club.id)
            .eq('player_id', playerId)
            .single();

          if (existingMember) {
            failed++;
            continue;
          }

          // Add to clan
          const { error: memberError } = await supabase
            .from('clan_members')
            .insert({
              clan_id: club.id,
              player_id: playerId,
              hierarchy_role: 'member'
            });

          if (memberError) {
            failed++;
          } else {
            created++;
          }
        } catch {
          failed++;
        }
      }

      return { created, failed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["club-players", club?.id] });
      queryClient.invalidateQueries({ queryKey: ["club-usage", club?.id] });
      setBulkPlayersList("");
      setIsBulkOpen(false);
      toast.success(`Добавлено: ${result.created}, Ошибок: ${result.failed}`);
    },
    onError: (error) => {
      console.error("Error bulk creating players:", error);
      toast.error("Ошибка массового добавления");
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

  const handleBulkCreate = () => {
    const names = bulkPlayersList.trim().split('\n').filter(name => name.trim());
    if (names.length === 0) {
      toast.error("Введите имена игроков");
      return;
    }
    bulkCreatePlayers.mutate(names);
  };

  const filteredPlayers = players.filter(member => 
    member.player?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-green-500/20 text-green-500 border-green-500/30">LIVE</Badge>;
      case 'paused':
        return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">ПАУЗА</Badge>;
      case 'scheduled':
      case 'registration':
        return <Badge className="bg-blue-500/20 text-blue-500 border-blue-500/30">Регистрация</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (playersLoading || tournamentsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Tournament Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Управление игроками</h2>
          <p className="text-sm text-muted-foreground">
            {players.length} игроков в клубе • {tournaments.length} активных турниров
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Tournament selector */}
          {tournaments.length > 0 && (
            <Select value={selectedTournamentId} onValueChange={setSelectedTournamentId}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Выбрать турнир..." />
              </SelectTrigger>
              <SelectContent>
                {tournaments.map(t => (
                  <SelectItem key={t.id} value={t.id}>
                    <div className="flex items-center gap-2">
                      {t.status === 'running' && <PlayCircle className="w-3 h-3 text-green-500" />}
                      {t.status === 'paused' && <Clock className="w-3 h-3 text-yellow-500" />}
                      <span className="truncate">{t.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card/50 border p-1">
          <TabsTrigger value="club" className="data-[state=active]:bg-primary/20 font-semibold">
            <Users className="w-4 h-4 mr-2" />
            Игроки клуба ({players.length})
          </TabsTrigger>
          <TabsTrigger 
            value="tournament" 
            className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500 font-semibold"
            disabled={!selectedTournament}
          >
            <Trophy className="w-4 h-4 mr-2" />
            {selectedTournament ? selectedTournament.name : 'Выберите турнир'}
          </TabsTrigger>
        </TabsList>

        {/* Club Players Tab */}
        <TabsContent value="club" className="space-y-4 mt-4">
          {/* Search and Actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск игроков..."
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
                    <Label>Имя игрока</Label>
                    <Input
                      value={newPlayerName}
                      onChange={(e) => setNewPlayerName(e.target.value)}
                      placeholder="Введите имя"
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

            <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" disabled={!canAddPlayer}>
                  <Upload className="w-4 h-4 mr-2" />
                  Список
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Массовое добавление</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Каждое имя с новой строки</Label>
                    <Textarea
                      value={bulkPlayersList}
                      onChange={(e) => setBulkPlayersList(e.target.value)}
                      placeholder="Иван Петров&#10;Мария Сидорова&#10;Алексей Иванов"
                      rows={8}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={handleBulkCreate}
                    disabled={!bulkPlayersList.trim() || bulkCreatePlayers.isPending}
                  >
                    {bulkCreatePlayers.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Users className="w-4 h-4 mr-2" />
                    )}
                    Добавить всех
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Players List */}
          {filteredPlayers.length === 0 ? (
            <Card className="bg-card/50">
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
            <div className="grid gap-2">
              <AnimatePresence>
                {filteredPlayers.map((member, index) => (
                  <motion.div
                    key={member.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card className="bg-card/50 hover:border-primary/30 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-4">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={member.player?.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary/10 text-primary">
                              {member.player?.name?.charAt(0).toUpperCase() || '?'}
                            </AvatarFallback>
                          </Avatar>

                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">
                              {member.player?.name || 'Неизвестный'}
                            </h3>
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <TrendingUp className="w-3 h-3" />
                                {member.player?.elo_rating || 100} RPS
                              </span>
                              <span className="flex items-center gap-1">
                                <Trophy className="w-3 h-3" />
                                {member.player?.games_played || 0} игр
                              </span>
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-500" />
                                {member.player?.wins || 0} побед
                              </span>
                            </div>
                          </div>

                          {isAdmin && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
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
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Tournament Players Tab */}
        <TabsContent value="tournament" className="mt-4">
          {selectedTournament ? (
            <ClubTournamentPlayers 
              tournament={selectedTournament}
              onClose={() => {
                setSelectedTournament(null);
                setSelectedTournamentId("");
                setActiveTab("club");
              }}
            />
          ) : (
            <Card className="bg-card/50">
              <CardContent className="py-12 text-center">
                <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-4" />
                <h3 className="text-lg font-medium mb-2">Выберите турнир</h3>
                <p className="text-sm text-muted-foreground">
                  Используйте селектор выше для управления игроками турнира
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
