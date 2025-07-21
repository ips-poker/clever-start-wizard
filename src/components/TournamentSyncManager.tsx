import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Globe, Archive, Trash2, Download, Upload, Eye, EyeOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Tournament {
  id: string;
  name: string;
  description: string;
  status: string;
  is_published: boolean;
  is_archived: boolean;
  start_time: string;
  buy_in: number;
  max_players: number;
  finished_at?: string;
}

interface TournamentSyncManagerProps {
  tournaments: Tournament[];
  onRefresh: () => void;
}

const TournamentSyncManager = ({ tournaments, onRefresh }: TournamentSyncManagerProps) => {
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const publishTournament = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase.rpc('publish_tournament', {
        tournament_id_param: tournamentId
      });

      if (error) throw error;

      if (data) {
        toast({
          title: 'Турнир опубликован',
          description: 'Турнир доступен для регистрации на сайте',
        });
        onRefresh();
      } else {
        toast({
          title: 'Ошибка',
          description: 'Турнир не может быть опубликован в текущем статусе',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error publishing tournament:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось опубликовать турнир',
        variant: 'destructive',
      });
    }
  };

  const unpublishTournament = async (tournamentId: string) => {
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ is_published: false })
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: 'Турнир скрыт',
        description: 'Турнир больше не отображается на сайте',
      });
      onRefresh();
    } catch (error) {
      console.error('Error unpublishing tournament:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось скрыть турнир',
        variant: 'destructive',
      });
    }
  };

  const archiveTournament = async (tournamentId: string) => {
    try {
      const { data, error } = await supabase.rpc('archive_tournament', {
        tournament_id_param: tournamentId
      });

      if (error) throw error;

      if (data) {
        toast({
          title: 'Турнир архивирован',
          description: 'Турнир перемещен в архив, но данные сохранены',
        });
        onRefresh();
      } else {
        toast({
          title: 'Ошибка',
          description: 'Турнир не может быть архивирован в текущем статусе',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error archiving tournament:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось архивировать турнир',
        variant: 'destructive',
      });
    }
  };

  const deleteTournament = async (tournamentId: string) => {
    try {
      // Delete related records first
      await supabase.from('game_results').delete().eq('tournament_id', tournamentId);
      await supabase.from('tournament_registrations').delete().eq('tournament_id', tournamentId);
      await supabase.from('blind_levels').delete().eq('tournament_id', tournamentId);
      
      // Then delete the tournament
      const { error } = await supabase
        .from('tournaments')
        .delete()
        .eq('id', tournamentId);

      if (error) throw error;

      toast({
        title: 'Турнир удален',
        description: 'Турнир и все связанные данные удалены из базы',
      });
      onRefresh();
    } catch (error) {
      console.error('Error deleting tournament:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить турнир',
        variant: 'destructive',
      });
    }
  };

  const exportTournamentData = async () => {
    setIsExporting(true);
    try {
      // Export all tournament data
      const { data: tournamentsData } = await supabase.from('tournaments').select('*');
      const { data: playersData } = await supabase.from('players').select('*');
      const { data: registrationsData } = await supabase.from('tournament_registrations').select('*');
      const { data: blindLevelsData } = await supabase.from('blind_levels').select('*');
      const { data: gameResultsData } = await supabase.from('game_results').select('*');

      const exportData = {
        tournaments: tournamentsData,
        players: playersData,
        registrations: registrationsData,
        blindLevels: blindLevelsData,
        gameResults: gameResultsData,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `poker-club-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Экспорт завершен',
        description: 'Данные турниров экспортированы в файл',
      });
    } catch (error) {
      console.error('Error exporting data:', error);
      toast({
        title: 'Ошибка экспорта',
        description: 'Не удалось экспортировать данные',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (tournament: Tournament) => {
    if (tournament.is_archived) return <Badge variant="secondary">Архив</Badge>;
    if (tournament.is_published && tournament.status === 'registration') return <Badge variant="default">Открыт для регистрации</Badge>;
    if (tournament.is_published && tournament.status === 'running') return <Badge variant="destructive">Идет турнир</Badge>;
    if (tournament.status === 'completed') return <Badge variant="outline">Завершен</Badge>;
    if (tournament.status === 'cancelled') return <Badge variant="secondary">Отменен</Badge>;
    return <Badge variant="secondary">Черновик</Badge>;
  };

  const activeTournaments = tournaments.filter(t => !t.is_archived);
  const archivedTournaments = tournaments.filter(t => t.is_archived);

  return (
    <div className="space-y-6">
      <Card className="bg-white/70 backdrop-blur-sm border border-gray-200/50 shadow-subtle">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-gray-800">
            <Globe className="w-5 h-5" />
            Управление публикацией турниров
          </CardTitle>
          <CardDescription>
            Управляйте видимостью турниров на сайте и синхронизацией с базой данных
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <Button onClick={exportTournamentData} disabled={isExporting} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              {isExporting ? 'Экспорт...' : 'Экспорт данных'}
            </Button>
            <input
              type="file"
              accept=".json"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      const importedData = JSON.parse(event.target?.result as string);
                      console.log('Imported data:', importedData);
                      toast({
                        title: 'Импорт готов',
                        description: 'Данные загружены, но импорт не реализован в демо-версии',
                      });
                    } catch (error) {
                      toast({
                        title: 'Ошибка импорта',
                        description: 'Неверный формат файла',
                        variant: 'destructive',
                      });
                    }
                  };
                  reader.readAsText(file);
                }
              }}
              style={{ display: 'none' }}
              id="import-file"
            />
            <Button
              onClick={() => document.getElementById('import-file')?.click()}
              disabled={isImporting}
              variant="outline"
            >
              <Upload className="w-4 h-4 mr-2" />
              Импорт данных
            </Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800">Активные турниры</h3>
            {activeTournaments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Нет активных турниров</p>
            ) : (
              <div className="space-y-2">
                {activeTournaments.map((tournament) => (
                  <div
                    key={tournament.id}
                    className="flex items-center justify-between p-4 border border-gray-200/30 rounded-lg bg-white/50"
                  >
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-800">{tournament.name}</h4>
                      <p className="text-sm text-gray-600">
                        {new Date(tournament.start_time).toLocaleDateString('ru-RU')} • 
                        Бай-ин: {tournament.buy_in}₽ • 
                        Макс. игроков: {tournament.max_players}
                      </p>
                      <div className="mt-2">{getStatusBadge(tournament)}</div>
                    </div>
                    <div className="flex gap-2">
                      {tournament.is_published ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => unpublishTournament(tournament.id)}
                        >
                          <EyeOff className="w-4 h-4 mr-1" />
                          Скрыть
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => publishTournament(tournament.id)}
                          disabled={tournament.status !== 'scheduled'}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          Опубликовать
                        </Button>
                      )}
                      
                      {tournament.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => archiveTournament(tournament.id)}
                        >
                          <Archive className="w-4 h-4 mr-1" />
                          В архив
                        </Button>
                      )}
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Удалить турнир?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Это действие нельзя отменить. Турнир и все связанные данные 
                              (регистрации, результаты, рейтинги) будут удалены навсегда.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteTournament(tournament.id)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Удалить навсегда
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {archivedTournaments.length > 0 && (
              <>
                <h3 className="text-lg font-semibold text-gray-800 pt-4">Архив турниров</h3>
                <div className="space-y-2">
                  {archivedTournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="flex items-center justify-between p-4 border border-gray-200/20 rounded-lg bg-gray-50/50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium text-gray-600">{tournament.name}</h4>
                        <p className="text-sm text-gray-500">
                          Завершен: {tournament.finished_at ? 
                            new Date(tournament.finished_at).toLocaleDateString('ru-RU') : 
                            'Дата неизвестна'
                          }
                        </p>
                        <div className="mt-2">{getStatusBadge(tournament)}</div>
                      </div>
                      <div className="flex gap-2">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Удалить из архива?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Турнир и все данные будут удалены из базы данных навсегда.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteTournament(tournament.id)}
                                className="bg-red-500 hover:bg-red-600"
                              >
                                Удалить навсегда
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TournamentSyncManager;