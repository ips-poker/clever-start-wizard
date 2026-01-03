// Telegram Online Poker Table - Uses Fullscreen table
import React, { useState, useEffect } from 'react';
import { FullscreenPokerTableWrapper } from '@/components/poker/FullscreenPokerTableWrapper';
import { supabase } from '@/integrations/supabase/client';

interface OnlinePokerTableProps {
  tableId: string;
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  buyIn?: number;
  minBuyIn?: number;
  maxBuyIn?: number;
  playerBalance?: number;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave: () => void;
  onBalanceUpdate?: () => void;
}

export function OnlinePokerTable({
  tableId,
  playerId,
  playerName = 'Player',
  playerAvatar,
  buyIn = 10000,
  minBuyIn = 200,
  maxBuyIn = 2000,
  playerBalance = 10000,
  isTournament: propIsTournament,
  tournamentId: propTournamentId,
  onLeave,
  onBalanceUpdate
}: OnlinePokerTableProps) {
  const [maxSeats, setMaxSeats] = useState(6);
  const [isTournament, setIsTournament] = useState(propIsTournament || false);
  const [tournamentId, setTournamentId] = useState<string | null>(propTournamentId || null);
  
  // Fetch table config including tournament info
  useEffect(() => {
    const fetchTableConfig = async () => {
      const { data } = await supabase
        .from('poker_tables')
        .select('max_players, tournament_id, table_type')
        .eq('id', tableId)
        .single();
      
      if (data) {
        if (data.max_players) {
          setMaxSeats(data.max_players);
        }
        // Auto-detect tournament from table data
        if (data.tournament_id) {
          setTournamentId(data.tournament_id);
          setIsTournament(true);
        } else if (data.table_type === 'tournament') {
          setIsTournament(true);
        }
      }
    };
    
    fetchTableConfig();
  }, [tableId]);
  
  if (!playerId) {
    return (
      <div className="flex items-center justify-center min-h-[400px] bg-background text-foreground">
        <p>Player ID required</p>
      </div>
    );
  }

  return (
    <FullscreenPokerTableWrapper
      tableId={tableId}
      playerId={playerId}
      buyIn={buyIn}
      minBuyIn={minBuyIn}
      maxBuyIn={maxBuyIn}
      playerBalance={playerBalance}
      isTournament={isTournament}
      tournamentId={tournamentId || undefined}
      onLeave={onLeave}
      onBalanceUpdate={onBalanceUpdate}
      maxSeats={maxSeats}
      wideMode={true} // Telegram Mini App uses wider table
    />
  );
}

export default OnlinePokerTable;
