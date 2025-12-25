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
      onLeave={onLeave}
      onBalanceUpdate={onBalanceUpdate}
      maxSeats={maxSeats}
      wideMode={true} // Telegram Mini App uses wider table
    />
  );
}

export default OnlinePokerTable;
