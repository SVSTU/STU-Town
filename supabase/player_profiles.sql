-- Run this in Supabase Dashboard > SQL Editor.
-- The application stores only a SHA-256 hash of the browser's anonymous token.
create table if not exists public.player_profiles (
  token_hash text primary key check (token_hash ~ '^[a-f0-9]{64}$'),
  nickname text not null default '' check (char_length(nickname) <= 24),
  coins bigint not null default 1500 check (coins >= 0),
  reputation bigint not null default 0 check (reputation >= 0),
  stats jsonb not null default '{"hunger":100,"strength":100,"fatigue":0}'::jsonb,
  inventory jsonb not null default '{"seeds":{"carrot":3,"tomato":3,"corn":3,"strawberry":3},"produce":{"carrot":0,"tomato":0,"corn":0,"strawberry":0},"items":{}}'::jsonb,
  farm_plant_count bigint not null default 0 check (farm_plant_count >= 0),
  farm_harvest_count bigint not null default 0 check (farm_harvest_count >= 0),
  updated_at timestamptz not null default now()
);

-- Safe for projects that already ran an earlier version of this schema.
alter table public.player_profiles add column if not exists nickname text not null default '';
update public.player_profiles
set nickname = left(coalesce(stats->>'nickname', ''), 24)
where nickname = '' and coalesce(stats->>'nickname', '') <> '';
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'player_profiles_nickname_length'
      and conrelid = 'public.player_profiles'::regclass
  ) then
    alter table public.player_profiles add constraint player_profiles_nickname_length
      check (char_length(nickname) <= 24);
  end if;
end $$;

alter table public.player_profiles enable row level security;
revoke all on table public.player_profiles from anon, authenticated;
grant all on table public.player_profiles to service_role;
