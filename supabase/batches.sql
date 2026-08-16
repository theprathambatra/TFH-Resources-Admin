-- TFH Batch Availability
-- Run once in Supabase: SQL Editor -> New query -> paste this file -> Run

create extension if not exists pgcrypto;

create table if not exists public.batches (
  id uuid primary key default gen_random_uuid(),
  course text not null check (course in ('TEF', 'TCF', 'DELF')),
  level text,
  name text not null,
  days text[] not null,
  start_time time not null,
  end_time time not null,
  start_date date,
  end_date date,
  total_seats integer not null default 4 check (total_seats > 0),
  seats_remaining integer not null default 4 check (seats_remaining >= 0),
  status text not null default 'available' check (status in ('available', 'few_seats', 'full', 'waitlist', 'hidden')),
  timezone text not null default 'Asia/Kolkata',
  sort_order integer not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint batches_seats_valid check (seats_remaining <= total_seats),
  constraint batches_time_window check (
    start_time >= time '08:00' and
    end_time <= time '18:00' and
    end_time > start_time
  ),
  constraint batches_days_valid check (
    cardinality(days) > 0 and
    days <@ array['Mon','Tue','Wed','Thu','Fri','Sat']::text[]
  ),
  constraint batches_date_range check (
    end_date is null or start_date is null or end_date >= start_date
  )
);

create index if not exists idx_batches_course on public.batches(course);
create index if not exists idx_batches_status on public.batches(status);
create index if not exists idx_batches_sort on public.batches(sort_order, start_time);

-- Keep browser/anonymous users away from direct database access.
-- Public batch availability will be exposed through a safe Vercel API endpoint instead.
alter table public.batches enable row level security;

-- Update updated_at automatically whenever Yana edits a batch.
create or replace function public.set_batches_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_batches_updated_at on public.batches;
create trigger trg_batches_updated_at
before update on public.batches
for each row execute function public.set_batches_updated_at();
