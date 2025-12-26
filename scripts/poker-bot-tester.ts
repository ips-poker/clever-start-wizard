/**
 * Poker Bot Tester
 * 
 * Node.js скрипт для безопасного тестирования покерных столов без браузера.
 * 
 * ИСПОЛЬЗОВАНИЕ:
 * 1. Скопируйте этот файл на VPS
 * 2. Установите зависимости: npm install ws
 * 3. Запустите: npx ts-node poker-bot-tester.ts
 * 
 * ВАЖНО:
 * - Используйте ПРЯМЫЕ Supabase URL (не прокси) для ботов
 * - Запускайте ботов с задержкой между подключениями
 * - Максимум 5-10 ботов за сессию
 */

import WebSocket from 'ws';

// Конфигурация
const CONFIG = {
  // Прямой WebSocket URL покерного сервера (не прокси!)
  POKER_WS_URL: 'wss://poker.syndicate-poker.ru/ws/poker',
  
  // Прямой Supabase URL (не прокси!)
  SUPABASE_URL: 'https://mokhssmnorrhohrowxvu.supabase.co',
  SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1va2hzc21ub3JyaG9ocm93eHZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwODUzNDYsImV4cCI6MjA2ODY2MTM0Nn0.ZWYgSZFeidY0b_miC7IyfXVPh1EUR2WtxlEvt_fFmGc',
  
  // Задержка между запуском ботов (мс)
  BOT_START_DELAY: 3000,
  
  // Максимум ботов
  MAX_BOTS: 5,
  
  // Таймаут для операций (мс)
  OPERATION_TIMEOUT: 30000,
};

interface BotPlayer {
  id: string;
  name: string;
  ws: WebSocket | null;
  tableId: string;
  seatNumber: number | null;
  stack: number;
  isConnected: boolean;
}

interface TableState {
  phase: string;
  currentPlayerSeat: number | null;
  communityCards: string[];
  pot: number;
  currentBet: number;
}

class PokerBot {
  private player: BotPlayer;
  private tableState: TableState | null = null;
  private pingInterval: NodeJS.Timer | null = null;

  constructor(playerId: string, playerName: string, tableId: string) {
    this.player = {
      id: playerId,
      name: playerName,
      ws: null,
      tableId,
      seatNumber: null,
      stack: 0,
      isConnected: false,
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const wsUrl = `${CONFIG.POKER_WS_URL}?tableId=${this.player.tableId}&playerId=${this.player.id}`;
      
      console.log(`[${this.player.name}] 🔌 Connecting to ${wsUrl}`);
      
      this.player.ws = new WebSocket(wsUrl);
      
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, CONFIG.OPERATION_TIMEOUT);

      this.player.ws.on('open', () => {
        clearTimeout(timeout);
        console.log(`[${this.player.name}] ✅ Connected`);
        this.player.isConnected = true;
        this.startPing();
        resolve();
      });

      this.player.ws.on('message', (data: Buffer) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (err) {
          console.error(`[${this.player.name}] Parse error:`, err);
        }
      });

      this.player.ws.on('close', (code, reason) => {
        console.log(`[${this.player.name}] 🔴 Disconnected: ${code} ${reason}`);
        this.player.isConnected = false;
        this.stopPing();
      });

      this.player.ws.on('error', (err) => {
        console.error(`[${this.player.name}] ❌ Error:`, err.message);
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private startPing(): void {
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' });
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private handleMessage(message: any): void {
    const type = message.type;
    
    switch (type) {
      case 'connected':
        console.log(`[${this.player.name}] 🔗 Server connected`);
        break;
        
      case 'state':
      case 'player_joined':
      case 'game_update':
        this.updateState(message.state || message);
        break;
        
      case 'your_turn':
        console.log(`[${this.player.name}] 🎯 My turn!`);
        this.makeDecision();
        break;
        
      case 'hand_started':
        console.log(`[${this.player.name}] 🃏 New hand started`);
        break;
        
      case 'pong':
        // Ping response, ignore
        break;
        
      case 'error':
        console.error(`[${this.player.name}] ⚠️ Server error:`, message.message);
        break;
        
      default:
        console.log(`[${this.player.name}] 📥 ${type}:`, JSON.stringify(message).slice(0, 100));
    }
  }

  private updateState(state: any): void {
    if (state.mySeat !== undefined) {
      this.player.seatNumber = state.mySeat;
    }
    if (state.myStack !== undefined) {
      this.player.stack = state.myStack;
    }
    
    this.tableState = {
      phase: state.phase || 'unknown',
      currentPlayerSeat: state.currentPlayerSeat,
      communityCards: state.communityCards || [],
      pot: state.pot || 0,
      currentBet: state.currentBet || 0,
    };
  }

  private makeDecision(): void {
    // Простая стратегия бота: 70% call/check, 20% raise, 10% fold
    const random = Math.random();
    
    if (random < 0.1) {
      this.send({ type: 'action', action: 'fold' });
      console.log(`[${this.player.name}] 🃏 Fold`);
    } else if (random < 0.3) {
      const raiseAmount = Math.min(this.player.stack, (this.tableState?.currentBet || 0) * 2 + 10);
      this.send({ type: 'action', action: 'raise', amount: raiseAmount });
      console.log(`[${this.player.name}] 💰 Raise to ${raiseAmount}`);
    } else {
      this.send({ type: 'action', action: 'call' });
      console.log(`[${this.player.name}] ✅ Call/Check`);
    }
  }

  async joinTable(buyIn: number): Promise<void> {
    console.log(`[${this.player.name}] 🎰 Joining table with ${buyIn} diamonds`);
    this.send({ type: 'join', buyIn });
  }

  async leaveTable(): Promise<void> {
    console.log(`[${this.player.name}] 👋 Leaving table`);
    this.send({ type: 'leave' });
  }

  private send(message: any): void {
    if (this.player.ws && this.player.isConnected) {
      this.player.ws.send(JSON.stringify(message));
    }
  }

  disconnect(): void {
    this.stopPing();
    if (this.player.ws) {
      this.player.ws.close();
      this.player.ws = null;
    }
    this.player.isConnected = false;
  }

  get name(): string {
    return this.player.name;
  }

  get isConnected(): boolean {
    return this.player.isConnected;
  }
}

// Главная функция тестирования
async function runBotTest(tableId: string, botCount: number = 3): Promise<void> {
  console.log('='.repeat(60));
  console.log('🤖 POKER BOT TESTER');
  console.log('='.repeat(60));
  console.log(`Table ID: ${tableId}`);
  console.log(`Bot count: ${botCount}`);
  console.log(`Start delay: ${CONFIG.BOT_START_DELAY}ms between bots`);
  console.log('='.repeat(60));

  if (botCount > CONFIG.MAX_BOTS) {
    console.warn(`⚠️ Reducing bot count from ${botCount} to ${CONFIG.MAX_BOTS}`);
    botCount = CONFIG.MAX_BOTS;
  }

  const bots: PokerBot[] = [];

  try {
    // Создаем и подключаем ботов с задержкой
    for (let i = 0; i < botCount; i++) {
      const botId = `bot-${Date.now()}-${i}`;
      const botName = `TestBot_${i + 1}`;
      
      const bot = new PokerBot(botId, botName, tableId);
      bots.push(bot);
      
      await bot.connect();
      await bot.joinTable(200);
      
      // Задержка между ботами
      if (i < botCount - 1) {
        console.log(`⏳ Waiting ${CONFIG.BOT_START_DELAY}ms before next bot...`);
        await sleep(CONFIG.BOT_START_DELAY);
      }
    }

    console.log('\n✅ All bots connected and joined!');
    console.log('Press Ctrl+C to stop the test\n');

    // Держим ботов активными
    await new Promise<void>((resolve) => {
      process.on('SIGINT', () => {
        console.log('\n\n🛑 Stopping test...');
        resolve();
      });
    });

  } catch (err) {
    console.error('❌ Test failed:', err);
  } finally {
    // Отключаем всех ботов
    console.log('\n👋 Disconnecting bots...');
    for (const bot of bots) {
      try {
        await bot.leaveTable();
        await sleep(500);
        bot.disconnect();
        console.log(`[${bot.name}] Disconnected`);
      } catch (err) {
        console.error(`[${bot.name}] Disconnect error:`, err);
      }
    }
    
    console.log('\n✅ Test completed');
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Запуск
const args = process.argv.slice(2);
const tableId = args[0] || 'test-table-id';
const botCount = parseInt(args[1] || '3', 10);

runBotTest(tableId, botCount).catch(console.error);
