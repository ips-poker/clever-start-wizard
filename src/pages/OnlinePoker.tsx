import React, { useState, useEffect } from 'react';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { PokerTableLobby } from '@/components/poker/PokerTableLobby';
import { OnlinePokerTable } from '@/components/poker/OnlinePokerTable';
import { PlayerBalanceCard } from '@/components/poker/PlayerBalanceCard';
import { OnlineTournamentLobby } from '@/components/poker/OnlineTournamentLobby';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, User, LogOut, Trophy, Table2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function OnlinePoker() {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState('');
  const [playerBalance, setPlayerBalance] = useState(0);
  const [activeTable, setActiveTable] = useState<{ id: string; buyIn: number; isTournament?: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [lobbyTab, setLobbyTab] = useState('cash');

  // Check for existing player
  useEffect(() => {
    const checkPlayer = async () => {
      // Check localStorage for saved player
      const savedPlayerId = localStorage.getItem('poker_player_id');
      
      if (savedPlayerId) {
        // Verify player exists
        const { data } = await supabase
          .from('players')
          .select('id, name')
          .eq('id', savedPlayerId)
          .single();
        
        if (data) {
          setPlayerId(data.id);
          setPlayerName(data.name);
        } else {
          localStorage.removeItem('poker_player_id');
        }
      }
      
      setLoading(false);
    };

    checkPlayer();
  }, []);

  const handleCreatePlayer = async () => {
    if (!playerName.trim()) {
      toast.error('Введите имя');
      return;
    }

    try {
      const { data, error } = await supabase.rpc('create_player_safe', {
        p_name: playerName.trim()
      });

      if (error) throw error;

      const result = data as any;
      if (result.success) {
        const newPlayerId = result.player.id;
        setPlayerId(newPlayerId);
        localStorage.setItem('poker_player_id', newPlayerId);
        
        // Create initial balance
        await supabase.rpc('ensure_player_balance', { p_player_id: newPlayerId });
        
        toast.success('Профиль создан!');
      } else {
        // Player exists, use existing
        if (result.player_id) {
          setPlayerId(result.player_id);
          localStorage.setItem('poker_player_id', result.player_id);
        }
      }
    } catch (error: any) {
      console.error('Error creating player:', error);
      toast.error('Ошибка создания профиля');
    }
  };

  const handleJoinTable = (tableId: string, buyIn: number) => {
    if (buyIn > playerBalance) {
      toast.error('Недостаточно фишек для входа');
      return;
    }
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
    setPlayerBalance(0);
    toast.success('Вы вышли из аккаунта');
  };

  if (loading) {
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
                <User className="h-4 w-4" />
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
          // Active poker table
          <div className="max-w-4xl mx-auto">
            <OnlinePokerTable
              tableId={activeTable.id}
              playerId={playerId}
              buyIn={activeTable.buyIn}
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
              <TabsList className="grid grid-cols-2 w-full max-w-md mx-auto">
                <TabsTrigger value="cash" className="gap-2">
                  <Table2 className="h-4 w-4" />
                  Кэш-игры
                </TabsTrigger>
                <TabsTrigger value="tournaments" className="gap-2">
                  <Trophy className="h-4 w-4" />
                  Турниры
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
            </Tabs>
          </div>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
