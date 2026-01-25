import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Tv,
  Shield,
  RefreshCw,
  Calculator,
  MessageSquare,
  Users,
  TrendingUp,
  Trophy,
  Layers,
  BarChart3,
  Play,
  Pause
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FinalTableTVMode } from '../FinalTableTVMode';
import { BubbleProtection } from '../BubbleProtection';
import { ICMDealCalculator } from '../ICMDealCalculator';
import { TournamentChatModeration } from '../TournamentChatModeration';
import { useTournamentLiveData } from '@/hooks/useTournamentLiveData';
import { useTournamentHandForHand } from '@/hooks/useTournamentHandForHand';
import { useTournamentChat } from '@/hooks/useTournamentChat';

interface Tournament {
  id: string;
  name: string;
  status: string;
  current_level: number | null;
  prize_pool: number | null;
  participants_count?: number;
}

export function TournamentAdvancedTools() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [activeTab, setActiveTab] = useState('tv-mode');
  const [loading, setLoading] = useState(true);

  // Feature flags
  const [tvModeEnabled, setTvModeEnabled] = useState(false);
  const [bubbleProtectionEnabled, setBubbleProtectionEnabled] = useState(false);
  const [icmEnabled, setIcmEnabled] = useState(false);

  // Live data hooks
  const { liveData, participants, refetch } = useTournamentLiveData(
    selectedTournament?.id || null
  );
  
  const {
    isActive: handForHandActive,
    tables: hfhTables,
    allTablesReady,
    toggleHandForHand,
    startNextHand,
    fetchTableStatuses
  } = useTournamentHandForHand(selectedTournament?.id || null);

  const {
    messages,
    playerStatuses,
    autoModEnabled,
    isChatEnabled,
    sendMessage,
    deleteMessage,
    mutePlayer,
    banPlayer,
    warnPlayer,
    reportMessage,
    toggleAutoMod
  } = useTournamentChat(selectedTournament?.id || null, 'admin');

  const loadTournaments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('online_poker_tournaments')
      .select('*')
      .in('status', ['running', 'paused', 'hand_for_hand', 'final_table'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tournaments:', error);
      setLoading(false);
      return;
    }

    const tournamentsWithCounts = await Promise.all(
      (data || []).map(async (t) => {
        const { count } = await supabase
          .from('online_poker_tournament_participants')
          .select('*', { count: 'exact', head: true })
          .eq('tournament_id', t.id)
          .neq('status', 'eliminated');
        return { ...t, participants_count: count || 0 };
      })
    );

    setTournaments(tournamentsWithCounts);
    if (tournamentsWithCounts.length > 0 && !selectedTournament) {
      setSelectedTournament(tournamentsWithCounts[0]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadTournaments();

    const channel = supabase
      .channel('tournament-tools')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_poker_tournaments' }, () => {
        loadTournaments();
        if (selectedTournament) {
          fetchTableStatuses();
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_poker_tournament_participants' }, () => {
        refetch();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      refetch();
      fetchTableStatuses();
    }
  }, [selectedTournament]);

  const toggleTVMode = async () => {
    setTvModeEnabled(!tvModeEnabled);
    toast.success(tvModeEnabled ? 'TV Mode отключён' : 'TV Mode включён');
  };

  const toggleBubbleProtection = async () => {
    setBubbleProtectionEnabled(!bubbleProtectionEnabled);
    toast.success(bubbleProtectionEnabled ? 'Bubble Protection отключён' : 'Bubble Protection включён');
  };

  const handleBubbleBurst = () => {
    setBubbleProtectionEnabled(false);
    toggleHandForHand(false);
    toast.success('Bubble burst! Все оставшиеся игроки в деньгах!');
  };

  // Prepare players data for TV mode and ICM
  const playersForTV = participants.slice(0, 9).map((p, i) => ({
    id: p.player_id,
    name: p.player_name,
    chips: p.chips,
    seatNumber: i + 1,
    isDealer: i === 0,
    isBigBlind: i === 1,
    isSmallBlind: i === 2
  }));

  const bubblePosition = Math.max(Math.floor(participants.length * 0.15), 3);
  const prizeForBubble = liveData.payoutPositions.find(p => p.position === bubblePosition)?.amount || 
    (selectedTournament?.prize_pool || 0) * 0.05;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tournaments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Нет активных турниров</p>
          <p className="text-sm text-muted-foreground mt-2">
            Запустите турнир для доступа к расширенным инструментам
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tournament Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Trophy className="h-5 w-5 text-amber-500" />
            Выберите турнир
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tournaments.map(t => (
              <Button
                key={t.id}
                variant={selectedTournament?.id === t.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedTournament(t)}
              >
                {t.name}
                <Badge variant="secondary" className="ml-2">
                  {t.participants_count} игроков
                </Badge>
                {t.status === 'hand_for_hand' && (
                  <Badge variant="destructive" className="ml-1">H-f-H</Badge>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Controls */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={tvModeEnabled ? 'border-purple-500/50 bg-purple-500/5' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Tv className="h-4 w-4 text-purple-500" />
                <Label>TV Mode</Label>
              </div>
              <Switch checked={tvModeEnabled} onCheckedChange={toggleTVMode} />
            </div>
          </CardContent>
        </Card>

        <Card className={bubbleProtectionEnabled ? 'border-amber-500/50 bg-amber-500/5' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-amber-500" />
                <Label>Bubble</Label>
              </div>
              <Switch checked={bubbleProtectionEnabled} onCheckedChange={toggleBubbleProtection} />
            </div>
          </CardContent>
        </Card>

        <Card className={handForHandActive ? 'border-red-500/50 bg-red-500/5' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-red-500" />
                <Label>H-f-H</Label>
              </div>
              <Switch 
                checked={handForHandActive} 
                onCheckedChange={toggleHandForHand} 
              />
            </div>
            {handForHandActive && allTablesReady && (
              <Button 
                size="sm" 
                className="w-full mt-2"
                onClick={startNextHand}
              >
                <Play className="h-3 w-3 mr-1" />
                Начать раздачу
              </Button>
            )}
          </CardContent>
        </Card>

        <Card className={icmEnabled ? 'border-cyan-500/50 bg-cyan-500/5' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-cyan-500" />
                <Label>ICM</Label>
              </div>
              <Switch checked={icmEnabled} onCheckedChange={setIcmEnabled} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tools Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tv-mode" className="gap-1">
            <Tv className="h-4 w-4" />
            <span className="hidden md:inline">TV Mode</span>
          </TabsTrigger>
          <TabsTrigger value="bubble" className="gap-1">
            <Shield className="h-4 w-4" />
            <span className="hidden md:inline">Bubble</span>
          </TabsTrigger>
          <TabsTrigger value="icm" className="gap-1">
            <Calculator className="h-4 w-4" />
            <span className="hidden md:inline">ICM Deal</span>
          </TabsTrigger>
          <TabsTrigger value="chat" className="gap-1">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden md:inline">Chat</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden md:inline">Stats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tv-mode" className="mt-4">
          {tvModeEnabled && selectedTournament ? (
            <FinalTableTVMode
              tournamentName={selectedTournament.name}
              players={playersForTV}
              prizePool={selectedTournament.prize_pool || 0}
              payoutPositions={liveData.payoutPositions.length > 0 ? liveData.payoutPositions : [
                { position: 1, amount: (selectedTournament.prize_pool || 0) * 0.5, percentage: 50 },
                { position: 2, amount: (selectedTournament.prize_pool || 0) * 0.3, percentage: 30 },
                { position: 3, amount: (selectedTournament.prize_pool || 0) * 0.2, percentage: 20 }
              ]}
              currentLevel={liveData.currentLevel}
              blinds={liveData.blinds}
              timeRemaining={liveData.timeRemaining}
              spectatorCount={liveData.spectatorCount}
              pot={liveData.pot}
              communityCards={liveData.communityCards}
              isHandInProgress={liveData.isHandInProgress}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Включите TV Mode для начала трансляции</p>
                <Button onClick={toggleTVMode} className="mt-4">
                  <Tv className="h-4 w-4 mr-2" />
                  Включить TV Mode
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bubble" className="mt-4">
          {selectedTournament && (
            <BubbleProtection
              isActive={bubbleProtectionEnabled}
              bubblePosition={bubblePosition}
              playersRemaining={participants.length}
              tablesInTournament={hfhTables.length > 0 ? hfhTables : liveData.tables}
              prizeForBubble={prizeForBubble}
              handForHandActive={handForHandActive}
              onToggleHandForHand={toggleHandForHand}
            />
          )}
          {!bubbleProtectionEnabled && (
            <Card className="mt-4">
              <CardContent className="py-8 text-center">
                <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground mb-4">Bubble Protection неактивен</p>
                <Button onClick={() => setBubbleProtectionEnabled(true)} variant="outline">
                  <Shield className="h-4 w-4 mr-2" />
                  Активировать
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="icm" className="mt-4">
          {selectedTournament && icmEnabled ? (
            <ICMDealCalculator
              isOpen={icmEnabled}
              onClose={() => setIcmEnabled(false)}
              players={participants.map((p, i) => ({
                id: p.player_id,
                name: p.player_name,
                chips: p.chips,
                seatNumber: i + 1
              }))}
              prizePoolRemaining={selectedTournament.prize_pool || 0}
              payoutStructure={liveData.payoutPositions.length > 0 
                ? liveData.payoutPositions.map(p => ({ position: p.position, amount: p.amount }))
                : [
                    { position: 1, amount: (selectedTournament.prize_pool || 0) * 0.5 },
                    { position: 2, amount: (selectedTournament.prize_pool || 0) * 0.3 },
                    { position: 3, amount: (selectedTournament.prize_pool || 0) * 0.2 }
                  ]
              }
              onProposeDeal={(deal) => {
                console.log('Deal proposed:', deal);
                toast.success('Сделка предложена всем игрокам');
              }}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Calculator className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">ICM калькулятор неактивен</p>
                <Button onClick={() => setIcmEnabled(true)} variant="outline">
                  <Calculator className="h-4 w-4 mr-2" />
                  Открыть ICM Deal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Модерация чата
              </CardTitle>
              <CardDescription>
                Управление сообщениями и пользователями турнирного чата
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TournamentChatModeration
                messages={messages}
                onSendMessage={sendMessage}
                onDeleteMessage={deleteMessage}
                onMutePlayer={mutePlayer}
                onBanPlayer={banPlayer}
                onWarnPlayer={warnPlayer}
                onReportMessage={reportMessage}
                playerModerationStatus={playerStatuses}
                currentPlayerId="admin"
                isAdmin={true}
                isModerator={true}
                isChatEnabled={isChatEnabled}
                slowModeInterval={5}
                autoModEnabled={autoModEnabled}
                onToggleAutoMod={toggleAutoMod}
                className="relative static w-full max-w-none"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Распределение игроков
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {participants.map((p, i) => {
                    const totalChips = participants.reduce((s, p) => s + p.chips, 0);
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{i + 1}</Badge>
                          <span className="font-medium">{p.player_name}</span>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{p.chips.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">
                            {((p.chips / totalChips) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Метрики турнира
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Всего фишек</span>
                  <span className="font-bold">
                    {participants.reduce((s, p) => s + p.chips, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Средний стек</span>
                  <span className="font-bold">
                    {Math.round(participants.reduce((s, p) => s + p.chips, 0) / Math.max(participants.length, 1)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Чип-лидер</span>
                  <span className="font-bold text-emerald-500">
                    {participants[0]?.player_name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Шорт стек</span>
                  <span className="font-bold text-red-500">
                    {participants[participants.length - 1]?.player_name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Призовой фонд</span>
                  <span className="font-bold">
                    {(selectedTournament?.prize_pool || 0).toLocaleString()} 💎
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Уровень</span>
                  <span className="font-bold">
                    {liveData.currentLevel} ({liveData.blinds.small}/{liveData.blinds.big})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">H-f-H статус</span>
                  <Badge variant={handForHandActive ? 'destructive' : 'secondary'}>
                    {handForHandActive ? 'Активен' : 'Неактивен'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
