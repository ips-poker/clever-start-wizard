import React, { useState } from "react";
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
    <div className="space-y-6">
      <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-charcoal">
            <UserPlus className="w-5 h-5" />
            Регистрация игроков
          </CardTitle>
          <CardDescription className="text-poker-silver">
            Зарегистрируйте игроков на турнир "{tournament.name}"
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="player">Игрок</Label>
              <Select value={selectedPlayerId} onValueChange={setSelectedPlayerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Выберите игрока" />
                </SelectTrigger>
                <SelectContent>
                  {availablePlayers.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.name} (RPS: {player.elo_rating})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="seat">Место (опционально)</Label>
              <Input
                id="seat"
                type="number"
                min="1"
                max={tournament.max_players}
                value={seatNumber}
                onChange={(e) => setSeatNumber(e.target.value)}
                placeholder="1-9"
              />
            </div>
            <div>
              <Label htmlFor="chips">Стартовые фишки</Label>
              <Input
                id="chips"
                type="number"
                min="100"
                value={startingChips}
                onChange={(e) => setStartingChips(parseInt(e.target.value))}
              />
            </div>
          </div>
          <Button 
            onClick={registerPlayer} 
            className="w-full bg-poker-charcoal hover:bg-poker-slate text-white transition-all duration-300"
            disabled={!selectedPlayerId || registrations.length >= tournament.max_players}
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Зарегистрировать игрока
          </Button>
        </CardContent>
      </Card>

      <Card className="bg-gradient-glass backdrop-blur-sm border border-white/10 shadow-elegant">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-poker-charcoal">
            <Trophy className="w-5 h-5" />
            Список зарегистрированных игроков
          </CardTitle>
          <CardDescription className="text-poker-silver">
            {registrations.length} из {tournament.max_players} игроков
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {registrations.length === 0 ? (
              <div className="text-center py-8 text-poker-silver">
                <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Нет зарегистрированных игроков</p>
              </div>
            ) : (
              registrations.map((registration) => (
                <div
                  key={registration.id}
                  className="flex items-center justify-between p-4 border border-white/10 rounded-xl bg-gradient-glass backdrop-blur-sm hover:shadow-card transition-all duration-300"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-poker-charcoal rounded-full flex items-center justify-center text-white font-bold">
                      {registration.seat_number || '?'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-poker-charcoal">{registration.player.name}</h4>
                      <div className="flex items-center gap-3 text-sm text-poker-silver">
                        <span>RPS: {registration.player.elo_rating}</span>
                        <span>Фишки: {registration.chips}</span>
                        {getStatusBadge(registration.status)}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => unregisterPlayer(registration.id)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                    disabled={tournament.status === 'running'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayerRegistration;