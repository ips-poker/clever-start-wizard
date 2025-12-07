// Re-export the PPPoker-style professional table
// This file wraps PPPokerProfessionalTable for backward compatibility

import React from 'react';
import { PPPokerProfessionalTable } from './PPPokerProfessionalTable';

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
    <PPPokerProfessionalTable
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
