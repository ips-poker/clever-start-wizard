import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  UserPlus, 
  UserMinus, 
  Trophy, 
  Plus, 
  Minus, 
  RotateCcw, 
  Users,
  AlertTriangle,
  CheckCircle,
  X
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_players: number;
  buy_in: number;
  rebuy_cost: number;
  addon_cost: number;
  rebuy_chips: number;
  addon_chips: number;
  starting_chips: number;
  current_level: number;
  addon_level: number;
}

interface Player {
  id: string;
  name: string;
  email: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url?: string;
}

interface Registration {
  id: string;
  player: Player;
  seat_number: number;
  chips: number;
  status: string;
  rebuys: number;
  addons: number;
  position?: number;
  eliminated_at?: string;
  final_position?: number;
}

interface MobilePlayerManagementProps {
  tournament: Tournament;
  players: Player[];
  registrations: Registration[];
  onRegistrationUpdate: () => void;
}

const MobilePlayerManagement = ({ 
  tournament, 
  players, 
  registrations, 
  onRegistrationUpdate 
}: MobilePlayerManagementProps) => {
  const [playerName, setPlayerName] = useState("");
  const [isAddPlayerDialogOpen, setIsAddPlayerDialogOpen] = useState(false);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isPlayerActionsDialogOpen, setIsPlayerActionsDialogOpen] = useState(false);
  
  const { toast } = useToast();

  const getPlayerAvatar = (playerId: string) => {
    const player = registrations.find(r => r.player.id === playerId);
    if (player?.player.avatar_url) {
      return player.player.avatar_url;
    }
    
    const avatarIndex = Math.abs(playerId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 6 + 1;
    return `/src/assets/avatars/poker-avatar-${avatarIndex}.png`;
  };

  const registerPlayer = async () => {
    if (!playerName.trim()) {
      toast({ title: "Ошибка", description: "Введите имя игрока", variant: "destructive" });
      return;
    }

    if (registrations.length >= tournament.max_players) {
      toast({ title: "Ошибка", description: "Достигнуто максимальное количество игроков", variant: "destructive" });
      return;
    }

    try {
      // Check if player exists
      let { data: existingPlayer, error: playerSearchError } = await supabase
        .from('players')
        .select('*')
        .eq('name', playerName.trim())
        .single();

      let playerId;

      if (playerSearchError && playerSearchError.code === 'PGRST116') {
        // Player not found, create new
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert([{
            name: playerName.trim(),
            email: `${playerName.trim().toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
            elo_rating: 100
          }])
          .select()
          .single();

        if (createError) {
          toast({ title: "Ошибка", description: "Не удалось создать игрока", variant: "destructive" });
          return;
        }
        playerId = newPlayer.id;
      } else if (existingPlayer) {
        // Check if player is already registered
        const existingRegistration = registrations.find(reg => reg.player.id === existingPlayer.id);
        if (existingRegistration) {
          toast({ title: "Ошибка", description: "Игрок уже зарегистрирован", variant: "destructive" });
          return;
        }
        playerId = existingPlayer.id;
      } else {
        toast({ title: "Ошибка", description: "Ошибка при поиске игрока", variant: "destructive" });
        return;
      }

      // Register player for tournament
      const { error: registrationError } = await supabase
        .from('tournament_registrations')
        .insert([{
          tournament_id: tournament.id,
          player_id: playerId,
          chips: tournament.starting_chips,
          status: 'registered'
        }]);

      if (registrationError) {
        toast({ title: "Ошибка", description: "Не удалось зарегистрировать игрока", variant: "destructive" });
      } else {
        toast({ title: "Успех", description: "Игрок зарегистрирован на турнир" });
        setPlayerName("");
        setIsAddPlayerDialogOpen(false);
        onRegistrationUpdate();
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Произошла ошибка при регистрации", variant: "destructive" });
    }
  };

  const updateRebuys = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const newRebuys = Math.max(0, registration.rebuys + change);
    const newChips = registration.chips + (change > 0 ? tournament.rebuy_chips : -tournament.rebuy_chips);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        rebuys: newRebuys,
        chips: Math.max(0, newChips)
      })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить ребаи", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Ребай добавлен" : "Ребай удален", 
        description: `Игрок получил ${change > 0 ? '+' : ''}${change > 0 ? tournament.rebuy_chips : -tournament.rebuy_chips} фишек` 
      });
      onRegistrationUpdate();
    }
  };

  const updateAddons = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const newAddons = Math.max(0, registration.addons + change);
    const newChips = registration.chips + (change > 0 ? tournament.addon_chips : -tournament.addon_chips);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        addons: newAddons,
        chips: Math.max(0, newChips)
      })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить аддоны", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Аддон добавлен" : "Аддон удален", 
        description: `Игрок получил ${change > 0 ? '+' : ''}${change > 0 ? tournament.addon_chips : -tournament.addon_chips} фишек` 
      });
      onRegistrationUpdate();
    }
  };

  const eliminatePlayer = async (registrationId: string) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ status: 'eliminated' })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось исключить игрока", variant: "destructive" });
    } else {
      toast({ title: "Игрок исключен", description: `${registration.player.name} выбыл из турнира` });
      setIsPlayerActionsDialogOpen(false);
      setSelectedRegistration(null);
      onRegistrationUpdate();
    }
  };

  const restorePlayer = async (registrationId: string) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ status: 'registered' })
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось восстановить игрока", variant: "destructive" });
    } else {
      toast({ title: "Игрок восстановлен", description: `${registration.player.name} возвращен в турнир` });
      setIsPlayerActionsDialogOpen(false);
      setSelectedRegistration(null);
      onRegistrationUpdate();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      registered: "default",
      playing: "default", 
      eliminated: "destructive",
      finished: "secondary"
    } as const;

    const labels = {
      registered: "Активен",
      playing: "Играет",
      eliminated: "Выбыл",
      finished: "Завершен"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "secondary"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const activePlayers = registrations.filter(r => r.status === 'registered' || r.status === 'playing' || r.status === 'confirmed');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated');

  return (
    <div className="space-y-4">
      {/* Add Player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Добавить игрока
            </div>
            <Badge variant="secondary">{registrations.length}/{tournament.max_players}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog open={isAddPlayerDialogOpen} onOpenChange={setIsAddPlayerDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="w-full h-12 text-lg"
                disabled={registrations.length >= tournament.max_players}
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Добавить игрока
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Добавить игрока</DialogTitle>
                <DialogDescription>
                  Введите имя игрока для регистрации на турнир
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Имя игрока"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && registerPlayer()}
                />
                <div className="flex gap-2">
                  <Button onClick={registerPlayer} className="flex-1">
                    Добавить
                  </Button>
                  <Button variant="outline" onClick={() => setIsAddPlayerDialogOpen(false)}>
                    Отмена
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Active Players */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Активные игроки ({activePlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activePlayers.map((registration) => (
            <div 
              key={registration.id} 
              className="flex items-center justify-between p-3 border border-border rounded-lg bg-card hover:bg-accent/50 transition-colors"
              onClick={() => {
                setSelectedRegistration(registration);
                setIsPlayerActionsDialogOpen(true);
              }}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={getPlayerAvatar(registration.player.id)} />
                  <AvatarFallback>{registration.player.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{registration.player.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Фишки: {registration.chips?.toLocaleString() || 0}
                    {registration.seat_number && ` • Место: ${registration.seat_number}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {getStatusBadge(registration.status)}
                {(registration.rebuys > 0 || registration.addons > 0) && (
                  <div className="text-xs text-muted-foreground">
                    {registration.rebuys > 0 && `R:${registration.rebuys}`}
                    {registration.addons > 0 && ` A:${registration.addons}`}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {activePlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Нет активных игроков</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eliminated Players */}
      {eliminatedPlayers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserMinus className="h-5 w-5" />
              Выбывшие игроки ({eliminatedPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {eliminatedPlayers
              .sort((a, b) => (a.final_position || 999) - (b.final_position || 999))
              .map((registration) => (
              <div 
                key={registration.id} 
                className="flex items-center justify-between p-3 border border-border rounded-lg bg-muted/30"
                onClick={() => {
                  setSelectedRegistration(registration);
                  setIsPlayerActionsDialogOpen(true);
                }}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10 opacity-60">
                    <AvatarImage src={getPlayerAvatar(registration.player.id)} />
                    <AvatarFallback>{registration.player.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium opacity-80">{registration.player.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {registration.final_position && `Место: ${registration.final_position}`}
                      {registration.eliminated_at && ` • ${new Date(registration.eliminated_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {registration.final_position && (
                    <div className="text-lg font-bold text-muted-foreground">
                      #{registration.final_position}
                    </div>
                  )}
                  {getStatusBadge(registration.status)}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Player Actions Dialog */}
      {selectedRegistration && (
        <Dialog open={isPlayerActionsDialogOpen} onOpenChange={setIsPlayerActionsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={getPlayerAvatar(selectedRegistration.player.id)} />
                  <AvatarFallback>{selectedRegistration.player.name.charAt(0)}</AvatarFallback>
                </Avatar>
                {selectedRegistration.player.name}
              </DialogTitle>
              <DialogDescription>
                Выберите действие для игрока
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Фишки</p>
                  <p className="text-lg font-bold">{selectedRegistration.chips?.toLocaleString() || 0}</p>
                </div>
                <div className="text-center p-3 border border-border rounded-lg">
                  <p className="text-sm text-muted-foreground">Статус</p>
                  {getStatusBadge(selectedRegistration.status)}
                </div>
              </div>

              {selectedRegistration.status !== 'eliminated' && (
                <>
                  {/* Rebuys */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Ребаи ({selectedRegistration.rebuys})</span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateRebuys(selectedRegistration.id, -1)}
                          disabled={selectedRegistration.rebuys <= 0}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateRebuys(selectedRegistration.id, 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Addons */}
                  {tournament.current_level >= (tournament.addon_level || 999) && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Аддоны ({selectedRegistration.addons})</span>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAddons(selectedRegistration.id, -1)}
                            disabled={selectedRegistration.addons <= 0}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAddons(selectedRegistration.id, 1)}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Eliminate Player */}
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => eliminatePlayer(selectedRegistration.id)}
                  >
                    <UserMinus className="w-4 h-4 mr-2" />
                    Исключить игрока
                  </Button>
                </>
              )}

              {selectedRegistration.status === 'eliminated' && (
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => restorePlayer(selectedRegistration.id)}
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Восстановить игрока
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsPlayerActionsDialogOpen(false);
                  setSelectedRegistration(null);
                }}
              >
                Закрыть
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default MobilePlayerManagement;