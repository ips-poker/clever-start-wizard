/**
 * Tournament seating utilities for consistent table/seat calculation
 * across admin panel and player-facing components
 */

// Default players per table - standard 9-max format
export const DEFAULT_PLAYERS_PER_TABLE = 9;

/**
 * Calculate table number from global seat number
 * @param seatNumber - Global seat number (1-indexed, continuous)
 * @param playersPerTable - Max players per table (default 9)
 * @returns Table number (1-indexed)
 */
export function calculateTableNumber(seatNumber: number, playersPerTable: number = DEFAULT_PLAYERS_PER_TABLE): number {
  return Math.ceil(seatNumber / playersPerTable);
}

/**
 * Calculate seat at table from global seat number
 * @param seatNumber - Global seat number (1-indexed, continuous)
 * @param playersPerTable - Max players per table (default 9)
 * @returns Seat number at table (1-indexed, 1 to playersPerTable)
 */
export function calculateSeatAtTable(seatNumber: number, playersPerTable: number = DEFAULT_PLAYERS_PER_TABLE): number {
  return ((seatNumber - 1) % playersPerTable) + 1;
}

/**
 * Calculate global seat number from table and seat
 * @param tableNumber - Table number (1-indexed)
 * @param seatAtTable - Seat at table (1-indexed)
 * @param playersPerTable - Max players per table (default 9)
 * @returns Global seat number
 */
export function calculateGlobalSeatNumber(tableNumber: number, seatAtTable: number, playersPerTable: number = DEFAULT_PLAYERS_PER_TABLE): number {
  return (tableNumber - 1) * playersPerTable + seatAtTable;
}

/**
 * Get formatted seat display string
 * @param seatNumber - Global seat number
 * @param playersPerTable - Max players per table (default 9)
 * @returns Formatted string like "СТОЛ 2 • МЕСТО 5"
 */
export function formatSeatDisplay(seatNumber: number, playersPerTable: number = DEFAULT_PLAYERS_PER_TABLE): string {
  const table = calculateTableNumber(seatNumber, playersPerTable);
  const seat = calculateSeatAtTable(seatNumber, playersPerTable);
  return `СТОЛ ${table} • МЕСТО ${seat}`;
}

/**
 * Detect players per table from existing seat assignments
 * Analyzes the seat number pattern to determine table size
 * @param seatNumbers - Array of assigned seat numbers
 * @returns Detected players per table or default (9)
 */
export function detectPlayersPerTable(seatNumbers: number[]): number {
  if (seatNumbers.length < 2) return DEFAULT_PLAYERS_PER_TABLE;
  
  const sortedSeats = [...seatNumbers].sort((a, b) => a - b);
  
  // Check for common table sizes (9, 8, 6)
  for (const size of [9, 8, 6]) {
    // Check if pattern matches this table size
    // Look for seats that would be on different tables
    const hasMultipleTables = sortedSeats.some(s => s > size);
    
    if (hasMultipleTables) {
      // Verify the first seat on "table 2" is within expected range
      const table2Seats = sortedSeats.filter(s => s > size && s <= size * 2);
      if (table2Seats.length > 0) {
        // Additional validation: check if the gap makes sense
        const maxTable1 = Math.max(...sortedSeats.filter(s => s <= size));
        const minTable2 = Math.min(...table2Seats);
        
        // The gap should be reasonable (not more than size seats)
        if (minTable2 - maxTable1 <= size) {
          return size;
        }
      }
    }
  }
  
  return DEFAULT_PLAYERS_PER_TABLE;
}
