create extension if not exists pgcrypto;

create table if not exists public.participants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  age_range text not null,
  gender text not null,
  academic_qualification text not null,
  study_stage text not null,
  specialization text not null,
  residence_side text not null,
  economic_level text not null,
  religion text not null,
  marital_status text not null,
  profession text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.scales (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  scale_type text not null,
  timing text not null,
  q01 smallint check (q01 between 1 and 5),
  q02 smallint check (q02 between 1 and 5),
  q03 smallint check (q03 between 1 and 5),
  q04 smallint check (q04 between 1 and 5),
  q05 smallint check (q05 between 1 and 5),
  q06 smallint check (q06 between 1 and 5),
  q07 smallint check (q07 between 1 and 5),
  q08 smallint check (q08 between 1 and 5),
  q09 smallint check (q09 between 1 and 5),
  q10 smallint check (q10 between 1 and 5),
  q11 smallint check (q11 between 1 and 5),
  q12 smallint check (q12 between 1 and 5),
  q13 smallint check (q13 between 1 and 5),
  q14 smallint check (q14 between 1 and 5),
  q15 smallint check (q15 between 1 and 5),
  q16 smallint check (q16 between 1 and 5),
  q17 smallint check (q17 between 1 and 5),
  q18 smallint check (q18 between 1 and 5),
  q19 smallint check (q19 between 1 and 5),
  q20 smallint check (q20 between 1 and 5),
  total_score smallint not null,
  submitted_at timestamptz not null default now()
);

create table if not exists public.image_responses (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.participants(id) on delete cascade,
  site_id smallint not null,
  site_name text not null,
  hope smallint not null check (hope between 1 and 5),
  belonging smallint not null check (belonging between 1 and 5),
  pride smallint not null check (pride between 1 and 5),
  happiness smallint not null check (happiness between 1 and 5),
  sadness smallint not null check (sadness between 1 and 5),
  anger smallint not null check (anger between 1 and 5),
  fear smallint not null check (fear between 1 and 5),
  reaction_time_ms integer not null,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_scales_participant on public.scales(participant_id);
create index if not exists idx_scales_type on public.scales(scale_type);
create index if not exists idx_images_participant on public.image_responses(participant_id);
create index if not exists idx_images_site on public.image_responses(site_id);

alter table public.participants enable row level security;
alter table public.scales enable row level security;
alter table public.image_responses enable row level security;

drop policy if exists "participants_insert_only" on public.participants;
drop policy if exists "scales_insert_only" on public.scales;
drop policy if exists "image_responses_insert_only" on public.image_responses;

create policy "participants_insert_only"
on public.participants
for insert
to anon
with check (true);

create policy "scales_insert_only"
on public.scales
for insert
to anon
with check (true);

create policy "image_responses_insert_only"
on public.image_responses
for insert
to anon
with check (true);

grant usage on schema public to anon;
grant insert on public.participants to anon;
grant insert on public.scales to anon;
grant insert on public.image_responses to anon;
