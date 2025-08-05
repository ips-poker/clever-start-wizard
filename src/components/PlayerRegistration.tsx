import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Trash2, Trophy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
}

interface Registration {
  id: string;
  player: Player;
  seat_number: number;
  chips: number;
  status: string;
}

interface PlayerRegistrationProps {
  tournament: Tournament;
  players: Player[];
  registrations: Registration[];
  onRegistrationUpdate: () => void;
}

const PlayerRegistration = ({ tournament, players, registrations, onRegistrationUpdate }: PlayerRegistrationProps) => {
  const [selectedPlayerId, setSelectedPlayerId] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [startingChips, setStartingChips] = useState(1000);
  const { toast } = useToast();

  const registerPlayer = async () => {
    if (!selectedPlayerId) {
      toast({ title: "Ошибка", description: "Выберите игрока", variant: "destructive" });
      return;
    }

    // Check if player already registered
    const existingRegistration = registrations.find(reg => reg.player.id === selectedPlayerId);
    if (existingRegistration) {
      toast({ title: "Ошибка", description: "Игрок уже зарегистрирован", variant: "destructive" });
      return;
    }

    // Check max players
    if (registrations.length >= tournament.max_players) {
      toast({ title: "Ошибка", description: "Достигнуто максимальное количество игроков", variant: "destructive" });
      return;
    }

    const { error } = await supabase
      .from('tournament_registrations')
      .insert([{
        tournament_id: tournament.id,
        player_id: selectedPlayerId,
        seat_number: seatNumber ? parseInt(seatNumber) : null,
        chips: startingChips,
        status: 'registered'
      }]);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось зарегистрировать игрока", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: "Игрок зарегистрирован на турнир" });
      setSelectedPlayerId("");
      setSeatNumber("");
      onRegistrationUpdate();
    }
  };

  const unregisterPlayer = async (registrationId: string) => {
    const { error } = await supabase
      .from('tournament_registrations')
      .delete()
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось отменить регистрацию", variant: "destructive" });
    } else {
      toast({ title: "Успех", description: "Регистрация отменена" });
      onRegistrationUpdate();
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      registered: "default",
      playing: "destructive",
      eliminated: "secondary",
      finished: "outline"
    } as const;

    const labels = {
      registered: "Зарегистрирован",
      playing: "Играет",
      eliminated: "Выбыл",
      finished: "Завершил"
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || "default"}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const availablePlayers = players.filter(player => 
    !registrations.some(reg => reg.player.id === player.id)
  );

  return (
    <div className="min-h-screen bg-slate-50 space-y-6">
      {/* Регистрация игроков в стиле приглашений */}
      <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
        style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
      >
        <CardContent className="p-0">
          {/* Минимальные акцентные линии */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-900/20 to-transparent"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-900/10 to-transparent"></div>

          <div className="relative p-6">
            {/* Заголовок в стиле приглашений */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-semibold text-lg tracking-tight text-slate-900">PLAYER REGISTRATION</div>
                  <div className="text-xs text-slate-500 font-medium">Tournament: {tournament.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-slate-900 text-white text-xs font-semibold px-3 py-1 rounded-full tracking-wide">
                  {registrations.length}/{tournament.max_players} PLAYERS
                </div>
              </div>
            </div>

            {/* Статистические блоки */}
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center py-4">
                  <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Registered</div>
                  <div className="text-3xl font-light text-slate-900">{registrations.length}</div>
                </div>
                <div className="text-center py-4">
                  <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Available</div>
                  <div className="text-3xl font-light text-slate-900">{tournament.max_players - registrations.length}</div>
                </div>
              </div>
              
              <div className="w-full h-px bg-slate-200 my-4"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="player" className="text-slate-700 text-sm font-medium">Игрок</Label>
                  <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                    <SelectTrigger className="bg-white border-slate-200">
                      <SelectValue placeholder="Выберите игрока" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlayers.map((player) => (
                        <SelectItem key={player.id} value={player.id}>
                          {player.name} (ELO: {player.elo_rating})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="seat" className="text-slate-700 text-sm font-medium">Место (опционально)</Label>
                  <Input
                    id="seat"
                    type="number"
                    min="1"
                    max={tournament.max_players}
                    value={seatNumber}
                    onChange={(e) => setSeatNumber(e.target.value)}
                    placeholder="1-9"
                    className="bg-white border-slate-200"
                  />
                </div>
                <div>
                  <Label htmlFor="chips" className="text-slate-700 text-sm font-medium">Стартовые фишки</Label>
                  <Input
                    id="chips"
                    type="number"
                    min="100"
                    value={startingChips}
                    onChange={(e) => setStartingChips(parseInt(e.target.value))}
                    className="bg-white border-slate-200"
                  />
                </div>
              </div>
              <Button 
                onClick={registerPlayer} 
                className="w-full mt-4 bg-slate-900 text-white hover:bg-slate-700 px-6 py-3 rounded-lg font-medium text-sm tracking-wide transition-all"
                disabled={!selectedPlayerId || registrations.length >= tournament.max_players}
              >
                <UserPlus className="w-4 h-4 mr-2" />
                REGISTER PLAYER
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Список игроков в стиле приглашений */}
      <Card className="w-full bg-white border border-slate-200 shadow-[0_20px_25px_-5px_rgba(0,0,0,0.06),0_10px_10px_-5px_rgba(0,0,0,0.04)]"
        style={{ background: 'linear-gradient(145deg, #ffffff 0%, #f9fafb 100%)' }}
      >
        <CardContent className="p-0">
          <div className="relative p-6">
            <div className="text-center mb-6">
              <div className="text-slate-500 text-xs font-medium mb-1 tracking-wide uppercase">Registered Players</div>
              <div className="text-lg font-light text-slate-900">{registrations.length} of {tournament.max_players} players</div>
            </div>
            
            <div className="w-full h-px bg-slate-200 mb-6"></div>
            
            <div className="space-y-3">
              {registrations.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                  <div className="text-slate-500 text-sm font-medium">No registered players</div>
                </div>
              ) : (
                registrations.map((registration) => (
                  <div
                    key={registration.id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all duration-300"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold text-sm">
                        {registration.seat_number || '?'}
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">{registration.player.name}</div>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span>ELO: {registration.player.elo_rating}</span>
                          <span>Chips: {registration.chips}</span>
                          {getStatusBadge(registration.status)}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => unregisterPlayer(registration.id)}
                      className="bg-white border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                      disabled={tournament.status === 'running'}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerRegistration;