# Сводка изменений для пересборки Poker Engine v3.6

## Дата: 2026-01-03

## Новые файлы для движка:

### 1. `server/src/utils/hud-stats-calculator.ts`
Расширенный калькулятор HUD-статистики:
- **RealHUDStats** - полный интерфейс с 40+ метриками
- **calculateRealHUDStats()** - расчёт статистики из истории раздач
- **getPlayerStyle()** - определение стиля игры (TAG, LAG, Fish, etc.)
- **detectLeaks()** - обнаружение утечек в игре
- **realtimeHUDTracker** - трекер статистики в реальном времени

### 2. `server/src/utils/realtime-events.ts`
Система трансляции событий для Real-time Dashboard:
- **RealtimeEvent** - интерфейс событий
- **realtimeEventBroadcaster** - синглтон для рассылки событий
- События: hand_start, hand_end, player_join, all_in, tournament_start, bubble, final_table, и др.

### 3. `server/src/routes/analytics.ts`
API эндпоинты для аналитики:
- `GET /api/analytics/hud/:playerId` - HUD статистика игрока
- `GET /api/analytics/table/:tableId/hud` - HUD всех игроков стола
- `GET /api/analytics/tournament/:playerId` - турнирная аналитика
- `GET /api/analytics/realtime` - данные для real-time dashboard
- `POST /api/analytics/compare` - сравнение игроков

## Изменённые файлы:

### 4. `server/src/routes/index.ts`
- Добавлен импорт `setupAnalyticsRoutes`
- Вызов `setupAnalyticsRoutes(app, supabase)` перед 404 handler

### 5. `server/src/index.ts`
- Импорт `realtimeEventBroadcaster`
- Новый endpoint `GET /api/events` для получения событий

## API Endpoints (новые):

```
GET  /api/analytics/hud/:playerId?tableId=...&limit=500
GET  /api/analytics/table/:tableId/hud?limit=200
GET  /api/analytics/tournament/:playerId
GET  /api/analytics/realtime
POST /api/analytics/compare { playerIds: [...], limit: 300 }
GET  /api/events?limit=50
```

## Структура HUD Stats:

```typescript
interface RealHUDStats {
  // Core
  handsPlayed, handsWon
  
  // Preflop
  vpip, pfr, threeBet, foldToThreeBet, fourBet, squeeze
  
  // Postflop
  afTotal, afFlop, afTurn, afRiver
  
  // C-Bet
  cbet, cbetFold, cbetTurn, cbetRiver
  
  // Showdown
  wtsd, wsd, wwsf
  
  // Position
  positionStats: Record<string, PositionStats>
  
  // Session
  profitBB, bbPer100, biggestWin, biggestLoss
  
  // Advanced
  limp, steal, checkRaise, donkBet
}
```

## Команды для пересборки:

```bash
cd server
npm run build
pm2 restart poker-engine
```

## Проверка после деплоя:

```bash
curl http://localhost:3002/health
curl http://localhost:3002/api/analytics/realtime
curl http://localhost:3002/api/events
```

## Frontend компоненты (уже интегрированы):

1. `src/components/poker/admin/RealtimeDashboard.tsx` - Live мониторинг
2. `src/components/poker/analytics/EnhancedPlayerAnalytics.tsx` - Расширенная аналитика
3. `src/components/poker/analytics/TournamentAnalytics.tsx` - Турнирная статистика
4. `src/components/poker/analytics/PlayerComparison.tsx` - Сравнение игроков
5. `src/utils/calculateRealHUDStats.ts` - Клиентский расчёт HUD (зеркало серверного)

## Версия движка: 3.6.0
