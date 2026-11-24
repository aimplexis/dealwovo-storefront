-- Dealwovo Phase 4B: private affiliate feed intake, no automatic publication.
-- Never expose raw candidate prices, source notes or feed URLs to anon.
create table if not exists public.catalog_feed_sources(
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 3 and 120),
 provider text not null check(provider in ('manual_csv','awin','impact','cj','amazon','other')),
 partner_ref text,
 authorization_note text not null default '',
 status text not null default 'draft' check(status in ('draft','authorized','disabled')),
 created_by uuid not null references auth.users(id) on delete restrict,
 authorized_by uuid references auth.users(id) on delete restrict,
 authorized_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 constraint authorized_feed_requires_evidence check(status <> 'authorized'
  or (authorized_by is not null and authorized_at is not null and length(authorization_note) >= 25))
);
create table if not exists public.catalog_feed_batches(
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null references public.catalog_feed_sources(id) on delete restrict,
 created_by uuid not null references auth.users(id) on delete restrict,
 row_count integer not null check(row_count between 1 and 100),
 status text not null default 'staged' check(status in ('staged','reviewed')),
 created_at timestamptz not null default now()
);
create table if not exists public.catalog_feed_candidates(
 id uuid primary key default gen_random_uuid(),
 batch_id uuid not null references public.catalog_feed_batches(id) on delete cascade,
 external_product_id text not null check(length(external_product_id) between 1 and 120),
 title text not null check(length(title) between 3 and 180),
 description text not null default '' check(length(description)<=3000),
 category_hint text not null default '' check(length(category_hint)<=120),
 image_url text check(image_url is null or image_url ~* '^https://[^[:space:]]+$'),
 affiliate_url text not null check(length(affiliate_url)<=2000 and affiliate_url ~* '^https://[^[:space:]]+$'),
 price_cents bigint check(price_cents is null or price_cents between 0 and 100000000),
 currency text not null default 'USD' check(currency='USD'),
 status text not null default 'staged' check(status in ('staged','rejected','converted')),
 converted_product_id uuid references public.catalog_products(id) on delete restrict,
 converted_offer_id uuid references public.catalog_offers(id) on delete restrict,
 created_at timestamptz not null default now(),
 constraint converted_requires_both_records check(status <> 'converted' or (converted_product_id is not null and converted_offer_id is not null)),
 unique(batch_id,external_product_id)
);
create index if not exists idx_feed_batches_source on public.catalog_feed_batches(source_id);
create index if not exists idx_feed_batches_created_by on public.catalog_feed_batches(created_by);
create index if not exists idx_feed_candidates_batch on public.catalog_feed_candidates(batch_id);
create index if not exists idx_feed_candidates_converted_product on public.catalog_feed_candidates(converted_product_id);
create index if not exists idx_feed_candidates_converted_offer on public.catalog_feed_candidates(converted_offer_id);
create index if not exists idx_feed_sources_creator on public.catalog_feed_sources(created_by);
create index if not exists idx_feed_sources_authorizer on public.catalog_feed_sources(authorized_by);
alter table public.catalog_feed_sources enable row level security;
alter table public.catalog_feed_batches enable row level security;
alter table public.catalog_feed_candidates enable row level security;

-- Explicit least-privilege grants: Supabase default privileges can include TRUNCATE/TRIGGER.
revoke all on public.catalog_feed_sources,public.catalog_feed_batches,public.catalog_feed_candidates from anon,authenticated;
grant select,insert,update,delete on public.catalog_feed_sources,public.catalog_feed_batches,public.catalog_feed_candidates to authenticated;
create policy "feed sources admin only" on public.catalog_feed_sources for all to authenticated
 using((select dealwovo_private.is_catalog_admin())) with check((select dealwovo_private.is_catalog_admin()));
create policy "feed batches admin only" on public.catalog_feed_batches for all to authenticated
 using((select dealwovo_private.is_catalog_admin())) with check((select dealwovo_private.is_catalog_admin()));
create policy "feed candidates admin only" on public.catalog_feed_candidates for all to authenticated
 using((select dealwovo_private.is_catalog_admin())) with check((select dealwovo_private.is_catalog_admin()));
-- Reuse an immutable audit log: authenticated mutations emit audit events through triggers.
alter table public.catalog_admin_events drop constraint if exists catalog_admin_events_entity_type_check;
alter table public.catalog_admin_events add constraint catalog_admin_events_entity_type_check
 check (entity_type in ('category','merchant','product','offer','feed_source','feed_batch','feed_candidate'));
create trigger audit_catalog_feed_sources after insert or update or delete on public.catalog_feed_sources
 for each row execute function dealwovo_private.catalog_audit_change('feed_source');
create trigger audit_catalog_feed_batches after insert or update or delete on public.catalog_feed_batches
 for each row execute function dealwovo_private.catalog_audit_change('feed_batch');
create trigger audit_catalog_feed_candidates after insert or update or delete on public.catalog_feed_candidates
 for each row execute function dealwovo_private.catalog_audit_change('feed_candidate');
create trigger touch_catalog_feed_sources before update on public.catalog_feed_sources
 for each row execute function public.touch_catalog_updated_at();

-- Atomic, human-initiated conversion: candidates become DRAFT product + DRAFT offer.
-- SECURITY INVOKER means existing RLS policies and explicit grants remain enforced.
create or replace function public.dealwovo_convert_feed_candidate(
 p_candidate_id uuid, p_category_id uuid, p_merchant_id uuid, p_slug text)
returns table(product_id uuid,offer_id uuid)
language plpgsql security invoker set search_path='' as $$
declare
 v_candidate public.catalog_feed_candidates%rowtype;
 v_source_status text;
 v_product_id uuid;
 v_offer_id uuid;
begin
 if (select auth.uid()) is null or not (select dealwovo_private.is_catalog_admin()) then
  raise exception 'not authorized' using errcode='42501';
 end if;
 if p_slug is null or p_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or length(p_slug)>130 then
  raise exception 'invalid product slug';
 end if;
 select * into v_candidate from public.catalog_feed_candidates where id=p_candidate_id for update;
 if not found or v_candidate.status <> 'staged' then raise exception 'candidate unavailable'; end if;
 select s.status into v_source_status
 from public.catalog_feed_batches b join public.catalog_feed_sources s on s.id=b.source_id
 where b.id=v_candidate.batch_id;
 if coalesce(v_source_status,'') <> 'authorized' then raise exception 'source not authorized'; end if;
 if not exists(select 1 from public.catalog_categories where id=p_category_id) or
    not exists(select 1 from public.catalog_merchants where id=p_merchant_id) then
  raise exception 'select a valid category and merchant';
 end if;
 insert into public.catalog_products(category_id,slug,title,description,image_url,status)
 values (p_category_id,p_slug,v_candidate.title,v_candidate.description,v_candidate.image_url,'draft')
 returning id into v_product_id;
 insert into public.catalog_offers(product_id,merchant_id,affiliate_url,price_cents,currency,status)
 values (v_product_id,p_merchant_id,v_candidate.affiliate_url,v_candidate.price_cents,'USD','draft')
 returning id into v_offer_id;
 update public.catalog_feed_candidates
 set status='converted',converted_product_id=v_product_id,converted_offer_id=v_offer_id
 where id=v_candidate.id;
 return query select v_product_id,v_offer_id;
end;
$$;
revoke all on function public.dealwovo_convert_feed_candidate(uuid,uuid,uuid,text) from public,anon;
grant execute on function public.dealwovo_convert_feed_candidate(uuid,uuid,uuid,text) to authenticated;
