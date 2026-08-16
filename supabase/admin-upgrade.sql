-- Run this ONCE after the original schema.sql has already been run.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

alter table public.products
  add column if not exists cover_storage_path text;

insert into storage.buckets (id, name, public)
values ('resource-covers', 'resource-covers', true)
on conflict (id) do update set public = true;
