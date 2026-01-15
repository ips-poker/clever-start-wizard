-- Normalize PokerStars-style timers in DB (data fix)
-- Cash games: base 15s, time bank 30s
-- Tournaments: base 30s, time bank 60s

-- 1) Normalize table-level settings
update public.poker_tables
set action_time_seconds = 15,
    time_bank_seconds = 30
where (table_type = 'cash' or tournament_id is null)
  and (coalesce(action_time_seconds, 15) <> 15 or coalesce(time_bank_seconds, 30) <> 30);

update public.poker_tables
set action_time_seconds = 30,
    time_bank_seconds = 60
where tournament_id is not null
  and (coalesce(action_time_seconds, 30) <> 30 or coalesce(time_bank_seconds, 60) <> 60);

-- 2) Clamp per-player time bank to match table type (preserve already-used bank)
-- Cash tables
update public.poker_table_players p
set time_bank_remaining = least(greatest(coalesce(p.time_bank_remaining, 30), 0), 30)
where exists (
  select 1
  from public.poker_tables t
  where t.id = p.table_id
    and (t.table_type = 'cash' or t.tournament_id is null)
);

-- Tournament tables
update public.poker_table_players p
set time_bank_remaining = least(greatest(coalesce(p.time_bank_remaining, 60), 0), 60)
where exists (
  select 1
  from public.poker_tables t
  where t.id = p.table_id
    and t.tournament_id is not null
);
