/**
 * Connection Manager v1.0
 * Manages WebSocket connections with memory cleanup and health monitoring
 * 
 * Features:
 * - Automatic cleanup of stale connections
 * - Connection limit per table
 * - Health monitoring and statistics
 * - Memory-efficient storage with LRU eviction
 */

export interface ConnectionInfo {
  socket: WebSocket;
  playerId: string;
  tableId: string;
  playerName?: string;
  connectedAt: number;
  lastPingAt: number;
  lastPongAt: number;
  missedPings: number;
  messageCount: number;
}

export interface TableConnections {
  connections: Map<string, ConnectionInfo>;
  createdAt: number;
  lastActivityAt: number;
}

// Configuration
const CONFIG = {
  MAX_TABLES: 200,                    // Maximum tables in memory
  MAX_CONNECTIONS_PER_TABLE: 9,       // Maximum 9 players per table (poker standard)
  STALE_CONNECTION_MS: 60000,         // 60 seconds without pong = stale
  CLEANUP_INTERVAL_MS: 30000,         // Cleanup every 30 seconds
  MAX_MISSED_PINGS: 3,                // Disconnect after 3 missed pings
  TABLE_IDLE_TIMEOUT_MS: 300000,      // Remove empty table after 5 minutes
};

// Storage
const tableConnections = new Map<string, TableConnections>();
let cleanupIntervalId: number | null = null;
let totalConnectionCount = 0;
let totalMessageCount = 0;

/**
 * Initialize cleanup interval
 */
export function initConnectionManager(): void {
  if (cleanupIntervalId === null) {
    cleanupIntervalId = setInterval(() => {
      cleanupStaleConnections();
    }, CONFIG.CLEANUP_INTERVAL_MS) as unknown as number;
    
    console.log('[ConnMgr] ✅ Connection manager initialized');
  }
}

/**
 * Stop cleanup interval
 */
export function stopConnectionManager(): void {
  if (cleanupIntervalId !== null) {
    clearInterval(cleanupIntervalId);
    cleanupIntervalId = null;
  }
}

/**
 * Add a connection for a player at a table
 */
export function addConnection(
  tableId: string,
  playerId: string,
  socket: WebSocket,
  playerName?: string
): { success: boolean; error?: string } {
  // Check if table exists, create if not
  if (!tableConnections.has(tableId)) {
    // Check table limit
    if (tableConnections.size >= CONFIG.MAX_TABLES) {
      // Remove oldest idle table
      const oldestTable = findOldestIdleTable();
      if (oldestTable) {
        removeTable(oldestTable);
        console.log(`[ConnMgr] 🗑️ Removed idle table ${oldestTable} to make room`);
      } else {
        console.warn(`[ConnMgr] ⚠️ Max tables reached (${CONFIG.MAX_TABLES})`);
        return { success: false, error: 'Server at capacity' };
      }
    }
    
    tableConnections.set(tableId, {
      connections: new Map(),
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
    });
  }
  
  const table = tableConnections.get(tableId)!;
  
  // Check connection limit per table
  if (table.connections.size >= CONFIG.MAX_CONNECTIONS_PER_TABLE && !table.connections.has(playerId)) {
    return { success: false, error: 'Table is full' };
  }
  
  // Close existing connection if any
  const existing = table.connections.get(playerId);
  if (existing && existing.socket.readyState === WebSocket.OPEN) {
    try {
      existing.socket.close(1000, 'Replaced by new connection');
    } catch (e) {
      // Ignore close errors
    }
  }
  
  // Add new connection
  const now = Date.now();
  table.connections.set(playerId, {
    socket,
    playerId,
    tableId,
    playerName,
    connectedAt: now,
    lastPingAt: now,
    lastPongAt: now,
    missedPings: 0,
    messageCount: 0,
  });
  
  table.lastActivityAt = now;
  totalConnectionCount++;
  
  console.log(`[ConnMgr] ➕ Added connection: table=${tableId.slice(0,8)} player=${playerId.slice(0,8)} (${table.connections.size} at table, ${getTotalConnections()} total)`);
  
  return { success: true };
}

/**
 * Remove a connection
 */
export function removeConnection(tableId: string, playerId: string): boolean {
  const table = tableConnections.get(tableId);
  if (!table) return false;
  
  const connection = table.connections.get(playerId);
  if (!connection) return false;
  
  // Close socket if still open
  if (connection.socket.readyState === WebSocket.OPEN) {
    try {
      connection.socket.close(1000, 'Connection removed');
    } catch (e) {
      // Ignore close errors
    }
  }
  
  table.connections.delete(playerId);
  table.lastActivityAt = Date.now();
  
  console.log(`[ConnMgr] ➖ Removed connection: table=${tableId.slice(0,8)} player=${playerId.slice(0,8)} (${table.connections.size} remaining)`);
  
  // Remove table if empty and idle
  if (table.connections.size === 0) {
    scheduleTableRemoval(tableId);
  }
  
  return true;
}

/**
 * Get connection for a player
 */
export function getConnection(tableId: string, playerId: string): ConnectionInfo | undefined {
  return tableConnections.get(tableId)?.connections.get(playerId);
}

/**
 * Get all connections for a table
 */
export function getTableConnections(tableId: string): Map<string, ConnectionInfo> | undefined {
  return tableConnections.get(tableId)?.connections;
}

/**
 * Record a pong received from client
 */
export function recordPong(tableId: string, playerId: string): void {
  const connection = getConnection(tableId, playerId);
  if (connection) {
    connection.lastPongAt = Date.now();
    connection.missedPings = 0;
  }
}

/**
 * Record a message sent/received
 */
export function recordMessage(tableId: string, playerId: string): void {
  const connection = getConnection(tableId, playerId);
  if (connection) {
    connection.messageCount++;
    totalMessageCount++;
  }
  
  const table = tableConnections.get(tableId);
  if (table) {
    table.lastActivityAt = Date.now();
  }
}

/**
 * Send ping to all connections and track missed pings
 */
export function pingAllConnections(): { sent: number; stale: number } {
  let sent = 0;
  let stale = 0;
  const now = Date.now();
  
  for (const [tableId, table] of tableConnections) {
    for (const [playerId, conn] of table.connections) {
      // Check for stale connection
      if (now - conn.lastPongAt > CONFIG.STALE_CONNECTION_MS) {
        conn.missedPings++;
        
        if (conn.missedPings >= CONFIG.MAX_MISSED_PINGS) {
          console.log(`[ConnMgr] 💀 Stale connection detected: ${playerId.slice(0,8)} (${conn.missedPings} missed pings)`);
          stale++;
          removeConnection(tableId, playerId);
          continue;
        }
      }
      
      // Send ping
      if (conn.socket.readyState === WebSocket.OPEN) {
        try {
          conn.socket.send(JSON.stringify({ type: 'ping', timestamp: now }));
          conn.lastPingAt = now;
          sent++;
        } catch (e) {
          stale++;
          removeConnection(tableId, playerId);
        }
      } else {
        stale++;
        removeConnection(tableId, playerId);
      }
    }
  }
  
  return { sent, stale };
}

/**
 * Broadcast message to all connections at a table
 */
export function broadcastToTable(tableId: string, message: any, excludePlayerId?: string): number {
  const table = tableConnections.get(tableId);
  if (!table) return 0;
  
  const payload = JSON.stringify(message);
  let sent = 0;
  
  for (const [playerId, conn] of table.connections) {
    if (excludePlayerId && playerId === excludePlayerId) continue;
    
    if (conn.socket.readyState === WebSocket.OPEN) {
      try {
        conn.socket.send(payload);
        sent++;
      } catch (e) {
        console.error(`[ConnMgr] Error broadcasting to ${playerId.slice(0,8)}:`, e);
      }
    }
  }
  
  return sent;
}

/**
 * Send message to specific player
 */
export function sendToPlayer(tableId: string, playerId: string, message: any): boolean {
  const conn = getConnection(tableId, playerId);
  if (!conn || conn.socket.readyState !== WebSocket.OPEN) return false;
  
  try {
    conn.socket.send(JSON.stringify(message));
    recordMessage(tableId, playerId);
    return true;
  } catch (e) {
    console.error(`[ConnMgr] Error sending to ${playerId.slice(0,8)}:`, e);
    return false;
  }
}

/**
 * Cleanup stale connections and empty tables
 */
function cleanupStaleConnections(): void {
  const now = Date.now();
  let removedConnections = 0;
  let removedTables = 0;
  
  for (const [tableId, table] of tableConnections) {
    // Check each connection
    for (const [playerId, conn] of table.connections) {
      // Remove closed sockets
      if (conn.socket.readyState === WebSocket.CLOSED || conn.socket.readyState === WebSocket.CLOSING) {
        table.connections.delete(playerId);
        removedConnections++;
        continue;
      }
      
      // Remove stale connections (no pong for too long)
      if (now - conn.lastPongAt > CONFIG.STALE_CONNECTION_MS && conn.missedPings >= CONFIG.MAX_MISSED_PINGS) {
        try {
          conn.socket.close(1000, 'Stale connection');
        } catch (e) {
          // Ignore
        }
        table.connections.delete(playerId);
        removedConnections++;
      }
    }
    
    // Remove empty tables that have been idle
    if (table.connections.size === 0 && now - table.lastActivityAt > CONFIG.TABLE_IDLE_TIMEOUT_MS) {
      tableConnections.delete(tableId);
      removedTables++;
    }
  }
  
  if (removedConnections > 0 || removedTables > 0) {
    console.log(`[ConnMgr] 🧹 Cleanup: removed ${removedConnections} connections, ${removedTables} tables`);
  }
}

/**
 * Find oldest idle table for eviction
 */
function findOldestIdleTable(): string | null {
  let oldest: string | null = null;
  let oldestTime = Infinity;
  
  for (const [tableId, table] of tableConnections) {
    if (table.connections.size === 0 && table.lastActivityAt < oldestTime) {
      oldest = tableId;
      oldestTime = table.lastActivityAt;
    }
  }
  
  return oldest;
}

/**
 * Remove a table and all its connections
 */
function removeTable(tableId: string): void {
  const table = tableConnections.get(tableId);
  if (!table) return;
  
  for (const [, conn] of table.connections) {
    if (conn.socket.readyState === WebSocket.OPEN) {
      try {
        conn.socket.close(1000, 'Table removed');
      } catch (e) {
        // Ignore
      }
    }
  }
  
  tableConnections.delete(tableId);
}

/**
 * Schedule table removal after timeout
 */
function scheduleTableRemoval(tableId: string): void {
  setTimeout(() => {
    const table = tableConnections.get(tableId);
    if (table && table.connections.size === 0) {
      tableConnections.delete(tableId);
      console.log(`[ConnMgr] 🗑️ Removed empty table ${tableId.slice(0,8)}`);
    }
  }, CONFIG.TABLE_IDLE_TIMEOUT_MS);
}

/**
 * Get total number of connections across all tables
 */
export function getTotalConnections(): number {
  let total = 0;
  for (const table of tableConnections.values()) {
    total += table.connections.size;
  }
  return total;
}

/**
 * Get statistics about current connections
 */
export function getStats(): {
  tables: number;
  connections: number;
  totalMessagesProcessed: number;
  averageConnectionsPerTable: number;
  oldestConnectionAge: number;
} {
  const now = Date.now();
  let totalConns = 0;
  let oldestAge = 0;
  
  for (const table of tableConnections.values()) {
    totalConns += table.connections.size;
    
    for (const conn of table.connections.values()) {
      const age = now - conn.connectedAt;
      if (age > oldestAge) oldestAge = age;
    }
  }
  
  return {
    tables: tableConnections.size,
    connections: totalConns,
    totalMessagesProcessed: totalMessageCount,
    averageConnectionsPerTable: tableConnections.size > 0 ? totalConns / tableConnections.size : 0,
    oldestConnectionAge: Math.floor(oldestAge / 1000),
  };
}

/**
 * Get list of active table IDs
 */
export function getActiveTableIds(): string[] {
  return Array.from(tableConnections.keys());
}

// Initialize on module load
initConnectionManager();
