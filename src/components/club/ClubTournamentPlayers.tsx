import React, { useState, useEffect, useRef, useCallback } from "react";
import { useClub } from "@/contexts/ClubContext";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  UserPlus,
  Users,
  Trophy,
  Clock,
  Check,
  CheckCircle,
  X,
  Plus,
  Minus,
  Upload,
  Grid3X3,
  UserX,
  TrendingUp,
  Coins,
  RotateCcw,
  Loader2,
  Search,
  Send
} from "lucide-react";

interface Tournament {
  id: string;
  name: string;
  status: string;
  max_players: number;
  starting_chips: number;
  players_per_table?: number;
  participation_fee?: number;
  reentry_fee?: number;
  additional_fee?: number;
  reentry_chips?: number;
  additional_chips?: number;
  rebuy_chips?: number;
  addon_chips?: number;
  rebuy_cost?: number;
  addon_cost?: number;
  current_level?: number;
  reentry_end_level?: number;
  additional_level?: number;
}

interface Player {
  id: string;
  name: string;
  avatar_url?: string;
  elo_rating: number;
}

interface Registration {
  id: string;
  player_id: string;
  tournament_id: string;
  seat_number: number | null;
  chips: number;
  status: string;
  reentries: number;
  additional_sets: number;
  rebuys?: number;
  addons?: number;
  position?: number;
  final_position?: number;
  pending_reentry?: boolean;
  pending_addon?: boolean;
  pending_reentry_at?: string;
  pending_addon_at?: string;
  player: Player;
}

interface ClubTournamentPlayersProps {
  tournament: Tournament;
  onClose?: () => void;
}

export function ClubTournamentPlayers({ tournament, onClose }: ClubTournamentPlayersProps) {
  const { club } = useClub();
  const queryClient = useQueryClient();
  const isMountedRef = useRef(true);
  
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("register");
  
  // Registration form state
  const [playerName, setPlayerName] = useState("");
  const [seatNumber, setSeatNumber] = useState("");
  const [startingChips, setStartingChips] = useState(tournament.starting_chips || 10000);
  const [bulkPlayersList, setBulkPlayersList] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [search, setSearch] = useState("");

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch registrations
  const fetchRegistrations = useCallback(async () => {
    if (!tournament?.id) return;

    try {
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          id,
          player_id,
          tournament_id,
          seat_number,
          chips,
          status,
          reentries,
          additional_sets,
          rebuys,
          addons,
          position,
          final_position,
          pending_reentry,
          pending_addon,
          pending_reentry_at,
          pending_addon_at,
          player:players(id, name, avatar_url, elo_rating)
        `)
        .eq('tournament_id', tournament.id)
        .order('created_at', { ascending: true });

      if (error) throw error;

      if (isMountedRef.current) {
        setRegistrations((data || []) as unknown as Registration[]);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching registrations:', error);
      if (isMountedRef.current) setLoading(false);
    }
  }, [tournament?.id]);

  // Initial fetch and realtime subscription
  useEffect(() => {
    if (!tournament?.id) return;

    fetchRegistrations();

    console.log('🔌 Setting up realtime for tournament players:', tournament.id);

    const channel = supabase
      .channel(`club_tournament_players_${tournament.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tournament_registrations',
          filter: `tournament_id=eq.${tournament.id}`
        },
        (payload) => {
          console.log('📡 Registration changed:', payload);
          if (isMountedRef.current) {
            fetchRegistrations();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Players channel status:', status);
      });

    return () => {
      console.log('🔌 Cleaning up players realtime');
      supabase.removeChannel(channel);
    };
  }, [tournament?.id, fetchRegistrations]);

  // Player lists
  const pendingPlayers = registrations.filter(r => r.status === 'registered');
  const activePlayers = registrations.filter(r => r.status === 'playing');
  const eliminatedPlayers = registrations.filter(r => r.status === 'eliminated')
    .sort((a, b) => (a.final_position || a.position || 999) - (b.final_position || b.position || 999));
  const pendingRequests = registrations.filter(r => r.pending_reentry || r.pending_addon);

  // Get avatar
  const getPlayerAvatar = (playerId: string) => {
    const avatarIndex = Math.abs(playerId.split('').reduce((a, b) => a + b.charCodeAt(0), 0)) % 6 + 1;
    return `/src/assets/avatars/poker-avatar-${avatarIndex}.png`;
  };

  // Register single player
  const registerPlayer = async () => {
    if (!playerName.trim()) {
      toast.error("Введите имя игрока");
      return;
    }

    if (registrations.length >= tournament.max_players) {
      toast.error("Достигнуто максимальное количество игроков");
      return;
    }

    setIsRegistering(true);

    try {
      // Find or create player
      let { data: existingPlayer, error: searchError } = await supabase
        .from('players')
        .select('*')
        .eq('name', playerName.trim())
        .single();

      let playerId;

      if (searchError && searchError.code === 'PGRST116') {
        // Create new player
        const { data: newPlayer, error: createError } = await supabase
          .from('players')
          .insert([{
            name: playerName.trim(),
            email: `${playerName.trim().toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
            elo_rating: 100
          }])
          .select()
          .single();

        if (createError) throw createError;
        playerId = newPlayer.id;
      } else if (existingPlayer) {
        // Check if already registered
        const isAlreadyRegistered = registrations.some(r => r.player.id === existingPlayer.id);
        if (isAlreadyRegistered) {
          toast.error("Игрок уже зарегистрирован");
          setIsRegistering(false);
          return;
        }
        playerId = existingPlayer.id;
      } else {
        throw new Error("Ошибка поиска игрока");
      }

      // Register player
      const { error: regError } = await supabase
        .from('tournament_registrations')
        .insert([{
          tournament_id: tournament.id,
          player_id: playerId,
          seat_number: seatNumber ? parseInt(seatNumber) : null,
          chips: startingChips,
          status: 'registered'
        }]);

      if (regError) throw regError;

      toast.success(`${playerName.trim()} зарегистрирован`);
      setPlayerName("");
      setSeatNumber("");
      fetchRegistrations();
    } catch (error: any) {
      console.error('Registration error:', error);
      toast.error(error.message || "Ошибка регистрации");
    } finally {
      setIsRegistering(false);
    }
  };

  // Bulk register players
  const bulkRegisterPlayers = async () => {
    if (!bulkPlayersList.trim()) {
      toast.error("Введите список игроков");
      return;
    }

    const playerNames = bulkPlayersList.trim().split('\n').filter(name => name.trim());
    let registered = 0;
    let failed = 0;

    setIsRegistering(true);

    for (const name of playerNames) {
      const trimmedName = name.trim();
      if (!trimmedName) continue;

      if (registrations.length + registered >= tournament.max_players) break;

      try {
        let { data: existingPlayer, error: searchError } = await supabase
          .from('players')
          .select('*')
          .eq('name', trimmedName)
          .single();

        let playerId;

        if (searchError && searchError.code === 'PGRST116') {
          const { data: newPlayer, error: createError } = await supabase
            .from('players')
            .insert([{
              name: trimmedName,
              email: `${trimmedName.toLowerCase().replace(/\s+/g, '.')}@placeholder.com`,
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
          const isAlreadyRegistered = registrations.some(r => r.player.id === existingPlayer.id);
          if (isAlreadyRegistered) {
            failed++;
            continue;
          }
          playerId = existingPlayer.id;
        } else {
          failed++;
          continue;
        }

        const { error: regError } = await supabase
          .from('tournament_registrations')
          .insert([{
            tournament_id: tournament.id,
            player_id: playerId,
            chips: startingChips,
            status: 'registered'
          }]);

        if (!regError) {
          registered++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    toast.success(`Зарегистрировано: ${registered}, Ошибок: ${failed}`);
    setBulkPlayersList("");
    fetchRegistrations();
    setIsRegistering(false);
  };

  // Confirm single player
  const confirmPlayer = async (registrationId: string) => {
    const { error } = await supabase
      .from('tournament_registrations')
      .update({ status: 'playing' })
      .eq('id', registrationId);

    if (error) {
      toast.error("Ошибка подтверждения");
    } else {
      toast.success("Игрок подтверждён");
      fetchRegistrations();
    }
  };

  // Confirm all pending
  const confirmAllPending = async () => {
    if (pendingPlayers.length === 0) return;

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ status: 'playing' })
      .eq('tournament_id', tournament.id)
      .eq('status', 'registered');

    if (error) {
      toast.error("Ошибка подтверждения");
    } else {
      toast.success(`${pendingPlayers.length} игроков подтверждено`);
      fetchRegistrations();
    }
  };

  // Re-entry
  const updateReentries = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const reentryChips = tournament.reentry_chips || tournament.rebuy_chips || 0;
    const currentCount = registration.reentries || registration.rebuys || 0;
    const newCount = Math.max(0, currentCount + change);
    const newChips = registration.chips + (change > 0 ? reentryChips : -reentryChips);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        reentries: newCount, 
        rebuys: newCount,
        chips: Math.max(0, newChips) 
      })
      .eq('id', registrationId);

    if (error) {
      toast.error("Ошибка обновления re-entry");
    } else {
      toast.success(change > 0 ? `Re-entry: +${reentryChips} фишек` : `Re-entry отменён`);
      fetchRegistrations();
    }
  };

  // Additional set (addon)
  const updateAddons = async (registrationId: string, change: number) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const addonChips = tournament.additional_chips || tournament.addon_chips || 0;
    const currentCount = registration.additional_sets || registration.addons || 0;
    const newCount = Math.max(0, currentCount + change);
    const newChips = registration.chips + (change > 0 ? addonChips : -addonChips);

    const { error } = await supabase
      .from('tournament_registrations')
      .update({ 
        additional_sets: newCount, 
        addons: newCount,
        chips: Math.max(0, newChips) 
      })
      .eq('id', registrationId);

    if (error) {
      toast.error("Ошибка обновления add-on");
    } else {
      toast.success(change > 0 ? `Add-on: +${addonChips} фишек` : `Add-on отменён`);
      fetchRegistrations();
    }
  };

  // Eliminate player
  const eliminatePlayer = async (registrationId: string) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const remainingActive = activePlayers.filter(r => r.id !== registrationId);
    const position = remainingActive.length + 1;

    const { error } = await supabase
      .from('tournament_registrations')
      .update({
        status: 'eliminated',
        position: position,
        final_position: position,
        chips: 0
      })
      .eq('id', registrationId);

    if (error) {
      toast.error("Ошибка исключения");
    } else {
      toast.success(`${registration.player.name} выбыл на ${position} месте`);
      fetchRegistrations();
    }
  };

  // Confirm pending re-entry request
  const confirmPendingReentry = async (registrationId: string, playerName: string) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const reentryChips = tournament.reentry_chips || tournament.rebuy_chips || 10000;
    const newReentries = (registration.reentries || registration.rebuys || 0) + 1;
    const newChips = registration.chips + reentryChips;

    const { error } = await supabase
      .from('tournament_registrations')
      .update({
        reentries: newReentries,
        rebuys: newReentries,
        chips: newChips,
        pending_reentry: false,
        pending_reentry_at: null
      })
      .eq('id', registrationId);

    if (error) {
      toast.error("Ошибка подтверждения re-entry");
    } else {
      toast.success(`Re-entry подтвержден: ${playerName} +${reentryChips} фишек`);
      fetchRegistrations();
    }
  };

  // Confirm pending addon request
  const confirmPendingAddon = async (registrationId: string, playerName: string) => {
    const registration = registrations.find(r => r.id === registrationId);
    if (!registration) return;

    const addonChips = tournament.additional_chips || tournament.addon_chips || 10000;
    const newAddons = (registration.additional_sets || registration.addons || 0) + 1;
    const newChips = registration.chips + addonChips;

    const { error } = await supabase
      .from('tournament_registrations')
      .update({
        additional_sets: newAddons,
        addons: newAddons,
        chips: newChips,
        pending_addon: false,
        pending_addon_at: null
      })
      .eq('id', registrationId);

    if (error) {
      toast.error("Ошибка подтверждения add-on");
    } else {
      toast.success(`Add-on подтвержден: ${playerName} +${addonChips} фишек`);
      fetchRegistrations();
    }
  };

  // Reject pending request
  const rejectPendingRequest = async (registrationId: string, type: 'reentry' | 'addon') => {
    const updateData = type === 'reentry'
      ? { pending_reentry: false, pending_reentry_at: null }
      : { pending_addon: false, pending_addon_at: null };

    const { error } = await supabase
      .from('tournament_registrations')
      .update(updateData)
      .eq('id', registrationId);

    if (!error) {
      toast.success(type === 'reentry' ? 'Re-entry отклонён' : 'Add-on отклонён');
      fetchRegistrations();
    }
  };

  // Calculate totals
  const totalReentries = registrations.reduce((sum, r) => sum + (r.reentries || r.rebuys || 0), 0);
  const totalAddons = registrations.reduce((sum, r) => sum + (r.additional_sets || r.addons || 0), 0);
  const participationFee = tournament.participation_fee || 0;
  const reentryFee = tournament.reentry_fee || tournament.rebuy_cost || 0;
  const addonFee = tournament.additional_fee || tournament.addon_cost || 0;
  const totalPrizePool = (participationFee * registrations.length) + (reentryFee * totalReentries) + (addonFee * totalAddons);

  // Table/seat calculation
  const playersPerTable = tournament.players_per_table || 9;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-card/50 border-yellow-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black text-yellow-500">{pendingPlayers.length}</div>
            <div className="text-xs text-muted-foreground">Ожидают</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-green-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black text-green-500">{activePlayers.length}</div>
            <div className="text-xs text-muted-foreground">Активные</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-red-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black text-red-500">{eliminatedPlayers.length}</div>
            <div className="text-xs text-muted-foreground">Выбыли</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-primary/30">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black text-primary">{totalReentries}</div>
            <div className="text-xs text-muted-foreground">Re-entries</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50 border-blue-500/30">
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-black text-blue-500">{totalPrizePool.toLocaleString()}₽</div>
            <div className="text-xs text-muted-foreground">Призовой фонд</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Requests Queue */}
      {pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-lg bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50"
        >
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-5 h-5 text-yellow-500 animate-pulse" />
            <span className="font-bold text-yellow-500">Заявки на подтверждение ({pendingRequests.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingRequests.map(r => (
              <div key={r.id} className="flex items-center gap-2 bg-background/50 rounded-lg px-3 py-2">
                <span className="font-medium">{r.player.name}</span>
                {r.pending_reentry && (
                  <Badge className="bg-purple-500/20 text-purple-400">Re-entry</Badge>
                )}
                {r.pending_addon && (
                  <Badge className="bg-blue-500/20 text-blue-400">Add-on</Badge>
                )}
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-green-500 hover:bg-green-500/20"
                    onClick={() => {
                      if (r.pending_reentry) confirmPendingReentry(r.id, r.player.name);
                      if (r.pending_addon) confirmPendingAddon(r.id, r.player.name);
                    }}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-500/20"
                    onClick={() => rejectPendingRequest(r.id, r.pending_reentry ? 'reentry' : 'addon')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-card/50 border p-1">
          <TabsTrigger value="register" className="data-[state=active]:bg-primary/20 font-semibold text-sm">
            <UserPlus className="w-4 h-4 mr-1" />
            Регистрация
          </TabsTrigger>
          <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-500 font-semibold text-sm">
            <Clock className="w-4 h-4 mr-1" />
            Ожидают ({pendingPlayers.length})
          </TabsTrigger>
          <TabsTrigger value="active" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-500 font-semibold text-sm">
            <Users className="w-4 h-4 mr-1" />
            Активные ({activePlayers.length})
          </TabsTrigger>
          <TabsTrigger value="eliminated" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-500 font-semibold text-sm">
            <UserX className="w-4 h-4 mr-1" />
            Выбыли ({eliminatedPlayers.length})
          </TabsTrigger>
          <TabsTrigger value="seating" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-500 font-semibold text-sm">
            <Grid3X3 className="w-4 h-4 mr-1" />
            Рассадка
          </TabsTrigger>
        </TabsList>

        {/* Registration Tab */}
        <TabsContent value="register" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Single Registration */}
            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <UserPlus className="w-5 h-5 text-primary" />
                  Добавить игрока
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-muted-foreground">Имя игрока</Label>
                  <Input
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Введите имя"
                    className="h-10"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Место</Label>
                    <Input
                      type="number"
                      min="1"
                      max={tournament.max_players}
                      value={seatNumber}
                      onChange={(e) => setSeatNumber(e.target.value)}
                      placeholder="Авто"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase tracking-wider text-muted-foreground">Фишки</Label>
                    <Input
                      type="number"
                      value={startingChips}
                      onChange={(e) => setStartingChips(parseInt(e.target.value) || 0)}
                      className="h-10"
                    />
                  </div>
                </div>
                <Button
                  onClick={registerPlayer}
                  className="w-full"
                  disabled={!playerName.trim() || isRegistering || registrations.length >= tournament.max_players}
                >
                  {isRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Зарегистрировать
                </Button>
              </CardContent>
            </Card>

            {/* Bulk Registration */}
            <Card className="bg-card/50">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Upload className="w-5 h-5 text-green-500" />
                  Массовая регистрация
                </CardTitle>
                <CardDescription className="text-xs">Каждое имя с новой строки</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Иван Петров&#10;Мария Сидорова&#10;Алексей Иванов"
                  value={bulkPlayersList}
                  onChange={(e) => setBulkPlayersList(e.target.value)}
                  rows={5}
                  className="resize-none"
                />
                <Button
                  onClick={bulkRegisterPlayers}
                  className="w-full bg-green-500 hover:bg-green-600"
                  disabled={!bulkPlayersList.trim() || isRegistering}
                >
                  {isRegistering ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Users className="w-4 h-4 mr-2" />}
                  Зарегистрировать всех
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Pending Tab */}
        <TabsContent value="pending" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              Ожидают подтверждения
            </h3>
            {pendingPlayers.length > 0 && (
              <Button onClick={confirmAllPending} className="bg-green-500 hover:bg-green-600">
                <CheckCircle className="w-4 h-4 mr-2" />
                Подтвердить всех ({pendingPlayers.length})
              </Button>
            )}
          </div>

          {pendingPlayers.length === 0 ? (
            <Card className="bg-card/50 p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Нет ожидающих игроков</p>
            </Card>
          ) : (
            <div className="grid gap-2">
              <AnimatePresence>
                {pendingPlayers.map((reg, index) => (
                  <motion.div
                    key={reg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card className="bg-card/50 hover:border-yellow-500/50 transition-colors">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 border-2 border-yellow-500/30">
                              <AvatarImage src={reg.player.avatar_url || getPlayerAvatar(reg.player.id)} />
                              <AvatarFallback className="bg-yellow-500/20 text-yellow-600 font-bold">
                                {reg.player.name.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-semibold">{reg.player.name}</div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-yellow-500 border-yellow-500/30">Ожидает</Badge>
                                <span>•</span>
                                <span>{reg.chips.toLocaleString()} фишек</span>
                                <span>•</span>
                                <span className="text-primary">RPS {reg.player.elo_rating}</span>
                              </div>
                            </div>
                          </div>
                          <Button
                            onClick={() => confirmPlayer(reg.id)}
                            className="bg-green-500 hover:bg-green-600 h-9"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Подтвердить
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Active Tab */}
        <TabsContent value="active" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-green-500" />
              Активные игроки
            </h3>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск..."
                className="pl-9 w-48 h-9"
              />
            </div>
          </div>

          {activePlayers.length === 0 ? (
            <Card className="bg-card/50 p-8 text-center">
              <Users className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Нет активных игроков</p>
            </Card>
          ) : (
            <div className="grid gap-2">
              <AnimatePresence>
                {activePlayers
                  .filter(r => r.player.name.toLowerCase().includes(search.toLowerCase()))
                  .map((reg, index) => {
                    const tableNum = reg.seat_number ? Math.ceil(reg.seat_number / playersPerTable) : null;
                    const seatAtTable = reg.seat_number ? ((reg.seat_number - 1) % playersPerTable) + 1 : null;

                    return (
                      <motion.div
                        key={reg.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <Card className="bg-card/50 hover:border-green-500/50 transition-colors">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="w-10 h-10 border-2 border-green-500/30">
                                  <AvatarImage src={reg.player.avatar_url || getPlayerAvatar(reg.player.id)} />
                                  <AvatarFallback className="bg-green-500/20 text-green-600 font-bold">
                                    {reg.player.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-semibold flex items-center gap-2">
                                    {reg.player.name}
                                    {tableNum && seatAtTable && (
                                      <Badge variant="outline" className="text-blue-400 border-blue-500/30 text-xs">
                                        Стол {tableNum} • Место {seatAtTable}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="font-medium text-foreground">{reg.chips.toLocaleString()} фишек</span>
                                    {(reg.reentries || reg.rebuys || 0) > 0 && (
                                      <Badge className="bg-purple-500/20 text-purple-400 text-xs">
                                        {reg.reentries || reg.rebuys} re-entry
                                      </Badge>
                                    )}
                                    {(reg.additional_sets || reg.addons || 0) > 0 && (
                                      <Badge className="bg-blue-500/20 text-blue-400 text-xs">
                                        {reg.additional_sets || reg.addons} add-on
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Re-entry buttons */}
                                <div className="flex items-center gap-1 bg-background/50 rounded-lg px-2 py-1">
                                  <span className="text-xs text-muted-foreground mr-1">RE</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => updateReentries(reg.id, -1)}
                                    disabled={(reg.reentries || reg.rebuys || 0) === 0}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-6 text-center font-bold text-sm">{reg.reentries || reg.rebuys || 0}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => updateReentries(reg.id, 1)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>

                                {/* Add-on buttons */}
                                <div className="flex items-center gap-1 bg-background/50 rounded-lg px-2 py-1">
                                  <span className="text-xs text-muted-foreground mr-1">ADD</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => updateAddons(reg.id, -1)}
                                    disabled={(reg.additional_sets || reg.addons || 0) === 0}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-6 text-center font-bold text-sm">{reg.additional_sets || reg.addons || 0}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    onClick={() => updateAddons(reg.id, 1)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>

                                {/* Eliminate button */}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="h-8"
                                  onClick={() => eliminatePlayer(reg.id)}
                                >
                                  <UserX className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          )}
        </TabsContent>

        {/* Eliminated Tab */}
        <TabsContent value="eliminated" className="space-y-4 mt-4">
          <h3 className="font-bold flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Результаты турнира
          </h3>

          {eliminatedPlayers.length === 0 ? (
            <Card className="bg-card/50 p-8 text-center">
              <Trophy className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-muted-foreground">Нет выбывших игроков</p>
            </Card>
          ) : (
            <div className="grid gap-2">
              {eliminatedPlayers.map((reg) => {
                const position = reg.final_position || reg.position || 0;
                const getMedalColor = (pos: number) => {
                  if (pos === 1) return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/10';
                  if (pos === 2) return 'text-gray-400 border-gray-400/50 bg-gray-400/10';
                  if (pos === 3) return 'text-orange-600 border-orange-600/50 bg-orange-600/10';
                  return 'text-muted-foreground border-border bg-card/50';
                };

                return (
                  <Card key={reg.id} className={`${getMedalColor(position)} transition-colors`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${getMedalColor(position)}`}>
                            {position}
                          </div>
                          <Avatar className="w-10 h-10">
                            <AvatarImage src={reg.player.avatar_url || getPlayerAvatar(reg.player.id)} />
                            <AvatarFallback>{reg.player.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-semibold">{reg.player.name}</div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>RPS {reg.player.elo_rating}</span>
                              {(reg.reentries || reg.rebuys || 0) > 0 && (
                                <span>• {reg.reentries || reg.rebuys} re-entry</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Badge variant="outline" className={getMedalColor(position)}>
                          {position} место
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Seating Tab */}
        <TabsContent value="seating" className="space-y-4 mt-4">
          <SeatingDisplay 
            registrations={activePlayers} 
            playersPerTable={playersPerTable}
            onSeatChange={fetchRegistrations}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Seating Display Component
interface SeatingDisplayProps {
  registrations: Registration[];
  playersPerTable: number;
  onSeatChange: () => void;
}

function SeatingDisplay({ registrations, playersPerTable, onSeatChange }: SeatingDisplayProps) {
  // Group players by table
  const tables: Record<number, Registration[]> = {};
  const unseated: Registration[] = [];

  registrations.forEach(reg => {
    if (reg.seat_number && reg.seat_number > 0) {
      const tableNum = Math.ceil(reg.seat_number / playersPerTable);
      if (!tables[tableNum]) tables[tableNum] = [];
      tables[tableNum].push(reg);
    } else {
      unseated.push(reg);
    }
  });

  const tableNumbers = Object.keys(tables).map(Number).sort((a, b) => a - b);

  // Auto-assign seats to unseated players
  const autoAssignSeats = async () => {
    if (unseated.length === 0) return;

    // Find all occupied seats
    const occupiedSeats = new Set(
      registrations
        .filter(r => r.seat_number && r.seat_number > 0)
        .map(r => r.seat_number!)
    );

    // Find available seats
    const maxSeat = Math.max(
      playersPerTable * Math.ceil(registrations.length / playersPerTable),
      ...Array.from(occupiedSeats)
    );

    const availableSeats: number[] = [];
    for (let i = 1; i <= maxSeat + playersPerTable; i++) {
      if (!occupiedSeats.has(i)) availableSeats.push(i);
    }

    // Shuffle available seats
    for (let i = availableSeats.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [availableSeats[i], availableSeats[j]] = [availableSeats[j], availableSeats[i]];
    }

    // Assign seats
    for (let i = 0; i < unseated.length && i < availableSeats.length; i++) {
      await supabase
        .from('tournament_registrations')
        .update({ seat_number: availableSeats[i] })
        .eq('id', unseated[i].id);
    }

    toast.success(`${unseated.length} игроков рассажено`);
    onSeatChange();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold flex items-center gap-2">
          <Grid3X3 className="w-5 h-5 text-blue-500" />
          Рассадка по столам
        </h3>
        {unseated.length > 0 && (
          <Button onClick={autoAssignSeats} className="bg-blue-500 hover:bg-blue-600">
            <RotateCcw className="w-4 h-4 mr-2" />
            Рассадить всех ({unseated.length})
          </Button>
        )}
      </div>

      {/* Unseated players */}
      {unseated.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-yellow-500">
              <Clock className="w-4 h-4" />
              Без места ({unseated.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {unseated.map(reg => (
              <Badge key={reg.id} variant="outline" className="bg-background">
                {reg.player.name}
              </Badge>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Tables grid */}
      {tableNumbers.length === 0 && unseated.length === 0 && (
        <Card className="bg-card/50 p-8 text-center">
          <Grid3X3 className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-muted-foreground">Нет игроков для рассадки</p>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tableNumbers.map(tableNum => (
          <Card key={tableNum} className="bg-card/50 border-blue-500/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center font-bold text-blue-500">
                    {tableNum}
                  </div>
                  Стол {tableNum}
                </span>
                <Badge variant="outline" className="text-blue-400">
                  {tables[tableNum].length}/{playersPerTable}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2">
                {Array.from({ length: playersPerTable }, (_, i) => {
                  const seatNum = (tableNum - 1) * playersPerTable + i + 1;
                  const player = tables[tableNum].find(r => r.seat_number === seatNum);
                  
                  return (
                    <div
                      key={i}
                      className={`h-10 rounded-lg flex items-center justify-center text-xs font-medium border ${
                        player
                          ? 'bg-green-500/20 border-green-500/50 text-green-400'
                          : 'bg-muted/30 border-dashed text-muted-foreground'
                      }`}
                    >
                      {player ? (
                        <span className="truncate px-1">{player.player.name.split(' ')[0]}</span>
                      ) : (
                        <span>{i + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
