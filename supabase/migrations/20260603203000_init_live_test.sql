create table if not exists public.businesses (
  id text primary key,
  name text not null,
  slug text not null,
  billing_contact_email text not null,
  retention_policy_days integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.business_memberships (
  id text primary key,
  user_id text not null references public.users(id) on delete cascade,
  business_id text not null references public.businesses(id) on delete cascade,
  role text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.presets (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  name text not null,
  version integer not null,
  status text not null,
  document_family text not null,
  definition jsonb not null,
  example_notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.processing_jobs (
  id text primary key,
  business_id text not null references public.businesses(id) on delete cascade,
  preset_id text not null references public.presets(id) on delete cascade,
  created_by text not null references public.users(id) on delete cascade,
  status text not null,
  warnings jsonb not null default '[]'::jsonb,
  review_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.source_documents (
  id text primary key,
  job_id text not null references public.processing_jobs(id) on delete cascade,
  filename text not null,
  mime_type text not null,
  page_count integer not null,
  storage_path text not null,
  status text not null,
  deletion_scheduled_at timestamptz
);

create table if not exists public.extracted_rows (
  id text primary key,
  job_id text not null references public.processing_jobs(id) on delete cascade,
  row_index integer not null,
  raw_fields jsonb not null,
  normalized jsonb not null
);

create table if not exists public.export_artifacts (
  id text primary key,
  job_id text not null references public.processing_jobs(id) on delete cascade,
  format text not null,
  generated_at timestamptz not null,
  download_path text not null
);

create table if not exists public.audit_events (
  id text primary key,
  actor_id text not null,
  business_id text not null,
  target_type text not null,
  target_id text not null,
  action text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.businesses enable row level security;
alter table public.users enable row level security;
alter table public.business_memberships enable row level security;
alter table public.presets enable row level security;
alter table public.processing_jobs enable row level security;
alter table public.source_documents enable row level security;
alter table public.extracted_rows enable row level security;
alter table public.export_artifacts enable row level security;
alter table public.audit_events enable row level security;

drop policy if exists "live test businesses" on public.businesses;
create policy "live test businesses" on public.businesses for all using (true) with check (true);
drop policy if exists "live test users" on public.users;
create policy "live test users" on public.users for all using (true) with check (true);
drop policy if exists "live test memberships" on public.business_memberships;
create policy "live test memberships" on public.business_memberships for all using (true) with check (true);
drop policy if exists "live test presets" on public.presets;
create policy "live test presets" on public.presets for all using (true) with check (true);
drop policy if exists "live test jobs" on public.processing_jobs;
create policy "live test jobs" on public.processing_jobs for all using (true) with check (true);
drop policy if exists "live test documents" on public.source_documents;
create policy "live test documents" on public.source_documents for all using (true) with check (true);
drop policy if exists "live test rows" on public.extracted_rows;
create policy "live test rows" on public.extracted_rows for all using (true) with check (true);
drop policy if exists "live test exports" on public.export_artifacts;
create policy "live test exports" on public.export_artifacts for all using (true) with check (true);
drop policy if exists "live test audits" on public.audit_events;
create policy "live test audits" on public.audit_events for all using (true) with check (true);

insert into storage.buckets (id, name, public)
values ('bank-source-files', 'bank-source-files', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('bank-export-files', 'bank-export-files', false)
on conflict (id) do nothing;

drop policy if exists "live test storage objects" on storage.objects;
create policy "live test storage objects"
on storage.objects for all
using (bucket_id in ('bank-source-files', 'bank-export-files'))
with check (bucket_id in ('bank-source-files', 'bank-export-files'));
