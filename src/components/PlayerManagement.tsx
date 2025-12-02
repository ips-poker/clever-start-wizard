import React, { useState, useEffect, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useVoiceAnnouncements } from "@/hooks/useVoiceAnnouncements";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TableSeating from "@/components/TableSeating";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { 
  UserPlus, 
  Trophy, 
  Plus, 
  Minus, 
  RotateCcw, 
  Users, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Upload,
  X,
  Crown,
  Medal,
  Star,
  Coins,
  Target,
  Zap,
  Activity,
  UserX,
  Grid3X3
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
  tournament_format: string;
  current_level: number;
  addon_level: number;
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
  reentry_chips?: number;
  additional_chips?: number;
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
  reentries: number;
  additional_sets: number;
  position?: number;
  rebuys?: number;
  addons?: number;
}

interface PlayerManagementProps {
  tournament: Tournament;
  players: Player[];
  registrations: Registration[];
  onRegistrationUpdate: () => void;
}

const PlayerManagement = ({ tournament, players, registrations, onRegistrationUpdate }: PlayerManagementProps) => {
  const [playerName, setPlayerName] = useState("");
  const [playerPhone, setPlayerPhone] = useState("");
  const [playerTelegram, setPlayerTelegram] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [startingChips, setStartingChips] = useState(tournament.starting_chips || 10000);
  const [bulkPlayersList, setBulkPlayersList] = useState("");
  const { toast } = useToast();
  const isMountedRef = useRef(true);

  const voiceAnnouncements = useVoiceAnnouncements({ enabled: true });

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setStartingChips(tournament.starting_chips || 10000);
  }, [tournament.starting_chips]);

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
      let { data: existingPlayer, error: playerSearchError } = await supabase
        .from('players')
        .select('*')
        .eq('name', playerName.trim())
        .single();

      let playerId;

      if (playerSearchError && playerSearchError.code === 'PGRST116') {
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert([{
            name: playerName.trim(),
            email: `${playerName.trim().toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
            phone: playerPhone.trim() || null,
            telegram: playerTelegram.trim() || null,
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

      const { error: registrationError } = await supabase
        .from('tournament_registrations')
        .insert([{
          tournament_id: tournament.id,
          player_id: playerId,
          seat_number: seatNumber ? parseInt(seatNumber) : null,
          chips: startingChips,
          status: 'registered'
        }]);

      if (registrationError) {
        toast({ title: "Ошибка", description: "Не удалось зарегистрировать игрока", variant: "destructive" });
      } else {
        toast({ title: "Успех", description: "Игрок зарегистрирован на турнир" });
        setPlayerName("");
        setPlayerPhone("");
        setPlayerTelegram("");
        setSeatNumber("");
        onRegistrationUpdate();
      }
    } catch (error) {
      toast({ title: "Ошибка", description: "Произошла ошибка при регистрации", variant: "destructive" });
    }
  };

  const bulkRegisterPlayers = async () => {
    if (!bulkPlayersList.trim()) {
      toast({ title: "Ошибка", description: "Введите список игроков", variant: "destructive" });
      return;
    }

    const playerNames = bulkPlayersList.trim().split('\n').filter(name => name.trim());
    let registered = 0;
    let failed = 0;

    for (const playerNameInput of playerNames) {
      const name = playerNameInput.trim();
      if (!name) continue;

      try {
        let { data: existingPlayer, error: playerSearchError } = await supabase
          .from('players')
          .select('*')
          .eq('name', name)
          .single();

        let playerId;

        if (playerSearchError && playerSearchError.code === 'PGRST116') {
          const { data: newPlayer, error: createError } = await supabase
            .from('players')
            .insert([{
              name: name,
              email: `${name.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
              phone: null,
              telegram: null,
              elo_rating: 100
            }])
            .select()
            .single();

          if (createError) {
            failed++;
            continue;
          }
          playerId = newPlayer.id;
        } else if (existingPlayer) {
          const existingRegistration = registrations.find(reg => reg.player.id === existingPlayer.id);
          if (existingRegistration) {
            failed++;
            continue;
          }
          playerId = existingPlayer.id;
        } else {
          failed++;
          continue;
        }

        if (registrations.length + registered >= tournament.max_players) {
          break;
        }

        const { error: registrationError } = await supabase
          .from('tournament_registrations')
          .insert([{
            tournament_id: tournament.id,
            player_id: playerId,
            chips: startingChips,
            status: 'registered'
          }]);

        if (!registrationError) {
          registered++;
        } else {
          failed++;
        }
      } catch (error) {
        failed++;
      }
    }

    toast({ 
      title: "Массовая регистрация завершена", 
      description: `Зарегистрировано: ${registered}, Ошибок: ${failed}` 
    });
    setBulkPlayersList("");
    onRegistrationUpdate();
  };

  const updateRebuys = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const reentryChips = tournament.reentry_chips || tournament.rebuy_chips || 0;
    const useNewFields = tournament.participation_fee !== undefined;
    const currentCount = useNewFields ? (registration.reentries || 0) : (registration.rebuys || 0);
    const newCount = Math.max(0, currentCount + change);
    const newChips = registration.chips + (change > 0 ? reentryChips : -reentryChips);

    const updateData = useNewFields 
      ? { reentries: newCount, chips: Math.max(0, newChips) }
      : { rebuys: newCount, chips: Math.max(0, newChips) };

    const { error } = await supabase
      .from('tournament_registrations')
      .update(updateData)
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить ребаи", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Ребай добавлен" : "Ребай удален", 
        description: `Игрок получил ${change > 0 ? '+' : ''}${change > 0 ? reentryChips : -reentryChips} фишек` 
      });
      onRegistrationUpdate();
    }
  };

  const updateAddons = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const additionalChips = tournament.additional_chips || tournament.addon_chips || 0;
    const useNewFields = tournament.participation_fee !== undefined;
    const currentCount = useNewFields ? (registration.additional_sets || 0) : (registration.addons || 0);
    const newCount = Math.max(0, currentCount + change);
    const newChips = registration.chips + (change > 0 ? additionalChips : -additionalChips);

    const updateData = useNewFields 
      ? { additional_sets: newCount, chips: Math.max(0, newChips) }
      : { addons: newCount, chips: Math.max(0, newChips) };

    const { error } = await supabase
      .from('tournament_registrations')
      .update(updateData)
      .eq('id', registrationId);

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось обновить аддоны", variant: "destructive" });
    } else {
      toast({ 
        title: change > 0 ? "Аддон добавлен" : "Аддон удален", 
        description: `Игрок получил ${change > 0 ? '+' : ''}${change > 0 ? additionalChips : -additionalChips} фишек` 
      });
      onRegistrationUpdate();
    }
  };

  const eliminatePlayer = async (registrationId: string, position: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const { error } = await supabase.rpc('redistribute_chips_on_elimination', {
      eliminated_player_id: registration.player.id,
      tournament_id_param: tournament.id
    });

    if (error) {
      toast({ title: "Ошибка", description: "Не удалось исключить игрока", variant: "destructive" });
    } else {
      toast({ title: "Игрок исключен", description: `${registration.player.name} выбыл из турнира` });
      await voiceAnnouncements.announcePlayerElimination(registration.player.name, position);
      onRegistrationUpdate();
      
      const activeCount = registrations.filter(r => r.status !== 'eliminated').length;
      if (activeCount <= 1) {
        toast({ title: "Турнир готов к завершению", description: "Остался один игрок" });
        await voiceAnnouncements.playAnnouncement('Внимание! Остался последний игрок. Турнир готов к завершению!');
      }
    }
  };

  const finishTournament = async () => {
    try {
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ status: 'finished' })
        .eq('id', tournament.id);

      if (tournamentError) throw tournamentError;

      const { data: freshRegistrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('id, player_id, position, final_position, reentries, rebuys, additional_sets, addons, status')
        .eq('tournament_id', tournament.id);

      if (regError) throw regError;

      const results = freshRegistrations.map(reg => ({
        player_id: reg.player_id,
        position: reg.final_position || reg.position || null,
        rebuys: reg.reentries || reg.rebuys || 0,
        addons: reg.additional_sets || reg.addons || 0
      })).filter(r => r.position !== null);

      if (results.length === 0) {
        throw new Error('Нет участников с корректными позициями');
      }

      const { error: rpsError } = await supabase.functions.invoke('calculate-elo', {
        body: { tournament_id: tournament.id, results: results }
      });

      if (rpsError) throw rpsError;

      toast({ title: "Турнир завершен", description: "Рейтинги обновлены" });
      onRegistrationUpdate();

    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message || "Не удалось завершить турнир", variant: "destructive" });
    }
  };

  const activePlayers = registrations.filter(r => r.status !== 'eliminated');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated').sort((a, b) => {
    const posA = (a as any).final_position || a.position || 999;
    const posB = (b as any).final_position || b.position || 999;
    return posA - posB;
  });

  const totalReentries = registrations.reduce((sum, reg) => sum + (reg.reentries || reg.rebuys || 0), 0);
  const totalAdditionalSets = registrations.reduce((sum, reg) => sum + (reg.additional_sets || reg.addons || 0), 0);

  const participationFee = tournament.participation_fee || tournament.buy_in || 0;
  const reentryFee = tournament.reentry_fee || tournament.rebuy_cost || 0;
  const additionalFee = tournament.additional_fee || tournament.addon_cost || 0;

  const mainTotal = participationFee * registrations.length;
  const reentryTotal = reentryFee * totalReentries;
  const additionalTotal = additionalFee * totalAdditionalSets;
  const totalPrizePool = mainTotal + reentryTotal + additionalTotal;
  const totalRPS = Math.floor(totalPrizePool / 10);

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.1 } } }}
    >
      <Tabs defaultValue="register" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-secondary/80 border-2 border-border p-1 rounded-xl">
          <TabsTrigger value="register" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg">
            Регистрация
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-green-500 data-[state=active]:text-white font-bold rounded-lg">
            Активные ({activePlayers.length})
          </TabsTrigger>
          <TabsTrigger value="eliminated" className="data-[state=active]:bg-destructive data-[state=active]:text-white font-bold rounded-lg">
            Выбывшие ({eliminatedPlayers.length})
          </TabsTrigger>
          <TabsTrigger value="seating" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white font-bold rounded-lg">
            Рассадка
          </TabsTrigger>
          <TabsTrigger value="finish" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-bold rounded-lg">
            Завершение
          </TabsTrigger>
        </TabsList>

        {/* Registration Tab */}
        <TabsContent value="register" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div variants={itemVariants}>
              <Card className="bg-card brutal-border overflow-hidden">
                <CardHeader className="bg-secondary/60 border-b-2 border-border">
                  <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                    <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                      <UserPlus className="w-5 h-5 text-primary" />
                    </div>
                    Добавить игрока
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Имя игрока</Label>
                      <Input
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        placeholder="Введите имя игрока"
                        className="bg-secondary/50 border-2 border-border focus:border-primary h-12 font-medium"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Телефон</Label>
                        <Input
                          value={playerPhone}
                          onChange={(e) => setPlayerPhone(e.target.value)}
                          placeholder="+7 (999) 123-45-67"
                          className="bg-secondary/50 border-2 border-border focus:border-primary h-12 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Telegram</Label>
                        <Input
                          value={playerTelegram}
                          onChange={(e) => setPlayerTelegram(e.target.value)}
                          placeholder="@username"
                          className="bg-secondary/50 border-2 border-border focus:border-primary h-12 font-medium"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Место</Label>
                        <Input
                          type="number"
                          min="1"
                          max={tournament.max_players}
                          value={seatNumber}
                          onChange={(e) => setSeatNumber(e.target.value)}
                          placeholder="Опционально"
                          className="bg-secondary/50 border-2 border-border focus:border-primary h-12 font-medium"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Стартовые фишки</Label>
                        <Input
                          type="number"
                          min="100"
                          value={startingChips}
                          onChange={(e) => setStartingChips(parseInt(e.target.value))}
                          className="bg-secondary/50 border-2 border-border focus:border-primary h-12 font-medium"
                        />
                      </div>
                    </div>
                  </div>
                  <Button 
                    onClick={registerPlayer} 
                    className="w-full h-12 bg-primary hover:bg-primary/80 text-primary-foreground font-black text-base"
                    disabled={!playerName.trim() || registrations.length >= tournament.max_players}
                  >
                    <UserPlus className="w-5 h-5 mr-2" />
                    ЗАРЕГИСТРИРОВАТЬ
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div variants={itemVariants}>
              <Card className="bg-card brutal-border overflow-hidden">
                <CardHeader className="bg-secondary/60 border-b-2 border-border">
                  <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                    <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                      <Upload className="w-5 h-5 text-green-500" />
                    </div>
                    Массовая регистрация
                  </CardTitle>
                  <CardDescription className="text-muted-foreground mt-2">Каждое имя с новой строки</CardDescription>
                </CardHeader>
                <CardContent className="p-6 space-y-5">
                  <div className="space-y-2">
                    <Label className="text-muted-foreground font-medium text-sm uppercase tracking-wider">Список игроков</Label>
                    <Textarea
                      placeholder="Иван Петров&#10;Мария Сидорова&#10;Алексей Иванов"
                      value={bulkPlayersList}
                      onChange={(e) => setBulkPlayersList(e.target.value)}
                      rows={7}
                      className="bg-secondary/50 border-2 border-border focus:border-green-500 font-medium resize-none"
                    />
                  </div>
                  <Button 
                    onClick={bulkRegisterPlayers} 
                    className="w-full h-12 bg-green-500 hover:bg-green-600 text-white font-black text-base"
                    disabled={!bulkPlayersList.trim()}
                  >
                    <Users className="w-5 h-5 mr-2" />
                    ЗАРЕГИСТРИРОВАТЬ ВСЕХ
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        {/* Active Players Tab */}
        <TabsContent value="active" className="space-y-6 mt-6">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/20 border-2 border-green-500/50">
                  <Activity className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-foreground">Активные участники</h3>
                  <p className="text-muted-foreground">{activePlayers.length} игроков в турнире</p>
                </div>
              </div>
            </div>
            
            {activePlayers.length === 0 ? (
              <Card className="bg-card brutal-border p-12 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-xl font-bold text-muted-foreground">Нет активных игроков</p>
                <p className="text-muted-foreground">Зарегистрируйте участников</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {activePlayers.map((registration, index) => (
                  <motion.div
                    key={registration.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="bg-card brutal-border hover:border-green-500/50 transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <Avatar className="w-14 h-14 border-2 border-border">
                              <AvatarImage src={getPlayerAvatar(registration.player.id)} alt={registration.player.name} />
                              <AvatarFallback className="bg-secondary text-foreground font-black text-lg">
                                {registration.player.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h4 className="text-lg font-black text-foreground">{registration.player.name}</h4>
                              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Grid3X3 className="w-3 h-3" />
                                  Место {registration.seat_number || '—'}
                                </span>
                                <span>•</span>
                                <span className="text-primary font-bold">RPS {registration.player.elo_rating}</span>
                                <span>•</span>
                                <span className="text-green-500 font-bold">{registration.chips.toLocaleString()} фишек</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="text-right mr-4">
                              <div className="text-xs text-muted-foreground uppercase tracking-wider">Re-entry + Доп.</div>
                              <div className="text-xl font-black text-foreground">{(registration.reentries || 0) + (registration.additional_sets || 0)}</div>
                            </div>
                            
                            <div className="flex gap-2">
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateRebuys(registration.id, 1)}
                                  className="h-10 w-10 p-0 border-2 border-green-500/50 text-green-500 hover:bg-green-500/20"
                                  title="Добавить re-entry"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </Button>
                              </motion.div>
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateRebuys(registration.id, -1)}
                                  disabled={(registration.reentries || 0) === 0}
                                  className="h-10 w-10 p-0 border-2 border-border text-muted-foreground hover:bg-secondary disabled:opacity-30"
                                  title="Убрать re-entry"
                                >
                                  <Minus className="w-4 h-4" />
                                </Button>
                              </motion.div>
                              {tournament.current_level === tournament.addon_level && (
                                <>
                                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateAddons(registration.id, 1)}
                                      className="h-10 w-10 p-0 border-2 border-blue-500/50 text-blue-500 hover:bg-blue-500/20"
                                      title="Добавить доп. набор"
                                    >
                                      <Plus className="w-4 h-4" />
                                    </Button>
                                  </motion.div>
                                  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updateAddons(registration.id, -1)}
                                      disabled={(registration.additional_sets || 0) === 0}
                                      className="h-10 w-10 p-0 border-2 border-border text-muted-foreground hover:bg-secondary disabled:opacity-30"
                                      title="Убрать доп. набор"
                                    >
                                      <Minus className="w-4 h-4" />
                                    </Button>
                                  </motion.div>
                                </>
                              )}
                              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => eliminatePlayer(registration.id, activePlayers.length)}
                                  className="h-10 w-10 p-0 border-2 border-destructive/50 text-destructive hover:bg-destructive/20"
                                  title="Исключить игрока"
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </motion.div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Eliminated Players Tab */}
        <TabsContent value="eliminated" className="space-y-6 mt-6">
          <motion.div variants={itemVariants}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-destructive/20 border-2 border-destructive/50">
                  <UserX className="w-6 h-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-foreground">Выбывшие игроки</h3>
                  <p className="text-muted-foreground">Порядок выбывания и призовые места</p>
                </div>
              </div>
              <div className="text-center px-6 py-3 bg-destructive/10 rounded-xl border-2 border-destructive/30">
                <div className="text-3xl font-black text-destructive">{eliminatedPlayers.length}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">Выбыло</div>
              </div>
            </div>
            
            {eliminatedPlayers.length === 0 ? (
              <Card className="bg-card brutal-border p-12 text-center">
                <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
                <p className="text-xl font-bold text-muted-foreground">Никто еще не выбыл</p>
                <p className="text-muted-foreground">Все игроки все еще в игре</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {eliminatedPlayers.map((registration, index) => {
                  const position = (registration as any).final_position || registration.position || 0;
                  const isPrize = position <= 3;
                  
                  return (
                    <motion.div
                      key={registration.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className={`bg-card brutal-border transition-all ${isPrize ? 'border-primary/50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="relative">
                                <Avatar className="w-14 h-14 border-2 border-border">
                                  <AvatarImage src={getPlayerAvatar(registration.player.id)} alt={registration.player.name} />
                                  <AvatarFallback className="bg-secondary text-foreground font-black text-lg">
                                    {registration.player.name.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shadow-lg ${
                                  position === 1 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600' :
                                  position === 2 ? 'bg-gradient-to-br from-gray-300 to-gray-500' :
                                  position === 3 ? 'bg-gradient-to-br from-amber-500 to-amber-700' :
                                  'bg-secondary border-2 border-border text-muted-foreground'
                                }`}>
                                  {position}
                                </div>
                                {isPrize && (
                                  <div className="absolute -top-3 -left-3">
                                    {position === 1 ? <Crown className="w-6 h-6 text-yellow-500" /> :
                                     position === 2 ? <Medal className="w-6 h-6 text-gray-400" /> :
                                     <Star className="w-6 h-6 text-amber-600" />}
                                  </div>
                                )}
                              </div>
                              <div>
                                <h4 className="text-lg font-black text-foreground">{registration.player.name}</h4>
                                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                                  <span className="text-primary font-bold">RPS {registration.player.elo_rating}</span>
                                  <span>•</span>
                                  <span>Re-entry {registration.reentries || 0}</span>
                                  <span>•</span>
                                  <span>Доп. {registration.additional_sets || 0}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-right">
                              <div className="text-xl font-black text-foreground">{position} место</div>
                              {isPrize ? (
                                <Badge className="bg-primary/20 text-primary border border-primary/30 font-bold">
                                  ПРИЗОВОЕ МЕСТО
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">Выбыл</span>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </TabsContent>

        {/* Seating Tab */}
        <TabsContent value="seating" className="mt-6">
          <TableSeating 
            tournamentId={tournament.id}
            registrations={registrations}
            onSeatingUpdate={onRegistrationUpdate}
          />
        </TabsContent>

        {/* Finish Tab */}
        <TabsContent value="finish" className="space-y-6 mt-6">
          <motion.div variants={itemVariants}>
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-xl bg-primary/20 border-2 border-primary/50">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-foreground">Завершение турнира</h3>
                <p className="text-muted-foreground">Автоматический расчет рейтингов</p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-card brutal-border p-6 text-center">
                <Activity className="w-8 h-8 mx-auto mb-3 text-green-500" />
                <p className="text-4xl font-black text-green-500 mb-1">{activePlayers.length}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Активных</p>
              </Card>
              <Card className="bg-card brutal-border p-6 text-center">
                <Trophy className="w-8 h-8 mx-auto mb-3 text-primary" />
                <p className="text-4xl font-black text-primary mb-1">{eliminatedPlayers.length}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Выбыло</p>
              </Card>
              <Card className="bg-card brutal-border p-6 text-center">
                <Users className="w-8 h-8 mx-auto mb-3 text-blue-500" />
                <p className="text-4xl font-black text-blue-500 mb-1">{registrations.length}</p>
                <p className="text-sm text-muted-foreground uppercase tracking-wider">Всего</p>
              </Card>
            </div>

            {activePlayers.length <= 1 ? (
              <div className="space-y-4">
                <Card className="bg-green-500/10 border-2 border-green-500/30 p-6">
                  <div className="flex items-center gap-3 text-green-500 mb-2">
                    <CheckCircle className="w-6 h-6" />
                    <span className="text-xl font-black">Турнир готов к завершению</span>
                  </div>
                  <p className="text-muted-foreground">
                    Остался {activePlayers.length === 0 ? 'ноль' : 'один'} активный игрок. 
                    Нажмите для расчета рейтингов.
                  </p>
                </Card>
                <Button 
                  onClick={finishTournament} 
                  className="w-full h-14 bg-green-500 hover:bg-green-600 text-white font-black text-lg"
                >
                  <Trophy className="w-6 h-6 mr-2" />
                  ЗАВЕРШИТЬ ТУРНИР
                </Button>
              </div>
            ) : (
              <Card className="bg-primary/10 border-2 border-primary/30 p-6">
                <div className="flex items-center gap-3 text-primary mb-2">
                  <AlertTriangle className="w-6 h-6" />
                  <span className="text-xl font-black">Турнир не готов к завершению</span>
                </div>
                <p className="text-muted-foreground">
                  Осталось {activePlayers.length} активных игроков. 
                  Для завершения должен остаться максимум один игрок.
                </p>
              </Card>
            )}
          </motion.div>
        </TabsContent>
      </Tabs>

      {/* Statistics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Player Stats */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card brutal-border h-full">
            <CardHeader className="bg-secondary/60 border-b-2 border-border">
              <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                Статистика игроков
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-secondary/40 rounded-xl border-2 border-border text-center">
                  <div className="text-3xl font-black text-foreground">{registrations.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Всего</div>
                </div>
                <div className="p-4 bg-green-500/10 rounded-xl border-2 border-green-500/30 text-center">
                  <div className="text-3xl font-black text-green-500">{activePlayers.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Активных</div>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-xl border-2 border-blue-500/30 text-center">
                  <div className="text-3xl font-black text-blue-500">{tournament.max_players - registrations.length}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Свободно</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Reentries & Addons Stats */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card brutal-border h-full">
            <CardHeader className="bg-secondary/60 border-b-2 border-border">
              <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                  <RotateCcw className="w-5 h-5 text-primary" />
                </div>
                Re-entry и Доп. наборы
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-500/10 rounded-xl border-2 border-green-500/30 text-center">
                  <div className="text-3xl font-black text-green-500">{totalReentries}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Повторных входов</div>
                </div>
                <div className="p-4 bg-blue-500/10 rounded-xl border-2 border-blue-500/30 text-center">
                  <div className="text-3xl font-black text-blue-500">{totalAdditionalSets}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">Доп. наборов</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Prize Pool */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card brutal-border h-full">
            <CardHeader className="bg-secondary/60 border-b-2 border-border">
              <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                  <Coins className="w-5 h-5 text-green-500" />
                </div>
                Призовой фонд
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Орг. взносы</span>
                <span className="font-black text-foreground">{mainTotal.toLocaleString()} ₽</span>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/30 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Повторные входы</span>
                <span className="font-black text-green-500">{reentryTotal.toLocaleString()} ₽</span>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Доп. наборы</span>
                <span className="font-black text-blue-500">{additionalTotal.toLocaleString()} ₽</span>
              </div>
              <div className="p-4 bg-primary/10 rounded-xl border-2 border-primary/30">
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-bold">ИТОГО</span>
                  <div className="text-right">
                    <div className="text-2xl font-black text-foreground">{totalPrizePool.toLocaleString()} ₽</div>
                    <div className="text-lg font-black neon-orange">{totalRPS.toLocaleString()} RPS</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Chips Stats */}
        <motion.div variants={itemVariants}>
          <Card className="bg-card brutal-border h-full">
            <CardHeader className="bg-secondary/60 border-b-2 border-border">
              <CardTitle className="flex items-center gap-3 text-lg font-black text-foreground">
                <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                  <Target className="w-5 h-5 text-purple-500" />
                </div>
                Статистика фишек
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="p-3 bg-secondary/40 rounded-xl border border-border flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Всего в игре</span>
                <span className="font-black text-foreground">{activePlayers.reduce((sum, p) => sum + p.chips, 0).toLocaleString()}</span>
              </div>
              {activePlayers.length > 0 && (
                <>
                  <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/30 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Средний стек</span>
                    <span className="font-black text-purple-500">
                      {Math.round(activePlayers.reduce((sum, p) => sum + p.chips, 0) / activePlayers.length).toLocaleString()}
                    </span>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/30 flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Лидер</span>
                    <span className="font-black text-blue-500">{Math.max(...activePlayers.map(p => p.chips)).toLocaleString()}</span>
                  </div>
                </>
              )}
              <div className="pt-3 border-t-2 border-border space-y-2">
                <div className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Конфигурация</div>
                <div className="p-2 bg-green-500/10 rounded-lg flex justify-between">
                  <span className="text-xs text-muted-foreground">Стартовые</span>
                  <span className="text-sm font-black text-green-500">{tournament.starting_chips.toLocaleString()}</span>
                </div>
                <div className="p-2 bg-purple-500/10 rounded-lg flex justify-between">
                  <span className="text-xs text-muted-foreground">Re-entry</span>
                  <span className="text-sm font-black text-purple-500">{(tournament.reentry_chips || tournament.rebuy_chips || 0).toLocaleString()}</span>
                </div>
                <div className="p-2 bg-primary/10 rounded-lg flex justify-between">
                  <span className="text-xs text-muted-foreground">Доп. набор</span>
                  <span className="text-sm font-black text-primary">{(tournament.additional_chips || tournament.addon_chips || 0).toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default PlayerManagement;
