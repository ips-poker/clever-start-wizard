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
import { Users, UserX, Trophy, Clock, TrendingUp, TrendingDown, Shuffle, Upload, Plus, Minus, X, UserMinus } from 'lucide-react';
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
  rebuys?: number; // Старое поле для обратной совместимости
  addons?: number; // Старое поле для обратной совместимости
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

    // Используем и старое и новое поле для совместимости
    const currentReentries = registration.reentries || registration.rebuys || 0;
    const newReentries = Math.max(0, currentReentries + change);
    const chipsChange = change > 0 ? tournament.reentry_chips : -tournament.reentry_chips;
    const newChips = Math.max(0, registration.chips + chipsChange);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({
        reentries: newReentries,
        rebuys: newReentries, // Дублируем в старое поле для совместимости
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

    // Используем и старое и новое поле для совместимости
    const currentAdditionalSets = registration.additional_sets || registration.addons || 0;
    const newAdditionalSets = Math.max(0, currentAdditionalSets + change);
    const chipsChange = change > 0 ? tournament.additional_chips : -tournament.additional_chips;
    const newChips = Math.max(0, registration.chips + chipsChange);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({
        additional_sets: newAdditionalSets,
        addons: newAdditionalSets, // Дублируем в старое поле для совместимости
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
    registrations.reduce((sum, reg) => sum + (reg.reentries || reg.rebuys || 0), 0),
    tournament.reentry_fee,
    registrations.reduce((sum, reg) => sum + (reg.additional_sets || reg.addons || 0), 0),
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

        <TabsContent value="overview" className="space-y-6">
          {/* Кнопка добавления участников */}
          <div className="flex justify-end">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              disabled={registrations.length >= tournament.max_players}
              size="default"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить участников
            </Button>
          </div>

          {/* Статистика участников */}
          <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
              <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                <div className="p-2 bg-blue-500/10 rounded-xl">
                  <Users className="w-5 h-5 text-blue-600" />
                </div>
                Статистика участников
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50/50 rounded-xl text-center">
                  <div className="text-3xl font-light text-blue-600">{registrations.length}</div>
                  <div className="text-sm text-slate-500 font-light mt-1">Всего игроков</div>
                </div>
                <div className="p-4 bg-green-50/50 rounded-xl text-center">
                  <div className="text-3xl font-light text-green-600">{activePlayers.length}</div>
                  <div className="text-sm text-slate-500 font-light mt-1">Активных</div>
                </div>
                <div className="p-4 bg-red-50/50 rounded-xl text-center">
                  <div className="text-3xl font-light text-red-600">{eliminatedPlayers.length}</div>
                  <div className="text-sm text-slate-500 font-light mt-1">Выбыло</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Призовой фонд */}
          <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-b border-emerald-100">
              <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                <div className="p-2 bg-emerald-500/10 rounded-xl">
                  <Trophy className="w-5 h-5 text-emerald-600" />
                </div>
                Призовой фонд
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-slate-50/50 rounded-xl">
                  <span className="text-sm text-slate-600 font-light">Орг взносы</span>
                  <span className="text-lg font-medium text-slate-800">
                    {(tournament.participation_fee * registrations.length).toLocaleString()} ₽
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50/50 rounded-xl">
                  <span className="text-sm text-slate-600 font-light">Повторные входы</span>
                  <span className="text-lg font-medium text-green-600">
                    {(tournament.reentry_fee * registrations.reduce((sum, reg) => sum + (reg.reentries || reg.rebuys || 0), 0)).toLocaleString()} ₽
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-50/50 rounded-xl">
                  <span className="text-sm text-slate-600 font-light">Доп наборы</span>
                  <span className="text-lg font-medium text-blue-600">
                    {(tournament.additional_fee * registrations.reduce((sum, reg) => sum + (reg.additional_sets || reg.addons || 0), 0)).toLocaleString()} ₽
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between items-center p-3 bg-emerald-50/50 rounded-xl">
                    <span className="text-base font-medium text-slate-800">Общий призовой в баллах RPS</span>
                    <span className="text-2xl font-light text-emerald-600">
                      {formatRPSPoints(totalRPSPool)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Статистика фишек */}
          <Card className="bg-white/80 backdrop-blur-sm border border-slate-200/50 shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-indigo-50 to-indigo-100/50 border-b border-indigo-100">
              <CardTitle className="flex items-center gap-3 text-slate-800 font-light text-xl">
                <div className="p-2 bg-indigo-500/10 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                </div>
                Статистика фишек
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl">
                  <span className="text-sm text-slate-600 font-light">Всего фишек в игре</span>
                  <span className="text-lg font-medium text-indigo-600">
                    {activePlayers.reduce((sum, player) => sum + player.chips, 0).toLocaleString()}
                  </span>
                </div>
                {activePlayers.length > 0 && (
                  <div className="flex justify-between items-center p-3 bg-purple-50/50 rounded-xl">
                    <span className="text-sm text-slate-600 font-light">Средний стек</span>
                    <span className="text-lg font-medium text-purple-600">
                      {Math.round(activePlayers.reduce((sum, player) => sum + player.chips, 0) / activePlayers.length).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
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
                          {(registration.reentries || registration.rebuys || 0) + (registration.additional_sets || registration.addons || 0)}
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
                            disabled={(registration.reentries || registration.rebuys || 0) === 0}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            const { error } = await supabase.rpc('redistribute_chips_on_elimination', {
                              eliminated_player_id: registration.player.id,
                              tournament_id_param: tournament.id
                            });
                            if (error) {
                              toast({
                                title: "Ошибка",
                                description: "Не удалось исключить игрока",
                                variant: "destructive",
                              });
                            } else {
                              toast({
                                title: "Игрок исключен",
                                description: `${registration.player.name} выбыл из турнира`,
                              });
                              onRegistrationUpdate();
                            }
                          }}
                          className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                          title="Исключить игрока"
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
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
                        Повторных входов: {registration.reentries || registration.rebuys || 0}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Доп. наборов: {registration.additional_sets || registration.addons || 0}
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
            tournamentId={tournament.id}
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