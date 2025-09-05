import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  Users, 
  UserMinus, 
  RotateCcw, 
  Search,
  Trophy,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_players: number;
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
  seat_number: number | null;
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
  registrations: Registration[];
  onRegistrationUpdate: () => void;
}

export const MobilePlayerManagement = ({ 
  tournament, 
  registrations, 
  onRegistrationUpdate 
}: MobilePlayerManagementProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPlayer, setSelectedPlayer] = useState<Registration | null>(null);
  const { toast } = useToast();

  const getActivePlayers = () => {
    return registrations.filter(r => 
      r.status === 'registered' || 
      r.status === 'playing' || 
      r.status === 'confirmed' ||
      (!r.status || r.status === 'active')
    );
  };

  const getEliminatedPlayers = () => {
    return registrations.filter(r => r.status === 'eliminated')
      .sort((a, b) => {
        // Сортируем по финальной позиции (1 место первым)
        if (a.final_position && b.final_position) {
          return a.final_position - b.final_position;
        }
        // Если нет финальной позиции, сортируем по времени выбывания (последний выбывший первым)
        if (a.eliminated_at && b.eliminated_at) {
          return new Date(b.eliminated_at).getTime() - new Date(a.eliminated_at).getTime();
        }
        return 0;
      });
  };

  const getPlayerAvatar = (player: Player) => {
    if (player.avatar_url) {
      return player.avatar_url;
    }
    
    const avatarIndex = Math.abs(player.id.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 6 + 1;
    return `/src/assets/avatars/poker-avatar-${avatarIndex}.png`;
  };

  const eliminatePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          status: 'eliminated',
          seat_number: null
        })
        .eq('player_id', playerId)
        .eq('tournament_id', tournament.id);

      if (error) throw error;

      // Пересчитываем финальные позиции
      await supabase.rpc('calculate_final_positions', {
        tournament_id_param: tournament.id
      });

      onRegistrationUpdate();
      setSelectedPlayer(null);
      
      toast({
        title: "Игрок выбыл",
        description: "Игрок исключен из турнира. Позиция рассчитана автоматически."
      });
    } catch (error) {
      console.error('Error eliminating player:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось исключить игрока",
        variant: "destructive"
      });
    }
  };

  const restorePlayer = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ 
          status: 'registered',
          final_position: null,
          eliminated_at: null
        })
        .eq('player_id', playerId)
        .eq('tournament_id', tournament.id);

      if (error) throw error;

      // Пересчитываем финальные позиции для оставшихся выбывших игроков
      await supabase.rpc('calculate_final_positions', {
        tournament_id_param: tournament.id
      });

      onRegistrationUpdate();
      setSelectedPlayer(null);
      
      toast({
        title: "Игрок восстановлен",
        description: "Игрок возвращен в игру"
      });
    } catch (error) {
      console.error('Error restoring player:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось восстановить игрока",
        variant: "destructive"
      });
    }
  };

  const updatePlayerChips = async (playerId: string, newChips: number) => {
    try {
      const { error } = await supabase
        .from('tournament_registrations')
        .update({ chips: newChips })
        .eq('player_id', playerId)
        .eq('tournament_id', tournament.id);

      if (error) throw error;

      onRegistrationUpdate();
      
      toast({
        title: "Фишки обновлены",
        description: `Новое количество фишек: ${newChips.toLocaleString()}`
      });
    } catch (error) {
      console.error('Error updating chips:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить фишки",
        variant: "destructive"
      });
    }
  };

  const activePlayers = getActivePlayers();
  const eliminatedPlayers = getEliminatedPlayers();

  const filteredActivePlayers = activePlayers.filter(reg =>
    reg.player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEliminatedPlayers = eliminatedPlayers.filter(reg =>
    reg.player.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Поиск игроков..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <div>
              <div className="font-semibold">{activePlayers.length}</div>
              <div className="text-xs text-muted-foreground">В игре</div>
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <UserMinus className="h-4 w-4 text-red-600" />
            <div>
              <div className="font-semibold">{eliminatedPlayers.length}</div>
              <div className="text-xs text-muted-foreground">Выбыло</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Players */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            Активные игроки ({filteredActivePlayers.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 max-h-64 overflow-y-auto">
          {filteredActivePlayers.map((registration) => (
            <div 
              key={registration.id}
              className="flex items-center justify-between p-2 bg-secondary/50 rounded-lg"
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getPlayerAvatar(registration.player)} />
                  <AvatarFallback>
                    {registration.player.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {registration.player.name}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {registration.chips.toLocaleString()} фишек
                    {registration.seat_number && (
                      <span className="ml-2">• Место {registration.seat_number}</span>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                onClick={() => setSelectedPlayer(registration)}
                size="sm"
                variant="destructive"
              >
                <UserMinus className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          {filteredActivePlayers.length === 0 && (
            <div className="text-center text-muted-foreground py-4">
              {searchTerm ? 'Игроки не найдены' : 'Нет активных игроков'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Eliminated Players */}
      {eliminatedPlayers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              Выбывшие игроки ({filteredEliminatedPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-64 overflow-y-auto">
            {filteredEliminatedPlayers.map((registration) => (
              <div 
                key={registration.id}
                className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Avatar className="h-8 w-8 opacity-60">
                    <AvatarImage src={getPlayerAvatar(registration.player)} />
                    <AvatarFallback>
                      {registration.player.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-1">
                      {registration.final_position && (
                        <Badge variant="outline" className="text-xs px-1 py-0">
                          #{registration.final_position}
                        </Badge>
                      )}
                      {registration.player.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {registration.eliminated_at && (
                        <>Выбыл: {new Date(registration.eliminated_at).toLocaleTimeString()}</>
                      )}
                    </div>
                  </div>
                </div>
                
                <Button
                  onClick={() => setSelectedPlayer(registration)}
                  size="sm"
                  variant="outline"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              </div>
            ))}
            
            {filteredEliminatedPlayers.length === 0 && searchTerm && (
              <div className="text-center text-muted-foreground py-4">
                Игроки не найдены
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Player Action Dialog */}
      <Dialog open={!!selectedPlayer} onOpenChange={() => setSelectedPlayer(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={selectedPlayer ? getPlayerAvatar(selectedPlayer.player) : undefined} />
                <AvatarFallback>
                  {selectedPlayer?.player.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              {selectedPlayer?.player.name}
            </DialogTitle>
            <DialogDescription>
              {selectedPlayer?.status === 'eliminated' ? 'Выбывший игрок' : 'Активный игрок'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedPlayer && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <div>Фишки: {selectedPlayer.chips.toLocaleString()}</div>
                {selectedPlayer.seat_number && (
                  <div>Место: {selectedPlayer.seat_number}</div>
                )}
                {selectedPlayer.final_position && (
                  <div>Позиция в турнире: #{selectedPlayer.final_position}</div>
                )}
                <div>Ребаи: {selectedPlayer.rebuys}</div>
                <div>Аддоны: {selectedPlayer.addons}</div>
              </div>
              
              <div className="space-y-2">
                {selectedPlayer.status === 'eliminated' ? (
                  <Button
                    onClick={() => restorePlayer(selectedPlayer.player.id)}
                    className="w-full"
                    variant="default"
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Вернуть в игру
                  </Button>
                ) : (
                  <Button
                    onClick={() => eliminatePlayer(selectedPlayer.player.id)}
                    className="w-full"
                    variant="destructive"
                  >
                    <UserMinus className="h-4 w-4 mr-2" />
                    Исключить из турнира
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};