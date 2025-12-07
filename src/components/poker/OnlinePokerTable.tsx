// Re-export the production-ready poker table with all improvements
// This file wraps ProductionPokerTable for backward compatibility

import React from 'react';
import { ProductionPokerTable } from './ProductionPokerTable';

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
    <ProductionPokerTable
      tableId={tableId}
      playerId={playerId}
      buyIn={buyIn}
      isTournament={isTournament}
      tournamentId={tournamentId}
      onLeave={onLeave}
    />
  );
}

export default OnlinePokerTable;
