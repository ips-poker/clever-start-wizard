-- Fix RLS policies that referenced auth.users (causing "permission denied for table users")

-- Helper: get telegram_id from JWT user_metadata without querying auth.users
create or replace function public.current_telegram_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select nullif(auth.jwt() -> 'user_metadata' ->> 'telegram_id', '');
$$;

-- Update players UPDATE policy to avoid auth.users
alter policy "Users can update their own player data"
on public.players
using (
  is_admin(auth.uid())
  or auth.uid() = user_id
  or (
    telegram is not null
    and auth.uid() is not null
    and public.current_telegram_id() is not null
    and public.current_telegram_id() = players.telegram
  )
);

-- Update player_balances SELECT policy to avoid auth.users
alter policy "Players can view their own balance"
on public.player_balances
using (
  exists (
    select 1
    from public.players p
    where p.id = player_balances.player_id
      and (
        p.user_id = auth.uid()
        or (
          p.telegram is not null
          and auth.uid() is not null
          and public.current_telegram_id() is not null
          and public.current_telegram_id() = p.telegram
        )
      )
  )
);
