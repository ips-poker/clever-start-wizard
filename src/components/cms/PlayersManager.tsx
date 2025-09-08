import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Search, 
  Trophy, 
  Users, 
  Target, 
  Calendar,
  Mail,
  User,
  UserCheck,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface Player {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  telegram: string | null;
  elo_rating: number;
  games_played: number;
  wins: number;
  avatar_url: string | null;
  user_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Profile {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  user_role: 'admin' | 'editor' | 'user';
  created_at: string;
}

interface PlayerWithProfile extends Player {
  profile?: Profile;
  hasProfile: boolean;
}

type SortField = 'name' | 'elo_rating' | 'games_played' | 'wins' | 'created_at';
type SortDirection = 'asc' | 'desc';

const PlayersManager = () => {
  const [players, setPlayers] = useState<PlayerWithProfile[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchPlayers();
  }, []);

  const fetchPlayers = async () => {
    try {
      setLoading(true);

      // Получаем всех игроков
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .order('created_at', { ascending: false });

      if (playersError) {
        throw playersError;
      }

      // Получаем все профили
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('*');

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        // Не выбрасываем ошибку, просто продолжаем без профилей
      }

      setProfiles(profilesData || []);

      // Объединяем игроков с профилями
      const playersWithProfiles: PlayerWithProfile[] = (playersData || []).map(player => {
        const profile = profilesData?.find(p => p.user_id === player.user_id);
        return {
          ...player,
          profile,
          hasProfile: !!profile
        };
      });

      setPlayers(playersWithProfiles);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить список игроков',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />;
  };

  const filteredAndSortedPlayers = players
    .filter(player => {
      const searchLower = searchTerm.toLowerCase();
      return (
        player.name.toLowerCase().includes(searchLower) ||
        player.email?.toLowerCase().includes(searchLower) ||
        player.phone?.toLowerCase().includes(searchLower) ||
        player.telegram?.toLowerCase().includes(searchLower) ||
        player.profile?.full_name?.toLowerCase().includes(searchLower) ||
        player.profile?.email?.toLowerCase().includes(searchLower)
      );
    })
    .sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      let comparison = 0;
      if (aValue < bValue) comparison = -1;
      if (aValue > bValue) comparison = 1;
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });

  const stats = {
    totalPlayers: players.length,
    withProfiles: players.filter(p => p.hasProfile).length,
    withoutProfiles: players.filter(p => !p.hasProfile).length,
    totalGames: players.reduce((sum, p) => sum + p.games_played, 0),
    totalWins: players.reduce((sum, p) => sum + p.wins, 0),
    avgElo: players.length > 0 ? Math.round(players.reduce((sum, p) => sum + p.elo_rating, 0) / players.length) : 0
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Управление игроками</h2>
          <p className="text-muted-foreground">
            Список всех зарегистрированных игроков и их статистика
          </p>
        </div>
        <Button onClick={fetchPlayers} variant="outline">
          Обновить
        </Button>
      </div>

      {/* Статистика */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-medium">Всего игроков</p>
                <p className="text-2xl font-bold">{stats.totalPlayers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium">С профилями</p>
                <p className="text-2xl font-bold">{stats.withProfiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium">Без профилей</p>
                <p className="text-2xl font-bold">{stats.withoutProfiles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium">Средний ELO</p>
                <p className="text-2xl font-bold">{stats.avgElo}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium">Всего игр</p>
                <p className="text-2xl font-bold">{stats.totalGames}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Trophy className="h-4 w-4 text-yellow-600" />
              <div>
                <p className="text-sm font-medium">Всего побед</p>
                <p className="text-2xl font-bold">{stats.totalWins}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Поиск */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Search className="h-5 w-5" />
            <span>Поиск игроков</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Input
                placeholder="Поиск по имени, email, телефону или Telegram..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Таблица игроков */}
      <Card>
        <CardHeader>
          <CardTitle>Список игроков ({filteredAndSortedPlayers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Игрок</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('elo_rating')}
                >
                  <div className="flex items-center space-x-1">
                    <span>ELO рейтинг</span>
                    {getSortIcon('elo_rating')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('games_played')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Игр</span>
                    {getSortIcon('games_played')}
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('wins')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Побед</span>
                    {getSortIcon('wins')}
                  </div>
                </TableHead>
                <TableHead>Профиль</TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => handleSort('created_at')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Регистрация</span>
                    {getSortIcon('created_at')}
                  </div>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedPlayers.map((player) => (
                <TableRow key={player.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage 
                          src={player.avatar_url || player.profile?.avatar_url || ''} 
                          alt={player.name}
                        />
                        <AvatarFallback>
                          {player.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{player.name}</p>
                         <p className="text-sm text-muted-foreground">
                          {player.profile?.full_name && player.profile.full_name !== player.name 
                            ? player.profile.full_name 
                            : (player.email || player.profile?.email || 'Нет email')
                          }
                        </p>
                        {(player.phone || player.profile?.user_id) && (
                          <div className="flex flex-wrap gap-2 mt-1">
                            {player.phone && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                📞 {player.phone}
                              </span>
                            )}
                            {player.telegram && (
                              <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                📱 {player.telegram}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {player.elo_rating}
                    </Badge>
                  </TableCell>
                  <TableCell>{player.games_played}</TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-1">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                      <span>{player.wins}</span>
                      {player.games_played > 0 && (
                        <span className="text-sm text-muted-foreground">
                          ({Math.round((player.wins / player.games_played) * 100)}%)
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {player.hasProfile ? (
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <UserCheck className="h-3 w-3 mr-1" />
                          Есть профиль
                        </Badge>
                        {player.profile?.user_role === 'admin' && (
                          <Badge variant="destructive" className="text-xs">
                            Админ
                          </Badge>
                        )}
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-orange-600 border-orange-600">
                        <User className="h-3 w-3 mr-1" />
                        Без профиля
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(player.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {filteredAndSortedPlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Игроки не найдены' : 'Нет зарегистрированных игроков'}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default PlayersManager;