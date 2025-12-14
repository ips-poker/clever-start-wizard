// Telegram Online Poker Table - Uses Fullscreen table
import React from 'react';
import { FullscreenPokerTableWrapper } from '@/components/poker/FullscreenPokerTableWrapper';

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
      maxSeats={6}
      wideMode={true} // Telegram Mini App uses wider table
    />
  );
}

export default OnlinePokerTable;
