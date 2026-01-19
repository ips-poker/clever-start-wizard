import React, { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RefreshCw, Download, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHandHistory, HandHistoryRecord } from '@/hooks/useHandHistory';
import { HandHistoryFilters, ResultFilter, SortOption } from './HandHistoryFilters';
import { HandHistoryStats } from './HandHistoryStats';
import { HandHistoryRow, HandRowData } from './HandHistoryRow';
import { SessionGroup } from './SessionGroup';
import { HandDetailModal } from './HandDetailModal';
import { HandReplayer, HandReplay, ReplayAction, ReplayPlayer } from '../HandReplayer';
import { formatHandHistoryPokerStars } from '@/utils/handHistoryFormatter';

interface ProHandHistoryProps {
  tableId?: string;
  playerId?: string;
  className?: string;
  onReplayHand?: (hand: HandReplay) => void;
}

export function ProHandHistory({ tableId, playerId, className, onReplayHand }: ProHandHistoryProps) {
  const { hands, isLoading, error, selectedHand, setSelectedHand, fetchHistory, fetchHandDetails } = useHandHistory({
    tableId,
    playerId,
    limit: 100
  });

  // Filters state
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDetails, setShowDetails] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'sessions'>('sessions');

  // Convert hand to row data format
  const convertToRowData = useCallback((hand: HandHistoryRecord): HandRowData => {
    const isWinner = hand.winners.some(w => w.playerId === playerId);
    const myPlayer = hand.players.find(p => p.playerId === playerId);
    const amountWon = hand.winners.find(w => w.playerId === playerId)?.amount || 0;
    const amountLost = myPlayer ? myPlayer.betAmount : 0;
    
    let result: 'won' | 'lost' | 'folded' = 'lost';
    if (isWinner) result = 'won';
    else if (myPlayer?.isFolded) result = 'folded';

    return {
      id: hand.id,
      handNumber: hand.handNumber,
      timestamp: hand.completedAt || hand.startedAt,
      pot: hand.pot,
      communityCards: hand.communityCards,
      myCards: myPlayer?.holeCards || [],
      result,
      amountWon,
      amountLost,
      playerCount: hand.players.length,
      winnerName: hand.winners[0]?.playerName,
      handRank: hand.winners.find(w => w.playerId === playerId)?.handName,
      tableName: hand.tableName
    };
  }, [playerId]);

  // Convert to replay format
  const convertToReplayFormat = useCallback((hand: HandHistoryRecord): HandReplay => {
    const players: ReplayPlayer[] = hand.players.map(p => ({
      id: p.playerId,
      name: p.playerName || `Seat ${p.seatNumber}`,
      seatNumber: p.seatNumber,
      stackStart: p.stackStart,
      stackEnd: p.stackEnd || p.stackStart,
      holeCards: p.holeCards,
      isWinner: hand.winners.some(w => w.playerId === p.playerId),
      amountWon: p.wonAmount,
      handRank: p.handRank
    }));

    let runningPot = 0;
    const sbPlayer = hand.players.find(p => p.seatNumber === hand.smallBlindSeat);
    const bbPlayer = hand.players.find(p => p.seatNumber === hand.bigBlindSeat);
    const smallBlind = sbPlayer ? Math.min(sbPlayer.betAmount, 10) : 10;
    const bigBlind = bbPlayer ? Math.min(bbPlayer.betAmount, 20) : 20;
    runningPot = smallBlind + bigBlind;

    const actions: ReplayAction[] = hand.actions.map(a => {
      if (a.amount) runningPot += a.amount;
      return {
        phase: a.phase as ReplayAction['phase'],
        playerId: a.playerId,
        playerName: a.playerName,
        seatNumber: a.seatNumber,
        action: a.actionType as ReplayAction['action'],
        amount: a.amount,
        potAfter: runningPot,
        timestamp: new Date(a.createdAt).getTime()
      };
    });

    return {
      handId: hand.id,
      handNumber: hand.handNumber,
      timestamp: new Date(hand.startedAt).getTime(),
      players,
      communityCards: hand.communityCards,
      actions,
      dealerSeat: hand.dealerSeat,
      smallBlindSeat: hand.smallBlindSeat,
      bigBlindSeat: hand.bigBlindSeat,
      smallBlindAmount: smallBlind,
      bigBlindAmount: bigBlind,
      potTotal: hand.pot,
      winners: hand.winners.map(w => ({
        playerId: w.playerId,
        amount: w.amount,
        handRank: w.handName
      }))
    };
  }, []);

  // Apply filters and sorting
  const filteredHands = useMemo(() => {
    let result = hands.map(convertToRowData);

    // Apply result filter
    if (resultFilter !== 'all') {
      result = result.filter(h => h.result === resultFilter);
    }

    // Apply search
    if (searchQuery) {
      result = result.filter(h => 
        h.handNumber.toString().includes(searchQuery) ||
        h.tableName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply sorting
    switch (sortBy) {
      case 'oldest':
        result.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        break;
      case 'biggest_pot':
        result.sort((a, b) => b.pot - a.pot);
        break;
      case 'biggest_win':
        result.sort((a, b) => b.amountWon - a.amountWon);
        break;
      default: // newest
        result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    return result;
  }, [hands, resultFilter, searchQuery, sortBy, convertToRowData]);

  // Group by session/date
  const sessionGroups = useMemo(() => {
    const groups: Record<string, HandRowData[]> = {};
    
    filteredHands.forEach(hand => {
      const date = new Date(hand.timestamp).toDateString();
      if (!groups[date]) groups[date] = [];
      groups[date].push(hand);
    });

    return Object.entries(groups).sort(([a], [b]) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
  }, [filteredHands]);

  // Calculate stats
  const stats = useMemo(() => {
    const allRows = hands.map(convertToRowData);
    const wonHands = allRows.filter(h => h.result === 'won');
    const totalWon = wonHands.reduce((sum, h) => sum + h.amountWon, 0);
    const totalLost = allRows.reduce((sum, h) => sum + (h.result === 'lost' ? h.amountLost : 0), 0);
    const biggestWin = Math.max(0, ...wonHands.map(h => h.amountWon));
    const biggestPot = Math.max(0, ...allRows.map(h => h.pot));
    const winRate = allRows.length > 0 ? (wonHands.length / allRows.length) * 100 : 0;

    return { totalHands: allRows.length, totalWon, totalLost, winRate, biggestWin, biggestPot };
  }, [hands, convertToRowData]);

  // Handlers
  const handleSelectHand = async (row: HandRowData) => {
    await fetchHandDetails(row.id);
    setShowDetails(true);
  };

  const handleReplayHand = (row: HandRowData) => {
    const hand = hands.find(h => h.id === row.id);
    if (hand) {
      const replayData = convertToReplayFormat(hand);
      if (onReplayHand) {
        onReplayHand(replayData);
      } else {
        setSelectedHand(hand);
        setShowReplay(true);
        setShowDetails(false);
      }
    }
  };

  const handleReplayFromDetails = () => {
    if (selectedHand) {
      const replayData = convertToReplayFormat(selectedHand);
      if (onReplayHand) {
        onReplayHand(replayData);
        setShowDetails(false);
      } else {
        setShowReplay(true);
        setShowDetails(false);
      }
    }
  };

  const handleExport = () => {
    if (hands.length === 0) return;
    // Export all hands in PokerStars format
    const content = hands.map(hand => {
      // Simplified export
      return `Hand #${hand.handNumber} - Pot: ${hand.pot} - Winners: ${hand.winners.map(w => `${w.playerName} (${w.amount})`).join(', ')}`;
    }).join('\n\n');
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hand-history-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading && hands.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={cn('flex flex-col', className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <History className="h-4 w-4 text-primary" />
              История рук
            </CardTitle>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={handleExport} disabled={hands.length === 0}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" onClick={fetchHistory} disabled={isLoading}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 flex flex-col gap-3 p-3 pt-0">
          {/* Stats */}
          {hands.length > 0 && (
            <HandHistoryStats {...stats} />
          )}

          {/* Filters */}
          <HandHistoryFilters
            resultFilter={resultFilter}
            onResultFilterChange={setResultFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            totalHands={hands.length}
            filteredCount={filteredHands.length}
          />

          {/* Error */}
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-lg">
              {error}
            </div>
          )}

          {/* Hands List */}
          {filteredHands.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              {hands.length === 0 ? 'История пуста' : 'Нет рук по фильтру'}
            </div>
          ) : (
            <ScrollArea className="flex-1 -mx-3 px-3">
              <div className="space-y-3 pb-2">
                {viewMode === 'sessions' ? (
                  sessionGroups.map(([date, groupHands]) => {
                    const sessionWon = groupHands.filter(h => h.result === 'won').reduce((s, h) => s + h.amountWon, 0);
                    const sessionLost = groupHands.filter(h => h.result === 'lost').reduce((s, h) => s + h.amountLost, 0);
                    
                    return (
                      <SessionGroup
                        key={date}
                        date={date}
                        hands={groupHands}
                        totalWon={sessionWon}
                        totalLost={sessionLost}
                        onSelectHand={handleSelectHand}
                        onReplayHand={handleReplayHand}
                        defaultExpanded={sessionGroups.indexOf([date, groupHands]) === 0}
                      />
                    );
                  })
                ) : (
                  filteredHands.map(hand => (
                    <HandHistoryRow
                      key={hand.id}
                      hand={hand}
                      onSelect={() => handleSelectHand(hand)}
                      onReplay={() => handleReplayHand(hand)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      <HandDetailModal
        hand={selectedHand}
        open={showDetails}
        onClose={() => setShowDetails(false)}
        onReplay={handleReplayFromDetails}
        playerId={playerId}
      />

      {/* Replay Modal */}
      {showReplay && selectedHand && (
        <div className="fixed inset-4 z-50 bg-black/80 backdrop-blur-sm rounded-xl overflow-hidden">
          <HandReplayer
            hand={convertToReplayFormat(selectedHand)}
            onClose={() => setShowReplay(false)}
            isFullscreen
          />
        </div>
      )}
    </>
  );
}

export default ProHandHistory;
