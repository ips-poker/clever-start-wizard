import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PokerTableLobby } from '@/components/poker/PokerTableLobby';
import { OnlinePokerTable } from '@/components/poker/OnlinePokerTable';
import { PlayerBalanceCard } from '@/components/poker/PlayerBalanceCard';
import { OnlineTournamentLobby } from '@/components/poker/OnlineTournamentLobby';
import { FullHandHistory } from '@/components/poker/FullHandHistory';
import { PokerCraftDashboard } from '@/components/poker/PokerCraftDashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowLeft, User, LogOut, Trophy, Table2, History, BarChart3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function OnlinePoker() {
  const { user, userProfile, isAuthenticated, loading: authLoading } = useAuth();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerAvatar, setPlayerAvatar] = useState<string | null>(null);
  const [playerBalance, setPlayerBalance] = useState(0);
  const [activeTable, setActiveTable] = useState<{ id: string; buyIn: number; isTournament?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lobbyTab, setLobbyTab] = useState('cash');

  // Check for existing player - prioritize authenticated user
  useEffect(() => {
    const checkPlayer = async () => {
      // If user is authenticated, find their player profile
      if (isAuthenticated && user) {
        const { data: playerData } = await supabase
          .from('players')
          .select('id, name, avatar_url, telegram')
          .eq('user_id', user.id)
          .single();
        
        if (playerData) {
          setPlayerId(playerData.id);
          setPlayerName(playerData.name);
          setPlayerAvatar(playerData.avatar_url);
          localStorage.setItem('poker_player_id', playerData.id);
          setLoading(false);
          return;
        }
        
        // Check if there's a player linked by telegram_id
        const telegramId = user.user_metadata?.telegram_id;
        if (telegramId) {
          const { data: telegramPlayer } = await supabase
            .from('players')
            .select('id, name, avatar_url')
            .eq('telegram', String(telegramId))
            .single();
          
          if (telegramPlayer) {
            // Link player to user_id if not already linked
            await supabase
              .from('players')
              .update({ user_id: user.id })
              .eq('id', telegramPlayer.id);
            
            setPlayerId(telegramPlayer.id);
            setPlayerName(telegramPlayer.name);
            setPlayerAvatar(telegramPlayer.avatar_url);
            localStorage.setItem('poker_player_id', telegramPlayer.id);
            setLoading(false);
            return;
          }
        }
      }
      
      // Fallback to localStorage for non-authenticated users
      const savedPlayerId = localStorage.getItem('poker_player_id');
      
      if (savedPlayerId) {
        const { data } = await supabase
          .from('players')
          .select('id, name, avatar_url')
          .eq('id', savedPlayerId)
          .single();
        
        if (data) {
          setPlayerId(data.id);
          setPlayerName(data.name);
          setPlayerAvatar(data.avatar_url);
        } else {
          localStorage.removeItem('poker_player_id');
        }
      }
      
      setLoading(false);
    };

    if (!authLoading) {
      checkPlayer();
    }
  }, [isAuthenticated, user, authLoading]);

  const handleCreatePlayer = async () => {
    if (!playerName.trim()) {
      toast.error('Введите имя');
      return;
    }

    try {
      // If authenticated, create player linked to user
      const createParams: any = {
        p_name: playerName.trim(),
        p_user_id: isAuthenticated && user ? user.id : null,
        p_avatar_url: userProfile?.avatar_url || null,
        p_email: user?.email || null,
        p_telegram: user?.user_metadata?.telegram_id ? String(user.user_metadata.telegram_id) : null
      };

      const { data, error } = await supabase.rpc('create_player_safe', createParams);

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        const newPlayerId = result.player.id;
        setPlayerId(newPlayerId);
        setPlayerAvatar(result.player.avatar_url);
        localStorage.setItem('poker_player_id', newPlayerId);
        
        // Create initial balance
        await supabase.rpc('ensure_player_balance', { p_player_id: newPlayerId });
        
        toast.success('Профиль создан!');
      } else {
        // Player exists, use existing
        if (result.player_id) {
          setPlayerId(result.player_id);
          localStorage.setItem('poker_player_id', result.player_id);
          
          // Fetch avatar for existing player
          const { data: existingPlayer } = await supabase
            .from('players')
            .select('avatar_url')
            .eq('id', result.player_id)
            .single();
          if (existingPlayer) {
            setPlayerAvatar(existingPlayer.avatar_url);
          }
        }
      }
    } catch (error: any) {
      console.error('Error creating player:', error);
      toast.error('Ошибка создания профиля');
    }
  };

  const handleJoinTable = (tableId: string, buyIn: number) => {
    // Allow joining if balance check passed in PokerTableLobby
    // The lobby already validates buy-in against player balance
    setActiveTable({ id: tableId, buyIn, isTournament: false });
  };

  const handleJoinTournament = (tournamentId: string) => {
    setActiveTable({ id: tournamentId, buyIn: 0, isTournament: true });
  };

  const handleLeaveTable = () => {
    setActiveTable(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('poker_player_id');
    setPlayerId(null);
    setPlayerName('');
    setPlayerAvatar(null);
    setPlayerBalance(0);
    toast.success('Вы вышли из аккаунта');
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-24">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Назад
            </Button>
          </Link>
          
          {playerId && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={playerAvatar || undefined} />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="font-medium">{playerName}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {!playerId ? (
          // Player registration
          <div className="max-w-md mx-auto">
            <Card>
              <CardContent className="p-6">
                <h1 className="text-2xl font-bold text-center mb-6">
                  Онлайн Покер
                </h1>
                <p className="text-muted-foreground text-center mb-6">
                  Введите ваше имя, чтобы начать играть
                </p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Ваше имя</Label>
                    <Input
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Введите имя..."
                      onKeyDown={(e) => e.key === 'Enter' && handleCreatePlayer()}
                    />
                  </div>
                  
                  <Button onClick={handleCreatePlayer} className="w-full">
                    Начать играть
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : activeTable ? (
          // Active poker table or tournament
          <div className="max-w-4xl mx-auto">
            <OnlinePokerTable
              tableId={activeTable.id}
              playerId={playerId}
              buyIn={activeTable.buyIn}
              isTournament={activeTable.isTournament}
              tournamentId={activeTable.isTournament ? activeTable.id : undefined}
              onLeave={handleLeaveTable}
            />
          </div>
        ) : (
          // Lobby with Cash Games and Tournaments tabs
          <div className="max-w-4xl mx-auto space-y-6">
            <PlayerBalanceCard 
              playerId={playerId} 
              onBalanceUpdate={setPlayerBalance}
            />
            
            <Tabs value={lobbyTab} onValueChange={setLobbyTab}>
              <TabsList className="grid grid-cols-4 w-full max-w-xl mx-auto">
                <TabsTrigger value="cash" className="gap-2">
                  <Table2 className="h-4 w-4" />
                  Кэш-игры
                </TabsTrigger>
                <TabsTrigger value="tournaments" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Турниры
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Аналитика
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2">
                  <History className="h-4 w-4" />
                  История
                </TabsTrigger>
              </TabsList>

              <TabsContent value="cash" className="mt-6">
                <PokerTableLobby
                  playerId={playerId}
                  playerBalance={playerBalance}
                  onJoinTable={handleJoinTable}
                />
              </TabsContent>

              <TabsContent value="tournaments" className="mt-6">
                <OnlineTournamentLobby
                  playerId={playerId}
                  playerBalance={playerBalance}
                  onJoinTournament={handleJoinTournament}
                />
              </TabsContent>

              <TabsContent value="analytics" className="mt-6">
                <Card className="p-6 text-center">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">PokerCraft Analytics</h3>
                  <p className="text-muted-foreground">
                    Статистика будет доступна после игры минимум 50 рук
                  </p>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-6">
                <FullHandHistory playerId={playerId} />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
