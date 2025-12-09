// Syndikate Poker Table - Clean wrapper
import React from 'react';
import { FullscreenPokerTableWrapper } from './FullscreenPokerTableWrapper';

interface OnlinePokerTableProps {
  tableId: string;
  playerId: string;
  buyIn: number;
  isSpectator?: boolean;
  isTournament?: boolean;
  tournamentId?: string;
  onLeave: () => void;
}

export function OnlinePokerTable({ 
  tableId, 
  playerId, 
  buyIn, 
  isSpectator = false, 
  isTournament = false,
  tournamentId,
  onLeave 
}: OnlinePokerTableProps) {
  return (
    <FullscreenPokerTableWrapper
      tableId={tableId}
      playerId={playerId}
      buyIn={buyIn}
      isTournament={isTournament}
      tournamentId={tournamentId}
      onLeave={onLeave}
      maxSeats={6}
    />
  );
}

export default OnlinePokerTable;
