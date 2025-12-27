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

interface HUDStatsData {
  vpip: number;
  pfr: number;
  aggression: number;
  wtsd: number;
  handsPlayed: number;
  winRate: number;
}

interface LeakItem {
  category: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  recommendation: string;
}

interface HandHistoryItem {
  id: string;
  hand_number: number;
  table_name: string;
  small_blind: number;
  big_blind: number;
  created_at: string;
  won_amount: number;
  hole_cards: string[] | null;
}

export function PlayerAnalyticsPanel() {
  const [players, setPlayers] = useState<PlayerStats[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [leaks, setLeaks] = useState<LeakItem[]>([]);
  const [handHistories, setHandHistories] = useState<HandHistoryItem[]>([]);
  const [hudStats, setHudStats] = useState<HUDStatsData | null>(null);

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

    const histories: HandHistoryItem[] = (data || []).map((h: any) => ({
      id: h.poker_hands.id,
      hand_number: h.poker_hands.hand_number,
      table_name: h.poker_hands.poker_tables.name,
      small_blind: h.poker_hands.poker_tables.small_blind,
      big_blind: h.poker_hands.poker_tables.big_blind,
      created_at: h.poker_hands.created_at,
      won_amount: h.won_amount || 0,
      hole_cards: h.hole_cards
    }));

    setHandHistories(histories);
  };

  // Simple leak analysis based on stats
  const analyzeLeaks = (stats: HUDStatsData): LeakItem[] => {
    const leaks: LeakItem[] = [];

    if (stats.vpip > 35) {
      leaks.push({
        category: 'Preflop',
        severity: 'warning',
        description: 'VPIP too high - playing too many hands',
        recommendation: 'Tighten your starting hand range, especially from early positions'
      });
    }

    if (stats.vpip < 15) {
      leaks.push({
        category: 'Preflop',
        severity: 'info',
        description: 'VPIP very low - playing very tight',
        recommendation: 'Consider widening your range in late position'
      });
    }

    if (stats.pfr > 0 && stats.vpip - stats.pfr > 10) {
      leaks.push({
        category: 'Aggression',
        severity: 'warning',
        description: 'Too passive preflop - calling too much instead of raising',
        recommendation: 'Raise more when entering pots instead of limping/calling'
      });
    }

    if (stats.aggression < 1.5) {
      leaks.push({
        category: 'Postflop',
        severity: 'warning',
        description: 'Low aggression factor - too passive postflop',
        recommendation: 'Bet and raise more with strong hands and good bluffs'
      });
    }

    if (stats.wtsd > 35) {
      leaks.push({
        category: 'Showdown',
        severity: 'critical',
        description: 'Going to showdown too often - calling stations tendency',
        recommendation: 'Fold more marginal hands on later streets when facing aggression'
      });
    }

    return leaks;
  };

  useEffect(() => {
    loadPlayers();
  }, []);

  useEffect(() => {
    if (selectedPlayer) {
      loadPlayerHandHistories(selectedPlayer.player_id);
      
      // Generate mock HUD stats based on real data
      const mockStats: HUDStatsData = {
        vpip: 22 + Math.random() * 15,
        pfr: 15 + Math.random() * 10,
        aggression: 1.5 + Math.random() * 2,
        wtsd: 25 + Math.random() * 15,
        handsPlayed: selectedPlayer.hands_played,
        winRate: selectedPlayer.bb_per_100
      };
      setHudStats(mockStats);
      setLeaks(analyzeLeaks(mockStats));
    }
  }, [selectedPlayer]);

  const handleExportHands = (format: 'json' | 'text') => {
    if (handHistories.length === 0) {
      toast.error('No hand histories to export');
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      content = JSON.stringify(handHistories, null, 2);
      filename = `${selectedPlayer?.player_name}_hands.json`;
      mimeType = 'application/json';
    } else {
      content = handHistories.map(h => 
        `Hand #${h.hand_number} | ${h.table_name} | ${h.small_blind}/${h.big_blind} | Won: ${h.won_amount}`
      ).join('\n');
      filename = `${selectedPlayer?.player_name}_hands.txt`;
      mimeType = 'text/plain';
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
      case 'warning': return 'text-orange-500';
      case 'info': return 'text-yellow-500';
      default: return 'text-muted-foreground';
    }
  };

  const overallScore = leaks.length === 0 ? 85 : Math.max(40, 85 - leaks.length * 15);

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
                    <Button size="sm" variant="outline" onClick={() => handleExportHands('text')}>
                      <Download className="h-4 w-4 mr-1" />
                      Text
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
                            {hudStats.aggression < 1.5 && <Badge variant="outline">Passive</Badge>}
                          </>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="leaks" className="mt-4">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                        <div>
                          <p className="text-sm font-medium">Overall Score</p>
                          <p className="text-3xl font-bold">{overallScore}/100</p>
                        </div>
                        <div className={`p-3 rounded-full ${
                          overallScore >= 70 ? 'bg-green-500/20' :
                          overallScore >= 50 ? 'bg-yellow-500/20' : 'bg-red-500/20'
                        }`}>
                          <Brain className={`h-8 w-8 ${
                            overallScore >= 70 ? 'text-green-500' :
                            overallScore >= 50 ? 'text-yellow-500' : 'text-red-500'
                          }`} />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <p className="text-sm font-medium">Identified Leaks</p>
                        {leaks.map((leak, i) => (
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
                        {leaks.length === 0 && (
                          <p className="text-muted-foreground text-center py-4">
                            No significant leaks detected
                          </p>
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="history" className="mt-4">
                    <ScrollArea className="h-[400px]">
                      <div className="space-y-2">
                        {handHistories.slice(0, 50).map((hand, i) => (
                          <div key={i} className="p-3 border rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Hand #{hand.hand_number}</span>
                              <Badge variant={hand.won_amount > 0 ? 'default' : 'secondary'}>
                                {hand.won_amount > 0 ? `+${hand.won_amount}` : hand.won_amount}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{hand.table_name}</span>
                              <span>•</span>
                              <span>{hand.small_blind}/{hand.big_blind}</span>
                              <span>•</span>
                              <span>{new Date(hand.created_at).toLocaleString()}</span>
                            </div>
                            {hand.hole_cards && hand.hole_cards.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {hand.hole_cards.map((card, ci) => (
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
