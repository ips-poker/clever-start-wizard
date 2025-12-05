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
import { Users, UserX, Trophy, Clock, TrendingUp, TrendingDown, Shuffle, Upload, Plus, Minus, X, UserMinus, Trash2, UserCheck } from 'lucide-react';
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

  // Удаление игрока из регистрации (без влияния на призовые места)
  const removeFromRegistration = async (registrationId: string, playerName: string) => {
    const { error } = await supabase
      .from('tournament_registrations')
      .delete()
      .eq('id', registrationId);

    if (error) {
      console.error('Error removing registration:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить регистрацию",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Регистрация удалена",
        description: `${playerName} удален из списка участников`,
      });
      onRegistrationUpdate();
    }
  };

  // Отметить игрока как активного в турнире (пришел и играет)
  const markAsPlaying = async (registrationId: string, playerName: string) => {
    const { error } = await supabase
      .from('tournament_registrations')
      .update({ status: 'playing' })
      .eq('id', registrationId);

    if (error) {
      console.error('Error marking as playing:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить статус",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Статус обновлен",
        description: `${playerName} отмечен как активный участник`,
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
        <TabsList className="grid w-full grid-cols-4 bg-secondary/60 border-2 border-border p-1">
          <TabsTrigger value="overview" className="font-black text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Обзор</TabsTrigger>
          <TabsTrigger value="active" className="font-black text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Активные ({activePlayers.length})</TabsTrigger>
          <TabsTrigger value="eliminated" className="font-black text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Выбывшие ({eliminatedPlayers.length})</TabsTrigger>
          <TabsTrigger value="seating" className="font-black text-xs uppercase data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Рассадка</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Кнопка добавления участников */}
          <div className="flex justify-end">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              disabled={registrations.length >= tournament.max_players}
              className="bg-primary hover:bg-primary/80 text-primary-foreground font-black uppercase"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить участников
            </Button>
          </div>

          {/* Статистика участников */}
          <Card className="bg-card brutal-border overflow-hidden">
            <CardHeader className="bg-secondary/60 border-b-2 border-border">
              <CardTitle className="flex items-center gap-3 text-foreground font-black text-lg">
                <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
                  <Users className="w-5 h-5 text-blue-500" />
                </div>
                СТАТИСТИКА УЧАСТНИКОВ
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-blue-500/10 rounded-xl border-2 border-blue-500/30 text-center">
                  <div className="text-3xl font-black text-blue-500">{registrations.length}</div>
                  <div className="text-xs text-muted-foreground font-bold uppercase mt-1">Всего</div>
                </div>
                <div className="p-4 bg-green-500/10 rounded-xl border-2 border-green-500/30 text-center">
                  <div className="text-3xl font-black text-green-500">{activePlayers.length}</div>
                  <div className="text-xs text-muted-foreground font-bold uppercase mt-1">Активных</div>
                </div>
                <div className="p-4 bg-destructive/10 rounded-xl border-2 border-destructive/30 text-center">
                  <div className="text-3xl font-black text-destructive">{eliminatedPlayers.length}</div>
                  <div className="text-xs text-muted-foreground font-bold uppercase mt-1">Выбыло</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Призовой фонд */}
          <Card className="bg-card brutal-border overflow-hidden">
            <CardHeader className="bg-secondary/60 border-b-2 border-border">
              <CardTitle className="flex items-center gap-3 text-foreground font-black text-lg">
                <div className="p-2 bg-primary/20 rounded-lg border border-primary/30">
                  <Trophy className="w-5 h-5 text-primary" />
                </div>
                ПРИЗОВОЙ ФОНД
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-secondary/40 rounded-lg border border-border">
                  <span className="text-xs text-muted-foreground font-bold uppercase">Орг взносы</span>
                  <span className="text-lg font-black text-foreground">
                    {(tournament.participation_fee * registrations.length).toLocaleString()} ₽
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-500/10 rounded-lg border border-green-500/30">
                  <span className="text-xs text-muted-foreground font-bold uppercase">Повторные входы</span>
                  <span className="text-lg font-black text-green-500">
                    {(tournament.reentry_fee * registrations.reduce((sum, reg) => sum + (reg.reentries || reg.rebuys || 0), 0)).toLocaleString()} ₽
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-blue-500/10 rounded-lg border border-blue-500/30">
                  <span className="text-xs text-muted-foreground font-bold uppercase">Доп наборы</span>
                  <span className="text-lg font-black text-blue-500">
                    {(tournament.additional_fee * registrations.reduce((sum, reg) => sum + (reg.additional_sets || reg.addons || 0), 0)).toLocaleString()} ₽
                  </span>
                </div>
                <div className="border-t-2 border-border pt-3">
                  <div className="flex justify-between items-center p-4 bg-primary/10 rounded-lg border-2 border-primary/30">
                    <span className="text-sm font-black text-foreground uppercase">Общий в RPS</span>
                    <span className="text-2xl font-black text-primary">
                      {formatRPSPoints(totalRPSPool)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Статистика фишек */}
          <Card className="bg-card brutal-border overflow-hidden">
            <CardHeader className="bg-secondary/60 border-b-2 border-border">
              <CardTitle className="flex items-center gap-3 text-foreground font-black text-lg">
                <div className="p-2 bg-purple-500/20 rounded-lg border border-purple-500/30">
                  <TrendingUp className="w-5 h-5 text-purple-500" />
                </div>
                СТАТИСТИКА ФИШЕК
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-purple-500/10 rounded-lg border border-purple-500/30">
                  <span className="text-xs text-muted-foreground font-bold uppercase">Всего фишек</span>
                  <span className="text-lg font-black text-purple-500">
                    {activePlayers.reduce((sum, player) => sum + player.chips, 0).toLocaleString()}
                  </span>
                </div>
                {activePlayers.length > 0 && (
                  <div className="flex justify-between items-center p-3 bg-secondary/40 rounded-lg border border-border">
                    <span className="text-xs text-muted-foreground font-bold uppercase">Средний стек</span>
                    <span className="text-lg font-black text-foreground">
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
              <Card key={registration.id} className="bg-card brutal-border hover:shadow-neon-orange/10 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-xl font-black text-primary w-10 text-center">
                        #{index + 1}
                      </div>
                      <Avatar className="w-12 h-12 border-2 border-border">
                        <AvatarImage src={registration.player.avatar_url} />
                        <AvatarFallback className="bg-secondary text-foreground font-black">
                          {registration.player.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-black text-foreground">{registration.player.name}</h3>
                        <div className="flex items-center space-x-4 text-sm">
                          <span className="text-primary font-bold">{registration.chips.toLocaleString()} фишек</span>
                          <Badge className={`font-bold text-xs ${
                            registration.status === 'playing' 
                              ? 'bg-green-500/20 text-green-500 border-green-500/50' 
                              : 'bg-secondary text-muted-foreground border-border'
                          }`}>
                            {registration.status === 'playing' ? 'В ИГРЕ' : 'ЗАРЕГИСТРИРОВАН'}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-center p-2 bg-secondary/40 rounded-lg border border-border">
                        <div className="text-xs text-muted-foreground font-bold uppercase">Re-entry + Add-on</div>
                        <div className="text-xl font-black text-foreground">
                          {(registration.reentries || registration.rebuys || 0) + (registration.additional_sets || registration.addons || 0)}
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        {/* Кнопка отметки "В игре" */}
                        {registration.status !== 'playing' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsPlaying(registration.id, registration.player.name)}
                            className="h-8 px-2 border-2 border-green-500/50 text-green-500 hover:bg-green-500/20"
                            title="Отметить как активного (пришел)"
                          >
                            <UserCheck className="h-3 w-3 mr-1" />
                            <span className="text-xs font-bold">В игре</span>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReentries(registration.id, 1)}
                          className="h-8 w-8 p-0 border-2 border-green-500/50 text-green-500 hover:bg-green-500/20"
                          title="Добавить повторный вход"
                        >
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateReentries(registration.id, -1)}
                          disabled={(registration.reentries || registration.rebuys || 0) === 0}
                          className="h-8 w-8 p-0 border-2 border-border text-muted-foreground hover:bg-secondary"
                          title="Убрать повторный вход"
                        >
                          <Minus className="h-3 w-3" />
                        </Button>
                        {tournament.current_level === tournament.additional_level && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateAdditionalSets(registration.id, 1)}
                            className="h-8 w-8 p-0 border-2 border-blue-500/50 text-blue-500 hover:bg-blue-500/20"
                            title="Добавить дополнительный набор"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        )}
                        {/* Кнопка исключения (с призовыми местами) */}
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
                          className="h-8 w-8 p-0 border-2 border-destructive/50 text-destructive hover:bg-destructive/20"
                          title="Исключить игрока (с присвоением места)"
                        >
                          <UserMinus className="h-3 w-3" />
                        </Button>
                        {/* Кнопка удаления из регистрации (без призовых) */}
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 border-2 border-orange-500/50 text-orange-500 hover:bg-orange-500/20"
                              title="Удалить из регистрации (без призовых)"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить регистрацию?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Игрок {registration.player.name} будет удален из списка участников без присвоения призового места. Это действие нельзя отменить.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => removeFromRegistration(registration.id, registration.player.name)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Удалить
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
              <Card key={registration.id} className="bg-card/60 brutal-border border-destructive/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="text-xl font-black text-primary w-10 text-center">
                        #{registration.final_position || '?'}
                      </div>
                      <Avatar className="w-12 h-12 border-2 border-border opacity-60">
                        <AvatarImage src={registration.player.avatar_url} />
                        <AvatarFallback className="bg-secondary text-foreground font-black">
                          {registration.player.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="font-black text-foreground/80">{registration.player.name}</h3>
                        <div className="flex items-center space-x-4 text-sm">
                          <Badge className="bg-destructive/20 text-destructive border-destructive/50 font-bold text-xs">
                            ВЫБЫЛ
                          </Badge>
                          {registration.eliminated_at && (
                            <span className="text-muted-foreground text-xs font-bold">
                              {new Date(registration.eliminated_at).toLocaleTimeString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-xs text-muted-foreground font-bold">
                        Re-entry: <span className="text-foreground">{registration.reentries || registration.rebuys || 0}</span>
                      </div>
                      <div className="text-xs text-muted-foreground font-bold">
                        Add-on: <span className="text-foreground">{registration.additional_sets || registration.addons || 0}</span>
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
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-card border-border brutal-border">
          <DialogHeader>
            <DialogTitle className="text-foreground font-black uppercase">Добавить участников</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <Input
                placeholder="Поиск участников..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-secondary/50 border-2 border-border"
              />
              <Badge className="bg-primary/20 text-primary border-primary/50 font-bold">
                Мест: {tournament.max_players - registrations.length}
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
                    className="flex items-center justify-between p-3 border-2 border-border rounded-lg bg-secondary/30 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10 border-2 border-border">
                        <AvatarImage src={player.avatar_url} />
                        <AvatarFallback className="bg-secondary text-foreground font-black text-xs">
                          {player.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-black text-foreground">{player.name}</p>
                        <p className="text-xs text-muted-foreground font-bold">
                          Рейтинг: <span className="text-primary">{player.elo_rating}</span>
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => handleSingleRegistration(player.id)}
                      disabled={registrations.length >= tournament.max_players}
                      className="bg-primary hover:bg-primary/80 text-primary-foreground font-black"
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