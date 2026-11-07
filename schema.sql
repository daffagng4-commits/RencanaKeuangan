-- Jalankan di Supabase > SQL Editor
create table if not exists public.rk_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb  not null,
  rev        bigint not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.rk_state enable row level security;

create policy "rk_select_own" on public.rk_state
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "rk_insert_own" on public.rk_state
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "rk_update_own" on public.rk_state
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "rk_delete_own" on public.rk_state
  for delete to authenticated using ((select auth.uid()) = user_id);

-- ===== Alat: Rebalance porto & IBKR vs Flip (r18) =====
-- Satu baris per akun per alat. Terpisah dari rk_state, tidak tercampur dengan data Rencana Keuangan.
create table if not exists public.rk_tools (
  user_id    uuid not null references auth.users(id) on delete cascade,
  tool       text not null check (tool in ('rebalance', 'ibkr')),
  data       jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, tool)
);

alter table public.rk_tools enable row level security;

create policy "rkt_select_own" on public.rk_tools
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "rkt_insert_own" on public.rk_tools
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "rkt_update_own" on public.rk_tools
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "rkt_delete_own" on public.rk_tools
  for delete to authenticated using ((select auth.uid()) = user_id);
