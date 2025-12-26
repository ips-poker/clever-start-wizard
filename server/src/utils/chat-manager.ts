/**
 * Chat Manager with Moderation
 * Handles in-game chat with profanity filter, rate limiting, and moderation
 */

import { WebSocket } from 'ws';
import { logger } from './logger.js';
import { loadManager } from './load-manager.js';
import { redisManager } from './redis-manager.js';

interface ChatMessage {
  id: string;
  tableId: string;
  tournamentId: string | null;
  playerId: string;
  playerName: string;
  content: string;
  type: 'chat' | 'emote' | 'system' | 'announcement';
  timestamp: number;
  isModerated: boolean;
}

interface PlayerChatState {
  playerId: string;
  messageCount: number;
  lastMessageTime: number;
  warnings: number;
  muted: boolean;
  mutedUntil: number;
}

// Common profanity patterns (basic filter - extend as needed)
const PROFANITY_PATTERNS = [
  /\bf+[u@]+[c(]+k/gi,
  /\bs+h+[i!1]+t/gi,
  /\ba+s+s+h+o+l+e/gi,
  /\bb+[i!1]+t+c+h/gi,
  /\bd+[i!1]+c+k/gi,
  /\bf+[a@]+g/gi,
  /\bn+[i!1]+g+g/gi,
  /\bc+u+n+t/gi,
  /\bw+h+o+r+e/gi,
  /\bслот|казино|выигрыш|ставки|betting/gi,
];

// Spam patterns
const SPAM_PATTERNS = [
  /(.)\1{5,}/,                    // Repeated characters
  /^[A-Z\s!]{20,}$/,              // All caps spam
  /(https?:\/\/[^\s]+)/gi,        // URLs (to check separately)
];

// Emotes available in chat
const VALID_EMOTES = [
  ':gg:',
  ':gl:',
  ':nh:',
  ':ty:',
  ':lol:',
  ':cry:',
  ':angry:',
  ':think:',
  ':clap:',
  ':heart:',
];

class ChatManager {
  private chatHistory: Map<string, ChatMessage[]> = new Map(); // tableId -> messages
  private playerStates: Map<string, PlayerChatState> = new Map();
  private tableSubscribers: Map<string, Set<WebSocket>> = new Map();
  
  private readonly MAX_HISTORY_PER_TABLE = 100;
  private readonly MAX_MESSAGE_LENGTH = 200;
  private readonly RATE_LIMIT_MESSAGES = 5;
  private readonly RATE_LIMIT_WINDOW_MS = 10000; // 5 messages per 10 seconds
  private readonly MUTE_DURATIONS = [60, 300, 900, 3600]; // 1min, 5min, 15min, 1hr

  constructor() {
    logger.info('ChatManager initialized');
  }

  /**
   * Process and send a chat message
   */
  async sendMessage(
    tableId: string,
    tournamentId: string | null,
    playerId: string,
    playerName: string,
    content: string,
    type: 'chat' | 'emote' = 'chat'
  ): Promise<{ success: boolean; error?: string; message?: ChatMessage }> {
    // Check if chat is enabled
    if (!loadManager.isChatEnabled()) {
      return { success: false, error: 'Chat temporarily disabled' };
    }

    // Get or create player state
    const state = this.getOrCreatePlayerState(playerId);

    // Check if muted
    if (state.muted && Date.now() < state.mutedUntil) {
      const remaining = Math.ceil((state.mutedUntil - Date.now()) / 1000);
      return { success: false, error: `Muted for ${remaining} more seconds` };
    } else if (state.muted) {
      // Unmute if time expired
      state.muted = false;
    }

    // Rate limit check
    const rateCheck = await this.checkRateLimit(playerId, state);
    if (!rateCheck.allowed) {
      return { success: false, error: 'Slow down, sending too fast' };
    }

    // Validate message
    if (type === 'emote') {
      if (!VALID_EMOTES.includes(content)) {
        return { success: false, error: 'Invalid emote' };
      }
    } else {
      // Content validation
      if (!content || content.trim().length === 0) {
        return { success: false, error: 'Message cannot be empty' };
      }

      if (content.length > this.MAX_MESSAGE_LENGTH) {
        return { success: false, error: `Message too long (max ${this.MAX_MESSAGE_LENGTH})` };
      }

      // Moderation
      const modResult = this.moderateContent(content);
      if (modResult.blocked) {
        state.warnings++;
        
        // Mute after 3 warnings
        if (state.warnings >= 3) {
          const muteIndex = Math.min(state.warnings - 3, this.MUTE_DURATIONS.length - 1);
          const muteDuration = this.MUTE_DURATIONS[muteIndex] * 1000;
          state.muted = true;
          state.mutedUntil = Date.now() + muteDuration;
          
          logger.warn('Player muted for chat violations', { 
            playerId, 
            warnings: state.warnings,
            muteDuration: this.MUTE_DURATIONS[muteIndex]
          });
          
          return { 
            success: false, 
            error: `Muted for ${this.MUTE_DURATIONS[muteIndex]} seconds due to chat violations`
          };
        }

        return { success: false, error: 'Message contains prohibited content' };
      }

      // Apply any content transformations (e.g., censor partial matches)
      content = modResult.content;
    }

    // Create message
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      tableId,
      tournamentId,
      playerId,
      playerName,
      content: content.trim(),
      type,
      timestamp: Date.now(),
      isModerated: false
    };

    // Add to history
    this.addToHistory(tableId, message);

    // Update player state
    state.messageCount++;
    state.lastMessageTime = Date.now();

    // Broadcast to table
    this.broadcastToTable(tableId, message);

    return { success: true, message };
  }

  /**
   * Send system message (announcements, dealer messages)
   */
  sendSystemMessage(
    tableId: string,
    content: string,
    type: 'system' | 'announcement' = 'system'
  ): ChatMessage {
    const message: ChatMessage = {
      id: `sys-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      tableId,
      tournamentId: null,
      playerId: 'system',
      playerName: type === 'announcement' ? 'Tournament Director' : 'Dealer',
      content,
      type,
      timestamp: Date.now(),
      isModerated: false
    };

    this.addToHistory(tableId, message);
    this.broadcastToTable(tableId, message);

    return message;
  }

  /**
   * Subscribe to table chat
   */
  subscribeToTable(tableId: string, ws: WebSocket): void {
    if (!this.tableSubscribers.has(tableId)) {
      this.tableSubscribers.set(tableId, new Set());
    }
    this.tableSubscribers.get(tableId)!.add(ws);

    // Send recent history
    const history = this.chatHistory.get(tableId);
    if (history && history.length > 0) {
      const recentMessages = history.slice(-20);
      ws.send(JSON.stringify({
        type: 'chat_history',
        tableId,
        messages: recentMessages
      }));
    }
  }

  /**
   * Unsubscribe from table chat
   */
  unsubscribeFromTable(tableId: string, ws: WebSocket): void {
    const subs = this.tableSubscribers.get(tableId);
    if (subs) {
      subs.delete(ws);
      if (subs.size === 0) {
        this.tableSubscribers.delete(tableId);
      }
    }
  }

  /**
   * Mute a player (moderator action)
   */
  mutePlayer(playerId: string, durationSeconds: number, reason: string): void {
    const state = this.getOrCreatePlayerState(playerId);
    state.muted = true;
    state.mutedUntil = Date.now() + durationSeconds * 1000;
    
    logger.info('Player muted by moderator', { playerId, durationSeconds, reason });
  }

  /**
   * Unmute a player
   */
  unmutePlayer(playerId: string): void {
    const state = this.playerStates.get(playerId);
    if (state) {
      state.muted = false;
      state.warnings = Math.max(0, state.warnings - 1);
    }
  }

  /**
   * Clear chat history for a table
   */
  clearTableHistory(tableId: string): void {
    this.chatHistory.delete(tableId);
    
    // Notify subscribers
    const subs = this.tableSubscribers.get(tableId);
    if (subs) {
      const msg = JSON.stringify({ type: 'chat_cleared', tableId });
      for (const ws of subs) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(msg);
        }
      }
    }
  }

  /**
   * Get available emotes
   */
  getEmotes(): string[] {
    return [...VALID_EMOTES];
  }

  // ==========================================
  // PRIVATE METHODS
  // ==========================================

  private getOrCreatePlayerState(playerId: string): PlayerChatState {
    if (!this.playerStates.has(playerId)) {
      this.playerStates.set(playerId, {
        playerId,
        messageCount: 0,
        lastMessageTime: 0,
        warnings: 0,
        muted: false,
        mutedUntil: 0
      });
    }
    return this.playerStates.get(playerId)!;
  }

  private async checkRateLimit(playerId: string, state: PlayerChatState): Promise<{ allowed: boolean }> {
    // Use Redis rate limiting
    const result = await redisManager.checkRateLimit(
      `chat:${playerId}`,
      this.RATE_LIMIT_MESSAGES,
      this.RATE_LIMIT_WINDOW_MS
    );
    return { allowed: result.allowed };
  }

  private moderateContent(content: string): { blocked: boolean; content: string } {
    // Check profanity
    for (const pattern of PROFANITY_PATTERNS) {
      if (pattern.test(content)) {
        return { blocked: true, content };
      }
    }

    // Check spam patterns
    for (const pattern of SPAM_PATTERNS) {
      if (pattern.test(content)) {
        // URLs are suspicious but not auto-blocked
        if (pattern.source.includes('http')) {
          logger.warn('URL in chat message', { content: content.substring(0, 50) });
          continue;
        }
        return { blocked: true, content };
      }
    }

    return { blocked: false, content };
  }

  private addToHistory(tableId: string, message: ChatMessage): void {
    if (!this.chatHistory.has(tableId)) {
      this.chatHistory.set(tableId, []);
    }
    
    const history = this.chatHistory.get(tableId)!;
    history.push(message);
    
    // Trim history
    if (history.length > this.MAX_HISTORY_PER_TABLE) {
      history.shift();
    }
  }

  private broadcastToTable(tableId: string, message: ChatMessage): void {
    const subs = this.tableSubscribers.get(tableId);
    if (!subs || subs.size === 0) return;

    const payload = JSON.stringify({
      type: 'chat_message',
      message
    });

    for (const ws of subs) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(payload);
        } catch {
          subs.delete(ws);
        }
      } else {
        subs.delete(ws);
      }
    }
  }

  getStats(): {
    activeChats: number;
    totalSubscribers: number;
    mutedPlayers: number;
  } {
    let totalSubs = 0;
    for (const subs of this.tableSubscribers.values()) {
      totalSubs += subs.size;
    }

    let mutedCount = 0;
    const now = Date.now();
    for (const state of this.playerStates.values()) {
      if (state.muted && state.mutedUntil > now) {
        mutedCount++;
      }
    }

    return {
      activeChats: this.tableSubscribers.size,
      totalSubscribers: totalSubs,
      mutedPlayers: mutedCount
    };
  }

  shutdown(): void {
    this.chatHistory.clear();
    this.playerStates.clear();
    this.tableSubscribers.clear();
    logger.info('ChatManager shutdown complete');
  }
}

// Singleton instance
export const chatManager = new ChatManager();
