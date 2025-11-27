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
  tournament_registrations?: Array<{ count: number }>;
}

interface TournamentRegistration {
  id: string;
  tournament_id: string;
  status: string;
  created_at: string;
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
      
      const { data, error } = await supabase
        .from('tournament_registrations')
        .select(`
          *,
          tournament:tournaments(*)
        `)
        .eq('player_id', player.id)
        .in('status', ['registered', 'confirmed', 'playing', 'eliminated'])
        .order('created_at', { ascending: false });

      console.log('Tournament registrations result:', { data, error });

      if (error) throw error;
      setUserTournaments(data || []);
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

  const getRankClass = (rating: number) => {
    if (rating >= 1800) return "from-yellow-400 to-yellow-600";
    if (rating >= 1600) return "from-purple-400 to-purple-600";
    if (rating >= 1400) return "from-blue-400 to-blue-600";
    if (rating >= 1200) return "from-green-400 to-green-600";
    return "from-gray-400 to-gray-600";
  };

  const getRankTitle = (rating: number) => {
    if (rating >= 1800) return "Мастер";
    if (rating >= 1600) return "Эксперт";
    if (rating >= 1400) return "Про";
    if (rating >= 1200) return "Игрок";
    return "Новичок";
  };

  const getRankIcon = (rating: number) => {
    if (rating >= 1800) return Crown;
    if (rating >= 1600) return Trophy;
    if (rating >= 1400) return Award;
    if (rating >= 1200) return Star;
    return Shield;
  };

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

  const RankIcon = getRankIcon(player.elo_rating);
  const winRate = player.games_played ? Math.round((player.wins / player.games_played) * 100) : 0;
  const avgPosition = gameResults.length > 0 ? 
    Math.round(gameResults.reduce((sum, result) => sum + result.position, 0) / gameResults.length * 10) / 10 : 0;
  const totalEarnings = gameResults.reduce((sum, result) => {
    if (result.position === 1) sum += result.tournament.participation_fee * 0.5; // Примерный выигрыш
    if (result.position === 2) sum += result.tournament.participation_fee * 0.3;
    if (result.position === 3) sum += result.tournament.participation_fee * 0.2;
    return sum;
  }, 0);
  const recentForm = gameResults.slice(0, 5).map(r => r.position <= 3 ? '✅' : '❌').join('');

  return (
    <div className="space-y-4 pb-20 px-4 bg-transparent min-h-screen relative z-10">
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

      {/* Profile Header */}
      <Card className="bg-syndikate-metal/90 brutal-border backdrop-blur-xl shadow-brutal relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-syndikate-orange/5 via-transparent to-syndikate-red/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-10 group-hover:opacity-20 transition-opacity duration-500">
          <div className="absolute top-4 right-4 text-syndikate-orange/30 text-3xl animate-pulse">♠</div>
          <div className="absolute bottom-4 left-4 text-syndikate-orange/20 text-2xl">♣</div>
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="text-center space-y-4">
            {/* Avatar */}
            <div className="relative inline-block">
              <Avatar className="w-20 h-20 mx-auto brutal-border shadow-neon-orange ring-2 ring-syndikate-orange/30">
                <AvatarImage src={player.avatar_url} alt={player.name} />
                <AvatarFallback className="text-lg bg-syndikate-orange text-background font-bold uppercase">
                  {player.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute -bottom-1 -right-1 brutal-border w-6 h-6 p-0 shadow-lg hover:scale-110 transition-transform bg-syndikate-orange hover:bg-syndikate-orange-glow"
                size="sm"
              >
                <Camera className="h-3 w-3" />
              </Button>
            </div>
            
            {/* Name */}
            <div className="space-y-2">
              {editingName ? (
                <div className="flex items-center gap-2 justify-center">
                  <Input
                    value={newPlayerName}
                    onChange={(e) => setNewPlayerName(e.target.value)}
                    className="text-center text-lg font-bold uppercase max-w-xs bg-syndikate-concrete/50 brutal-border text-foreground placeholder:text-muted-foreground backdrop-blur-sm"
                    placeholder="Введите новое имя"
                    onKeyPress={(e) => e.key === 'Enter' && handleNameUpdate()}
                  />
                  <Button
                    onClick={handleNameUpdate}
                    size="sm"
                    className="h-6 w-6 p-0 bg-syndikate-orange brutal-border hover:bg-syndikate-orange-glow"
                    disabled={!newPlayerName.trim() || loading}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={cancelNameEdit}
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 brutal-border border-border hover:bg-syndikate-concrete/50"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <h1 className="text-xl font-display font-bold text-foreground tracking-wider uppercase">{player.name}</h1>
                  <Button
                    onClick={startNameEdit}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-syndikate-concrete/50 text-muted-foreground hover:text-foreground brutal-border"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2">
                <Badge className={`bg-gradient-to-r ${getRankClass(player.elo_rating)} brutal-border border-0 px-3 py-1 font-bold text-sm uppercase tracking-wider shadow-brutal`}>
                  <RankIcon className="h-3 w-3 mr-1" />
                  {getRankTitle(player.elo_rating)}
                </Badge>
              </div>
            </div>
            
            {/* Main Stats */}
            <div className="flex items-center justify-center gap-4 pt-3 border-t-2 border-dashed border-syndikate-orange/30">
              <div className="text-center">
                <p className="text-lg font-bold text-syndikate-orange neon-orange">{player.elo_rating}</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-bold">RPS Рейтинг</p>
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
                <Coins className="h-4 w-4 text-background" />
              </div>
              <div className="flex-1">
                <h3 className="text-foreground font-bold text-sm uppercase tracking-wider">Заработано</h3>
                <p className="text-syndikate-orange text-lg font-bold">{Math.round(totalEarnings)}₽</p>
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
              <Card key={reg.id} className="bg-syndikate-metal/90 brutal-border border-2 border-dashed border-syndikate-orange/40 backdrop-blur-xl shadow-brutal group hover:shadow-neon-orange transition-all duration-500 relative overflow-hidden hover:scale-[1.01]">
                {/* Corner Decorations */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-background brutal-border -ml-2"></div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-background brutal-border -mr-2"></div>
                
                {/* Номер билета */}
                <div className="absolute top-2 right-3 text-syndikate-orange text-xs font-mono tracking-wider bg-syndikate-concrete/50 px-1.5 py-0.5 brutal-border backdrop-blur-sm">
                  #{reg.tournament.id.slice(-6).toUpperCase()}
                </div>
                
                {/* Штрих-код */}
                <div className="absolute bottom-2 right-3 flex gap-0.5">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`bg-blue-400/60 ${i % 2 === 0 ? 'w-0.5 h-3' : 'w-0.5 h-4'}`}></div>
                  ))}
                </div>
                
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-blue-600/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                <CardContent className="p-4 relative z-10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="text-blue-400/80 text-xs font-semibold uppercase tracking-wider mb-1">🎫 МОЙ БИЛЕТ</div>
                      <h3 className="text-lg font-bold text-white tracking-wide uppercase mb-1 group-hover:text-blue-100 transition-colors duration-300">
                        {reg.tournament.name}
                      </h3>
                      <div className="h-0.5 w-8 bg-gradient-to-r from-blue-400 to-blue-600 group-hover:w-12 transition-all duration-500 rounded-full"></div>
                      {reg.tournament.description && (
                        <p className="text-white/60 text-xs mt-1 line-clamp-1">{reg.tournament.description}</p>
                      )}
                    </div>
                    <div className="w-8 h-8 bg-white/10 backdrop-blur-sm rounded-lg flex items-center justify-center border border-blue-400/30 group-hover:scale-110 transition-transform duration-300">
                      <CheckCircle className="h-4 w-4 text-blue-400" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-lg border border-white/10 group-hover:border-blue-400/20 transition-all duration-300 backdrop-blur-sm">
                      <div className="w-6 h-6 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Clock className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <span className="text-white font-bold text-xs">{new Date(reg.tournament.start_time).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</span>
                        <p className="text-white/60 text-xs">{new Date(reg.tournament.start_time).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-white/8 via-white/12 to-white/8 rounded-lg border border-white/10 group-hover:border-blue-400/20 transition-all duration-300 backdrop-blur-sm">
                      <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Coins className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <span className="text-white font-bold text-xs">{reg.tournament.participation_fee.toLocaleString()} ₽</span>
                        <p className="text-white/60 text-xs">орг. взнос</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-3">
                    <Badge className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 border border-emerald-500/40 hover:from-emerald-500/30 hover:to-green-500/30 transition-all duration-300 px-3 py-1 text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-500/20">
                      <CheckCircle className="h-3 w-3 mr-1.5" />
                      Зарегистрирован
                    </Badge>
                    
                    <div className="flex items-center gap-2">
                      {getStatusBadge(reg.tournament.status)}
                      {onUnregister && reg.tournament.status !== 'running' && reg.tournament.status !== 'completed' && (
                        <Button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setUnregistering(reg.tournament.id);
                            await onUnregister(reg.tournament.id);
                            // Удаляем турнир из локального списка после успешной отмены
                            setUserTournaments(prev => prev.filter(t => t.tournament.id !== reg.tournament.id));
                            setUnregistering("");
                          }}
                          variant="outline"
                          size="sm"
                          disabled={unregistering === reg.tournament.id}
                          className="bg-gradient-to-r from-red-500/10 to-rose-500/10 border-red-500/40 text-red-400 hover:from-red-500/20 hover:to-rose-500/20 hover:text-red-300 hover:border-red-400/60 transition-all duration-300 px-3 py-1 h-auto text-xs font-semibold shadow-lg shadow-red-500/20 hover:shadow-red-500/30"
                        >
                          {unregistering === reg.tournament.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-400"></div>
                          ) : (
                            <>
                              <X className="h-3 w-3 mr-1" />
                              Отменить
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {userTournaments.length > 5 && (
              <p className="text-white/60 text-xs text-center mt-3">
                Показано первые 5 турниров из {userTournaments.length}
              </p>
            )}
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