import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Edit, 
  Save, 
  Trash2, 
  AlertTriangle,
  User,
  Trophy,
  RotateCcw,
  UserMinus,
  Users,
  TrendingUp,
  Percent,
  Zap,
  Target,
  Award
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Player {
  id: string;
  name: string;
  elo_rating: number;
  games_played: number;
  wins: number;
}

interface GameResult {
  id: string;
  tournament_id: string;
  player_id: string;
  position: number;
  elo_before: number;
  elo_after: number;
  elo_change: number;
  created_at: string;
  players: {
    name: string;
  };
  tournaments: {
    name: string;
  };
}

interface Tournament {
  id: string;
  name: string;
  status: string;
}

interface ManualAdjustmentsProps {
  tournaments: Tournament[];
  selectedTournament: Tournament | null;
  onRefresh: () => void;
}

const ManualAdjustments = ({ tournaments, selectedTournament, onRefresh }: ManualAdjustmentsProps) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [results, setResults] = useState<GameResult[]>([]);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [editingResult, setEditingResult] = useState<GameResult | null>(null);
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [newPlayerRating, setNewPlayerRating] = useState(0);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPlayers();
    if (selectedTournament) {
      loadResults();
    }
  }, [selectedTournament]);

  const loadPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('*')
        .order('elo_rating', { ascending: false });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading players:', error);
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить список игроков',
        variant: 'destructive'
      });
    }
  };

  const loadResults = async () => {
    if (!selectedTournament) return;

    try {
      const { data, error } = await supabase
        .from('game_results')
        .select(`
          *,
          players(name),
          tournaments(name)
        `)
        .eq('tournament_id', selectedTournament.id)
        .order('position');

      if (error) throw error;
      setResults(data || []);
    } catch (error) {
      console.error('Error loading results:', error);
      toast({
        title: 'Ошибка загрузки',
        description: 'Не удалось загрузить результаты турнира',
        variant: 'destructive'
      });
    }
  };

  const adjustPlayerRating = async () => {
    if (!editingPlayer || !adjustmentReason.trim()) return;

    setLoading(true);
    try {
      const ratingDifference = newPlayerRating - editingPlayer.elo_rating;

      // Используем RPC функцию для безопасного обновления
      const { error: playerError } = await supabase.rpc('update_player_safe', {
        p_player_id: editingPlayer.id,
        p_name: editingPlayer.name,
        p_avatar_url: null
      });

      // Если RPC не сработала, пробуем напрямую
      if (playerError) {
        console.log('RPC failed, trying direct update:', playerError);
        const { error: directError } = await supabase
          .from('players')
          .update({ elo_rating: newPlayerRating })
          .eq('id', editingPlayer.id);

        if (directError) throw directError;
      } else {
        // Обновляем рейтинг отдельно
        const { error: ratingError } = await supabase
          .from('players')
          .update({ elo_rating: newPlayerRating })
          .eq('id', editingPlayer.id);
        
        if (ratingError) {
          console.error('Rating update error:', ratingError);
        }
      }

      // Не записываем в game_results для ручных корректировок,
      // так как tournament_id обязателен
      console.log(`Ручная корректировка рейтинга: ${editingPlayer.name}, ${editingPlayer.elo_rating} -> ${newPlayerRating}, причина: ${adjustmentReason}`);

      toast({
        title: 'Рейтинг обновлен',
        description: `Рейтинг игрока ${editingPlayer.name} изменен на ${ratingDifference > 0 ? '+' : ''}${ratingDifference}`,
      });

      setEditingPlayer(null);
      setAdjustmentReason('');
      setNewPlayerRating(0);
      loadPlayers();
      onRefresh();
    } catch (error: any) {
      console.error('Error adjusting rating:', error);
      toast({
        title: 'Ошибка обновления',
        description: error.message || 'Не удалось обновить рейтинг',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteResult = async (resultId: string) => {
    try {
      const { error } = await supabase
        .from('game_results')
        .delete()
        .eq('id', resultId);

      if (error) throw error;

      toast({
        title: 'Результат удален',
        description: 'Запись результата успешно удалена',
      });

      loadResults();
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка удаления',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const updateResult = async () => {
    if (!editingResult) return;

    try {
      const { error } = await supabase
        .from('game_results')
        .update({
          position: editingResult.position,
          elo_change: editingResult.elo_change,
          elo_after: editingResult.elo_before + editingResult.elo_change
        })
        .eq('id', editingResult.id);

      if (error) throw error;

      const { error: playerError } = await supabase
        .from('players')
        .update({
          elo_rating: editingResult.elo_before + editingResult.elo_change
        })
        .eq('id', editingResult.player_id);

      if (playerError) throw playerError;

      toast({
        title: 'Результат обновлен',
        description: 'Результат турнира успешно изменен',
      });

      setEditingResult(null);
      loadResults();
      loadPlayers();
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка обновления',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const deletePlayer = async (playerId: string, playerName: string) => {
    try {
      const { error: resultsError } = await supabase
        .from('game_results')
        .delete()
        .eq('player_id', playerId);

      if (resultsError) throw resultsError;

      const { error: registrationsError } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('player_id', playerId);

      if (registrationsError) throw registrationsError;

      const { error: playerError } = await supabase
        .from('players')
        .delete()
        .eq('id', playerId);

      if (playerError) throw playerError;

      toast({
        title: 'Игрок удален',
        description: `Игрок ${playerName} и вся связанная с ним информация удалены из системы`,
      });

      loadPlayers();
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка удаления',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const resetPlayerStats = async (playerId: string) => {
    try {
      const { error } = await supabase
        .from('players')
        .update({
          elo_rating: 100,
          games_played: 0,
          wins: 0
        })
        .eq('id', playerId);

      if (error) throw error;

      toast({
        title: 'Статистика сброшена',
        description: 'Статистика игрока сброшена к начальным значениям',
      });

      loadPlayers();
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка сброса',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  const clearAllPlayers = async () => {
    try {
      const { error: resultsError } = await supabase
        .from('game_results')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (resultsError) throw resultsError;

      const { error: registrationsError } = await supabase
        .from('tournament_registrations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (registrationsError) throw registrationsError;

      const { error: playersError } = await supabase
        .from('players')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000');

      if (playersError) throw playersError;

      toast({
        title: 'Список очищен',
        description: 'Все игроки и связанные данные удалены из системы',
      });

      loadPlayers();
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка очистки',
        description: error.message,
        variant: 'destructive'
      });
    }
  };

  // Calculate stats
  const totalPlayers = players.length;
  const avgRating = players.length > 0 
    ? Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length) 
    : 0;
  const totalGames = players.reduce((sum, p) => sum + p.games_played, 0);

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Tabs defaultValue="ratings" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-background/50 border border-border/50 p-1 rounded-lg">
          <TabsTrigger 
            value="ratings" 
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-all duration-300"
          >
            <User className="w-4 h-4 mr-2" />
            Корректировка рейтингов
          </TabsTrigger>
          <TabsTrigger 
            value="results"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-[0_0_15px_hsl(var(--primary)/0.3)] transition-all duration-300"
          >
            <Trophy className="w-4 h-4 mr-2" />
            Корректировка результатов
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ratings" className="space-y-4 mt-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="bg-card brutal-border hover:shadow-[0_0_20px_hsl(var(--primary)/0.2)] transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Всего игроков</p>
                    <p className="text-2xl font-bold text-foreground">{totalPlayers}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="bg-card brutal-border hover:shadow-[0_0_20px_hsl(var(--accent)/0.2)] transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-accent/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-accent" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Средний рейтинг</p>
                    <p className="text-2xl font-bold text-foreground">{avgRating}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="bg-card brutal-border hover:shadow-[0_0_20px_hsl(142_76%_36%/0.2)] transition-all duration-300">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-3 bg-green-500/20 rounded-lg">
                    <Target className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Всего игр</p>
                    <p className="text-2xl font-bold text-foreground">{totalGames}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Main Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="bg-card brutal-border">
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/20 rounded-lg">
                      <Zap className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-foreground">
                        Ручная корректировка рейтингов
                      </CardTitle>
                      <CardDescription className="text-muted-foreground">
                        Изменение рейтингов с указанием причины
                      </CardDescription>
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        className="flex items-center gap-2 shadow-[0_0_15px_hsl(var(--destructive)/0.3)]"
                      >
                        <Trash2 className="h-4 w-4" />
                        Очистить весь список
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-card brutal-border">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Очистить весь список игроков
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2 text-muted-foreground">
                          <p>
                            Вы собираетесь <strong className="text-foreground">полностью удалить всех игроков</strong> из рейтинговой системы.
                          </p>
                          <div className="text-destructive font-medium">
                            <p>Это действие удалит:</p>
                            <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                              <li>Всех игроков</li>
                              <li>Все результаты турниров</li>
                              <li>Всю историю изменений рейтинга</li>
                              <li>Все регистрации на турниры</li>
                            </ul>
                          </div>
                          <p className="text-destructive font-medium">
                            Это действие <strong>необратимо</strong>!
                          </p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-background border-border/50 text-foreground hover:bg-muted">
                          Отмена
                        </AlertDialogCancel>
                        <AlertDialogAction
                          onClick={clearAllPlayers}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Очистить всё
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-background/50 border-b border-border/50 hover:bg-background/50">
                        <TableHead className="text-muted-foreground font-medium">Игрок</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Текущий рейтинг</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Игр</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Побед</TableHead>
                        <TableHead className="text-muted-foreground font-medium">Винрейт</TableHead>
                        <TableHead className="text-muted-foreground font-medium text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <AnimatePresence>
                        {players.map((player, index) => (
                          <motion.tr
                            key={player.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ delay: index * 0.02 }}
                            className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9 border-2 border-primary/30">
                                  <AvatarFallback className="bg-primary/20 text-primary font-bold">
                                    {player.name.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="font-medium text-foreground">{player.name}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-primary/20 text-primary border-primary/30 font-mono">
                                {player.elo_rating}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{player.games_played}</TableCell>
                            <TableCell className="text-muted-foreground">{player.wins}</TableCell>
                            <TableCell>
                              <Badge 
                                className={`font-mono ${
                                  player.games_played > 0 && (player.wins / player.games_played) > 0.5 
                                    ? "bg-green-500/20 text-green-400 border-green-500/30" 
                                    : "bg-muted/50 text-muted-foreground border-border/30"
                                }`}
                              >
                                <Percent className="w-3 h-3 mr-1" />
                                {player.games_played > 0 ? 
                                  `${Math.round((player.wins / player.games_played) * 100)}` : 
                                  '0'
                                }
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2 justify-end">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="bg-background/50 border-border/50 hover:bg-primary/20 hover:border-primary/50 hover:text-primary"
                                      onClick={() => {
                                        setEditingPlayer(player);
                                        setNewPlayerRating(player.elo_rating);
                                      }}
                                    >
                                      <Edit className="w-4 h-4" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="bg-card brutal-border">
                                    <DialogHeader>
                                      <DialogTitle className="text-foreground flex items-center gap-2">
                                        <Edit className="w-5 h-5 text-primary" />
                                        Корректировка рейтинга
                                      </DialogTitle>
                                      <DialogDescription className="text-muted-foreground">
                                        Изменение рейтинга игрока {player.name}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <Label className="text-muted-foreground">Текущий рейтинг</Label>
                                        <Input 
                                          value={player.elo_rating} 
                                          disabled 
                                          className="bg-background/50 border-border/50 text-muted-foreground"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-foreground">Новый рейтинг</Label>
                                        <Input
                                          type="number"
                                          value={newPlayerRating}
                                          onChange={(e) => setNewPlayerRating(Number(e.target.value))}
                                          min={100}
                                          max={3000}
                                          className="bg-background border-border/50 text-foreground focus:border-primary"
                                        />
                                      </div>
                                      <div>
                                        <Label className="text-foreground">Причина корректировки</Label>
                                        <Textarea
                                          value={adjustmentReason}
                                          onChange={(e) => setAdjustmentReason(e.target.value)}
                                          placeholder="Укажите причину изменения рейтинга..."
                                          className="bg-background border-border/50 text-foreground placeholder:text-muted-foreground focus:border-primary"
                                        />
                                      </div>
                                    </div>
                                    <DialogFooter>
                                      <Button
                                        onClick={adjustPlayerRating}
                                        disabled={loading || !adjustmentReason.trim()}
                                        className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                                      >
                                        <Save className="w-4 h-4 mr-2" />
                                        Сохранить изменения
                                      </Button>
                                    </DialogFooter>
                                  </DialogContent>
                                </Dialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="bg-background/50 border-border/50 hover:bg-accent/20 hover:border-accent/50 hover:text-accent"
                                    >
                                      <RotateCcw className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-card brutal-border">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="text-foreground">Сбросить статистику</AlertDialogTitle>
                                      <AlertDialogDescription className="text-muted-foreground">
                                        Это действие сбросит рейтинг игрока {player.name} к начальному значению (100) 
                                        и обнулит статистику игр. Это действие нельзя отменить.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-background border-border/50 text-foreground hover:bg-muted">
                                        Отмена
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => resetPlayerStats(player.id)}
                                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                                      >
                                        Сбросить
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>

                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button 
                                      size="sm" 
                                      variant="destructive"
                                      className="shadow-[0_0_10px_hsl(var(--destructive)/0.3)]"
                                    >
                                      <UserMinus className="w-4 h-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-card brutal-border">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle className="flex items-center gap-2 text-foreground">
                                        <AlertTriangle className="h-5 w-5 text-destructive" />
                                        Удалить игрока
                                      </AlertDialogTitle>
                                      <AlertDialogDescription className="space-y-2 text-muted-foreground">
                                        <p>
                                          Вы собираетесь <strong className="text-foreground">полностью удалить</strong> игрока {player.name} из рейтинговой системы.
                                        </p>
                                        <div className="text-destructive font-medium">
                                          <p>Это действие удалит:</p>
                                          <ul className="list-disc list-inside space-y-1 text-sm mt-2">
                                            <li>Профиль игрока</li>
                                            <li>Все результаты турниров</li>
                                            <li>Всю историю изменений рейтинга</li>
                                            <li>Все регистрации на турниры</li>
                                          </ul>
                                        </div>
                                        <p className="text-destructive font-medium">
                                          Это действие <strong>необратимо</strong>!
                                        </p>
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="bg-background border-border/50 text-foreground hover:bg-muted">
                                        Отмена
                                      </AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => deletePlayer(player.id, player.name)}
                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Удалить навсегда
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </div>
                            </TableCell>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </div>

                {players.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Нет игроков для отображения</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4 mt-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-card brutal-border">
              <CardHeader className="border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-accent/20 rounded-lg">
                    <Award className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-foreground">
                      Корректировка результатов турнира
                    </CardTitle>
                    <CardDescription className="text-muted-foreground">
                      {selectedTournament 
                        ? `Редактирование: ${selectedTournament.name}`
                        : 'Выберите турнир для редактирования результатов'
                      }
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {selectedTournament ? (
                  results.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-background/50 border-b border-border/50 hover:bg-background/50">
                            <TableHead className="text-muted-foreground font-medium">Игрок</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Место</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Рейтинг до</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Рейтинг после</TableHead>
                            <TableHead className="text-muted-foreground font-medium">Изменение</TableHead>
                            <TableHead className="text-muted-foreground font-medium text-right">Действия</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <AnimatePresence>
                            {results.map((result, index) => (
                              <motion.tr
                                key={result.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ delay: index * 0.02 }}
                                className="border-b border-border/30 hover:bg-muted/30 transition-colors"
                              >
                                <TableCell>
                                  <div className="flex items-center gap-3">
                                    <Avatar className="h-8 w-8 border-2 border-accent/30">
                                      <AvatarFallback className="bg-accent/20 text-accent font-bold text-xs">
                                        {result.players.name.charAt(0)}
                                      </AvatarFallback>
                                    </Avatar>
                                    <span className="font-medium text-foreground">{result.players.name}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    className={`font-mono ${
                                      result.position === 1 ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                                      result.position === 2 ? 'bg-slate-400/20 text-slate-300 border-slate-400/30' :
                                      result.position === 3 ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' :
                                      'bg-muted/50 text-muted-foreground border-border/30'
                                    }`}
                                  >
                                    #{result.position}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-muted-foreground font-mono">{result.elo_before}</TableCell>
                                <TableCell className="text-foreground font-mono">{result.elo_after}</TableCell>
                                <TableCell>
                                  <span className={`font-mono font-bold ${
                                    result.elo_change > 0 ? 'text-green-400' : 
                                    result.elo_change < 0 ? 'text-red-400' : 
                                    'text-muted-foreground'
                                  }`}>
                                    {result.elo_change > 0 ? '+' : ''}{result.elo_change}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2 justify-end">
                                    <Dialog>
                                      <DialogTrigger asChild>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="bg-background/50 border-border/50 hover:bg-primary/20 hover:border-primary/50 hover:text-primary"
                                          onClick={() => setEditingResult({...result})}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                      </DialogTrigger>
                                      <DialogContent className="bg-card brutal-border">
                                        <DialogHeader>
                                          <DialogTitle className="text-foreground flex items-center gap-2">
                                            <Edit className="w-5 h-5 text-primary" />
                                            Редактировать результат
                                          </DialogTitle>
                                          <DialogDescription className="text-muted-foreground">
                                            Изменение результата для {result.players.name}
                                          </DialogDescription>
                                        </DialogHeader>
                                        {editingResult && (
                                          <div className="space-y-4">
                                            <div>
                                              <Label className="text-foreground">Место в турнире</Label>
                                              <Input
                                                type="number"
                                                value={editingResult.position}
                                                onChange={(e) => setEditingResult({
                                                  ...editingResult,
                                                  position: Number(e.target.value)
                                                })}
                                                min={1}
                                                className="bg-background border-border/50 text-foreground focus:border-primary"
                                              />
                                            </div>
                                            <div>
                                              <Label className="text-foreground">Изменение рейтинга</Label>
                                              <Input
                                                type="number"
                                                value={editingResult.elo_change}
                                                onChange={(e) => setEditingResult({
                                                  ...editingResult,
                                                  elo_change: Number(e.target.value)
                                                })}
                                                className="bg-background border-border/50 text-foreground focus:border-primary"
                                              />
                                            </div>
                                            <div className="p-3 bg-background/50 rounded-lg border border-border/30">
                                              <p className="text-sm text-muted-foreground">
                                                Рейтинг до: <span className="text-foreground font-mono">{editingResult.elo_before}</span>
                                              </p>
                                              <p className="text-sm text-muted-foreground">
                                                Рейтинг после: <span className="text-foreground font-mono font-bold">{editingResult.elo_before + editingResult.elo_change}</span>
                                              </p>
                                            </div>
                                          </div>
                                        )}
                                        <DialogFooter>
                                          <Button 
                                            onClick={updateResult}
                                            className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_15px_hsl(var(--primary)/0.3)]"
                                          >
                                            <Save className="w-4 h-4 mr-2" />
                                            Сохранить
                                          </Button>
                                        </DialogFooter>
                                      </DialogContent>
                                    </Dialog>

                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button 
                                          size="sm" 
                                          variant="destructive"
                                          className="shadow-[0_0_10px_hsl(var(--destructive)/0.3)]"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent className="bg-card brutal-border">
                                        <AlertDialogHeader>
                                          <AlertDialogTitle className="text-foreground flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-destructive" />
                                            Удалить результат
                                          </AlertDialogTitle>
                                          <AlertDialogDescription className="text-muted-foreground">
                                            Вы уверены, что хотите удалить результат игрока {result.players.name}? 
                                            Это действие нельзя отменить.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel className="bg-background border-border/50 text-foreground hover:bg-muted">
                                            Отмена
                                          </AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => deleteResult(result.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Удалить
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </div>
                                </TableCell>
                              </motion.tr>
                            ))}
                          </AnimatePresence>
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>Нет результатов для редактирования</p>
                    </div>
                  )
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Выберите турнир для редактирования результатов</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default ManualAdjustments;
