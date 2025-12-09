// Telegram Online Poker Table - Uses Fullscreen table
import React from 'react';
import { FullscreenPokerTableWrapper } from '@/components/poker/FullscreenPokerTableWrapper';

interface OnlinePokerTableProps {
  tableId: string;
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  buyIn?: number;
  onLeave: () => void;
}

export function OnlinePokerTable({
  tableId,
  playerId,
  playerName = 'Player',
  playerAvatar,
  buyIn = 10000,
  onLeave
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
      onLeave={onLeave}
      maxSeats={6}
    />
  );
}

export default OnlinePokerTable;
