import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Award, 
  Edit3, 
  Check, 
  X, 
  Users, 
  Star,
  Crown,
  Shield,
  Camera,
  User,
  Calendar,
  Clock,
  Coins,
  MapPin,
  BarChart3,
  TrendingDown,
  Activity,
  Zap,
  CheckCircle,
  AlertCircle,
  Timer,
  Medal,
  Flame,
  Brain
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { AvatarSelector } from '@/components/AvatarSelector';
import { toast } from 'sonner';
import { convertFeeToRPS, formatRPSPoints } from '@/utils/rpsCalculations';
import { getCurrentMafiaRank, getMafiaRankProgress, getRarityInfo, type MafiaRank } from '@/utils/mafiaRanks';
import { fixStorageUrl } from '@/utils/storageUtils';
import { MafiaHierarchy } from './MafiaHierarchy';
import { getRankProfileStyle } from './RankProfileStyles';
import { GlitchAvatarFrame } from '@/components/ui/glitch-avatar-frame';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
  email?: string;
  avatar_url?: string;
  telegram?: string;
  created_at?: string;
}

interface GameResult {
  id: string;
  position: number;
  elo_change: number;
  elo_after: number;
  elo_before: number;
  created_at: string;
  tournament: { 
    name: string;
    participation_fee: number;
  };
}

interface Tournament {
  id: string;
  name: string;
  start_time: string;
  participation_fee: number;
  max_players: number;
  status: string;
  starting_chips: number;
  description?: string;
  tournament_format?: string;
  reentry_fee?: number;
  additional_fee?: number;
  // From tournaments_display view
  participant_count?: number;
  total_reentries?: number;
  total_additional_sets?: number;
  total_rps_pool?: number;
}

interface TournamentRegistration {
  id: string;
  tournament_id: string;
  player_id: string;
  status: string;
  created_at: string;
  seat_number?: number;
  chips?: number;
  position?: number;
  rebuys?: number;
  addons?: number;
  reentries?: number;
  additional_sets?: number;
  eliminated_at?: string;
  final_position?: number;
  tournament: Tournament;
}

interface TelegramUser {
  id: number;
  firstName?: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
}

interface TelegramProfileProps {
  telegramUser: TelegramUser | null;
  userStats: Player | null;
  onStatsUpdate: (stats: Player) => void;
  onUnregister?: (registrationId: string) => void;
}

export function TelegramProfile({ telegramUser, userStats, onStatsUpdate, onUnregister }: TelegramProfileProps) {
  const [player, setPlayer] = useState<Player | null>(userStats);
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [userTournaments, setUserTournaments] = useState<TournamentRegistration[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [unregistering, setUnregistering] = useState<string>("");
  

  // Инициализируем игрока только один раз
  useEffect(() => {
    if (!player && telegramUser) {
      createPlayerProfile();
    } else if (!player && userStats) {
      setPlayer(userStats);
    }
  }, [telegramUser]);

  // Обновляем только если изменились данные в БД И они отличаются от текущих
  useEffect(() => {
    if (userStats && player && (
      userStats.name !== player.name || 
      userStats.avatar_url !== player.avatar_url ||
      userStats.elo_rating !== player.elo_rating
    )) {
      console.log('Updating player from userStats', userStats);
      setPlayer(userStats);
    }
  }, [userStats]);

  useEffect(() => {
    if (player) {
      loadGameResults();
      loadUserTournaments();
    }
  }, [player]);

  const createPlayerProfile = async () => {
    if (!telegramUser) return;
    
    try {
      setLoading(true);
      const telegramId = telegramUser.id.toString();
      const playerName = telegramUser.firstName || telegramUser.username || `Player_${telegramId}`;
      
      console.log('Creating player profile for:', { telegramId, playerName });
      
      // Проверяем, не существует ли уже игрок
      const { data: existingPlayer } = await supabase
        .from('players')
        .select('*')
        .eq('telegram', telegramId)
        .maybeSingle();
      
      console.log('Existing player check:', existingPlayer);
      
      if (existingPlayer) {
        console.log('Player already exists, using existing profile');
        setPlayer(existingPlayer);
        onStatsUpdate(existingPlayer);
        return;
      }
      
      console.log('Creating new player with data:', {
        name: playerName,
        telegram: telegramId,
        elo_rating: 1000,
        games_played: 0,
        wins: 0,
        avatar_url: telegramUser.photoUrl || 'NO PHOTO',
        hasPhoto: !!telegramUser.photoUrl
      });
      
      // Создаем нового игрока через безопасную RPC функцию
      const { data: createResult, error: createError } = await supabase.rpc('create_player_safe', {
        p_name: playerName,
        p_email: null,
        p_telegram: telegramId,
        p_avatar_url: telegramUser.photoUrl || null,
        p_user_id: null
      });
        
      console.log('Create player result:', { createResult, createError });
        
      if (createError) {
        console.error('Error creating player:', createError);
        toast.error(`Ошибка создания профиля: ${createError.message}`);
        return;
      }

      const result = createResult as { success: boolean; error?: string; player?: any };
      
      if (!result?.success) {
        console.error('Player creation failed:', result?.error);
        toast.error(`Ошибка: ${result?.error || 'Не удалось создать профиль'}`);
        return;
      }
      
      setPlayer(result.player);
      onStatsUpdate(result.player);
      toast.success('Профиль успешно создан!');
    } catch (error) {
      console.error('Error in createPlayerProfile:', error);
      toast.error(`Ошибка создания профиля: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadGameResults = async () => {
    if (!player) return;

    try {
      const { data, error } = await supabase
        .from('game_results')
        .select(`
          *,
          tournament:tournaments(name, participation_fee)
        `)
        .eq('player_id', player.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setGameResults(data || []);
    } catch (error) {
      console.error('Error loading game results:', error);
    }
  };

  const loadUserTournaments = async () => {
    if (!player) return;

    try {
      console.log('Loading tournaments for player:', player.id);
      
      // Сначала получаем регистрации игрока
      const { data: registrations, error: regError } = await supabase
        .from('tournament_registrations')
        .select('*')
        .eq('player_id', player.id)
        .in('status', ['registered', 'confirmed', 'playing', 'eliminated'])
        .order('created_at', { ascending: false });

      if (regError) throw regError;
      
      if (!registrations || registrations.length === 0) {
        setUserTournaments([]);
        return;
      }

      // Получаем ID турниров
      const tournamentIds = registrations.map(r => r.tournament_id);
      
      // Загружаем турниры из view с актуальными данными
      const { data: tournaments, error: tournamentError } = await supabase
        .from('tournaments_display')
        .select('*')
        .in('id', tournamentIds);

      if (tournamentError) throw tournamentError;

      // Объединяем данные
      const combinedData: TournamentRegistration[] = registrations
        .map(reg => {
          const tournament = tournaments?.find(t => t.id === reg.tournament_id);
          if (!tournament) return null;
          return {
            ...reg,
            tournament: tournament as Tournament
          } as TournamentRegistration;
        })
        .filter(Boolean) as TournamentRegistration[];

      console.log('Tournament registrations with display data:', combinedData);

      setUserTournaments(combinedData);
    } catch (error) {
      console.error('Error loading user tournaments:', error);
    }
  };

  const handleAvatarUpdate = async (avatarUrl: string) => {
    if (!player) {
      console.error('No player found for avatar update');
      toast.error('Ошибка: профиль игрока не найден');
      return;
    }

    try {
      setLoading(true);
      console.log('Updating avatar for player:', { 
        playerId: player.id, 
        telegram: player.telegram,
        newAvatarUrl: avatarUrl 
      });
      
      const { data, error } = await supabase.rpc('update_player_safe', {
        p_player_id: player.id,
        p_avatar_url: avatarUrl
      });

      if (error) {
        console.error('Avatar update error:', error);
        toast.error(`Ошибка обновления: ${error.message}`);
        throw error;
      }

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        console.error('Avatar update failed:', result?.error);
        toast.error(`Ошибка: ${result?.error || 'Не удалось обновить аватар'}`);
        return;
      }

      console.log('Avatar updated successfully');
      const updatedPlayer = { ...player, avatar_url: avatarUrl };
      setPlayer(updatedPlayer);
      onStatsUpdate(updatedPlayer);
      setShowAvatarSelector(false);
      toast.success('Аватар обновлен!');
    } catch (error: any) {
      console.error('Error updating avatar:', error);
      toast.error(`Ошибка обновления аватара: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!player || !newPlayerName.trim()) {
      console.error('Cannot update name:', { player, newPlayerName });
      toast.error('Ошибка: введите имя');
      return;
    }

    try {
      setLoading(true);
      console.log('Updating name for player:', { 
        playerId: player.id, 
        telegram: player.telegram,
        oldName: player.name,
        newName: newPlayerName.trim() 
      });
      
      const { data, error } = await supabase.rpc('update_player_safe', {
        p_player_id: player.id,
        p_name: newPlayerName.trim()
      });

      if (error) {
        console.error('Name update error:', error);
        toast.error(`Ошибка обновления: ${error.message}`);
        throw error;
      }

      const result = data as { success: boolean; error?: string };
      if (!result?.success) {
        console.error('Name update failed:', result?.error);
        toast.error(`Ошибка: ${result?.error || 'Не удалось обновить имя'}`);
        return;
      }

      console.log('Name updated successfully');
      const updatedPlayer = { ...player, name: newPlayerName.trim() };
      setPlayer(updatedPlayer);
      onStatsUpdate(updatedPlayer);
      setEditingName(false);
      setNewPlayerName("");
      toast.success('Имя обновлено!');
    } catch (error: any) {
      console.error('Error updating player name:', error);
      toast.error(`Ошибка обновления имени: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const startNameEdit = () => {
    setNewPlayerName(player?.name || "");
    setEditingName(true);
  };

  const cancelNameEdit = () => {
    setEditingName(false);
    setNewPlayerName("");
  };

  // Get mafia rank based on player stats
  const getMafiaStats = () => ({
    gamesPlayed: player?.games_played || 0,
    wins: player?.wins || 0,
    rating: player?.elo_rating || 100
  });

  const mafiaRank = player ? getCurrentMafiaRank(getMafiaStats()) : null;
  const rankProgress = player ? getMafiaRankProgress(getMafiaStats()) : null;
  const rarityInfo = mafiaRank ? getRarityInfo(mafiaRank.rarity) : null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <Badge className="bg-syndikate-orange/20 text-syndikate-orange brutal-border">Запланирован</Badge>;
      case 'registration':
        return <Badge className="bg-syndikate-orange/20 text-syndikate-orange brutal-border">Регистрация</Badge>;
      case 'running':
        return <Badge className="bg-syndikate-red/20 text-syndikate-red brutal-border">Идет</Badge>;
      default:
        return <Badge className="bg-muted text-muted-foreground brutal-border">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPositionColor = (position: number) => {
    if (position === 1) return "text-yellow-400";
    if (position === 2) return "text-gray-300";
    if (position === 3) return "text-orange-400";
    return "text-white/70";
  };

  const getPositionIcon = (position: number) => {
    if (position === 1) return "🥇";
    if (position === 2) return "🥈";
    if (position === 3) return "🥉";
    return `${position}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Создание профиля...</p>
        </div>
      </div>
    );
  }

  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="text-center">
          <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Профиль не найден</p>
          <Button 
            onClick={createPlayerProfile}
            className="mt-4 bg-syndikate-orange hover:bg-syndikate-orange-glow text-background font-bold uppercase shadow-neon-orange"
          >
            Создать профиль
          </Button>
        </div>
      </div>
    );
  }

  const winRate = player.games_played ? Math.round((player.wins / player.games_played) * 100) : 0;
  const avgPosition = gameResults.length > 0 ? 
    Math.round(gameResults.reduce((sum, result) => sum + result.position, 0) / gameResults.length * 10) / 10 : 0;
  
  // Calculate total RPS earned from game results (last tournament)
  const lastTournamentRPS = gameResults.length > 0 ? (() => {
    const lastResult = gameResults[0];
    // RPS calculation: position 1 = 50% of pool, 2 = 30%, 3 = 20%
    const poolRPS = convertFeeToRPS(lastResult.tournament.participation_fee);
    if (lastResult.position === 1) return Math.round(poolRPS * 5 * 0.5); // Примерно 5 игроков
    if (lastResult.position === 2) return Math.round(poolRPS * 5 * 0.3);
    if (lastResult.position === 3) return Math.round(poolRPS * 5 * 0.2);
    return 0;
  })() : 0;
  
  // Total RPS earned from all games
  const totalRPSEarned = gameResults.reduce((sum, result) => {
    const poolRPS = convertFeeToRPS(result.tournament.participation_fee);
    if (result.position === 1) return sum + Math.round(poolRPS * 5 * 0.5);
    if (result.position === 2) return sum + Math.round(poolRPS * 5 * 0.3);
    if (result.position === 3) return sum + Math.round(poolRPS * 5 * 0.2);
    return sum;
  }, 0);
  
  const recentForm = gameResults.slice(0, 5).map(r => r.position <= 3 ? '✅' : '❌').join('');
  
  // Get rank-specific profile styling
  const rankStyle = getRankProfileStyle(mafiaRank);
  return (
    <div className="space-y-4 pb-20 px-4 pt-24 bg-transparent min-h-screen relative z-10">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 bg-syndikate-orange brutal-border flex items-center justify-center">
          <Trophy className="h-5 w-5 text-background" />
        </div>
        <div>
          <h2 className="font-display text-3xl uppercase text-foreground tracking-wider">ПРОФИЛЬ</h2>
          <div className="h-[2px] w-16 bg-gradient-neon mt-2"></div>
        </div>
      </div>

      {/* Profile Header with Rank-Specific Styling */}
      <Card className={`brutal-border backdrop-blur-xl shadow-brutal relative overflow-hidden group ${rankStyle.bgPattern}`}>
        {/* Rank-specific background overlay */}
        <div className={`absolute inset-0 ${rankStyle.bgOverlay}`}></div>
        
        {/* Rank-specific decorations */}
        {rankStyle.decorations}
        
        <CardContent className="p-6 relative z-10">
          <div className="text-center space-y-4">
            {/* Avatar with Rank-Specific Glitch Frame */}
            <div className="relative inline-block">
              <GlitchAvatarFrame rank={mafiaRank} size="md">
                <Avatar className="w-24 h-24 mx-auto brutal-border relative">
                  <AvatarImage src={player.avatar_url ? fixStorageUrl(player.avatar_url) : undefined} alt={player.name} />
                  <AvatarFallback className="text-xl bg-syndikate-orange text-background font-bold uppercase">
                    {player.name?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </GlitchAvatarFrame>
              <Button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute -bottom-1 -right-1 brutal-border w-7 h-7 p-0 shadow-lg hover:scale-110 transition-transform bg-syndikate-orange hover:bg-syndikate-orange-glow z-20"
                size="sm"
              >
                <Camera className="h-3.5 w-3.5" />
              </Button>
            </div>
            
            {/* Name with Rank-Specific Styling */}
            <div className="space-y-3">
              {editingName ? (
                <div className="flex items-center gap-2 justify-center">
                  <Input
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="text-center text-lg font-bold uppercase max-w-xs bg-background/50 brutal-border text-foreground placeholder:text-muted-foreground backdrop-blur-sm"
                    placeholder="Введите новое имя"
                    onKeyPress={(e) => e.key === 'Enter' && handleNameUpdate()}
                  />
                  <Button
                    onClick={handleNameUpdate}
                    size="sm"
                    className="h-7 w-7 p-0 bg-syndikate-orange brutal-border hover:bg-syndikate-orange-glow"
                    disabled={!newPlayerName.trim() || loading}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={cancelNameEdit}
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 brutal-border border-border hover:bg-background/50"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <h1 className={`text-2xl font-display font-bold tracking-wider uppercase ${rankStyle.nameClass}`}>
                    {player.name}
                  </h1>
                  <Button
                    onClick={startNameEdit}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-background/30 text-muted-foreground hover:text-foreground brutal-border"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              {/* Mafia Rank Display */}
              <div className="flex flex-col items-center gap-3">
                {/* Rank Avatar + Badge */}
                <div className="flex items-center gap-3">
                  <div className={`relative ${mafiaRank?.rarity === 'godfather' || mafiaRank?.rarity === 'boss' ? 'animate-pulse' : ''}`}>
                    <img 
                      src={mafiaRank?.avatar} 
                      alt={mafiaRank?.name}
                      className={`w-12 h-12 rounded-full shadow-xl ${mafiaRank?.rarity === 'godfather' ? 'ring-2 ring-cyan-400' : mafiaRank?.rarity === 'boss' ? 'ring-2 ring-rose-400' : 'border-2 border-white/20'}`}
                    />
                  </div>
                  <div className="flex flex-col items-start">
                    <Badge className={`bg-gradient-to-r ${mafiaRank?.bgGradient || 'from-zinc-600 to-zinc-800'} brutal-border border-0 px-4 py-1.5 font-bold text-base uppercase tracking-wider shadow-brutal ${mafiaRank?.rarity === 'godfather' ? 'animate-shimmer' : ''}`}>
                      {mafiaRank?.name || 'Аутсайдер'}
                    </Badge>
                    <span className={`text-sm ${mafiaRank?.textColor || 'text-zinc-400'} font-medium mt-1`}>
                      {mafiaRank?.title || 'Ещё не в семье'}
                    </span>
                  </div>
                </div>
                
                {/* Rarity Badge */}
                {rarityInfo && (
                  <Badge className={`${rarityInfo.class} text-xs px-3 py-1 rounded-sm font-bold tracking-wide shadow-md`}>
                    {rarityInfo.label} • +{rarityInfo.xp} XP
                  </Badge>
                )}
              </div>
              
              {/* Progress to Next Rank */}
              {rankProgress?.next && (
                <div className="mt-4 px-4 space-y-2 bg-background/20 rounded-lg p-3 backdrop-blur-sm">
                  <div className="flex justify-between text-xs text-foreground/80">
                    <span className="flex items-center gap-2">
                      <img src={rankProgress.next.avatar} alt={rankProgress.next.name} className="w-5 h-5 rounded-full" />
                      {rankProgress.next.name}
                    </span>
                    <span className="font-bold">{Math.round(rankProgress.progress)}%</span>
                  </div>
                  <Progress value={rankProgress.progress} className={`h-2.5 bg-background/30 ${mafiaRank?.rarity === 'godfather' ? '[&>div]:bg-gradient-to-r [&>div]:from-cyan-400 [&>div]:via-purple-400 [&>div]:to-pink-400' : ''}`} />
                  <div className="flex flex-wrap gap-1.5 justify-center">
                    {rankProgress.details.map((detail, i) => (
                      <span key={i} className="text-[11px] text-foreground/70 bg-background/30 px-2 py-1 rounded">
                        {detail}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            {/* Main Stats */}
            <div className="flex items-center justify-center gap-4 pt-3 border-t-2 border-dashed border-syndikate-orange/30">
              <div className="text-center">
                <p className="text-lg font-bold text-syndikate-orange neon-orange">{player.elo_rating}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">RPS</p>
              </div>
              <div className="w-px h-6 bg-border"></div>
              <div className="text-center">
                <p className="text-lg font-bold text-syndikate-orange">{player.wins}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Побед</p>
              </div>
              <div className="w-px h-6 bg-border"></div>
              <div className="text-center">
                <p className="text-lg font-bold text-foreground">{player.games_played}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Игр</p>
              </div>
              <div className="w-px h-6 bg-border"></div>
              <div className="text-center">
                <p className="text-lg font-bold text-syndikate-red">{winRate}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">Винрейт</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mafia Hierarchy Section */}
      <MafiaHierarchy 
        gamesPlayed={player.games_played}
        wins={player.wins}
        rating={player.elo_rating}
      />

      {/* Advanced Statistics */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">Средняя позиция</h3>
                <p className="text-syndikate-orange text-lg font-bold">{avgPosition || 'N/A'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <CardContent className="p-4 relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center">
                <Trophy className="h-4 w-4 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">Заработано RPS</h3>
                <p className="text-syndikate-orange text-lg font-bold">{totalRPSEarned} RPS</p>
                {lastTournamentRPS > 0 && (
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wider">
                    Последний турнир: +{lastTournamentRPS} RPS
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Form */}
      <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-syndikate-red brutal-border flex items-center justify-center">
              <Flame className="h-4 w-4 text-background" />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">Последние результаты</h3>
              <p className="text-syndikate-orange text-sm font-mono font-bold tracking-wider">{recentForm || 'Нет данных'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Registered Tournaments */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-1 h-5 bg-gradient-neon brutal-border"></div>
          <h3 className="text-foreground font-display font-bold text-base tracking-wider uppercase">МОИ ТУРНИРЫ ({userTournaments.length})</h3>
        </div>
        
        {userTournaments.length > 0 ? (
          <div className="space-y-4">
            {userTournaments.map((reg) => (
              <div key={reg.id} className="relative group">
                {/* External Neon Glow */}
                <div className="absolute -inset-1 bg-gradient-to-r from-syndikate-orange via-syndikate-red to-syndikate-orange rounded opacity-0 group-hover:opacity-30 blur-xl transition-all duration-500"></div>
                
                <Card className="bg-gradient-to-br from-syndikate-metal/95 to-syndikate-concrete/90 brutal-border backdrop-blur-xl shadow-brutal group-hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden">
                  {/* Warning Stripes at Top */}
                  <div 
                    className="absolute top-0 left-0 right-0 h-1.5 opacity-50"
                    style={{
                      backgroundImage: 'repeating-linear-gradient(45deg, rgba(255, 135, 31, 0.4), rgba(255, 135, 31, 0.4) 6px, transparent 6px, transparent 12px)'
                    }}
                  />
                  
                  {/* Corner Brackets */}
                  <div className="absolute top-2 left-2 w-5 h-5 border-l-2 border-t-2 border-syndikate-orange transition-all duration-300 group-hover:w-7 group-hover:h-7" />
                  <div className="absolute top-2 right-2 w-5 h-5 border-r-2 border-t-2 border-syndikate-orange transition-all duration-300 group-hover:w-7 group-hover:h-7" />
                  <div className="absolute bottom-2 left-2 w-5 h-5 border-l-2 border-b-2 border-syndikate-orange transition-all duration-300 group-hover:w-7 group-hover:h-7" />
                  <div className="absolute bottom-2 right-2 w-5 h-5 border-r-2 border-b-2 border-syndikate-orange transition-all duration-300 group-hover:w-7 group-hover:h-7" />
                  
                  {/* Ticket Perforations */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-r-full -ml-1.5"></div>
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-6 bg-background rounded-l-full -mr-1.5"></div>
                  
                  {/* Industrial Texture */}
                  <div className="absolute inset-0 industrial-texture opacity-15" />
                  
                  {/* Metal Grid Overlay */}
                  <div 
                    className="absolute inset-0 opacity-5"
                    style={{
                      backgroundImage: `
                        repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255, 135, 31, 0.1) 2px, rgba(255, 135, 31, 0.1) 3px),
                        repeating-linear-gradient(90deg, transparent, transparent 2px, rgba(255, 135, 31, 0.1) 2px, rgba(255, 135, 31, 0.1) 3px)
                      `,
                      backgroundSize: '16px 16px'
                    }}
                  />
                  
                  {/* Animated Glow */}
                  <div className="absolute top-0 right-0 w-20 h-20 bg-syndikate-orange/15 rounded-full blur-2xl animate-pulse" />
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-50 group-hover:opacity-100 transition-opacity duration-500"></div>
                  
                  {/* Metallic shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                  
                  <CardContent className="p-4 pt-5 relative z-10">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-7 h-7 bg-syndikate-orange brutal-border flex items-center justify-center animate-pulse shadow-neon-orange">
                            <CheckCircle className="h-3.5 w-3.5 text-background" />
                          </div>
                          <div className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 brutal-border text-[10px] uppercase font-bold tracking-wider">
                            ✓ ЗАРЕГИСТРИРОВАН
                          </div>
                          {getStatusBadge(reg.tournament.status)}
                        </div>
                        
                        <h3 className="text-lg font-display font-bold text-foreground tracking-wide uppercase group-hover:text-syndikate-orange transition-colors duration-300 leading-tight">
                          {reg.tournament.name}
                        </h3>
                        {reg.tournament.description && (
                          <p className="text-muted-foreground text-xs mt-1 line-clamp-1">{reg.tournament.description}</p>
                        )}
                      </div>
                      
                      {/* Ticket Number */}
                      <div className="bg-syndikate-orange/20 border border-syndikate-orange/50 px-2 py-1 brutal-border ml-2">
                        <span className="text-[9px] text-syndikate-orange font-bold tracking-widest">#{reg.tournament.id.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>
                    
                    {/* Divider */}
                    <div className="h-[2px] bg-gradient-to-r from-syndikate-orange via-syndikate-red to-syndikate-orange mb-3 opacity-50" />
                    
                    {/* Info Grid */}
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-syndikate-metal/30 brutal-border p-2.5 text-center">
                        <div className="w-6 h-6 bg-syndikate-orange/80 brutal-border flex items-center justify-center mx-auto mb-1">
                          <Calendar className="h-3 w-3 text-background" />
                        </div>
                        <div className="text-foreground font-bold text-sm">
                          {new Date(reg.tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                        </div>
                        <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Дата</div>
                      </div>
                      <div className="bg-syndikate-metal/30 brutal-border p-2.5 text-center">
                        <div className="w-6 h-6 bg-syndikate-orange/80 brutal-border flex items-center justify-center mx-auto mb-1">
                          <Clock className="h-3 w-3 text-background" />
                        </div>
                        <div className="text-syndikate-orange font-bold text-sm">
                          {new Date(reg.tournament.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Время</div>
                      </div>
                      <div className="bg-syndikate-metal/30 brutal-border p-2.5 text-center">
                        <div className="w-6 h-6 bg-syndikate-orange/80 brutal-border flex items-center justify-center mx-auto mb-1">
                          <Coins className="h-3 w-3 text-background" />
                        </div>
                        <div className="text-syndikate-orange font-bold text-sm">
                          {reg.tournament.participation_fee.toLocaleString()}₽
                        </div>
                        <div className="text-[8px] text-muted-foreground uppercase tracking-wider">Взнос</div>
                      </div>
                    </div>
                    
                    {/* Additional Info */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-syndikate-metal/20 brutal-border p-2 flex items-center gap-2">
                        <Users className="h-4 w-4 text-syndikate-orange" />
                        <div>
                          <div className="text-foreground font-bold text-xs">
                            {reg.tournament.participant_count || 0}/{reg.tournament.max_players}
                          </div>
                          <div className="text-[8px] text-muted-foreground uppercase">Игроков</div>
                        </div>
                      </div>
                      <div className="bg-syndikate-metal/20 brutal-border p-2 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-syndikate-orange" />
                        <div>
                          <div className="text-foreground font-bold text-xs">
                            {reg.tournament.total_rps_pool || 0} RPS
                          </div>
                          <div className="text-[8px] text-muted-foreground uppercase">Фонд</div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    {onUnregister && reg.tournament.status !== 'running' && reg.tournament.status !== 'completed' && (
                      <Button
                        onClick={async (e) => {
                          e.stopPropagation();
                          setUnregistering(reg.tournament.id);
                          await onUnregister(reg.tournament.id);
                          setUserTournaments(prev => prev.filter(t => t.tournament.id !== reg.tournament.id));
                          setUnregistering("");
                        }}
                        variant="outline"
                        size="sm"
                        disabled={unregistering === reg.tournament.id}
                        className="w-full bg-syndikate-red/10 border-syndikate-red/30 text-syndikate-red hover:bg-syndikate-red/20 hover:border-syndikate-red/50 brutal-border transition-all duration-300 text-xs font-bold uppercase tracking-wider"
                      >
                        {unregistering === reg.tournament.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-syndikate-red"></div>
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1.5" />
                            Отменить регистрацию
                          </>
                        )}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        ) : (
          <Card className="bg-syndikate-metal/50 brutal-border backdrop-blur-xl">
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-syndikate-orange/50 mx-auto mb-4" />
              <p className="text-foreground text-lg font-bold uppercase mb-2">Нет активных регистраций</p>
              <p className="text-muted-foreground text-sm">
                Зарегистрируйтесь на турниры на главной странице
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Game History */}
      {gameResults.length > 0 && (
        <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal">
          <CardHeader className="pb-3">
            <CardTitle className="text-foreground font-display uppercase text-sm flex items-center gap-2 font-bold tracking-wider">
              <Activity className="h-4 w-4 text-syndikate-orange" />
              История игр
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="space-y-2">
              {gameResults.slice(0, 5).map((result) => (
                <div key={result.id} className="flex items-center justify-between p-2 bg-syndikate-concrete/30 brutal-border backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className={`text-lg ${getPositionColor(result.position)}`}>
                      {getPositionIcon(result.position)}
                    </div>
                    <div>
                      <p className="text-foreground text-xs font-bold uppercase tracking-wide">{result.tournament.name}</p>
                      <p className="text-muted-foreground text-xs">{formatDate(result.created_at)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${result.elo_change >= 0 ? 'text-syndikate-orange' : 'text-syndikate-red'}`}>
                      {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                    </p>
                    <p className="text-muted-foreground text-xs font-bold">{result.elo_after}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Telegram Info */}
      <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <CardContent className="p-4 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-syndikate-orange brutal-border flex items-center justify-center">
              <Users className="h-4 w-4 text-background" />
            </div>
            <div className="flex-1">
              <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">Телеграм аккаунт</h3>
              <p className="text-muted-foreground text-xs font-medium">
                {telegramUser?.username ? `@${telegramUser.username}` : telegramUser?.firstName || 'Пользователь'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avatar Selector Modal */}
      {showAvatarSelector && player && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 industrial-texture">
          <div className="bg-syndikate-metal brutal-border p-6 max-w-md w-full shadow-brutal backdrop-blur-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-foreground font-display font-bold uppercase tracking-wider">Выберите аватар</h3>
              <Button
                onClick={() => setShowAvatarSelector(false)}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground brutal-border"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AvatarSelector
              onSelect={handleAvatarUpdate}
              onClose={() => setShowAvatarSelector(false)}
              playerId={player.id}
            />
          </div>
        </div>
      )}
    </div>
  );
}