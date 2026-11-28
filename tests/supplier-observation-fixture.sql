-- Disposable PostgreSQL fixture only, never run against a live database.
create role anon nologin;
create role authenticated nologin;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated,anon;
grant execute on function auth.uid() to authenticated,anon;
create table public.catalog_admins(user_id uuid primary key,role text not null);
insert into public.catalog_admins values ('00000000-0000-4000-8000-000000000001','owner'),('00000000-0000-4000-8000-000000000002','editor');
grant select on public.catalog_admins to authenticated;
alter table public.catalog_admins enable row level security;
create policy own_membership on public.catalog_admins for select to authenticated using(user_id=auth.uid());
