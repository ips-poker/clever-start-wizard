import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { 
  Trophy, 
  TrendingUp, 
  Target, 
  Award, 
  Edit3, 
  Check, 
  X, 
  Users, 
  Calendar,
  Star,
  Crown,
  Zap,
  Shield,
  Camera,
  History
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
  tournament: { name: string };
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
  const [gameResults, setGameResults] = useState<GameResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [newPlayerName, setNewPlayerName] = useState("");

  useEffect(() => {
    if (userStats) {
      setPlayer(userStats);
      loadGameResults(userStats.id);
    }
  }, [userStats]);

  const loadGameResults = async (playerId: string) => {
    if (!playerId) return;

    try {
      const { data, error } = await supabase
        .from('game_results')
        .select(`
          *,
          tournament:tournaments(name)
        `)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setGameResults(data || []);
    } catch (error) {
      console.error('Error loading game results:', error);
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
      toast("Аватар обновлен!");
    } catch (error) {
      console.error('Error updating avatar:', error);
      toast("Ошибка при обновлении аватара");
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
      toast("Имя обновлено!");
    } catch (error) {
      console.error('Error updating player name:', error);
      toast("Ошибка при обновлении имени");
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

  if (!player) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-transparent">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-400 mx-auto mb-4"></div>
          <p className="text-white/70 text-sm">Загрузка профиля...</p>
        </div>
      </div>
    );
  }

  const RankIcon = getRankIcon(player.elo_rating);
  const winRate = player.games_played ? Math.round((player.wins / player.games_played) * 100) : 0;

  return (
    <div className="space-y-4 pb-20 px-4 bg-transparent min-h-screen relative z-10">
      {/* Покерные масти в фоне */}
      <div className="absolute inset-0 opacity-3 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-8 text-4xl text-amber-400 transform rotate-12 animate-pulse">♠</div>
        <div className="absolute top-40 right-12 text-3xl text-amber-500 transform -rotate-12 animate-bounce-subtle">♥</div>
        <div className="absolute top-80 left-16 text-5xl text-amber-400 transform rotate-45 animate-pulse">♦</div>
        <div className="absolute top-96 right-8 text-4xl text-amber-500 transform -rotate-30 animate-bounce-subtle">♣</div>
      </div>

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

      {/* Profile Header */}
      <Card className="bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-black/90 border border-amber-400/20 backdrop-blur-xl shadow-xl group hover:shadow-2xl hover:shadow-amber-500/30 transition-all duration-500 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-600/8 opacity-60 group-hover:opacity-100 transition-opacity duration-500"></div>
        <div className="absolute inset-0 opacity-8 group-hover:opacity-15 transition-opacity duration-500">
          <div className="absolute top-4 right-4 text-amber-400/30 text-2xl animate-pulse">♠</div>
          <div className="absolute bottom-4 left-4 text-amber-400/20 text-xl animate-bounce-subtle">♣</div>
        </div>
        
        <CardContent className="p-6 relative z-10">
          <div className="text-center space-y-4">
            {/* Avatar */}
            <div className="relative inline-block">
              <div className={`absolute inset-0 rounded-full bg-gradient-to-br ${getRankClass(player.elo_rating)} opacity-20 blur-lg scale-110`}></div>
              <Avatar className="relative w-20 h-20 mx-auto border-2 border-white/20 shadow-xl">
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
            
            {/* Quick Stats */}
            <div className="flex items-center justify-center gap-4 pt-3 border-t border-white/10">
              <div className="text-center">
                <p className="text-lg font-light text-amber-400">{player.elo_rating}</p>
                <p className="text-xs text-white/60">Рейтинг</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 border border-white/10 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">{player.elo_rating}</p>
                <p className="text-white/60 text-xs">RPS Рейтинг</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 border border-white/10 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <Trophy className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">{player.wins}</p>
                <p className="text-white/60 text-xs">Побед</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 border border-white/10 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Target className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">{player.games_played}</p>
                <p className="text-white/60 text-xs">Игр сыграно</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 border border-white/10 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Award className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">{winRate}%</p>
                <p className="text-white/60 text-xs">Винрейт</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Games */}
      {gameResults.length > 0 && (
        <Card className="bg-gradient-to-br from-white/5 via-white/10 to-white/5 border border-white/10 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-6 h-6 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-md flex items-center justify-center">
                <History className="h-3 w-3 text-white" />
              </div>
              <h3 className="text-white font-medium text-sm">Последние игры</h3>
            </div>
            
            <div className="space-y-2">
              {gameResults.slice(0, 3).map((result, index) => (
                <div key={result.id} className="p-3 bg-gradient-to-r from-white/5 to-white/10 rounded-lg border border-white/5">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium truncate">{result.tournament.name}</p>
                      <p className="text-white/60 text-xs">Место: {result.position}</p>
                    </div>
                    <div className="text-right">
                      <div className={`flex items-center gap-1 ${result.elo_change >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        <span className="text-sm font-medium">
                          {result.elo_change >= 0 ? '+' : ''}{result.elo_change}
                        </span>
                        <TrendingUp className={`h-3 w-3 ${result.elo_change < 0 ? 'rotate-180' : ''}`} />
                      </div>
                      <p className="text-xs text-white/60">{result.elo_after} RPS</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Avatar Selector Dialog */}
      <Dialog open={showAvatarSelector} onOpenChange={setShowAvatarSelector}>
        <DialogContent className="max-w-md bg-gradient-to-br from-slate-900/98 via-black/95 to-slate-800/98 border-amber-400/20 backdrop-blur-2xl text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-light text-white tracking-wide">Выберите аватар</DialogTitle>
            <DialogDescription className="text-white/60 text-sm">
              Выберите один из предустановленных аватаров для вашего профиля
            </DialogDescription>
          </DialogHeader>
          <AvatarSelector 
            onSelect={handleAvatarUpdate}
            onClose={() => setShowAvatarSelector(false)}
          />
        </DialogContent>
      </Dialog>

      <style>{`
        .animate-bounce-subtle {
          animation: bounce-subtle 3s ease-in-out infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0px) rotate(var(--tw-rotate)); }
          50% { transform: translateY(-8px) rotate(var(--tw-rotate)); }
        }
      `}</style>
    </div>
  );
}