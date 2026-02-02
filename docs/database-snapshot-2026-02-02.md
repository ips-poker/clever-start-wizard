# 📸 Database Snapshot - 2026-02-02
## Состояние БД перед Фазой 1 Multi-Tenant

> **ВАЖНО**: Этот файл содержит полную схему БД для возможности отката.
> Дата создания: 2026-02-02

---

## 🔄 Rollback SQL (в случае необходимости отката)

```sql
-- =====================================================
-- ROLLBACK SCRIPT - Откат изменений Фазы 1
-- =====================================================

-- 1. Удалить новые таблицы (если созданы)
DROP TABLE IF EXISTS club_staff CASCADE;
DROP TABLE IF EXISTS club_subscriptions CASCADE;

-- 2. Удалить колонку clan_id из tournaments (если добавлена)
ALTER TABLE tournaments DROP COLUMN IF EXISTS clan_id;

-- 3. Удалить новые функции (если созданы)
DROP FUNCTION IF EXISTS get_user_clan_id(UUID);
DROP FUNCTION IF EXISTS is_club_admin(UUID, UUID);
DROP FUNCTION IF EXISTS get_club_role(UUID, UUID);

-- 4. Удалить RLS политики (если созданы)
DROP POLICY IF EXISTS "Users see only their club tournaments" ON tournaments;
DROP POLICY IF EXISTS "Club staff can manage tournaments" ON tournaments;
```

---

## 📊 Текущая схема таблиц

### 1. tournaments
```sql
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  buy_in INTEGER NOT NULL DEFAULT 0,
  max_players INTEGER NOT NULL DEFAULT 9,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  current_level INTEGER DEFAULT 1,
  current_small_blind INTEGER DEFAULT 10,
  current_big_blind INTEGER DEFAULT 20,
  timer_duration INTEGER DEFAULT 1200,
  timer_remaining INTEGER DEFAULT 1200,
  starting_chips INTEGER NOT NULL DEFAULT 10000,
  
  -- Reentry/Addon система
  rebuy_cost INTEGER DEFAULT 0,
  addon_cost INTEGER DEFAULT 0,
  rebuy_chips INTEGER DEFAULT 0,
  addon_chips INTEGER DEFAULT 0,
  rebuy_end_level INTEGER DEFAULT 6,
  addon_level INTEGER DEFAULT 7,
  break_start_level INTEGER DEFAULT 4,
  
  -- Новая терминология
  participation_fee INTEGER DEFAULT 0,
  reentry_fee INTEGER DEFAULT 0,
  additional_fee INTEGER DEFAULT 0,
  reentry_chips INTEGER DEFAULT 0,
  additional_chips INTEGER DEFAULT 0,
  reentry_end_level INTEGER DEFAULT 6,
  additional_level INTEGER DEFAULT 7,
  
  -- Настройки
  players_per_table INTEGER DEFAULT 9,
  is_published BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  finished_at TIMESTAMP WITH TIME ZONE,
  voice_control_enabled BOOLEAN DEFAULT false,
  voice_session_id TEXT,
  last_voice_command TIMESTAMP WITH TIME ZONE,
  tournament_format TEXT DEFAULT 'freezeout',
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 2. tournament_registrations
```sql
CREATE TABLE tournament_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  player_id UUID NOT NULL REFERENCES players(id),
  status TEXT NOT NULL DEFAULT 'registered',
  seat_number INTEGER,
  chips INTEGER DEFAULT 0,
  position INTEGER,
  final_position INTEGER,
  rebuys INTEGER DEFAULT 0,
  addons INTEGER DEFAULT 0,
  reentries INTEGER DEFAULT 0,
  additional_sets INTEGER DEFAULT 0,
  pending_reentry BOOLEAN DEFAULT false,
  pending_addon BOOLEAN DEFAULT false,
  pending_reentry_at TIMESTAMP WITH TIME ZONE,
  pending_addon_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  eliminated_at TIMESTAMP WITH TIME ZONE
);
```

### 3. players
```sql
CREATE TABLE players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  telegram TEXT,
  avatar_url TEXT,
  user_id UUID,
  elo_rating INTEGER NOT NULL DEFAULT 100,
  games_played INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  manual_rank TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 4. clans
```sql
CREATE TABLE clans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  don_player_id UUID NOT NULL REFERENCES players(id),
  emblem_id INTEGER NOT NULL DEFAULT 1,
  seal_id INTEGER NOT NULL DEFAULT 1,
  total_rating INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

### 5. clan_members
```sql
CREATE TABLE clan_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id),
  player_id UUID NOT NULL REFERENCES players(id),
  hierarchy_role TEXT NOT NULL DEFAULT 'soldier',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(clan_id, player_id)
);
```

### 6. clan_invitations
```sql
CREATE TABLE clan_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clan_id UUID NOT NULL REFERENCES clans(id),
  player_id UUID NOT NULL REFERENCES players(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '7 days')
);
```

### 7. blind_levels
```sql
CREATE TABLE blind_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  level INTEGER NOT NULL,
  small_blind INTEGER NOT NULL,
  big_blind INTEGER NOT NULL,
  ante INTEGER DEFAULT 0,
  duration INTEGER NOT NULL DEFAULT 1200,
  is_break BOOLEAN DEFAULT false
);
```

### 8. tournament_payouts
```sql
CREATE TABLE tournament_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id),
  place INTEGER NOT NULL,
  percentage NUMERIC NOT NULL,
  amount INTEGER NOT NULL,
  rps_points INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
```

---

## 🔐 RLS Policies (tournaments)

```sql
-- SELECT: Все могут видеть турниры
CREATE POLICY "Tournaments are viewable by everyone" 
ON tournaments FOR SELECT USING (true);

-- INSERT: Только админы
CREATE POLICY "Only admins can create tournaments" 
ON tournaments FOR INSERT WITH CHECK (is_admin(auth.uid()));

-- UPDATE: Только админы
CREATE POLICY "Only admins can update tournaments" 
ON tournaments FOR UPDATE USING (is_admin(auth.uid()));

-- DELETE: Только админы
CREATE POLICY "Only admins can delete tournaments" 
ON tournaments FOR DELETE USING (is_admin(auth.uid()));
```

---

## 🔐 RLS Policies (clans)

```sql
-- SELECT: Все могут видеть кланы
CREATE POLICY "Clans are viewable by everyone" 
ON clans FOR SELECT USING (true);

-- INSERT: Дон может создать клан
CREATE POLICY "Don can create clan" 
ON clans FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM players p WHERE p.id = clans.don_player_id AND p.user_id = auth.uid())
);

-- UPDATE: Дон может обновить свой клан
CREATE POLICY "Don can update own clan" 
ON clans FOR UPDATE USING (
  EXISTS (SELECT 1 FROM players p WHERE p.id = clans.don_player_id AND p.user_id = auth.uid())
);

-- DELETE: Дон может удалить свой клан
CREATE POLICY "Don can delete own clan" 
ON clans FOR DELETE USING (
  EXISTS (SELECT 1 FROM players p WHERE p.id = clans.don_player_id AND p.user_id = auth.uid())
);
```

---

## 🔐 RLS Policies (clan_members)

```sql
-- SELECT: Все могут видеть членов клана
CREATE POLICY "Clan members are viewable by everyone" 
ON clan_members FOR SELECT USING (true);

-- INSERT: Дон может добавлять членов
CREATE POLICY "Don can add members" 
ON clan_members FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM clans c
    JOIN players p ON p.id = c.don_player_id
    WHERE c.id = clan_members.clan_id AND p.user_id = auth.uid()
  )
);

-- INSERT: Игроки могут добавить себя при принятии приглашения
CREATE POLICY "Players can add themselves when accepting invitation" 
ON clan_members FOR INSERT WITH CHECK (
  player_id IN (SELECT p.id FROM players p WHERE p.user_id = auth.uid() OR (p.telegram IS NOT NULL AND auth.uid() IS NOT NULL))
  AND EXISTS (
    SELECT 1 FROM clan_invitations ci
    WHERE ci.clan_id = clan_members.clan_id 
    AND ci.player_id = clan_members.player_id 
    AND ci.status IN ('pending', 'accepted')
  )
);

-- UPDATE: Дон может обновлять роли
CREATE POLICY "Don can update member roles" 
ON clan_members FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM clans c
    JOIN players p ON p.id = c.don_player_id
    WHERE c.id = clan_members.clan_id AND p.user_id = auth.uid()
  )
);

-- DELETE: Дон или сам игрок может удалить
CREATE POLICY "Don can remove members" 
ON clan_members FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM clans c
    JOIN players p ON p.id = c.don_player_id
    WHERE c.id = clan_members.clan_id AND p.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM players p
    WHERE p.id = clan_members.player_id AND p.user_id = auth.uid()
  )
);
```

---

## ⚙️ Существующие функции

| Функция | Тип | Описание |
|---------|-----|----------|
| `is_admin(UUID)` | FUNCTION → boolean | Проверка админа |
| `get_players_public()` | FUNCTION → record | Публичные данные игроков |
| `get_player_safe(UUID)` | FUNCTION → record | Безопасные данные игрока |
| `create_player_safe(...)` | FUNCTION → jsonb | Создание игрока |
| `update_player_safe(...)` | FUNCTION → jsonb | Обновление игрока |
| `admin_diamond_transaction(...)` | FUNCTION → jsonb | Транзакции алмазов |
| `check_clan_member_limit()` | TRIGGER | Лимит членов клана |
| `update_clan_rating()` | TRIGGER | Обновление рейтинга клана |

---

## 📈 Статистика на момент снэпшота

```sql
-- Запустить для проверки текущего состояния данных
SELECT 
  (SELECT COUNT(*) FROM tournaments) as tournaments_count,
  (SELECT COUNT(*) FROM players) as players_count,
  (SELECT COUNT(*) FROM clans) as clans_count,
  (SELECT COUNT(*) FROM clan_members) as clan_members_count,
  (SELECT COUNT(*) FROM tournament_registrations) as registrations_count;
```

---

## ✅ Чек-лист перед Фазой 1

- [x] Схема таблиц задокументирована
- [x] RLS политики задокументированы
- [x] Функции задокументированы
- [x] Rollback SQL готов
- [ ] Бэкап данных выполнен (рекомендуется через Supabase Dashboard)

---

**Готово к началу Фазы 1!**
