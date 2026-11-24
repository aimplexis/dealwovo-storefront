-- Private, deterministic creative records. No uploads, external media or publishing.
create table public.marketing_visual_assets (
 id uuid primary key default gen_random_uuid(),
 created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 theme text not null check(theme in ('holiday','gifts','tech','essentials')),
 format text not null check(format in ('square','portrait','story','landscape')),
 palette text not null check(palette in ('midnight','cream','violet')),
 template_version integer not null default 1 check(template_version=1),
 status text not null default 'draft' check(status in ('draft','reviewed','archived')),
 reviewed_by uuid references auth.users(id) on delete restrict,
 reviewed_at timestamptz,
 check((status='draft' and reviewed_by is null and reviewed_at is null) or (status in ('reviewed','archived') and reviewed_by is not null and reviewed_at is not null))
);
create index marketing_visual_assets_created on public.marketing_visual_assets(created_at desc,id);
create index marketing_visual_assets_creator on public.marketing_visual_assets(created_by);
create index marketing_visual_assets_reviewer on public.marketing_visual_assets(reviewed_by);
create table public.marketing_visual_review_events (
 id bigint generated always as identity primary key,
 asset_id uuid not null references public.marketing_visual_assets(id) on delete restrict,
 reviewer_id uuid not null references auth.users(id) on delete restrict,
 previous_status text not null,
 new_status text not null,
 created_at timestamptz not null default now(),
 check((previous_status='draft' and new_status in ('reviewed','archived')) or (previous_status='reviewed' and new_status='archived'))
);
create index marketing_visual_events_asset on public.marketing_visual_review_events(asset_id,created_at,id);
create index marketing_visual_events_reviewer on public.marketing_visual_review_events(reviewer_id);
alter table public.marketing_visual_assets enable row level security;
alter table public.marketing_visual_review_events enable row level security;
revoke all on public.marketing_visual_assets,public.marketing_visual_review_events from public,anon,authenticated;
grant select on public.marketing_visual_assets,public.marketing_visual_review_events to authenticated;
grant insert(theme,format,palette),update(status) on public.marketing_visual_assets to authenticated;
create policy "visual owner reads assets" on public.marketing_visual_assets for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "visual owner creates drafts" on public.marketing_visual_assets for insert to authenticated with check(created_by=auth.uid() and status='draft' and (select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "visual owner reviews assets" on public.marketing_visual_assets for update to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner'))) with check((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "visual owner reads events" on public.marketing_visual_review_events for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.guard_visual_review() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if not ((old.status='draft' and new.status in ('reviewed','archived')) or (old.status='reviewed' and new.status='archived')) then raise exception 'Invalid visual review transition' using errcode='23514';end if;
 new.reviewed_by:=auth.uid();new.reviewed_at:=clock_timestamp();return new;
end;$$;
create function dealwovo_private.audit_visual_review() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into public.marketing_visual_review_events(asset_id,reviewer_id,previous_status,new_status) values(new.id,auth.uid(),old.status,new.status);
 return new;
end;$$;
revoke all on function dealwovo_private.guard_visual_review(),dealwovo_private.audit_visual_review() from public,anon,authenticated;
create trigger visual_guard before update on public.marketing_visual_assets for each row execute function dealwovo_private.guard_visual_review();
create trigger visual_audit after update on public.marketing_visual_assets for each row execute function dealwovo_private.audit_visual_review();
notify pgrst,'reload schema';
