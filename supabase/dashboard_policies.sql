create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

drop policy if exists "admin_users_self_select" on public.admin_users;
drop policy if exists "participants_admin_select" on public.participants;
drop policy if exists "scales_admin_select" on public.scales;
drop policy if exists "image_responses_admin_select" on public.image_responses;

create policy "admin_users_self_select"
on public.admin_users
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "participants_admin_select"
on public.participants
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

create policy "scales_admin_select"
on public.scales
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

create policy "image_responses_admin_select"
on public.image_responses
for select
to authenticated
using (
  exists (
    select 1
    from public.admin_users
    where admin_users.user_id = (select auth.uid())
  )
);

grant select on public.admin_users to authenticated;
grant select on public.participants to authenticated;
grant select on public.scales to authenticated;
grant select on public.image_responses to authenticated;
