-- Proposal Generator schema. Run in the Supabase SQL editor (or `supabase db push`).

create type proposal_status as enum ('draft', 'sent', 'viewed', 'signed', 'paid');

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_name text not null default '',
  notify_email text,
  logo_url text,
  default_terms text not null default '',
  brand_accent text not null default 'forest' check (brand_accent in ('forest', 'oxblood', 'inkblue')),
  created_at timestamptz not null default now()
);

create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  public_token text not null unique,
  title text not null,
  client_name text not null,
  client_email text,
  client_company text,
  brief text not null default '',
  content jsonb not null default '[]'::jsonb,
  line_items jsonb not null default '[]'::jsonb,
  total_cents integer not null default 0 check (total_cents >= 0),
  currency text not null default 'usd',
  status proposal_status not null default 'draft',
  expires_at timestamptz,
  sent_at timestamptz,
  viewed_at timestamptz,
  signed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index proposals_user_idx on public.proposals (user_id, updated_at desc);

create table public.proposal_events (
  id bigint generated always as identity primary key,
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  type text not null check (type in ('created', 'sent', 'viewed', 'signed', 'paid')),
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);
create index proposal_events_proposal_idx on public.proposal_events (proposal_id, created_at);

create table public.signatures (
  proposal_id uuid primary key references public.proposals (id) on delete cascade,
  signer_name text not null,
  signer_email text not null,
  method text not null check (method in ('typed', 'drawn')),
  image_data text, -- PNG data URL for drawn signatures
  ip text,
  user_agent text,
  content_hash text not null,
  signed_at timestamptz not null default now()
);

create table public.payments (
  id bigint generated always as identity primary key,
  proposal_id uuid not null references public.proposals (id) on delete cascade,
  stripe_session_id text not null unique,
  payment_intent_id text,
  amount_cents integer not null,
  currency text not null,
  status text not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

-- Processed Stripe webhook events (idempotency).
create table public.stripe_events (
  id text primary key,
  created_at timestamptz not null default now()
);

-- Row Level Security: owners see only their own data. Public pages use the service role on the server.
alter table public.profiles enable row level security;
alter table public.proposals enable row level security;
alter table public.proposal_events enable row level security;
alter table public.signatures enable row level security;
alter table public.payments enable row level security;
alter table public.stripe_events enable row level security;

create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own proposals" on public.proposals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own proposal events (read)" on public.proposal_events
  for select using (exists (select 1 from public.proposals p where p.id = proposal_id and p.user_id = auth.uid()));
create policy "own proposal events (insert)" on public.proposal_events
  for insert with check (exists (select 1 from public.proposals p where p.id = proposal_id and p.user_id = auth.uid()));

create policy "own signatures (read)" on public.signatures
  for select using (exists (select 1 from public.proposals p where p.id = proposal_id and p.user_id = auth.uid()));

create policy "own payments (read)" on public.payments
  for select using (exists (select 1 from public.proposals p where p.id = proposal_id and p.user_id = auth.uid()));

-- Owners may not edit content once a proposal is signed or paid.
create function public.prevent_signed_edits() returns trigger language plpgsql as $$
begin
  if old.status in ('signed', 'paid') and auth.role() = 'authenticated' then
    if new.content is distinct from old.content
      or new.line_items is distinct from old.line_items
      or new.total_cents is distinct from old.total_cents
      or new.title is distinct from old.title
      or new.status is distinct from old.status then
      raise exception 'Proposal is signed and can no longer be edited';
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;

create trigger proposals_lock before update on public.proposals
  for each row execute function public.prevent_signed_edits();

-- Create a profile row on sign-up.
create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, notify_email) values (new.id, new.email);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
