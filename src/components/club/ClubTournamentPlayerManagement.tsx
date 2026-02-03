import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { 
  Users, 
  UserX, 
  UserCheck,
  UserPlus,
  MoreVertical,
  Search,
  Plus,
  Minus,
  Trash2,
  RefreshCw,
  TrendingUp,
  Coins,
  Clock,
  Check,
  Loader2,
  ListPlus,
  ChevronRight,
  Edit3
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  participation_fee: number;
  reentry_fee: number;
  additional_fee: number;
  starting_chips: number;
  reentry_chips: number;
  additional_chips: number;
  current_level: number;
  reentry_end_level: number | null;
  additional_level: number | null;
}

interface Registration {
  id: string;
  player: {
    id: string;
    name: string;
    avatar_url: string | null;
    elo_rating: number;
  };
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  seat_number: number | null;
  pending_reentry: boolean;
  pending_addon: boolean;
  final_position: number | null;
}

interface ClubTournamentPlayerManagementProps {
  tournament: Tournament;
  registrations: Registration[];
  onUpdate: () => void;
}

export function ClubTournamentPlayerManagement({
  tournament,
  registrations,
  onUpdate
}: ClubTournamentPlayerManagementProps) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("active");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [bulkPlayersList, setBulkPlayersList] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [editingChips, setEditingChips] = useState<string | null>(null);
  const [editChipsValue, setEditChipsValue] = useState("");

  const activePlayers = registrations.filter(r => r.status === 'playing');
  const pendingPlayers = registrations.filter(r => r.status === 'registered');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated')
    .sort((a, b) => (a.final_position || 999) - (b.final_position || 999));

  const filteredActive = activePlayers.filter(r =>
    r.player.name.toLowerCase().includes(search.toLowerCase())
  );

  const canReentry = tournament.reentry_end_level 
    ? tournament.current_level <= tournament.reentry_end_level 
    : true; // Default to true if not set
  
  const canAddon = tournament.additional_level 
    ? tournament.current_level >= tournament.additional_level 
    : false;

  // Calculate prize pool
  const prizePoolInfo = React.useMemo(() => {
    const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || 0), 0);
    const totalAddons = registrations.reduce((sum, r) => sum + (r.additional_sets || 0), 0);
    const entries = registrations.length + totalReentries + totalAddons;
    const prizePool = (registrations.length * (tournament.participation_fee || 0)) +
                     (totalReentries * (tournament.reentry_fee || 0)) +
                     (totalAddons * (tournament.additional_fee || 0));
    return { totalReentries, totalAddons, entries, prizePool };
  }, [registrations, tournament]);

  // Confirm player (registered -> playing)
  const confirmPlayer = async (regId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          status: 'playing',
          chips: tournament.starting_chips
        })
        .eq('id', regId);

      if (error) throw error;
      toast({ title: "Игрок подтверждён" });
      onUpdate();
    } catch (error) {
      console.error('Error confirming player:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Confirm all pending players
  const confirmAllPlayers = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          status: 'playing',
          chips: tournament.starting_chips
        })
        .eq('tournament_id', tournament.id)
        .eq('status', 'registered');

      if (error) throw error;
      toast({ title: `Подтверждено ${pendingPlayers.length} игроков` });
      onUpdate();
    } catch (error) {
      console.error('Error confirming players:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Eliminate player
  const eliminatePlayer = async (regId: string, position?: number) => {
    setIsLoading(true);
    try {
      const finalPosition = position || activePlayers.length;
      
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          status: 'eliminated',
          chips: 0,
          final_position: finalPosition,
          eliminated_at: new Date().toISOString()
        })
        .eq('id', regId);

      if (error) throw error;
      toast({ title: `Игрок выбыл на ${finalPosition} месте` });
      onUpdate();
    } catch (error) {
      console.error('Error eliminating player:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Add reentry
  const addReentry = async (regId: string) => {
    if (!canReentry) {
      toast({ title: "Re-entry недоступен на этом уровне", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const reg = registrations.find(r => r.id === regId);
      if (!reg) return;

      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          status: 'playing',
          chips: tournament.reentry_chips || tournament.starting_chips,
          reentries: (reg.reentries || 0) + 1,
          eliminated_at: null,
          final_position: null
        })
        .eq('id', regId);

      if (error) throw error;
      toast({ title: "Re-entry выполнен" });
      onUpdate();
    } catch (error) {
      console.error('Error adding reentry:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Add addon
  const addAddon = async (regId: string) => {
    setIsLoading(true);
    try {
      const reg = registrations.find(r => r.id === regId);
      if (!reg) return;

      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          chips: (reg.chips || 0) + (tournament.additional_chips || 5000),
          additional_sets: (reg.additional_sets || 0) + 1
        })
        .eq('id', regId);

      if (error) throw error;
      toast({ title: "Addon добавлен" });
      onUpdate();
    } catch (error) {
      console.error('Error adding addon:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Update chips
  const updateChips = async (regId: string, chips: number) => {
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ chips })
        .eq('id', regId);

      if (error) throw error;
      onUpdate();
    } catch (error) {
      console.error('Error updating chips:', error);
    }
  };

  // Add new player
  const addNewPlayer = async () => {
    if (!newPlayerName.trim()) return;

    setIsLoading(true);
    try {
      // First check if player exists
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('id')
        .ilike('name', newPlayerName.trim())
        .maybeSingle();

      let playerId = existingPlayer?.id;

      if (!playerId) {
        // Create new player
        const { data: player, error: playerError } = await supabase
          .from('players')
          .insert({ name: newPlayerName.trim() })
          .select()
          .single();

        if (playerError) throw playerError;
        playerId = player.id;
      }

      // Check if already registered
      const existingReg = registrations.find(r => r.player.id === playerId);
      if (existingReg) {
        toast({ title: "Игрок уже зарегистрирован", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      // Register to tournament
      const { error: regError } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournament.id,
          player_id: playerId,
          status: 'registered',
          chips: 0
        });

      if (regError) throw regError;

      toast({ title: "Игрок добавлен" });
      setNewPlayerName("");
      setIsAddModalOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding player:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Add multiple players from list
  const addBulkPlayers = async () => {
    if (!bulkPlayersList.trim()) return;

    setIsLoading(true);
    try {
      const playerNames = bulkPlayersList
        .split('\n')
        .map(name => name.trim())
        .filter(name => name.length > 0);

      if (playerNames.length === 0) {
        toast({ title: "Список пуст", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      let addedCount = 0;
      let skippedCount = 0;

      for (const name of playerNames) {
        try {
          // Check if player exists
          const { data: existingPlayer } = await supabase
            .from('players')
            .select('id')
            .ilike('name', name)
            .maybeSingle();

          let playerId = existingPlayer?.id;

          if (!playerId) {
            // Create new player
            const { data: newPlayer, error: playerError } = await supabase
              .from('players')
              .insert({ name })
              .select()
              .single();

            if (playerError) {
              skippedCount++;
              continue;
            }
            playerId = newPlayer.id;
          }

          // Check if already registered
          const existingReg = registrations.find(r => r.player.id === playerId);
          if (existingReg) {
            skippedCount++;
            continue;
          }

          // Register to tournament
          await supabase
            .from('tournament_registrations')
            .insert({
              tournament_id: tournament.id,
              player_id: playerId,
              status: 'registered',
              chips: 0
            });

          addedCount++;
        } catch (err) {
          skippedCount++;
        }
      }

      toast({ 
        title: `Добавлено ${addedCount} игроков`,
        description: skippedCount > 0 ? `${skippedCount} пропущено (уже зарегистрированы)` : undefined
      });
      setBulkPlayersList("");
      setIsBulkAddModalOpen(false);
      onUpdate();
    } catch (error) {
      console.error('Error adding bulk players:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  // Update player chips inline
  const saveChipsEdit = async (regId: string) => {
    const chips = parseInt(editChipsValue);
    if (isNaN(chips) || chips < 0) {
      setEditingChips(null);
      return;
    }

    try {
      await supabase
        .from('tournament_registrations')
        .update({ chips })
        .eq('id', regId);
      
      onUpdate();
      toast({ title: "Стек обновлён" });
    } catch (error) {
      console.error('Error updating chips:', error);
    }
    setEditingChips(null);
  };

  // Remove registration
  const removeRegistration = async (regId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('id', regId);

      if (error) throw error;
      toast({ title: "Регистрация удалена" });
      onUpdate();
    } catch (error) {
      console.error('Error removing registration:', error);
      toast({ title: "Ошибка", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск игрока..."
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Single Player Add */}
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UserPlus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить игрока</DialogTitle>
                <DialogDescription>
                  Введите имя игрока для регистрации на турнир
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Имя игрока"
                  onKeyDown={(e) => e.key === 'Enter' && addNewPlayer()}
                />
                <Button 
                  className="w-full" 
                  onClick={addNewPlayer}
                  disabled={!newPlayerName.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <UserPlus className="w-4 h-4 mr-2" />
                  )}
                  Добавить
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          
          {/* Bulk Player Add */}
          <Dialog open={isBulkAddModalOpen} onOpenChange={setIsBulkAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <ListPlus className="w-4 h-4 mr-2" />
                Список
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Добавить игроков списком</DialogTitle>
                <DialogDescription>
                  Введите имена игроков, каждое с новой строки
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Textarea
                  value={bulkPlayersList}
                  onChange={(e) => setBulkPlayersList(e.target.value)}
                  placeholder={"Иван Иванов\nПетр Петров\nСидор Сидоров"}
                  className="min-h-[200px] font-mono text-sm"
                />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {bulkPlayersList.split('\n').filter(n => n.trim()).length} игроков в списке
                  </span>
                </div>
                <Button 
                  className="w-full" 
                  onClick={addBulkPlayers}
                  disabled={!bulkPlayersList.trim() || isLoading}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <ListPlus className="w-4 h-4 mr-2" />
                  )}
                  Добавить всех
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Extended Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="py-3 text-center">
            <UserCheck className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <p className="text-xl font-bold">{activePlayers.length}</p>
            <p className="text-xs text-muted-foreground">Активных</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-3 text-center">
            <Clock className="w-5 h-5 mx-auto mb-1 text-amber-500" />
            <p className="text-xl font-bold">{pendingPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Ожидают</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="py-3 text-center">
            <UserX className="w-5 h-5 mx-auto mb-1 text-red-500" />
            <p className="text-xl font-bold">{eliminatedPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Выбыло</p>
          </CardContent>
        </Card>
        <Card className="bg-purple-500/10 border-purple-500/20">
          <CardContent className="py-3 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-1 text-purple-500" />
            <p className="text-xl font-bold">{prizePoolInfo.totalReentries}</p>
            <p className="text-xs text-muted-foreground">Re-entry</p>
          </CardContent>
        </Card>
        <Card className="bg-primary/10 border-primary/20">
          <CardContent className="py-3 text-center">
            <Coins className="w-5 h-5 mx-auto mb-1 text-primary" />
            <p className="text-xl font-bold">{prizePoolInfo.prizePool.toLocaleString()}₽</p>
            <p className="text-xs text-muted-foreground">Призовой</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">
            Активные ({activePlayers.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Ожидают ({pendingPlayers.length})
          </TabsTrigger>
          <TabsTrigger value="eliminated">
            Выбывшие ({eliminatedPlayers.length})
          </TabsTrigger>
        </TabsList>

        {/* Active Players */}
        <TabsContent value="active" className="space-y-3">
          {filteredActive.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Нет активных игроков
              </CardContent>
            </Card>
          ) : (
            filteredActive.map((reg) => {
              // Calculate table and seat from global seat number
              const playersPerTable = 9; // Default
              const tableNumber = reg.seat_number ? Math.ceil(reg.seat_number / playersPerTable) : null;
              const seatAtTable = reg.seat_number ? ((reg.seat_number - 1) % playersPerTable) + 1 : null;
              
              return (
                <Card key={reg.id} className="hover:shadow-md transition-shadow border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={reg.player.avatar_url || undefined} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {reg.player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium truncate">{reg.player.name}</h3>
                          {tableNumber && seatAtTable && (
                            <Badge variant="outline" className="text-xs font-mono">
                              T{tableNumber} • S{seatAtTable}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {reg.player.elo_rating}
                          </span>
                          {reg.reentries > 0 && (
                            <Badge variant="secondary" className="text-xs bg-purple-500/10 text-purple-500">
                              +{reg.reentries} RE
                            </Badge>
                          )}
                          {reg.additional_sets > 0 && (
                            <Badge variant="secondary" className="text-xs bg-blue-500/10 text-blue-500">
                              +{reg.additional_sets} ADD
                            </Badge>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Editable Chips */}
                        {editingChips === reg.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={editChipsValue}
                              onChange={(e) => setEditChipsValue(e.target.value)}
                              className="w-24 h-8 text-right font-mono"
                              autoFocus
                              onBlur={() => saveChipsEdit(reg.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveChipsEdit(reg.id);
                                if (e.key === 'Escape') setEditingChips(null);
                              }}
                            />
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingChips(reg.id);
                              setEditChipsValue(String(reg.chips || 0));
                            }}
                            className="text-right hover:bg-secondary/50 px-2 py-1 rounded transition-colors"
                          >
                            <p className="text-lg font-bold font-mono">
                              {((reg.chips || 0) / 1000).toFixed(1)}K
                            </p>
                            <p className="text-xs text-muted-foreground">фишек</p>
                          </button>
                        )}

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setEditingChips(reg.id);
                                setEditChipsValue(String(reg.chips || 0));
                              }}
                            >
                              <Edit3 className="w-4 h-4 mr-2" />
                              Редактировать стек
                            </DropdownMenuItem>
                            {canAddon && (
                              <DropdownMenuItem onClick={() => addAddon(reg.id)}>
                                <Plus className="w-4 h-4 mr-2" />
                                Addon (+{(tournament.additional_chips || 5000) / 1000}K)
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => eliminatePlayer(reg.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <UserX className="w-4 h-4 mr-2" />
                              Выбыл
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Pending Players */}
        <TabsContent value="pending" className="space-y-3">
          {pendingPlayers.length > 0 && (
            <Button 
              className="w-full mb-4" 
              onClick={confirmAllPlayers}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Подтвердить всех ({pendingPlayers.length})
            </Button>
          )}
          
          {pendingPlayers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Нет ожидающих игроков
              </CardContent>
            </Card>
          ) : (
            pendingPlayers.map((reg) => (
              <Card key={reg.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reg.player.avatar_url || undefined} />
                      <AvatarFallback className="bg-amber-500/10 text-amber-500">
                        {reg.player.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h3 className="font-medium">{reg.player.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {reg.player.elo_rating} ELO
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => confirmPlayer(reg.id)} disabled={isLoading}>
                        <Check className="w-4 h-4 mr-1" />
                        Подтвердить
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => removeRegistration(reg.id)} disabled={isLoading}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Eliminated Players */}
        <TabsContent value="eliminated" className="space-y-3">
          {eliminatedPlayers.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                Нет выбывших игроков
              </CardContent>
            </Card>
          ) : (
            eliminatedPlayers.map((reg) => {
              const position = reg.final_position || (eliminatedPlayers.indexOf(reg) + 1);
              const isTop3 = position <= 3;
              
              return (
                <Card 
                  key={reg.id} 
                  className={`${
                    position === 1 ? 'border-l-4 border-l-amber-500 bg-amber-500/5' :
                    position === 2 ? 'border-l-4 border-l-gray-400 bg-gray-400/5' :
                    position === 3 ? 'border-l-4 border-l-amber-700 bg-amber-700/5' :
                    ''
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${
                        position === 1 ? 'bg-amber-500/20 text-amber-500' :
                        position === 2 ? 'bg-gray-400/20 text-gray-400' :
                        position === 3 ? 'bg-amber-700/20 text-amber-700' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {position}
                      </div>

                      <Avatar className="h-10 w-10">
                        <AvatarImage src={reg.player.avatar_url || undefined} />
                        <AvatarFallback className={isTop3 ? 'bg-amber-500/10 text-amber-500' : 'bg-red-500/10 text-red-500'}>
                          {reg.player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{reg.player.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {reg.player.elo_rating}
                          </span>
                          {reg.reentries > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{reg.reentries} RE
                            </Badge>
                          )}
                        </div>
                      </div>

                      {canReentry && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => addReentry(reg.id)} 
                          disabled={isLoading}
                          className="border-purple-500/50 text-purple-500 hover:bg-purple-500/10"
                        >
                          <RefreshCw className="w-4 h-4 mr-1" />
                          Re-entry
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}