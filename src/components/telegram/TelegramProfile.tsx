import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
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
  User
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
}

export function TelegramProfile({ telegramUser, userStats, onStatsUpdate }: TelegramProfileProps) {
  const [player, setPlayer] = useState<Player | null>(userStats);
  const [loading, setLoading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  // Если нет игрока, но есть телеграм пользователь, создаем профиль
  React.useEffect(() => {
    if (!player && telegramUser) {
      createPlayerProfile();
    } else if (userStats) {
      setPlayer(userStats);
    }
  }, [userStats, telegramUser, player]);

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
        wins: 0
      });
      
      // Создаем нового игрока (без user_id для телеграм пользователей)
      const { data: newPlayer, error: createError } = await supabase
        .from('players')
        .insert({
          name: playerName,
          telegram: telegramId,
          elo_rating: 1000,
          games_played: 0,
          wins: 0
          // user_id не устанавливается для телеграм пользователей
        })
        .select()
        .single();
        
      console.log('Create player result:', { newPlayer, createError });
        
      if (createError) {
        console.error('Error creating player:', createError);
        toast.error(`Ошибка создания профиля: ${createError.message}`);
        return;
      }
      
      setPlayer(newPlayer);
      onStatsUpdate(newPlayer);
      toast.success('Профиль успешно создан!');
    } catch (error) {
      console.error('Error in createPlayerProfile:', error);
      toast.error(`Ошибка создания профиля: ${error.message || 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpdate = async (avatarUrl: string) => {
    if (!player) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('players')
        .update({ avatar_url: avatarUrl })
        .eq('id', player.id);

      if (error) throw error;

      const updatedPlayer = { ...player, avatar_url: avatarUrl };
      setPlayer(updatedPlayer);
      onStatsUpdate(updatedPlayer);
      setShowAvatarSelector(false);
      toast.success('Аватар обновлен!');
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast.error('Ошибка обновления аватара');
    } finally {
      setLoading(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!player || !newPlayerName.trim()) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('players')
        .update({ name: newPlayerName.trim() })
        .eq('id', player.id);

      if (error) throw error;

      const updatedPlayer = { ...player, name: newPlayerName.trim() };
      setPlayer(updatedPlayer);
      onStatsUpdate(updatedPlayer);
      setEditingName(false);
      setNewPlayerName("");
      toast.success('Имя обновлено!');
    } catch (error) {
      console.error('Error updating player name:', error);
      toast.error('Ошибка обновления имени');
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
    if (rating >= 1400) return "Продвинутый";
    if (rating >= 1200) return "Любитель";
    return "Новичок";
  };

  const getRankIcon = (rating: number) => {
    if (rating >= 1800) return Crown;
    if (rating >= 1600) return Trophy;
    if (rating >= 1400) return Award;
    if (rating >= 1200) return Star;
    return Shield;
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
          <User className="h-12 w-12 text-white/30 mx-auto mb-4" />
          <p className="text-white/70 text-sm">Профиль не найден</p>
          <Button 
            onClick={createPlayerProfile}
            className="mt-4 bg-amber-500 hover:bg-amber-600"
          >
            Создать профиль
          </Button>
        </div>
      </div>
    );
  }

  const RankIcon = getRankIcon(player.elo_rating);
  const winRate = player.games_played ? Math.round((player.wins / player.games_played) * 100) : 0;

  return (
    <div className="space-y-4 pb-20 px-4 bg-transparent min-h-screen relative z-10">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
          <Trophy className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-light text-white tracking-wider">ПРОФИЛЬ</h2>
          <div className="h-0.5 w-16 bg-gradient-to-r from-amber-400 to-amber-600 mt-2"></div>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-amber-400/20 backdrop-blur-xl shadow-xl">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            {/* Avatar */}
            <div className="relative inline-block">
              <Avatar className="w-20 h-20 mx-auto border-2 border-white/20 shadow-xl">
                <AvatarImage src={player.avatar_url} alt={player.name} />
                <AvatarFallback className="text-lg bg-gradient-to-br from-amber-500 to-amber-600 text-white">
                  {player.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <Button
                onClick={() => setShowAvatarSelector(true)}
                className="absolute -bottom-1 -right-1 rounded-full w-6 h-6 p-0 shadow-lg hover:scale-110 transition-transform bg-amber-500 hover:bg-amber-600"
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
                    className="text-center text-lg font-bold max-w-xs bg-white/10 border-white/20 text-white placeholder:text-white/50"
                    placeholder="Введите новое имя"
                    onKeyPress={(e) => e.key === 'Enter' && handleNameUpdate()}
                  />
                  <Button
                    onClick={handleNameUpdate}
                    size="sm"
                    className="h-6 w-6 p-0 bg-green-500 hover:bg-green-600"
                    disabled={!newPlayerName.trim() || loading}
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button
                    onClick={cancelNameEdit}
                    variant="outline"
                    size="sm"
                    className="h-6 w-6 p-0 border-white/20 hover:bg-white/10"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 justify-center">
                  <h1 className="text-xl font-light text-white tracking-wide">{player.name}</h1>
                  <Button
                    onClick={startNameEdit}
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-white/10 text-white/70 hover:text-white"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2">
                <Badge className={`bg-gradient-to-r ${getRankClass(player.elo_rating)} text-white border-0 px-3 py-1 font-medium text-sm`}>
                  <RankIcon className="h-3 w-3 mr-1" />
                  {getRankTitle(player.elo_rating)}
                </Badge>
              </div>
            </div>
            
            {/* Stats */}
            <div className="flex items-center justify-center gap-4 pt-3 border-t border-white/10">
              <div className="text-center">
                <p className="text-lg font-light text-amber-400">{player.elo_rating}</p>
                <p className="text-xs text-white/60">RPS Рейтинг</p>
              </div>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="text-center">
                <p className="text-lg font-light text-green-400">{player.wins}</p>
                <p className="text-xs text-white/60">Побед</p>
              </div>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="text-center">
                <p className="text-lg font-light text-blue-400">{player.games_played}</p>
                <p className="text-xs text-white/60">Игр</p>
              </div>
              <div className="w-px h-6 bg-white/20"></div>
              <div className="text-center">
                <p className="text-lg font-light text-purple-400">{winRate}%</p>
                <p className="text-xs text-white/60">Винрейт</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Telegram Info */}
      <Card className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 border border-white/10 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
              <Users className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium text-sm">Телеграм аккаунт</h3>
              <p className="text-white/60 text-xs">
                {telegramUser?.username ? `@${telegramUser.username}` : telegramUser?.firstName || 'Пользователь'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Card */}
      <Card className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 border border-white/10 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-white font-medium text-sm">Игровая статистика</h3>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-xs">Рейтинг ELO</span>
              <span className="text-amber-400 font-medium text-sm">{player.elo_rating}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-xs">Процент побед</span>
              <span className="text-green-400 font-medium text-sm">{winRate}%</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-xs">Турниров сыграно</span>
              <span className="text-blue-400 font-medium text-sm">{player.games_played}</span>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-white/70 text-xs">Побед всего</span>
              <span className="text-purple-400 font-medium text-sm">{player.wins}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-xl border border-white/20 p-6 max-w-md w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Выберите аватар</h3>
              <Button
                onClick={() => setShowAvatarSelector(false)}
                variant="ghost"
                size="sm"
                className="text-white/70 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <AvatarSelector
              onSelect={handleAvatarUpdate}
              onClose={() => setShowAvatarSelector(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}