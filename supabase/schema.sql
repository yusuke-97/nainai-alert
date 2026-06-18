create extension if not exists pgcrypto;

do $$ begin
  create type item_status as enum ('in_stock', 'low', 'out', 'discontinued');
exception
  when duplicate_object then null;
end $$;

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  line_target_type text check (line_target_type in ('user', 'group')),
  line_target_id text,
  invite_code text unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references households(id) on delete set null,
  display_name text,
  email text,
  created_at timestamptz not null default now()
);

create table if not exists items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  name text not null,
  category text,
  icon text not null default '🧴',
  status item_status not null default 'in_stock',
  note text,
  last_purchase_memo text,
  updated_by uuid references profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists purchase_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  purchased_by uuid references profiles(id) on delete set null,
  volume text,
  memo text,
  purchased_at timestamptz not null default now()
);

create table if not exists status_change_logs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references items(id) on delete cascade,
  changed_by uuid references profiles(id) on delete set null,
  from_status item_status,
  to_status item_status not null,
  notified boolean not null default false,
  changed_at timestamptz not null default now()
);

create table if not exists notifications_log (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  item_id uuid references items(id) on delete cascade,
  status item_status not null,
  message text not null,
  line_status text,
  sent_at timestamptz not null default now()
);

alter table households enable row level security;
alter table profiles enable row level security;
alter table items enable row level security;
alter table purchase_logs enable row level security;
alter table status_change_logs enable row level security;
alter table notifications_log enable row level security;

alter table households add column if not exists created_by uuid references auth.users(id) on delete set null;
alter table items add column if not exists icon text not null default '🧴';

grant usage on schema public to authenticated;
grant select, insert, update, delete on households to authenticated;
grant select, insert, update, delete on profiles to authenticated;
grant select, insert, update, delete on items to authenticated;
grant select, insert, update, delete on purchase_logs to authenticated;
grant select, insert, update, delete on status_change_logs to authenticated;
grant select on notifications_log to authenticated;

create or replace function current_household_id()
returns uuid
language sql
security definer
set search_path = public
stable
as $$
  select household_id from profiles where id = auth.uid()
$$;

drop policy if exists "profiles_select_self_household" on profiles;
create policy "profiles_select_self_household" on profiles
for select using (id = auth.uid() or household_id = current_household_id());

drop policy if exists "profiles_insert_self" on profiles;
create policy "profiles_insert_self" on profiles
for insert with check (id = auth.uid());

drop policy if exists "profiles_update_self" on profiles;
create policy "profiles_update_self" on profiles
for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "households_insert_authenticated" on households;
create policy "households_insert_authenticated" on households
for insert to authenticated with check (true);

drop policy if exists "households_select_member" on households;
create policy "households_select_member" on households
for select using (id = current_household_id() or created_by = auth.uid());

drop policy if exists "households_update_member" on households;
create policy "households_update_member" on households
for update using (id = current_household_id()) with check (id = current_household_id());

drop policy if exists "items_member_all" on items;
create policy "items_member_all" on items
for all using (household_id = current_household_id()) with check (household_id = current_household_id());

drop policy if exists "purchase_logs_member_all" on purchase_logs;
create policy "purchase_logs_member_all" on purchase_logs
for all using (
  exists (
    select 1 from items
    where items.id = purchase_logs.item_id
      and items.household_id = current_household_id()
  )
) with check (
  exists (
    select 1 from items
    where items.id = purchase_logs.item_id
      and items.household_id = current_household_id()
  )
);

drop policy if exists "status_change_logs_member_select" on status_change_logs;
create policy "status_change_logs_member_select" on status_change_logs
for select using (
  exists (
    select 1 from items
    where items.id = status_change_logs.item_id
      and items.household_id = current_household_id()
  )
);

drop policy if exists "status_change_logs_member_insert" on status_change_logs;
create policy "status_change_logs_member_insert" on status_change_logs
for insert with check (
  exists (
    select 1 from items
    where items.id = status_change_logs.item_id
      and items.household_id = current_household_id()
  )
);

drop policy if exists "notifications_log_member_select" on notifications_log;
create policy "notifications_log_member_select" on notifications_log
for select using (household_id = current_household_id());

create or replace function join_household_by_invite(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_household_id uuid;
begin
  select id
    into target_household_id
    from households
   where invite_code = upper(trim(code))
   limit 1;

  if target_household_id is null then
    raise exception 'invalid_invite_code';
  end if;

  update profiles
     set household_id = target_household_id
   where id = auth.uid();

  return target_household_id;
end
$$;

grant execute on function join_household_by_invite(text) to authenticated;

create index if not exists idx_profiles_household_id on profiles(household_id);
create index if not exists idx_items_household_status on items(household_id, status);
create index if not exists idx_purchase_logs_item_date on purchase_logs(item_id, purchased_at desc);
create index if not exists idx_status_logs_item_date on status_change_logs(item_id, changed_at desc);
create index if not exists idx_notifications_dedupe on notifications_log(item_id, status, sent_at desc);
