-- TFH Resources production starter schema
-- Run in Supabase: SQL Editor -> New query -> paste -> Run

create extension if not exists pgcrypto;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  short_description text,
  description text,
  category text,
  skill text,
  level text,
  price_paise integer not null check (price_paise > 0),
  cover_path text,
  includes jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.product_files (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  display_name text,
  file_name text not null,
  storage_path text not null,
  sort_order integer not null default 100,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id),
  product_title text not null,
  name text not null,
  email text not null,
  amount_paise integer not null,
  currency text not null default 'INR',
  status text not null default 'pending' check (status in ('pending','paid','failed','refunded')),
  razorpay_order_id text unique,
  razorpay_payment_id text unique,
  email_claimed_at timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

alter table public.orders add column if not exists email_claimed_at timestamptz;
alter table public.orders add column if not exists email_sent_at timestamptz;

create table if not exists public.download_tokens (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  max_downloads integer not null default 10,
  download_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_products_slug on public.products(slug);
create index if not exists idx_product_files_product on public.product_files(product_id);
create index if not exists idx_orders_email on public.orders(email);
create index if not exists idx_orders_rzp_order on public.orders(razorpay_order_id);
create index if not exists idx_download_tokens_hash on public.download_tokens(token_hash);

-- Lock all tables from browser/anon access.
-- The Vercel server uses the Supabase service-role key and bypasses RLS.
alter table public.products enable row level security;
alter table public.product_files enable row level security;
alter table public.orders enable row level security;
alter table public.download_tokens enable row level security;

-- Create a PRIVATE Storage bucket.
insert into storage.buckets (id, name, public)
values ('paid-resources', 'paid-resources', false)
on conflict (id) do update set public = false;

-- Sample products. Delete/replace these before launch.
insert into public.products
(slug, title, short_description, description, category, skill, level, price_paise, cover_path, includes, sort_order)
values
(
  'tef-writing-framework',
  'TEF Writing Framework',
  'A structured approach to Expression Écrite with frameworks, examples and focused practice.',
  'Build a repeatable writing process for TEF with clear structures, model approaches and practice prompts.',
  'TEF',
  'Writing',
  'B2+',
  49900,
  '/covers/tef-writing.svg',
  '["Digital PDF","Writing frameworks","Model approaches","Practice prompts"]'::jsonb,
  10
),
(
  'tef-speaking-kit',
  'TEF Speaking Kit',
  'Focused speaking preparation for structure, spontaneity and confident exam-day delivery.',
  'A speaking-focused preparation pack designed to help learners structure ideas and practise under realistic constraints.',
  'TEF',
  'Speaking',
  'B2+',
  59900,
  '/covers/tef-speaking.svg',
  '["Digital PDF","Speaking frameworks","Prompt bank","Practice structure"]'::jsonb,
  20
),
(
  'vocabulary-notebook',
  'Le Carnet de Vocabulaire',
  'A clean vocabulary system for retaining useful French rather than collecting disconnected words.',
  'A guided vocabulary resource to organise, contextualise and reuse high-value French vocabulary.',
  'Vocabulary',
  'Lexique',
  'A2–B2',
  29900,
  '/covers/vocabulary.svg',
  '["Digital PDF","Topic vocabulary","Context prompts","Revision structure"]'::jsonb,
  30
)
on conflict (slug) do nothing;
