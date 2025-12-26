# Syndikatet Poker Server v3.2

Professional-grade Texas Hold'em poker server with tournament support, designed for high-concurrency deployments.

## Features

### Core Engine
- **Texas Hold'em Engine v3.1** - Fully validated hand rankings, side pots, all-in handling
- **Tournament System** - Multi-table tournaments with blind level progression, table balancing, eliminations
- **Anti-Cheat System** - Real-time bot detection, collusion analysis, timing pattern recognition

### Infrastructure
- **WebSocket Real-time** - Low-latency game state broadcasting
- **Connection Pool** - Manages up to 5,000 concurrent connections
- **Circuit Breakers** - Database protection with fallback mechanisms
- **Message Queue** - Batched broadcasting for efficiency
- **Load Manager** - Graceful degradation under high load

### Monitoring & Operations
- **Prometheus Metrics** - Full observability with `/metrics` endpoint
- **Health Checks** - Kubernetes-ready `/health`, `/ready`, `/live` endpoints
- **Performance Profiler** - Operation timing, slow query detection
- **Alert Manager** - Slack, Discord, PagerDuty webhook integrations

## Quick Start

### Prerequisites
- Node.js 18+
- Supabase project with configured tables
- (Optional) Redis for horizontal scaling

### Installation

```bash
cd server
npm install
```

### Environment Variables

Create a `.env` file:

```env
# Server
PORT=3001
NODE_ENV=production

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# CORS
CORS_ORIGINS=https://your-frontend.com,https://www.your-frontend.com

# Game Settings
ACTION_TIME_SECONDS=30
TIME_BANK_SECONDS=60
MAX_PLAYERS_PER_TABLE=9

# Security
JWT_SECRET=your-secure-jwt-secret

# Redis (optional, for scaling)
REDIS_URL=redis://localhost:6379

# Logging
LOG_LEVEL=info

# Alerting (optional)
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
PAGERDUTY_ROUTING_KEY=your-pagerduty-key
```

### Development

```bash
npm run dev
```

### Production Build

```bash
npm run build
npm start
```

### PM2 Deployment

```bash
pm2 start dist/index.js --name poker-server
pm2 save
```

## API Endpoints

### Health & Monitoring

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Full health check with all subsystem statuses |
| `GET /metrics` | Prometheus-compatible metrics export |
| `GET /api/alerts` | Active alerts and history |

### Game API

| Endpoint | Description |
|----------|-------------|
| `GET /api/tables` | List all active tables |
| `GET /api/tables/:id` | Get table details |
| `POST /api/tables` | Create new table |
| `GET /api/tournaments` | List tournaments |
| `POST /api/tournaments/:id/start` | Start tournament |

### WebSocket

Connect to `ws://server:3001/ws/poker`

#### Message Types

**Client → Server:**
```json
{ "type": "join_table", "tableId": "uuid", "playerId": "uuid", "playerName": "name", "seatNumber": 0, "buyIn": 1000 }
{ "type": "action", "tableId": "uuid", "playerId": "uuid", "actionType": "fold|check|call|bet|raise|allin", "amount": 100 }
{ "type": "leave_table", "tableId": "uuid", "playerId": "uuid" }
{ "type": "subscribe", "tableId": "uuid" }
{ "type": "tournament_subscribe", "tournamentId": "uuid" }
```

**Server → Client:**
```json
{ "type": "state", "tableId": "uuid", "state": {...} }
{ "type": "action_accepted", "actionType": "call", "amount": 100 }
{ "type": "error", "error": "message" }
{ "type": "tournament_update", "tournamentId": "uuid", "state": {...} }
```

## Architecture

```
server/
├── src/
│   ├── index.ts              # Entry point
│   ├── config.ts             # Configuration
│   ├── db/
│   │   └── supabase.ts       # Database client
│   ├── game/
│   │   ├── PokerEngine.ts    # Hand evaluation, game rules
│   │   ├── PokerTable.ts     # Table state management
│   │   ├── PokerGameManager.ts # Table lifecycle
│   │   └── TournamentManager.ts # Tournament logic
│   ├── websocket/
│   │   └── PokerWebSocketHandler.ts # Real-time communication
│   ├── routes/
│   │   └── index.ts          # REST API routes
│   └── utils/
│       ├── connection-pool.ts    # Connection management
│       ├── circuit-breaker.ts    # Fault tolerance
│       ├── load-manager.ts       # Load balancing
│       ├── message-queue.ts      # Broadcast optimization
│       ├── prometheus-metrics.ts # Metrics collection
│       ├── alerting.ts           # Alert notifications
│       ├── anti-cheat.ts         # Cheat detection
│       ├── health-check.ts       # Health monitoring
│       ├── performance-profiler.ts # Performance tracking
│       ├── graceful-shutdown.ts  # Clean shutdown
│       ├── redis-manager.ts      # Session/state storage
│       └── logger.ts             # Structured logging
└── dist/                     # Compiled output
```

## Scaling

### Vertical Scaling
- Single server handles 300+ tables, 2700+ players
- Optimized for 4-8 CPU cores

### Horizontal Scaling (with Redis)
1. Configure `REDIS_URL` in environment
2. Replace `InMemoryRedisManager` with Redis client
3. Deploy multiple server instances behind load balancer
4. Use sticky sessions for WebSocket connections

### Recommended Load Balancer Config (nginx)

```nginx
upstream poker_backend {
    ip_hash;  # Sticky sessions
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    location /ws/poker {
        proxy_pass http://poker_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

## Monitoring

### Prometheus Metrics

Key metrics exported:
- `poker_active_tables` - Current table count
- `poker_active_players` - Connected players
- `poker_hands_dealt_total` - Hands dealt counter
- `poker_websocket_connections_total` - Connection counter
- `poker_action_processing_duration_seconds` - Action latency histogram
- `poker_circuit_breaker_state` - CB status (0=closed, 1=open, 2=half-open)
- `poker_load_level` - Load level (0=normal, 1=elevated, 2=high, 3=critical)

### Alerting

Configure webhooks for:
- High memory usage (>1.5GB)
- Circuit breaker opens
- Error rate spikes
- Slow operations (>100ms)

## Security

- Rate limiting on HTTP and WebSocket
- Input validation with Zod schemas
- Circuit breakers prevent cascade failures
- Anti-cheat system detects suspicious patterns
- Graceful shutdown preserves game state

## License

Proprietary - Syndikatet Poker Club
