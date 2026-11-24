-- Separate US Amazon link-only workflow. No Amazon API, scraping, prices or images.
-- Publication remains OFF until a separate, explicit launch decision.
alter table public.catalog_feed_sources add column amazon_tracking_id text check(amazon_tracking_id is null or (provider='amazon' and amazon_tracking_id ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,59}-20$'));
grant update(amazon_tracking_id) on public.catalog_feed_sources to authenticated;
create function dealwovo_private.guard_amazon_setting() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.amazon_tracking_id is distinct from old.amazon_tracking_id then
  if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') or new.provider<>'amazon' or new.status='disabled' then raise exception 'Amazon owner setup required' using errcode='42501';end if;
 end if;
 return new;
end;$$;
revoke all on function dealwovo_private.guard_amazon_setting() from public,anon,authenticated;
create trigger amazon_source_setting before update on public.catalog_feed_sources for each row execute function dealwovo_private.guard_amazon_setting();

create table public.catalog_amazon_links (
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null references public.catalog_feed_sources(id) on delete restrict,
 asin text not null check(asin ~ '^[A-Z0-9]{10}$'),
 tracking_id text not null check(tracking_id ~ '^[A-Za-z0-9][A-Za-z0-9-]{0,59}-20$'),
 title text not null check(length(btrim(title)) between 3 and 180),
 description text not null check(length(btrim(description)) between 20 and 1500),
 status text not null default 'draft' check(status in ('draft','reviewed','archived')),
 created_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 reviewed_by uuid references auth.users(id) on delete restrict,
 reviewed_at timestamptz,
 expires_at timestamptz,
 check((status='draft' and reviewed_by is null and reviewed_at is null and expires_at is null) or (status in ('reviewed','archived') and reviewed_by is not null and reviewed_at is not null and expires_at is not null))
);
create unique index amazon_active_asin on public.catalog_amazon_links(asin) where status<>'archived';
create index amazon_links_source on public.catalog_amazon_links(source_id);
create index amazon_links_creator on public.catalog_amazon_links(created_by);
create index amazon_links_reviewer on public.catalog_amazon_links(reviewed_by);
create index amazon_links_recent on public.catalog_amazon_links(created_at desc,id);
alter table public.catalog_amazon_links enable row level security;
revoke all on public.catalog_amazon_links from public,anon,authenticated;
grant select on public.catalog_amazon_links to authenticated;
grant insert(source_id,asin,tracking_id,title,description),update(status) on public.catalog_amazon_links to authenticated;
create policy "amazon owner reads drafts" on public.catalog_amazon_links for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "amazon owner creates drafts" on public.catalog_amazon_links for insert to authenticated with check(created_by=auth.uid() and status='draft' and (select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "amazon owner reviews drafts" on public.catalog_amazon_links for update to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner'))) with check((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.guard_amazon_link() returns trigger language plpgsql security invoker set search_path='' as $$
declare s record;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if tg_op='UPDATE' then
  if old.status='archived' or new.status not in ('reviewed','archived') then raise exception 'Invalid Amazon review transition' using errcode='23514';end if;
  new.reviewed_by:=auth.uid();new.reviewed_at:=clock_timestamp();new.expires_at:=new.reviewed_at+interval '7 days';
  if new.status='archived' then return new;end if;
 end if;
 select provider,status,amazon_tracking_id into s from public.catalog_feed_sources where id=new.source_id for share;
 if s.provider is distinct from 'amazon' or s.status is distinct from 'authorized' or s.amazon_tracking_id is distinct from new.tracking_id then raise exception 'Authorized Amazon source and matching tracking ID required' using errcode='23514';end if;
 return new;
end;$$;
revoke all on function dealwovo_private.guard_amazon_link() from public,anon,authenticated;
create trigger amazon_link_guard before insert or update on public.catalog_amazon_links for each row execute function dealwovo_private.guard_amazon_link();

-- Audit events use the existing append-only catalog audit log.
alter table public.catalog_admin_events drop constraint catalog_admin_events_entity_type_check;
alter table public.catalog_admin_events add constraint catalog_admin_events_entity_type_check check(entity_type in ('category','merchant','product','offer','feed_source','feed_batch','feed_candidate','amazon_link'));
create trigger amazon_link_audit after insert or update or delete on public.catalog_amazon_links for each row execute function dealwovo_private.catalog_audit_change('amazon_link');

create table dealwovo_private.amazon_publication (singleton boolean primary key default true check(singleton),enabled boolean not null default false);
insert into dealwovo_private.amazon_publication(singleton,enabled) values(true,false);
alter table dealwovo_private.amazon_publication enable row level security;
revoke all on dealwovo_private.amazon_publication from public,anon,authenticated;
-- Intentionally public, narrowly projected read; private source metadata is never returned.
create function dealwovo_private.amazon_editorial_links() returns table(id uuid,title text,description text,affiliate_url text)
language sql stable security definer set search_path='' as $$
 select a.id,a.title,a.description,'https://www.amazon.com/dp/'||a.asin||'?tag='||a.tracking_id
 from public.catalog_amazon_links a join public.catalog_feed_sources s on s.id=a.source_id
 where exists(select 1 from dealwovo_private.amazon_publication where singleton and enabled)
 and a.status='reviewed' and a.expires_at>now() and s.provider='amazon' and s.status='authorized' and s.amazon_tracking_id=a.tracking_id
 order by a.reviewed_at desc,a.id limit 100
$$;
create function public.amazon_editorial_links() returns table(id uuid,title text,description text,affiliate_url text)
language sql stable security invoker set search_path='' as $$ select * from dealwovo_private.amazon_editorial_links() $$;
revoke all on function dealwovo_private.amazon_editorial_links(),public.amazon_editorial_links() from public,anon,authenticated;
grant execute on function dealwovo_private.amazon_editorial_links(),public.amazon_editorial_links() to anon,authenticated;
grant usage on schema dealwovo_private to anon;

-- Block known Amazon domains in generic feeds and offers. No URL fetching.
create function dealwovo_private.is_amazon_destination(v text) returns boolean language sql immutable set search_path='' as $$
 select coalesce(v ~* '^https://([a-z0-9-]+\.)*(amazon\.[a-z.]+|amzn\.to|amzn\.com|a\.co)([/:?#.]|$)',false)
$$;
create function dealwovo_private.block_generic_amazon() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_name='catalog_feed_batches' then
  if exists(select 1 from public.catalog_feed_sources s where s.id=new.source_id and s.provider='amazon') then raise exception 'Use dedicated Amazon workflow' using errcode='23514';end if;
 elsif dealwovo_private.is_amazon_destination(new.affiliate_url) then raise exception 'Use dedicated Amazon workflow' using errcode='23514';end if;
 return new;
end;$$;
revoke all on function dealwovo_private.is_amazon_destination(text),dealwovo_private.block_generic_amazon() from public,anon,authenticated;
create trigger amazon_block_generic_batch before insert on public.catalog_feed_batches for each row execute function dealwovo_private.block_generic_amazon();
create trigger amazon_block_generic_candidate before insert or update of affiliate_url on public.catalog_feed_candidates for each row execute function dealwovo_private.block_generic_amazon();
create trigger amazon_block_generic_offer before insert or update of affiliate_url on public.catalog_offers for each row execute function dealwovo_private.block_generic_amazon();
notify pgrst,'reload schema';
