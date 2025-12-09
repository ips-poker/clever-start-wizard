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
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ArrowLeft, User, LogOut, Trophy, Table2, History, BarChart3, X } from 'lucide-react';
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
        const createdPlayerId = result.player.id;
        setPlayerId(createdPlayerId);
        setPlayerAvatar(result.player.avatar_url);
        localStorage.setItem('poker_player_id', createdPlayerId);
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
        ) : (
          // Lobby with Cash Games and Tournaments tabs + Table Modal
          <>
            {/* Table Modal - opens table as overlay for multi-tabling */}
            <Dialog open={!!activeTable} onOpenChange={(open) => !open && handleLeaveTable()}>
              <DialogContent 
                className="max-w-[95vw] w-[900px] h-[90vh] p-0 border-none overflow-hidden"
                style={{ 
                  maxHeight: '90vh',
                  background: 'linear-gradient(180deg, #0a0a0a 0%, #1a0a0a 15%, #0d1a0d 50%, #0a0a0a 85%, #0a0505 100%)',
                }}
              >
                {activeTable && playerId && (
                  <div className="relative w-full h-full overflow-hidden">
                    {/* Mafia syndicate atmospheric background */}
                    <div className="absolute inset-0 pointer-events-none">
                      {/* Dark vignette edges */}
                      <div className="absolute inset-0" style={{
                        background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.8) 100%)'
                      }} />
                      
                      {/* Subtle smoke/fog effect */}
                      <div className="absolute inset-0 opacity-20" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='smoke'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.01' numOctaves='3' result='noise'/%3E%3CfeDisplacementMap in='SourceGraphic' in2='noise' scale='50'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23smoke)' fill='%23334433'/%3E%3C/svg%3E")`,
                        animation: 'pulse 8s ease-in-out infinite'
                      }} />
                      
                      {/* Golden accent lights */}
                      <div className="absolute top-0 left-1/4 w-64 h-64 opacity-10" style={{
                        background: 'radial-gradient(circle, rgba(251,191,36,0.4) 0%, transparent 70%)',
                        filter: 'blur(40px)'
                      }} />
                      <div className="absolute bottom-0 right-1/4 w-64 h-64 opacity-10" style={{
                        background: 'radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)',
                        filter: 'blur(40px)'
                      }} />
                      
                      {/* Subtle red accent for mafia vibe */}
                      <div className="absolute top-1/3 right-0 w-48 h-96 opacity-5" style={{
                        background: 'radial-gradient(ellipse, rgba(220,38,38,0.5) 0%, transparent 70%)',
                        filter: 'blur(60px)'
                      }} />
                      
                      {/* Art deco corner decorations */}
                      <svg className="absolute top-4 left-4 w-16 h-16 opacity-10" viewBox="0 0 100 100">
                        <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="rgba(251,191,36,0.5)" />
                        <path d="M30 30 L70 30 L70 35 L35 35 L35 70 L30 70 Z" fill="rgba(251,191,36,0.3)" />
                      </svg>
                      <svg className="absolute top-4 right-4 w-16 h-16 opacity-10 rotate-90" viewBox="0 0 100 100">
                        <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="rgba(251,191,36,0.5)" />
                        <path d="M30 30 L70 30 L70 35 L35 35 L35 70 L30 70 Z" fill="rgba(251,191,36,0.3)" />
                      </svg>
                      <svg className="absolute bottom-4 left-4 w-16 h-16 opacity-10 -rotate-90" viewBox="0 0 100 100">
                        <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="rgba(251,191,36,0.5)" />
                        <path d="M30 30 L70 30 L70 35 L35 35 L35 70 L30 70 Z" fill="rgba(251,191,36,0.3)" />
                      </svg>
                      <svg className="absolute bottom-4 right-4 w-16 h-16 opacity-10 rotate-180" viewBox="0 0 100 100">
                        <path d="M0 0 L100 0 L100 20 L20 20 L20 100 L0 100 Z" fill="rgba(251,191,36,0.5)" />
                        <path d="M30 30 L70 30 L70 35 L35 35 L35 70 L30 70 Z" fill="rgba(251,191,36,0.3)" />
                      </svg>
                      
                      {/* Subtle pattern overlay */}
                      <div className="absolute inset-0 opacity-[0.02]" style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0 L60 30 L30 60 L0 30 Z' fill='none' stroke='%23fbbf24' stroke-width='0.5'/%3E%3C/svg%3E")`,
                        backgroundSize: '30px 30px'
                      }} />
                    </div>
                    
                    {/* Close button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-3 right-3 z-50 bg-black/60 hover:bg-black/80 text-white/80 hover:text-white rounded-full border border-amber-900/30"
                      onClick={handleLeaveTable}
                    >
                      <X className="h-5 w-5" />
                    </Button>
                    
                    <OnlinePokerTable
                      tableId={activeTable.id}
                      playerId={playerId}
                      buyIn={activeTable.buyIn}
                      isTournament={activeTable.isTournament}
                      tournamentId={activeTable.isTournament ? activeTable.id : undefined}
                      onLeave={handleLeaveTable}
                    />
                  </div>
                )}
              </DialogContent>
            </Dialog>
            
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
          </>
        )}
      </main>
      
      <Footer />
    </div>
  );
}
