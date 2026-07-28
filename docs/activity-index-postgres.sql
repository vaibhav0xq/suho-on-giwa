-- Suho activity index schema for Postgres-compatible databases.
-- This mirrors the ActivityStore contract in lib/activity-store.ts.

create table if not exists suho_guarded_sends (
  chain_id integer not null,
  id numeric(78, 0) not null,
  sender text not null,
  recipient text not null,
  amount numeric(78, 0) not null,
  release_at numeric(78, 0) not null,
  claimed boolean not null default false,
  cancelled boolean not null default false,
  transaction_hash text,
  status text not null check (status in ('active', 'claimed', 'cancelled')),
  updated_at timestamptz not null default now(),
  primary key (chain_id, id)
);

create index if not exists suho_guarded_sends_sender_idx on suho_guarded_sends (chain_id, lower(sender), id desc);
create index if not exists suho_guarded_sends_recipient_idx on suho_guarded_sends (chain_id, lower(recipient), id desc);
create index if not exists suho_guarded_sends_status_idx on suho_guarded_sends (chain_id, status);

create table if not exists suho_sync_cursors (
  chain_id integer not null,
  cursor_name text not null,
  last_synced_block numeric(78, 0),
  last_synced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (chain_id, cursor_name)
);
