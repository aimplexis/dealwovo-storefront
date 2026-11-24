-- Manual Awin incremental synchronization. Missing rows never imply unavailable stock.
create table public.catalog_awin_sync_runs(
 id bigint generated always as identity primary key,
 source_id uuid not null references public.catalog_feed_sources(id) on delete restrict,
 created_by uuid not null references auth.users(id) on delete restrict,
 created_at timestamptz not null default now(),
 row_count integer not null check(row_count between 1 and 100)
);
create index awin_sync_runs_source on public.catalog_awin_sync_runs(source_id,id desc);
create index awin_sync_runs_actor on public.catalog_awin_sync_runs(created_by);
create table public.catalog_awin_sync_items(
 id bigint generated always as identity primary key,
 run_id bigint not null references public.catalog_awin_sync_runs(id) on delete restrict,
 external_product_id text not null check(length(external_product_id) between 1 and 120),
 title text not null check(length(title) between 3 and 180),
 candidate_id uuid references public.catalog_feed_candidates(id) on delete restrict,
 offer_id uuid references public.catalog_offers(id) on delete restrict,
 kind text not null check(kind in ('new','unchanged','staged_changed','offer_changed','editorial_changed')),
 metadata_changed boolean not null default false,
 previous_price bigint,
 proposed_price bigint check(proposed_price is null or proposed_price between 0 and 100000000),
 previous_url text,
 proposed_url text not null,
 previous_updated_at timestamptz,
 previous_status text,
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id) on delete restrict,
 decision text check(decision in ('applied','dismissed')),
 unique(run_id,external_product_id),
 check((decision is null and reviewed_at is null and reviewed_by is null) or (decision is not null and reviewed_at is not null and reviewed_by is not null))
);
create index awin_sync_items_candidate on public.catalog_awin_sync_items(candidate_id);
create index awin_sync_items_offer on public.catalog_awin_sync_items(offer_id);
create index awin_sync_items_reviewer on public.catalog_awin_sync_items(reviewed_by);
alter table public.catalog_awin_sync_runs enable row level security;
alter table public.catalog_awin_sync_items enable row level security;
revoke all on public.catalog_awin_sync_runs,public.catalog_awin_sync_items from public,anon,authenticated;
grant select on public.catalog_awin_sync_runs,public.catalog_awin_sync_items to authenticated;
create policy "owner reads Awin sync runs" on public.catalog_awin_sync_runs for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "owner reads Awin sync items" on public.catalog_awin_sync_items for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.sync_awin_feed(p_source_id uuid,p_rows jsonb) returns bigint
language plpgsql security definer set search_path='' as $$
declare s public.catalog_feed_sources%rowtype; c public.catalog_feed_candidates%rowtype; o public.catalog_offers%rowtype; r record; run bigint; n integer; k text; meta boolean; next_rows jsonb:='[]'; prior_price bigint; prior_url text; prior_updated timestamptz; prior_status text;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Invalid rows' using errcode='22023';end if;
 n:=jsonb_array_length(p_rows);
 if n not between 1 and 100 or octet_length(p_rows::text)>600000 or (select count(distinct x->>'external_product_id') from jsonb_array_elements(p_rows) x)<>n then raise exception 'Invalid or duplicate rows' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('awin-sync:'||p_source_id::text,0));
 select * into s from public.catalog_feed_sources where id=p_source_id for share;
 if not found or s.provider<>'awin' or s.status<>'authorized' or s.awin_merchant_id is null then raise exception 'Authorized configured Awin source required' using errcode='23514';end if;
 insert into public.catalog_awin_sync_runs(source_id,created_by,row_count) values(s.id,auth.uid(),n) returning id into run;
 for r in select * from jsonb_to_recordset(p_rows) as x(external_product_id text,title text,description text,category_hint text,image_url text,affiliate_url text,price_cents bigint,currency text) order by external_product_id loop
  if r.external_product_id is null or length(r.external_product_id) not between 1 and 120 or r.title is null or length(r.title) not between 3 and 180 or length(coalesce(r.description,''))>3000 or length(coalesce(r.category_hint,''))>120 or r.currency is distinct from 'USD' or (r.price_cents is not null and r.price_cents not between 0 and 100000000) or not dealwovo_private.awin_link_matches(r.affiliate_url,s.awin_publisher_id,s.awin_advertiser_id) or (r.image_url is not null and not dealwovo_private.safe_feed_url(r.image_url)) then raise exception 'Invalid scoped feed row' using errcode='23514';end if;
  perform pg_advisory_xact_lock(hashtextextended(s.id::text||':'||r.external_product_id,0));
  c:=null; o:=null;meta:=false;prior_price:=null;prior_url:=null;prior_updated:=null;prior_status:=null;
  select x.* into c from public.catalog_feed_candidates x join public.catalog_feed_batches b on b.id=x.batch_id where b.source_id=s.id and x.external_product_id=r.external_product_id and x.status in ('staged','converted') limit 1;
  if not found then
   k:='new';next_rows:=next_rows||jsonb_build_array(to_jsonb(r));
  else
   meta:=c.title is distinct from r.title or c.description is distinct from coalesce(r.description,'') or c.category_hint is distinct from coalesce(r.category_hint,'') or c.image_url is distinct from r.image_url;
   if c.status='staged' then
    prior_price:=c.price_cents;prior_url:=c.affiliate_url;
    k:=case when meta or prior_price is distinct from r.price_cents or prior_url is distinct from r.affiliate_url then 'staged_changed' else 'unchanged' end;
   else
    select * into strict o from public.catalog_offers where id=c.converted_offer_id;
    prior_price:=o.price_cents;prior_url:=o.affiliate_url;prior_updated:=o.updated_at;prior_status:=o.status;
    k:=case when prior_price is distinct from r.price_cents or prior_url is distinct from r.affiliate_url then 'offer_changed' when meta then 'editorial_changed' else 'unchanged' end;
   end if;
  end if;
  insert into public.catalog_awin_sync_items(run_id,external_product_id,title,candidate_id,offer_id,kind,metadata_changed,previous_price,proposed_price,previous_url,proposed_url,previous_updated_at,previous_status)
  values(run,r.external_product_id,r.title,c.id,o.id,k,meta,prior_price,r.price_cents,prior_url,r.affiliate_url,prior_updated,prior_status);
 end loop;
 if jsonb_array_length(next_rows)>0 then perform dealwovo_private.stage_catalog_feed(s.id,next_rows);end if;
 return run;
end;$$;
create function public.sync_awin_feed(p_source_id uuid,p_rows jsonb) returns bigint language sql security invoker set search_path='' as $$ select dealwovo_private.sync_awin_feed(p_source_id,p_rows) $$;
create function dealwovo_private.review_awin_sync_item(p_item_id bigint,p_decision text) returns boolean
language plpgsql security definer set search_path='' as $$
declare i public.catalog_awin_sync_items%rowtype; s public.catalog_feed_sources%rowtype; o public.catalog_offers%rowtype; rid bigint; sid uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_decision is null or p_decision not in ('applied','dismissed') then raise exception 'Invalid decision' using errcode='22023';end if;
 select r.source_id,r.id into sid,rid from public.catalog_awin_sync_items x join public.catalog_awin_sync_runs r on r.id=x.run_id where x.id=p_item_id;
 if not found then raise exception 'Unknown review' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended('awin-sync:'||sid::text,0));
 select * into strict i from public.catalog_awin_sync_items where id=p_item_id for update;
 if i.decision is not null or i.kind not in ('offer_changed','editorial_changed','staged_changed') then raise exception 'Review unavailable' using errcode='23514';end if;
 if p_decision='applied' then
  if i.kind<>'offer_changed' then raise exception 'Only offer changes may be applied' using errcode='23514';end if;
  if exists(select 1 from public.catalog_awin_sync_items x join public.catalog_awin_sync_runs r on r.id=x.run_id where r.source_id=sid and x.run_id>rid and x.external_product_id=i.external_product_id) then raise exception 'Newer observation exists' using errcode='23514';end if;
  select * into strict s from public.catalog_feed_sources where id=sid for share;
  if s.status<>'authorized' or not dealwovo_private.awin_link_matches(i.proposed_url,s.awin_publisher_id,s.awin_advertiser_id) then raise exception 'Source unavailable' using errcode='23514';end if;
  select * into strict o from public.catalog_offers where id=i.offer_id for update;
  if o.updated_at is distinct from i.previous_updated_at or o.price_cents is distinct from i.previous_price or o.affiliate_url is distinct from i.previous_url or o.status is distinct from i.previous_status or o.merchant_id is distinct from s.awin_merchant_id then raise exception 'Offer changed since comparison' using errcode='23514';end if;
  update public.catalog_offers set price_cents=i.proposed_price,affiliate_url=i.proposed_url,status='draft',verified_at=null,expires_at=null where id=o.id;
 end if;
 update public.catalog_awin_sync_items set decision=p_decision,reviewed_at=clock_timestamp(),reviewed_by=auth.uid() where id=i.id;
 return true;
end;$$;
create function public.review_awin_sync_item(p_item_id bigint,p_decision text) returns boolean language sql security invoker set search_path='' as $$ select dealwovo_private.review_awin_sync_item(p_item_id,p_decision) $$;
revoke all on function dealwovo_private.sync_awin_feed(uuid,jsonb),public.sync_awin_feed(uuid,jsonb),dealwovo_private.review_awin_sync_item(bigint,text),public.review_awin_sync_item(bigint,text) from public,anon,authenticated;
grant execute on function dealwovo_private.sync_awin_feed(uuid,jsonb),public.sync_awin_feed(uuid,jsonb),dealwovo_private.review_awin_sync_item(bigint,text),public.review_awin_sync_item(bigint,text) to authenticated;
notify pgrst,'reload schema';
