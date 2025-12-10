// Syndikate Poker Table - Clean wrapper
import React from 'react';
import { FullscreenPokerTableWrapper } from './FullscreenPokerTableWrapper';

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
      maxSeats={6}
    />
  );
}

export default OnlinePokerTable;
