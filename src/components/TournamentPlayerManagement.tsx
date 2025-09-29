import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Users, UserX, Trophy, Clock, TrendingUp, TrendingDown, Shuffle, Upload, Plus, Minus, X } from 'lucide-react';
import { calculateTotalRPSPool, formatRPSPoints, formatParticipationFee } from '@/utils/rpsCalculations';
import TableSeating from './TableSeating';

interface Tournament {
  id: string;
  name: string;
  participation_fee: number; // Организационный взнос
  starting_chips: number;
  reentry_chips: number;
  additional_chips: number;
  reentry_fee: number; // Стоимость повторного входа
  additional_fee: number; // Стоимость дополнительного набора
  max_players: number;
  current_level: number;
  reentry_end_level?: number; // До какого уровня доступен повторный вход
  additional_level?: number; // На каком уровне доступен дополнительный набор
  status: string;
}

interface Player {
  id: string;
  name: string;
  email?: string;
  elo_rating: number;
  avatar_url?: string;
}

interface Registration {
  id: string;
  player: Player;
  chips: number;
  reentries: number; // Количество повторных входов
  additional_sets: number; // Количество дополнительных наборов
  status: string;
  position?: number;
  seat_number?: number;
  eliminated_at?: string;
  final_position?: number;
}

interface TournamentPlayerManagementProps {
  tournament: Tournament;
  players: Player[];
  registrations: Registration[];
  onRegistrationUpdate: () => void;
}

const TournamentPlayerManagement = ({ tournament, players, registrations, onRegistrationUpdate }: TournamentPlayerManagementProps) => {
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [manualPlayerName, setManualPlayerName] = useState('');
  const [manualPlayerEmail, setManualPlayerEmail] = useState('');
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [seatConfiguration, setSeatConfiguration] = useState<{[key: string]: number}>({});
  const { toast } = useToast();

  const availablePlayers = players.filter(p => 
    !registrations.find(r => r.player.id === p.id)
  );

  const activePlayers = registrations.filter(r => 
    r.status === 'registered' || r.status === 'playing'
  );

  const eliminatedPlayers = registrations
    .filter(r => r.status === 'eliminated')
    .sort((a, b) => (b.final_position || 0) - (a.final_position || 0));

  const handleSingleRegistration = async (playerId: string) => {
    const player = availablePlayers.find(p => p.id === playerId);
    if (!player) return;

    if (registrations.length >= tournament.max_players) {
      toast({
        title: "Мероприятие заполнено",
        description: `Максимальное количество участников: ${tournament.max_players}`,
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from('tournament_registrations')
      .insert([{
        tournament_id: tournament.id,
        player_id: playerId,
        chips: tournament.starting_chips,
        status: 'registered'
      }]);

    if (error) {
      console.error('Registration error:', error);
      toast({
        title: "Ошибка регистрации",
        description: "Не удалось зарегистрировать участника",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Участник зарегистрирован",
        description: `${player.name} успешно зарегистрирован на мероприятие`,
      });
      onRegistrationUpdate();
    }
  };

  const handleBulkRegistration = async () => {
    if (selectedPlayers.length === 0) return;

    const availableSlots = tournament.max_players - registrations.length;
    if (selectedPlayers.length > availableSlots) {
      toast({
        title: "Недостаточно мест",
        description: `Доступно только ${availableSlots} мест`,
        variant: "destructive",
      });
      return;
    }

    const registrationData = selectedPlayers.map(playerId => ({
      tournament_id: tournament.id,
      player_id: playerId,
      chips: tournament.starting_chips,
      status: 'registered'
    }));

    const { error } = await supabase
      .from('tournament_registrations')
      .insert(registrationData);

    if (error) {
      console.error('Bulk registration error:', error);
      toast({
        title: "Ошибка регистрации",
        description: "Не удалось зарегистрировать участников",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Участники зарегистрированы",
        description: `Зарегистрировано ${selectedPlayers.length} участников`,
      });
      setSelectedPlayers([]);
      setIsAddModalOpen(false);
      onRegistrationUpdate();
    }
  };

  const updateReentries = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const newReentries = Math.max(0, registration.reentries + change);
    const chipsChange = change > 0 ? tournament.reentry_chips : -tournament.reentry_chips;
    const newChips = Math.max(0, registration.chips + chipsChange);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({
        rebuys: newReentries, // Временно используем старое поле
        chips: newChips
      })
      .eq('id', registrationId);

    if (error) {
      console.error('Error updating reentries:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить повторные входы",
        variant: "destructive",
      });
    } else {
      toast({
        title: change > 0 ? "Повторный вход добавлен" : "Повторный вход удален", 
        description: change > 0 ? "Участник получил дополнительный инвентарь" : "Инвентарь убран",
      });
      onRegistrationUpdate();
    }
  };

  const updateAdditionalSets = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const newAdditionalSets = Math.max(0, registration.additional_sets + change);
    const chipsChange = change > 0 ? tournament.additional_chips : -tournament.additional_chips;
    const newChips = Math.max(0, registration.chips + chipsChange);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({
        addons: newAdditionalSets, // Временно используем старое поле
        chips: newChips
      })
      .eq('id', registrationId);

    if (error) {
      console.error('Error updating additional sets:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить дополнительные наборы",
        variant: "destructive",
      });
    } else {
      toast({
        title: change > 0 ? "Дополнительный набор добавлен" : "Дополнительный набор удален", 
        description: change > 0 ? "Участник получил дополнительный инвентарь" : "Инвентарь убран",
      });
      onRegistrationUpdate();
    }
  };

  const totalRPSPool = calculateTotalRPSPool(
    registrations.length,
    tournament.participation_fee,
    registrations.reduce((sum, reg) => sum + reg.reentries, 0),
    tournament.reentry_fee,
    registrations.reduce((sum, reg) => sum + reg.additional_sets, 0),
    tournament.additional_fee
  );

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="active">Активные ({activePlayers.length})</TabsTrigger>
          <TabsTrigger value="eliminated">Выбывшие ({eliminatedPlayers.length})</TabsTrigger>
          <TabsTrigger value="seating">Рассадка</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Участники</p>
                    <p className="text-2xl font-bold">{registrations.length}/{tournament.max_players}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Активные</p>
                    <p className="text-2xl font-bold">{activePlayers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <UserX className="w-5 h-5 text-red-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Выбывшие</p>
                    <p className="text-2xl font-bold">{eliminatedPlayers.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Trophy className="w-5 h-5 text-amber-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Фонд RPS</p>
                    <p className="text-lg font-bold">{formatRPSPoints(totalRPSPool)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Статистика участников</span>
                  <Button
                    onClick={() => setIsAddModalOpen(true)}
                    disabled={registrations.length >= tournament.max_players}
                    size="sm"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Добавить участников
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600">Повторные входы:</span>
                    <span className="font-medium">
                      {registrations.reduce((sum, reg) => sum + reg.reentries, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600">Дополнительные наборы:</span>
                    <span className="font-medium">
                      {registrations.reduce((sum, reg) => sum + reg.additional_sets, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-600">Средний инвентарь:</span>
                    <span className="font-medium">
                      {registrations.length > 0 
                        ? Math.round(registrations.reduce((sum, reg) => sum + reg.chips, 0) / registrations.length).toLocaleString()
                        : 0
                      } фишек
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Trophy className="w-5 h-5 mr-2" />
                  Фонд RPS баллов
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">Организационные взносы:</span>
                    <span className="font-medium text-primary">
                      {formatRPSPoints(calculateTotalRPSPool(registrations.length, tournament.participation_fee, 0, 0, 0, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">Повторные входы:</span>
                    <span className="font-medium text-primary">
                      {formatRPSPoints(calculateTotalRPSPool(0, 0, registrations.reduce((sum, reg) => sum + reg.reentries, 0), tournament.reentry_fee, 0, 0))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-600">Дополнительные наборы:</span>
                    <span className="font-medium text-primary">
                      {formatRPSPoints(calculateTotalRPSPool(0, 0, 0, 0, registrations.reduce((sum, reg) => sum + reg.additional_sets, 0), tournament.additional_fee))}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between items-center">
                      <span className="text-base font-medium">Общий фонд RPS:</span>
                      <span className="text-xl font-bold text-primary">
                        {formatRPSPoints(totalRPSPool)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4">
            {activePlayers.map((registration, index) => (
              <Card key={registration.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-bold text-slate-500 w-8">
                        #{index + 1}
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={registration.player.avatar_url} />
                        <AvatarFallback>
                          {registration.player.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{registration.player.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Инвентарь: {registration.chips.toLocaleString()}</span>
                          <Badge variant={registration.status === 'playing' ? 'default' : 'secondary'}>
                            {registration.status === 'playing' ? 'В игре' : 'Зарегистрирован'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-xs text-slate-500 mb-1">Повторные входы + Доп. наборы</div>
                        <div className="text-lg font-light text-slate-800">
                          {registration.reentries + registration.additional_sets}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReentries(registration.id, 1)}
                          className="h-8 w-8 p-0"
                          title="Добавить повторный вход"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReentries(registration.id, -1)}
                          disabled={registration.reentries === 0}
                          className="h-8 w-8 p-0"
                          title="Убрать повторный вход"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        {tournament.current_level === tournament.additional_level && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAdditionalSets(registration.id, 1)}
                            className="h-8 w-8 p-0 mr-1"
                            title="Добавить дополнительный набор"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="eliminated" className="space-y-4">
          <div className="grid gap-4">
            {eliminatedPlayers.map((registration) => (
              <Card key={registration.id} className="opacity-75">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-lg font-bold text-amber-600 w-8">
                        #{registration.final_position || '?'}
                      </div>
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={registration.player.avatar_url} />
                        <AvatarFallback>
                          {registration.player.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-semibold">{registration.player.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <Badge variant="destructive">Выбыл</Badge>
                          {registration.eliminated_at && (
                            <span>
                              {new Date(registration.eliminated_at).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">
                        Повторных входов: {registration.reentries}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Доп. наборов: {registration.additional_sets}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="seating">
          <TableSeating 
            registrations={activePlayers}
            onSeatingUpdate={onRegistrationUpdate}
          />
        </TabsContent>
      </Tabs>

      {/* Модальное окно добавления участников */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Добавить участников в мероприятие</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Поиск участников..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Badge variant="outline">
                Доступно мест: {tournament.max_players - registrations.length}
              </Badge>
            </div>

            <div className="grid gap-2 max-h-60 overflow-y-auto">
              {availablePlayers
                .filter(player =>
                  player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  player.email?.toLowerCase().includes(searchTerm.toLowerCase())
                )
                .map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={player.avatar_url} />
                        <AvatarFallback>
                          {player.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{player.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Рейтинг: {player.elo_rating}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSingleRegistration(player.id)}
                      disabled={registrations.length >= tournament.max_players}
                    >
                      Добавить
                    </Button>
                  </div>
                ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TournamentPlayerManagement;