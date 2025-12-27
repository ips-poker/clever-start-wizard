import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  User,
  Activity,
  Target,
  Brain,
  AlertTriangle,
  Clock,
  DollarSign,
  Percent,
  FileText,
  Eye,
  RefreshCw
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useHUDStats } from '@/hooks/useHUDStats';
import { analyzePlaying, LeakAnalysis } from '@/utils/leakfinder';
import { exportToPokerStarsFormat, exportToJSON, exportToText, HandHistory } from '@/utils/handHistoryExport';

interface PlayerStats {
  id: string;
  player_id: string;
  player_name: string;
  hands_played: number;
  balance: number;
  total_won: number;
  total_lost: number;
  profit: number;
  bb_per_100: number;
}

export function PlayerAnalyticsPanel() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [leakAnalysis, setLeakAnalysis] = useState<LeakAnalysis | null>(null);
  const [handHistories, setHandHistories] = useState<HandHistory[]>([]);

  const { stats: hudStats } = useHUDStats(selectedPlayer?.player_id || '');

  const loadPlayers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('player_balances')
      .select(`
        id,
        player_id,
        balance,
        total_won,
        total_lost,
        hands_played,
        players!inner(name)
      `)
      .order('hands_played', { ascending: false });

    if (error) {
      console.error('Error loading players:', error);
      setLoading(false);
      return;
    }

    const playersWithStats = (data || []).map(p => ({
      id: p.id,
      player_id: p.player_id,
      player_name: (p.players as any)?.name || 'Unknown',
      hands_played: p.hands_played,
      balance: p.balance,
      total_won: p.total_won,
      total_lost: p.total_lost,
      profit: p.total_won - p.total_lost,
      bb_per_100: p.hands_played > 0 ? ((p.total_won - p.total_lost) / p.hands_played) * 100 / 20 : 0
    }));

    setPlayers(playersWithStats);
    setLoading(false);
  };

  const loadPlayerHandHistories = async (playerId: string) => {
    const { data, error } = await supabase
      .from('poker_hand_players')
      .select(`
        *,
        poker_hands!inner(
          id,
          hand_number,
          table_id,
          phase,
          pot,
          community_cards,
          winners,
          created_at,
          poker_tables!inner(name, small_blind, big_blind)
        )
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading hand histories:', error);
      return;
    }

    const histories: HandHistory[] = (data || []).map((h: any) => ({
      handId: h.poker_hands.id,
      handNumber: h.poker_hands.hand_number,
      tableId: h.poker_hands.table_id,
      tableName: h.poker_hands.poker_tables.name,
      smallBlind: h.poker_hands.poker_tables.small_blind,
      bigBlind: h.poker_hands.poker_tables.big_blind,
      timestamp: new Date(h.poker_hands.created_at),
      players: [{
        id: playerId,
        name: selectedPlayer?.player_name || 'Player',
        seatNumber: h.seat_number,
        stackStart: h.stack_start,
        stackEnd: h.stack_end,
        holeCards: h.hole_cards,
        isWinner: h.won_amount > 0,
        wonAmount: h.won_amount
      }],
      communityCards: h.poker_hands.community_cards || [],
      actions: [],
      pot: h.poker_hands.pot,
      winners: h.poker_hands.winners || [],
      showdown: []
    }));

    setHandHistories(histories);
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerHandHistories(selectedPlayer.player_id);
      
      // Analyze player's game
      if (hudStats) {
        const analysis = analyzePlaying({
          vpip: hudStats.vpip,
          pfr: hudStats.pfr,
          aggression: hudStats.aggression,
          wtsd: hudStats.wtsd,
          handsPlayed: hudStats.handsPlayed,
          winRate: hudStats.winRate,
          threeBetPercent: 0,
          cBetPercent: 0,
          foldToThreeBetPercent: 0,
          checkRaisePercent: 0,
          bbPer100: selectedPlayer.bb_per_100
        });
        setLeakAnalysis(analysis);
      }
    }
  }, [selectedPlayer, hudStats]);

  const handleExportHands = (format: 'pokerstars' | 'json' | 'text') => {
    if (handHistories.length === 0) {
      toast.error('No hand histories to export');
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    switch (format) {
      case 'pokerstars':
        content = handHistories.map(h => exportToPokerStarsFormat(h)).join('\n\n');
        filename = `${selectedPlayer?.player_name}_hands.txt`;
        mimeType = 'text/plain';
        break;
      case 'json':
        content = exportToJSON(handHistories);
        filename = `${selectedPlayer?.player_name}_hands.json`;
        mimeType = 'application/json';
        break;
      case 'text':
        content = handHistories.map(h => exportToText(h)).join('\n\n');
        filename = `${selectedPlayer?.player_name}_hands_readable.txt`;
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${handHistories.length} hands as ${format.toUpperCase()}`);
  };

  const filteredPlayers = players.filter(p =>
    p.player_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500';
      case 'major': return 'text-orange-500';
      case 'minor': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Search and Overview */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search players..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={loadPlayers} variant="outline" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Player List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="h-4 w-4" />
              Players ({filteredPlayers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {filteredPlayers.map(player => (
                  <div
                    key={player.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors
                      ${selectedPlayer?.id === player.id 
                        ? 'bg-primary/10 border-primary/50' 
                        : 'hover:bg-muted/50'
                      }`}
                    onClick={() => setSelectedPlayer(player)}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{player.player_name}</span>
                      <Badge variant={player.profit >= 0 ? 'default' : 'destructive'}>
                        {player.profit >= 0 ? '+' : ''}{player.profit.toLocaleString()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span>{player.hands_played} hands</span>
                      <span className={player.bb_per_100 >= 0 ? 'text-green-500' : 'text-red-500'}>
                        {player.bb_per_100.toFixed(2)} BB/100
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Player Details */}
        <Card className="md:col-span-2">
          {selectedPlayer ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {selectedPlayer.player_name}
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleExportHands('pokerstars')}>
                      <Download className="h-4 w-4 mr-1" />
                      PS Format
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => handleExportHands('json')}>
                      <Download className="h-4 w-4 mr-1" />
                      JSON
                    </Button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="stats">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="stats">HUD Stats</TabsTrigger>
                    <TabsTrigger value="leaks">Leak Finder</TabsTrigger>
                    <TabsTrigger value="history">History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="stats" className="mt-4 space-y-4">
                    {/* HUD Stats */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">VPIP</p>
                        <p className="text-2xl font-bold">{hudStats?.vpip.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">PFR</p>
                        <p className="text-2xl font-bold">{hudStats?.pfr.toFixed(1)}%</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">AF</p>
                        <p className="text-2xl font-bold">{hudStats?.aggression.toFixed(2)}</p>
                      </div>
                      <div className="p-3 bg-muted/30 rounded-lg">
                        <p className="text-xs text-muted-foreground">WTSD</p>
                        <p className="text-2xl font-bold">{hudStats?.wtsd.toFixed(1)}%</p>
                      </div>
                    </div>

                    {/* Win Rate Chart */}
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Win Rate (BB/100)</span>
                        <span className={`font-bold ${selectedPlayer.bb_per_100 >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {selectedPlayer.bb_per_100.toFixed(2)}
                        </span>
                      </div>
                      <Progress 
                        value={Math.min(100, Math.max(0, (selectedPlayer.bb_per_100 + 10) * 5))} 
                        className="h-2"
                      />
                    </div>

                    {/* Player Style */}
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <p className="text-sm font-medium mb-2">Player Style</p>
                      <div className="flex gap-2">
                        {hudStats && (
                          <>
                            {hudStats.vpip > 30 && <Badge>Loose</Badge>}
                            {hudStats.vpip < 20 && <Badge variant="secondary">Tight</Badge>}
                            {hudStats.aggression > 2 && <Badge variant="destructive">Aggressive</Badge>}
                            {hudStats.aggression < 1 && <Badge variant="outline">Passive</Badge>}
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="leaks" className="mt-4">
                    {leakAnalysis ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                          <div>
                            <p className="text-sm font-medium">Overall Score</p>
                            <p className="text-3xl font-bold">{leakAnalysis.overallScore}/100</p>
                          </div>
                          <div className={`p-3 rounded-full ${
                            leakAnalysis.overallScore >= 70 ? 'bg-green-500/20' :
                            leakAnalysis.overallScore >= 50 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                          }`}>
                            <Brain className={`h-8 w-8 ${
                              leakAnalysis.overallScore >= 70 ? 'text-green-500' :
                              leakAnalysis.overallScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                            }`} />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-medium">Identified Leaks</p>
                          {leakAnalysis.leaks.map((leak, i) => (
                            <div key={i} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium">{leak.category}</span>
                                <Badge className={getSeverityColor(leak.severity)}>
                                  {leak.severity}
                                </Badge>
                              </div>
                              <p className="text-sm text-muted-foreground">{leak.description}</p>
                              <p className="text-sm text-green-500 mt-2">💡 {leak.recommendation}</p>
                            </div>
                          ))}
                          {leakAnalysis.leaks.length === 0 && (
                            <p className="text-muted-foreground text-center py-4">
                              No significant leaks detected
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        Not enough data for analysis
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="history" className="mt-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {handHistories.slice(0, 50).map((hand, i) => (
                          <div key={i} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Hand #{hand.handNumber}</span>
                              <Badge variant={hand.players[0]?.isWinner ? 'default' : 'secondary'}>
                                {hand.players[0]?.isWinner 
                                  ? `+${hand.players[0].wonAmount}` 
                                  : `${(hand.players[0]?.stackEnd || 0) - (hand.players[0]?.stackStart || 0)}`
                                }
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{hand.tableName}</span>
                              <span>•</span>
                              <span>{hand.smallBlind}/{hand.bigBlind}</span>
                              <span>•</span>
                              <span>{hand.timestamp.toLocaleString()}</span>
                            </div>
                            {hand.players[0]?.holeCards && (
                              <div className="flex gap-1 mt-2">
                                {hand.players[0].holeCards.map((card, ci) => (
                                  <span key={ci} className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
                                    {card}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {handHistories.length === 0 && (
                          <p className="text-center py-8 text-muted-foreground">
                            No hand histories found
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </>
          ) : (
            <CardContent className="py-12 text-center">
              <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Select a player to view analytics</p>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
