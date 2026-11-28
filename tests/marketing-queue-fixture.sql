-- Disposable test database ONLY. No production connection.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create table auth.users(id uuid primary key);
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
grant usage on schema auth to authenticated;
create table public.catalog_admins(user_id uuid primary key,role text not null);
create table public.marketing_campaign_drafts(id uuid primary key,status text,channel text);
create table public.marketing_visual_assets(id uuid primary key,status text,format text,template_version integer);
create table public.marketing_social_plans(id uuid primary key,status text,planned_on date,draft_id uuid,asset_id uuid);
grant select on public.catalog_admins to authenticated,service_role;
grant select on public.marketing_campaign_drafts,public.marketing_visual_assets,public.marketing_social_plans to service_role;
insert into auth.users values ('10000000-0000-4000-8000-000000000001');
insert into public.catalog_admins values ('10000000-0000-4000-8000-000000000001','owner');
insert into public.marketing_campaign_drafts values ('20000000-0000-4000-8000-000000000001','reviewed','facebook');
insert into public.marketing_visual_assets values ('30000000-0000-4000-8000-000000000001','reviewed','square',1);
insert into public.marketing_social_plans values ('40000000-0000-4000-8000-000000000001','prepared',(now() at time zone 'UTC')::date,'20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');
