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
