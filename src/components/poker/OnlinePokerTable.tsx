// Syndikate Poker Table - Clean wrapper
import React, { useState, useEffect } from 'react';
import { FullscreenPokerTableWrapper } from './FullscreenPokerTableWrapper';
import { supabase } from '@/integrations/supabase/client';

interface OnlinePokerTableProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  minBuyIn?: number;
  maxBuyIn?: number;
  playerBalance?: number;
  isSpectator?: boolean;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave: () => void;
  onBalanceUpdate?: () => void;
}

export function OnlinePokerTable({ 
  tableId, 
  playerId, 
  buyIn,
  minBuyIn = 200,
  maxBuyIn = 2000,
  playerBalance = 10000,
  isSpectator = false, 
  isTournament = false,
  tournamentId,
  onLeave,
  onBalanceUpdate
}: OnlinePokerTableProps) {
  const [maxSeats, setMaxSeats] = useState(6);
  
  // Fetch max_players from table
  useEffect(() => {
    const fetchTableConfig = async () => {
      const { data } = await supabase
        .from('poker_tables')
        .select('max_players')
        .eq('id', tableId)
        .single();
      
      if (data?.max_players) {
        setMaxSeats(data.max_players);
      }
    };
    
    fetchTableConfig();
  }, [tableId]);
  
  return (
    <FullscreenPokerTableWrapper
      tableId={tableId}
      playerId={playerId}
      buyIn={buyIn}
      minBuyIn={minBuyIn}
      maxBuyIn={maxBuyIn}
      playerBalance={playerBalance}
      isTournament={isTournament}
      tournamentId={tournamentId}
      onLeave={onLeave}
      onBalanceUpdate={onBalanceUpdate}
      maxSeats={maxSeats}
    />
  );
}

export default OnlinePokerTable;
