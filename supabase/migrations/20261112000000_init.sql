-- PGhub core schema for Supabase. Run once on an empty project.
create extension if not exists pg_trgm;

create type user_role      as enum ('seeker','owner','moderator','admin','super_admin');
create type property_type  as enum ('pg','home');
create type gender_for     as enum ('boys','girls','both','not_stated');
create type listing_status as enum ('draft','submitted','in_review','changes_requested','rejected','published','paused','expired','archived');
create type verify_level   as enum ('unverified','phone_verified','owner_claimed','admin_verified');
create type source_kind    as enum ('owner','imported');

create table cities (id smallserial primary key, name text not null unique, slug text not null unique, state text default 'Gujarat', active boolean default true);
insert into cities(name,slug) values ('Gandhinagar','gandhinagar'),('Ahmedabad','ahmedabad');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, phone text, email text, language text default 'en', created_at timestamptz default now());

create table user_roles (
  user_id uuid references profiles(id) on delete cascade, role user_role not null,
  granted_by uuid references profiles(id), created_at timestamptz default now(), primary key (user_id, role));

-- every new auth user gets a profile + the seeker role
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles(id, email, phone, full_name) values (new.id, new.email, new.phone, coalesce(new.raw_user_meta_data->>'full_name', split_part(coalesce(new.email,''),'@',1)));
  insert into user_roles(user_id, role) values (new.id, 'seeker');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

create table properties (
  id uuid primary key default gen_random_uuid(),
  type property_type not null,
  owner_id uuid references profiles(id),
  source source_kind not null default 'owner',
  external_ref text,
  name text not null,
  gender gender_for not null default 'not_stated',
  description text, address text,
  city_id smallint references cities(id), area_label text,
  lat double precision, lng double precision,
  phone text, whatsapp text, owner_kind text check (owner_kind in ('owner','broker','manager')),
  gate_time text, hours text,
  food_option text check (food_option in ('included','tiffin','self_cook','none','optional')),
  amenities text[] default '{}',
  rules text,
  category text,
  google_rating numeric(2,1), google_reviews int,
  status listing_status not null default 'draft',
  verified verify_level not null default 'unverified',
  score numeric(6,2) default 0,
  rejection_reason text, listing_url text,
  published_at timestamptz, created_at timestamptz default now(), updated_at timestamptz default now()
);
create index on properties (lat, lng);
create index on properties (city_id, type, gender, status);
create index on properties (score desc);
create index on properties using gin (name gin_trgm_ops);
create unique index on properties (external_ref) where external_ref is not null;

create table units (
  id uuid primary key default gen_random_uuid(), property_id uuid not null references properties(id) on delete cascade,
  label text, sharing smallint, bhk numeric(2,1), area_sqft int, furnishing text,
  rent int not null check (rent > 0), deposit int, ac boolean, food_included boolean,
  beds_total smallint, beds_available smallint, available_from date);
create index on units (property_id);

create table photos (id uuid primary key default gen_random_uuid(), property_id uuid not null references properties(id) on delete cascade, path text not null, caption text, sort smallint default 0, approved boolean default false, created_at timestamptz default now());

create table reviews (
  id uuid primary key default gen_random_uuid(), property_id uuid not null references properties(id) on delete cascade, user_id uuid not null references profiles(id),
  rating_overall smallint not null check (rating_overall between 1 and 5), rating_food smallint, rating_clean smallint, rating_safety smallint, rating_owner smallint,
  body text, status text not null default 'pending' check (status in ('pending','approved','rejected')), visited_on date, created_at timestamptz default now(),
  unique(property_id,user_id));

create table leads (id bigserial primary key, property_id uuid references properties(id) on delete cascade, user_id uuid references profiles(id), kind text check (kind in ('phone_reveal','call','whatsapp','visit_request')), created_at timestamptz default now());
create table shortlists (user_id uuid references profiles(id) on delete cascade, property_id uuid references properties(id) on delete cascade, created_at timestamptz default now(), primary key(user_id,property_id));
create table visit_notes (id uuid primary key default gen_random_uuid(), user_id uuid references profiles(id) on delete cascade, property_id uuid references properties(id) on delete cascade, status text, rent_quoted int, notes text, visited_on date, updated_at timestamptz default now(), unique(user_id,property_id));
create table reports (id uuid primary key default gen_random_uuid(), property_id uuid references properties(id) on delete cascade, user_id uuid references profiles(id), reason text not null check (reason in ('wrong_number','fake','full','closed','wrong_info','other')), detail text, status text default 'open' check (status in ('open','resolved','dismissed')), created_at timestamptz default now());
create table claims (id uuid primary key default gen_random_uuid(), property_id uuid references properties(id) on delete cascade, user_id uuid references profiles(id), note text, status text default 'pending' check (status in ('pending','approved','rejected')), created_at timestamptz default now(), unique(property_id,user_id));
create table moderation_actions (id bigserial primary key, property_id uuid references properties(id) on delete cascade, moderator_id uuid references profiles(id), action text, reason text, created_at timestamptz default now());
create table audit_log (id bigserial primary key, actor_id uuid, action text, entity text, entity_id text, detail jsonb, at timestamptz default now());
create table ranking_config (key text primary key, weight numeric not null);
insert into ranking_config values ('quality',0.40),('verification',0.20),('completeness',0.20),('freshness',0.20);

-- ---------- helpers ----------
create or replace function has_role(r user_role) returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and (role = r or role in ('admin','super_admin') or (r = 'moderator' and role = 'moderator')))
$$;
create or replace function is_staff() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role in ('moderator','admin','super_admin')) $$;
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role in ('admin','super_admin')) $$;

create or replace function touch_updated() returns trigger language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
create trigger trg_touch before update on properties for each row execute function touch_updated();

-- ---------- ranking ----------
create or replace function property_score(pid uuid) returns numeric language sql stable security definer set search_path = public as $$
  select round(100 * (
      c.q * least(1, greatest(0, (( (coalesce(p.google_rating,0)*coalesce(p.google_reviews,0) + coalesce(r.a,0)*coalesce(r.n,0)*2 + 4.2*10) / nullif(coalesce(p.google_reviews,0) + coalesce(r.n,0)*2 + 10,0) ) - 1) / 4))
    + c.v * (case p.verified when 'admin_verified' then 1 when 'owner_claimed' then 0.7 when 'phone_verified' then 0.4 else 0 end)
    + c.c * least(1, (case when exists(select 1 from photos h where h.property_id=p.id and h.approved) then 0.4 else 0 end) + (case when exists(select 1 from units u where u.property_id=p.id) then 0.3 else 0 end) + (case when p.phone is not null then 0.1 else 0 end) + (case when p.lat is not null then 0.1 else 0 end) + (case when p.address is not null then 0.1 else 0 end))
    + c.f * (case when p.updated_at > now() - interval '30 days' then 1 when p.updated_at > now() - interval '90 days' then 0.5 else 0.2 end)
  ), 2)
  from properties p,
       (select max(weight) filter (where key='quality') q, max(weight) filter (where key='verification') v, max(weight) filter (where key='completeness') c, max(weight) filter (where key='freshness') f from ranking_config) c,
       lateral (select avg(rating_overall) a, count(*) n from reviews where property_id=p.id and status='approved') r
  where p.id = pid
$$;
create or replace function recompute_scores() returns void language sql security definer set search_path = public as $$
  update properties set score = property_score(id);
$$;

-- ---------- phone privacy: columns hidden from API roles, exposed only through reveal_phone ----------
revoke select (phone, whatsapp) on properties from anon, authenticated;
create or replace function reveal_phone(pid uuid) returns table(phone text, whatsapp text) language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  if (select count(*) from leads where user_id = auth.uid() and kind = 'phone_reveal' and created_at > now() - interval '1 day') >= 60 then raise exception 'daily limit reached'; end if;
  insert into leads(property_id, user_id, kind) values (pid, auth.uid(), 'phone_reveal');
  return query select p.phone, p.whatsapp from properties p where p.id = pid and (p.status = 'published' or p.owner_id = auth.uid() or is_staff());
end $$;
create or replace function my_contact(pid uuid) returns table(phone text, whatsapp text) language sql stable security definer set search_path = public as $$
  select p.phone, p.whatsapp from properties p where p.id = pid and (p.owner_id = auth.uid() or is_staff()) $$;

-- ---------- workflow RPCs ----------
create or replace function submit_property(pid uuid) returns void language plpgsql security definer set search_path = public as $$
begin
  update properties set status = 'submitted', rejection_reason = null where id = pid and owner_id = auth.uid() and status in ('draft','changes_requested','published','paused') and (select count(*) from units where property_id = pid) > 0;
  if not found then raise exception 'cannot submit: check ownership and add at least one room/price'; end if;
  insert into audit_log(actor_id, action, entity, entity_id) values (auth.uid(), 'submit', 'property', pid::text);
end $$;

create or replace function moderate_property(pid uuid, act text, why text default null) returns void language plpgsql security definer set search_path = public as $$
declare ns listing_status;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  ns := case act when 'approve' then 'published' when 'reject' then 'rejected' when 'changes' then 'changes_requested' when 'pause' then 'paused' when 'in_review' then 'in_review' else null end;
  if ns is null then raise exception 'bad action'; end if;
  update properties set status = ns, rejection_reason = case when ns in ('rejected','changes_requested') then why else null end,
    published_at = case when ns = 'published' then coalesce(published_at, now()) else published_at end,
    verified = case when ns = 'published' and verified = 'unverified' and source = 'owner' then 'phone_verified' else verified end
  where id = pid;
  update properties set score = property_score(pid) where id = pid;
  insert into moderation_actions(property_id, moderator_id, action, reason) values (pid, auth.uid(), act, why);
  insert into audit_log(actor_id, action, entity, entity_id, detail) values (auth.uid(), 'moderate:' || act, 'property', pid::text, jsonb_build_object('reason', why));
end $$;

create or replace function decide_claim(cid uuid, ok boolean) returns void language plpgsql security definer set search_path = public as $$
declare c claims%rowtype;
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  select * into c from claims where id = cid;
  update claims set status = case when ok then 'approved' else 'rejected' end where id = cid;
  if ok then
    update properties set owner_id = c.user_id, verified = 'owner_claimed' where id = c.property_id;
    insert into user_roles(user_id, role) values (c.user_id, 'owner') on conflict do nothing;
  end if;
  insert into audit_log(actor_id, action, entity, entity_id) values (auth.uid(), case when ok then 'claim:approve' else 'claim:reject' end, 'claim', cid::text);
end $$;

create or replace function become_owner() returns void language sql security definer set search_path = public as $$
  insert into user_roles(user_id, role) values (auth.uid(), 'owner') on conflict do nothing $$;

create or replace function set_user_role(uid uuid, r user_role, grant_it boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'admin only'; end if;
  if r in ('admin','super_admin') and not exists (select 1 from user_roles where user_id = auth.uid() and role = 'super_admin') then raise exception 'super admin only'; end if;
  if grant_it then insert into user_roles(user_id, role, granted_by) values (uid, r, auth.uid()) on conflict do nothing;
  else delete from user_roles where user_id = uid and role = r and role <> 'seeker'; end if;
  insert into audit_log(actor_id, action, entity, entity_id, detail) values (auth.uid(), case when grant_it then 'role:grant' else 'role:revoke' end, 'user', uid::text, jsonb_build_object('role', r));
end $$;

create or replace function decide_review(rid uuid, ok boolean) returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_staff() then raise exception 'not allowed'; end if;
  update reviews set status = case when ok then 'approved' else 'rejected' end where id = rid;
  update properties set score = property_score(property_id) where id = (select property_id from reviews where id = rid);
end $$;

-- ---------- Row Level Security ----------
alter table properties enable row level security;
create policy p_public  on properties for select using (status = 'published');
create policy p_owner   on properties for select using (owner_id = auth.uid());
create policy p_staff   on properties for select using (is_staff());
create policy p_insert  on properties for insert with check (owner_id = auth.uid() and source = 'owner' and status = 'draft' and has_role('owner'));
create policy p_update  on properties for update using (owner_id = auth.uid() and status in ('draft','changes_requested')) with check (owner_id = auth.uid() and status in ('draft','changes_requested'));
create policy p_staffup on properties for update using (is_admin()) with check (is_admin());
create policy p_delete  on properties for delete using (owner_id = auth.uid() and status = 'draft');

alter table units enable row level security;
create policy u_read  on units for select using (exists (select 1 from properties p where p.id = property_id and (p.status = 'published' or p.owner_id = auth.uid() or is_staff())));
create policy u_write on units for all using (exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid() and p.status in ('draft','changes_requested')))
  with check (exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid() and p.status in ('draft','changes_requested')));
create policy u_admin on units for all using (is_admin()) with check (is_admin());

alter table photos enable row level security;
create policy ph_read  on photos for select using (approved or exists (select 1 from properties p where p.id = property_id and (p.owner_id = auth.uid() or is_staff())));
create policy ph_write on photos for all using (exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid())) with check (exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid()));
create policy ph_staff on photos for all using (is_staff()) with check (is_staff());

alter table profiles enable row level security;
create policy pr_self  on profiles for select using (id = auth.uid());
create policy pr_upd   on profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy pr_staff on profiles for select using (is_admin());
alter table user_roles enable row level security;
create policy ur_self  on user_roles for select using (user_id = auth.uid());
create policy ur_admin on user_roles for select using (is_admin());

alter table shortlists enable row level security;  create policy sl_own on shortlists for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table visit_notes enable row level security; create policy vn_own on visit_notes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table reviews enable row level security;
create policy rv_read  on reviews for select using (status = 'approved' or user_id = auth.uid() or is_staff());
create policy rv_ins   on reviews for insert with check (user_id = auth.uid() and status = 'pending');
alter table reports enable row level security;
create policy rp_ins   on reports for insert with check (user_id = auth.uid());
create policy rp_staff on reports for select using (is_staff());
create policy rp_upd   on reports for update using (is_staff());
alter table claims enable row level security;
create policy cl_ins   on claims for insert with check (user_id = auth.uid());
create policy cl_read  on claims for select using (user_id = auth.uid() or is_staff());
alter table leads enable row level security;
create policy ld_owner on leads for select using (exists (select 1 from properties p where p.id = property_id and p.owner_id = auth.uid()) or is_admin());
alter table moderation_actions enable row level security; create policy ma_staff on moderation_actions for select using (is_staff());
alter table audit_log enable row level security; create policy al_admin on audit_log for select using (is_admin());
alter table ranking_config enable row level security; create policy rc_read on ranking_config for select using (true); create policy rc_admin on ranking_config for update using (is_admin());
alter table cities enable row level security; create policy c_read on cities for select using (true);

grant execute on function reveal_phone(uuid), my_contact(uuid), submit_property(uuid), moderate_property(uuid,text,text), decide_claim(uuid,boolean), become_owner(), set_user_role(uuid,user_role,boolean), decide_review(uuid,boolean), recompute_scores() to authenticated;
revoke execute on function recompute_scores() from anon, public;

-- ---------- storage bucket for photos ----------
insert into storage.buckets (id, name, public) values ('property-photos', 'property-photos', true) on conflict do nothing;
create policy "photos read" on storage.objects for select using (bucket_id = 'property-photos');
create policy "photos upload" on storage.objects for insert to authenticated with check (bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "photos delete own" on storage.objects for delete to authenticated using (bucket_id = 'property-photos' and (storage.foldername(name))[1] = auth.uid()::text);
