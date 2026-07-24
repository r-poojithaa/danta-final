-- Danta Supabase Schema
-- Run this in the Supabase SQL editor

-- ── Patients ──────────────────────────────────────────────────────────────────
create table if not exists public.patients (
  id                          uuid primary key default gen_random_uuid(),
  created_by                  uuid references auth.users(id) on delete cascade not null,
  full_name                   text not null,
  date_of_birth               date,
  gender                      text,
  phone                       text,
  email                       text,
  medical_conditions          text,        -- comma-separated
  current_medications         text,
  allergies                   text,
  smoking_status              text default 'never',
  drinks_alcohol              boolean default false,
  ocp_use                     boolean default false,
  previous_dry_socket         boolean default false,
  previous_dental_complications text,
  latest_risk_level           text,        -- denormalized from latest assessment
  created_at                  timestamptz default now(),
  updated_at                  timestamptz default now()
);

alter table public.patients enable row level security;
create policy "Users manage own patients" on public.patients
  for all using (auth.uid() = created_by);

-- ── Assessments ───────────────────────────────────────────────────────────────
create table if not exists public.assessments (
  id                  uuid primary key default gen_random_uuid(),
  patient_id          uuid references public.patients(id) on delete cascade not null,
  created_by          uuid references auth.users(id) on delete cascade not null,
  evidence_snapshot   jsonb,              -- BN evidence keys
  risk_score          integer,
  risk_level          text,
  risk_probability    float,
  extraction_site     text,
  tooth_number        text,
  extraction_type     text,
  notes               text,
  recommendations     jsonb,
  image_count         integer default 0,
  created_at          timestamptz default now(),
  updated_at          timestamptz default now()
);

alter table public.assessments enable row level security;
create policy "Users manage own assessments" on public.assessments
  for all using (auth.uid() = created_by);

-- ── Storage bucket ────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values ('intraoral-images', 'intraoral-images', false)
  on conflict do nothing;

create policy "Authenticated upload" on storage.objects
  for insert with check (auth.role() = 'authenticated' and bucket_id = 'intraoral-images');

create policy "Authenticated read own" on storage.objects
  for select using (auth.role() = 'authenticated' and bucket_id = 'intraoral-images');

-- ── Trigger: update patients.latest_risk_level ──────────────────────────────
create or replace function public.update_patient_risk()
returns trigger language plpgsql security definer as $$
begin
  update public.patients
  set latest_risk_level = new.risk_level, updated_at = now()
  where id = new.patient_id;
  return new;
end;
$$;

drop trigger if exists trg_update_patient_risk on public.assessments;
create trigger trg_update_patient_risk
  after insert or update on public.assessments
  for each row execute procedure public.update_patient_risk();
