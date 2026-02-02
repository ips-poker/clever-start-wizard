import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Loader2
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
  const [newPlayerName, setNewPlayerName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const activePlayers = registrations.filter(r => r.status === 'playing');
  const pendingPlayers = registrations.filter(r => r.status === 'registered');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated')
    .sort((a, b) => (b.chips || 0) - (a.chips || 0));

  const filteredActive = activePlayers.filter(r =>
    r.player.name.toLowerCase().includes(search.toLowerCase())
  );

  const canReentry = tournament.reentry_end_level 
    ? tournament.current_level <= tournament.reentry_end_level 
    : false;
  
  const canAddon = tournament.additional_level 
    ? tournament.current_level === tournament.additional_level 
    : false;

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
      // Create player
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({ name: newPlayerName.trim() })
        .select()
        .single();

      if (playerError) throw playerError;

      // Register to tournament
      const { error: regError } = await supabase
        .from('tournament_registrations')
        .insert({
          tournament_id: tournament.id,
          player_id: player.id,
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
      {/* Header */}
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
          <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Добавить
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить игрока</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <Input
                  value={newPlayerName}
                  onChange={(e) => setNewPlayerName(e.target.value)}
                  placeholder="Имя игрока"
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
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-green-500/10 border-green-500/20">
          <CardContent className="py-4 text-center">
            <UserCheck className="w-6 h-6 mx-auto mb-1 text-green-500" />
            <p className="text-2xl font-bold">{activePlayers.length}</p>
            <p className="text-xs text-muted-foreground">Активных</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-500/10 border-amber-500/20">
          <CardContent className="py-4 text-center">
            <Clock className="w-6 h-6 mx-auto mb-1 text-amber-500" />
            <p className="text-2xl font-bold">{pendingPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Ожидают</p>
          </CardContent>
        </Card>
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="py-4 text-center">
            <UserX className="w-6 h-6 mx-auto mb-1 text-red-500" />
            <p className="text-2xl font-bold">{eliminatedPlayers.length}</p>
            <p className="text-xs text-muted-foreground">Выбыло</p>
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
            filteredActive.map((reg) => (
              <Card key={reg.id} className="hover:shadow-md transition-shadow">
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
                        {reg.seat_number && (
                          <Badge variant="outline" className="text-xs">
                            Место {reg.seat_number}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span>{reg.player.elo_rating} ELO</span>
                        {reg.reentries > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{reg.reentries} re-entry
                          </Badge>
                        )}
                        {reg.additional_sets > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            +{reg.additional_sets} addon
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className="text-lg font-bold">
                          {((reg.chips || 0) / 1000).toFixed(1)}K
                        </p>
                        <p className="text-xs text-muted-foreground">фишек</p>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => eliminatePlayer(reg.id)}>
                            <UserX className="w-4 h-4 mr-2" />
                            Выбыл
                          </DropdownMenuItem>
                          {canAddon && (
                            <DropdownMenuItem onClick={() => addAddon(reg.id)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Addon (+{(tournament.additional_chips || 5000) / 1000}K)
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
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
            eliminatedPlayers.map((reg, index) => (
              <Card key={reg.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
                      {eliminatedPlayers.length - index}
                    </div>

                    <Avatar className="h-10 w-10">
                      <AvatarImage src={reg.player.avatar_url || undefined} />
                      <AvatarFallback className="bg-red-500/10 text-red-500">
                        {reg.player.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h3 className="font-medium">{reg.player.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {reg.player.elo_rating} ELO
                      </p>
                    </div>

                    {canReentry && (
                      <Button size="sm" variant="outline" onClick={() => addReentry(reg.id)} disabled={isLoading}>
                        <RefreshCw className="w-4 h-4 mr-1" />
                        Re-entry
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}