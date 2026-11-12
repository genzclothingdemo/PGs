-- Leads become a small CRM; listings can be created by the admin; visitors need no account.
alter type source_kind add value if not exists 'admin';

alter table leads drop constraint if exists leads_kind_check;
alter table leads
  add column if not exists visitor_id text,
  add column if not exists name text,
  add column if not exists phone text,
  add column if not exists message text,
  add column if not exists preferred_time text,
  add column if not exists status text not null default 'new',
  add column if not exists notes text,
  add column if not exists follow_up date,
  add column if not exists updated_at timestamptz default now();
alter table leads add constraint leads_kind_check check (kind in ('phone_reveal','call','whatsapp','visit_request','callback'));
alter table leads add constraint leads_status_check check (status in ('new','contacted','visit_scheduled','converted','lost','spam'));
create index if not exists leads_created_idx on leads (created_at desc);
create index if not exists leads_status_idx on leads (status);

alter table reports alter column user_id drop not null;
alter table reports add column if not exists visitor_id text;

alter table profiles add column if not exists business_name text;
alter table properties add column if not exists admin_notes text;

-- Owner phone is collected at sign-up; keep it private like listing phones.
revoke select (phone) on profiles from anon;
