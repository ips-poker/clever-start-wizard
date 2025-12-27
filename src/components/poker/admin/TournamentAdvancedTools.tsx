import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Tv,
  Shield,
  RefreshCw,
  Calculator,
  MessageSquare,
  Users,
  Clock,
  AlertTriangle,
  PlayCircle,
  PauseCircle,
  Eye,
  BarChart3,
  TrendingUp,
  Zap,
  Trophy,
  Layers,
  Settings,
  Radio
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { FinalTableTVMode } from '../FinalTableTVMode';
import { BubbleProtection } from '../BubbleProtection';
import { ICMDealCalculator } from '../ICMDealCalculator';
import { TournamentChatModeration } from '../TournamentChatModeration';

interface Tournament {
  id: string;
  name: string;
  status: string;
  current_level: number | null;
  prize_pool: number | null;
  participants_count?: number;
}

interface Participant {
  id: string;
  player_id: string;
  player_name: string;
  chips: number;
  status: string;
  table_id: string | null;
}

export function TournamentAdvancedTools() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTournament, setSelectedTournament] = useState<Tournament | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [activeTab, setActiveTab] = useState('tv-mode');
  const [loading, setLoading] = useState(true);

  // Feature flags
  const [tvModeEnabled, setTvModeEnabled] = useState(false);
  const [bubbleProtectionEnabled, setBubbleProtectionEnabled] = useState(false);
  const [handForHandEnabled, setHandForHandEnabled] = useState(false);
  const [icmEnabled, setIcmEnabled] = useState(false);

  const loadTournaments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('online_poker_tournaments')
      .select('*')
      .in('status', ['running', 'paused'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading tournaments:', error);
      setLoading(false);
      return;
    }

    // Get participant counts
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

  const loadParticipants = async (tournamentId: string) => {
    const { data, error } = await supabase
      .from('online_poker_tournament_participants')
      .select(`
        *,
        players:players!online_poker_tournament_participants_player_id_fkey(name)
      `)
      .eq('tournament_id', tournamentId)
      .neq('status', 'eliminated')
      .order('chips', { ascending: false });

    if (error) {
      console.error('Error loading participants:', error);
      return;
    }

    const participantsData = data?.map(p => ({
      ...p,
      player_name: (p.players as any)?.name || 'Unknown'
    })) || [];

    setParticipants(participantsData);
  };

  useEffect(() => {
    loadTournaments();

    const channel = supabase
      .channel('tournament-tools')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_poker_tournaments' }, () => {
        loadTournaments();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'online_poker_tournament_participants' }, () => {
        if (selectedTournament) {
          loadParticipants(selectedTournament.id);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (selectedTournament) {
      loadParticipants(selectedTournament.id);
    }
  }, [selectedTournament]);

  const toggleTVMode = async () => {
    setTvModeEnabled(!tvModeEnabled);
    toast.success(tvModeEnabled ? 'TV Mode disabled' : 'TV Mode enabled');
  };

  const toggleBubbleProtection = async () => {
    setBubbleProtectionEnabled(!bubbleProtectionEnabled);
    toast.success(bubbleProtectionEnabled ? 'Bubble Protection disabled' : 'Bubble Protection enabled');
  };

  const toggleHandForHand = async () => {
    setHandForHandEnabled(!handForHandEnabled);
    if (!handForHandEnabled) {
      toast.success('Hand-for-Hand mode activated - All tables synchronized');
    } else {
      toast.success('Hand-for-Hand mode disabled');
    }
  };

  const handlePlayerElimination = (playerId: string) => {
    toast.info(`Elimination handled for player ${playerId}`);
  };

  const handleBubbleBurst = () => {
    setBubbleProtectionEnabled(false);
    setHandForHandEnabled(false);
    toast.success('Bubble burst! All remaining players in the money!');
  };

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
          <p className="text-muted-foreground">No active tournaments</p>
          <p className="text-sm text-muted-foreground mt-2">
            Start a tournament to access advanced tools
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
            Select Tournament
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
                  {t.participants_count} players
                </Badge>
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

        <Card className={handForHandEnabled ? 'border-red-500/50 bg-red-500/5' : ''}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-red-500" />
                <Label>H-f-H</Label>
              </div>
              <Switch checked={handForHandEnabled} onCheckedChange={toggleHandForHand} />
            </div>
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
              tournamentId={selectedTournament.id}
              tournamentName={selectedTournament.name}
              players={participants.slice(0, 9).map((p, i) => ({
                id: p.player_id,
                name: p.player_name,
                chips: p.chips,
                position: i + 1,
                isDealer: i === 0,
                isBigBlind: i === 1,
                isSmallBlind: i === 2,
                isActive: true,
                avatar: undefined
              }))}
              prizePool={selectedTournament.prize_pool || 0}
              payoutStructure={[
                { position: 1, percentage: 50, amount: (selectedTournament.prize_pool || 0) * 0.5 },
                { position: 2, percentage: 30, amount: (selectedTournament.prize_pool || 0) * 0.3 },
                { position: 3, percentage: 20, amount: (selectedTournament.prize_pool || 0) * 0.2 }
              ]}
              currentLevel={selectedTournament.current_level || 1}
              blinds={{ small: 100, big: 200, ante: 25 }}
              averageStack={participants.reduce((sum, p) => sum + p.chips, 0) / Math.max(participants.length, 1)}
            />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Tv className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Enable TV Mode to start broadcasting</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="bubble" className="mt-4">
          {selectedTournament && (
            <BubbleProtection
              tournamentId={selectedTournament.id}
              playersRemaining={participants.length}
              playersInMoney={Math.max(Math.floor(participants.length * 0.15), 3)}
              isHandForHand={handForHandEnabled}
              tablesActive={2}
              avgStackBB={participants.reduce((sum, p) => sum + p.chips, 0) / Math.max(participants.length, 1) / 200}
              onPlayerElimination={handlePlayerElimination}
              onBubbleBurst={handleBubbleBurst}
            />
          )}
        </TabsContent>

        <TabsContent value="icm" className="mt-4">
          {selectedTournament && (
            <ICMDealCalculator
              players={participants.map(p => ({
                id: p.player_id,
                name: p.player_name,
                chips: p.chips
              }))}
              prizePool={selectedTournament.prize_pool || 0}
              payoutStructure={[
                { position: 1, percentage: 50, amount: (selectedTournament.prize_pool || 0) * 0.5 },
                { position: 2, percentage: 30, amount: (selectedTournament.prize_pool || 0) * 0.3 },
                { position: 3, percentage: 20, amount: (selectedTournament.prize_pool || 0) * 0.2 }
              ]}
              onDealProposed={(deal) => {
                console.log('Deal proposed:', deal);
                toast.success(`Deal proposed: ${deal.type}`);
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4">
          {selectedTournament && (
            <TournamentChatModeration
              tournamentId={selectedTournament.id}
              onBanPlayer={(playerId) => toast.info(`Player ${playerId} banned from chat`)}
              onMutePlayer={(playerId, duration) => toast.info(`Player ${playerId} muted for ${duration}s`)}
            />
          )}
        </TabsContent>

        <TabsContent value="stats" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Player Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {participants.map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{i + 1}</Badge>
                        <span className="font-medium">{p.player_name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{p.chips.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">
                          {((p.chips / participants.reduce((s, p) => s + p.chips, 0)) * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Tournament Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Chips</span>
                  <span className="font-bold">
                    {participants.reduce((s, p) => s + p.chips, 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Average Stack</span>
                  <span className="font-bold">
                    {Math.round(participants.reduce((s, p) => s + p.chips, 0) / Math.max(participants.length, 1)).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chip Leader</span>
                  <span className="font-bold text-green-500">
                    {participants[0]?.player_name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Short Stack</span>
                  <span className="font-bold text-red-500">
                    {participants[participants.length - 1]?.player_name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Prize Pool</span>
                  <span className="font-bold">
                    {(selectedTournament?.prize_pool || 0).toLocaleString()} 💎
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
