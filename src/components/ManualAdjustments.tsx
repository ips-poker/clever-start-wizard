import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Edit, 
  Save, 
  X, 
  Plus, 
  Trash2, 
  AlertTriangle,
  History,
  User,
  Trophy,
  Calculator,
  RotateCcw,
  UserMinus
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

      // Update player rating
      const { error: playerError } = await supabase
        .from('players')
        .update({ elo_rating: newPlayerRating })
        .eq('id', editingPlayer.id);

      if (playerError) throw playerError;

      // Create a manual adjustment record
      const { error: adjustmentError } = await supabase
        .from('game_results')
        .insert({
          tournament_id: null, // Manual adjustment
          player_id: editingPlayer.id,
          position: 0, // Special value for manual adjustments
          elo_before: editingPlayer.elo_rating,
          elo_after: newPlayerRating,
          elo_change: ratingDifference,
          // Note: We would need to add a 'reason' column to store adjustment reason
        });

      if (adjustmentError) {
        console.error('Error creating adjustment record:', adjustmentError);
      }

      toast({
        title: 'Рейтинг обновлен',
        description: `Рейтинг игрока ${editingPlayer.name} изменен на ${ratingDifference > 0 ? '+' : ''}${ratingDifference}`,
      });

      setEditingPlayer(null);
      setAdjustmentReason('');
      loadPlayers();
      onRefresh();
    } catch (error: any) {
      toast({
        title: 'Ошибка обновления',
        description: error.message,
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

      // Update player's current rating based on this change
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
      // First, delete all game results for this player
      const { error: resultsError } = await supabase
        .from('game_results')
        .delete()
        .eq('player_id', playerId);

      if (resultsError) throw resultsError;

      // Delete all tournament registrations for this player
      const { error: registrationsError } = await supabase
        .from('tournament_registrations')
        .delete()
        .eq('player_id', playerId);

      if (registrationsError) throw registrationsError;

      // Finally, delete the player
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
          elo_rating: 100, // Default starting rating
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
      // Delete all game results first
      const { error: resultsError } = await supabase
        .from('game_results')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (resultsError) throw resultsError;

      // Delete all tournament registrations
      const { error: registrationsError } = await supabase
        .from('tournament_registrations')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (registrationsError) throw registrationsError;

      // Finally, delete all players
      const { error: playersError } = await supabase
        .from('players')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="ratings" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="ratings">Корректировка рейтингов</TabsTrigger>
          <TabsTrigger value="results">Корректировка результатов</TabsTrigger>
        </TabsList>

        <TabsContent value="ratings" className="space-y-4">
          <Card className="bg-white/60 backdrop-blur-sm border border-gray-200/40 shadow-minimal hover:shadow-subtle transition-all duration-300 rounded-xl group">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-light">
                    <div className="p-2 bg-blue-100/80 rounded-lg group-hover:bg-blue-200/80 transition-colors">
                      <User className="w-5 h-5 text-blue-600" />
                    </div>
                    Ручная корректировка рейтингов игроков
                  </CardTitle>
                  <CardDescription className="text-sm text-gray-600">
                    Изменение рейтингов игроков с указанием причины корректировки
                  </CardDescription>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="flex items-center gap-2">
                      <Trash2 className="h-4 w-4" />
                      Очистить весь список
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        Очистить весь список игроков
                      </AlertDialogTitle>
                      <AlertDialogDescription className="space-y-2">
                        <p>
                          Вы собираетесь <strong>полностью удалить всех игроков</strong> из рейтинговой системы.
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
                      <AlertDialogCancel>Отмена</AlertDialogCancel>
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
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Игрок</TableHead>
                    <TableHead>Текущий рейтинг</TableHead>
                    <TableHead>Игр сыграно</TableHead>
                      <TableHead>Побед</TableHead>
                      <TableHead>Винрейт</TableHead>
                    <TableHead>Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{player.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{player.elo_rating}</Badge>
                      </TableCell>
                      <TableCell>{player.games_played}</TableCell>
                      <TableCell>{player.wins}</TableCell>
                      <TableCell>
                        <Badge variant={player.games_played > 0 && (player.wins / player.games_played) > 0.5 ? "default" : "secondary"}>
                          {player.games_played > 0 ? 
                            `${Math.round((player.wins / player.games_played) * 100)}%` : 
                            '0%'
                          }
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingPlayer(player);
                                  setNewPlayerRating(player.elo_rating);
                                }}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Корректировка рейтинга</DialogTitle>
                                <DialogDescription>
                                  Изменение рейтинга игрока {player.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div>
                                  <Label>Текущий рейтинг</Label>
                                  <Input value={player.elo_rating} disabled />
                                </div>
                                <div>
                                  <Label>Новый рейтинг</Label>
                                  <Input
                                    type="number"
                                    value={newPlayerRating}
                                    onChange={(e) => setNewPlayerRating(Number(e.target.value))}
                                    min={100}
                                    max={3000}
                                  />
                                </div>
                                <div>
                                  <Label>Причина корректировки</Label>
                                  <Textarea
                                    value={adjustmentReason}
                                    onChange={(e) => setAdjustmentReason(e.target.value)}
                                    placeholder="Укажите причину изменения рейтинга..."
                                  />
                                </div>
                              </div>
                              <DialogFooter>
                                <Button
                                  onClick={adjustPlayerRating}
                                  disabled={loading || !adjustmentReason.trim()}
                                >
                                  <Save className="w-4 h-4 mr-2" />
                                  Сохранить изменения
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <RotateCcw className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Сбросить статистику</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Это действие сбросит рейтинг игрока {player.name} к начальному значению (1200) 
                                  и обнулит статистику игр. Это действие нельзя отменить.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => resetPlayerStats(player.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Сбросить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
                                <UserMinus className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                  Удалить игрока
                                </AlertDialogTitle>
                                <AlertDialogDescription className="space-y-2">
                                  <p>
                                    Вы собираетесь <strong>полностью удалить</strong> игрока {player.name} из рейтинговой системы.
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
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Корректировка результатов турнира
              </CardTitle>
              <CardDescription>
                {selectedTournament 
                  ? `Редактирование результатов турнира: ${selectedTournament.name}`
                  : 'Выберите турнир для редактирования результатов'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedTournament ? (
                results.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Игрок</TableHead>
                        <TableHead>Место</TableHead>
                        <TableHead>Рейтинг до</TableHead>
                        <TableHead>Рейтинг после</TableHead>
                        <TableHead>Изменение</TableHead>
                        <TableHead>Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.map((result) => (
                        <TableRow key={result.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {result.players.name.charAt(0)}
                                </AvatarFallback>
                              </Avatar>
                              {result.players.name}
                            </div>
                          </TableCell>
                          <TableCell>#{result.position}</TableCell>
                          <TableCell>{result.elo_before}</TableCell>
                          <TableCell>{result.elo_after}</TableCell>
                          <TableCell>
                            <span className={`font-medium ${
                              result.elo_change > 0 ? 'text-green-500' : 
                              result.elo_change < 0 ? 'text-red-500' : 
                              'text-muted-foreground'
                            }`}>
                              {result.elo_change > 0 ? '+' : ''}{result.elo_change}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setEditingResult({...result})}
                                  >
                                    <Edit className="w-4 h-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>Редактировать результат</DialogTitle>
                                    <DialogDescription>
                                      Изменение результата для {result.players.name}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {editingResult && (
                                    <div className="space-y-4">
                                      <div>
                                        <Label>Место в турнире</Label>
                                        <Input
                                          type="number"
                                          value={editingResult.position}
                                          onChange={(e) => setEditingResult({
                                            ...editingResult,
                                            position: Number(e.target.value)
                                          })}
                                          min={1}
                                        />
                                      </div>
                                      <div>
                                        <Label>Изменение рейтинга</Label>
                                        <Input
                                          type="number"
                                          value={editingResult.elo_change}
                                          onChange={(e) => setEditingResult({
                                            ...editingResult,
                                            elo_change: Number(e.target.value)
                                          })}
                                        />
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        Рейтинг до: {editingResult.elo_before}<br/>
                                        Рейтинг после: {editingResult.elo_before + editingResult.elo_change}
                                      </div>
                                    </div>
                                  )}
                                  <DialogFooter>
                                    <Button onClick={updateResult}>
                                      <Save className="w-4 h-4 mr-2" />
                                      Сохранить
                                    </Button>
                                  </DialogFooter>
                                </DialogContent>
                              </Dialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="destructive">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Удалить результат</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Вы уверены, что хотите удалить результат игрока {result.players.name}? 
                                      Это действие нельзя отменить.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Отмена</AlertDialogCancel>
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
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Нет результатов для редактирования
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Выберите турнир для редактирования результатов
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManualAdjustments;