-- Restrict feed writes to narrowly authorized functions and one rejection transition.
-- This is syntactic URL validation, not external destination or ownership verification.
create function dealwovo_private.safe_feed_url(value text) returns boolean
language sql immutable set search_path='' as $$
 select coalesce(length(value)<=2000 and value ~* '^https://([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z][a-z0-9-]*(:443)?([/?#][^[:space:]]*)?$'
 and value !~ '[[:cntrl:][:space:]]' and strpos(value,chr(92))=0
 and split_part(split_part(split_part(split_part(lower(substring(value from 9)),'/'),'?'),'#'),':',1) !~ '\.(localhost|local|internal|test|example|invalid|onion)$',false);
$$;
revoke all on function dealwovo_private.safe_feed_url(text) from public,anon,authenticated;
create function dealwovo_private.stage_catalog_feed(p_source_id uuid,p_rows jsonb) returns integer
language plpgsql security definer set search_path='' as $$
declare n integer; b uuid; s text;
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Rows must be an array';end if;
 n:=jsonb_array_length(p_rows);
 if n<1 or n>100 or octet_length(p_rows::text)>600000 then raise exception 'Invalid batch size';end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where r->>'currency' is distinct from 'USD') then raise exception 'USD currency required';end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where
   not dealwovo_private.safe_feed_url(r->>'affiliate_url') or
   (r->>'image_url' is not null and not dealwovo_private.safe_feed_url(r->>'image_url'))) then raise exception 'Invalid external HTTPS URL';end if;
 select status into s from public.catalog_feed_sources where id=p_source_id for share;
 if s is distinct from 'authorized' then raise exception 'Source not authorized';end if;
 insert into public.catalog_feed_batches(source_id,created_by,row_count,status) values(p_source_id,auth.uid(),n,'staged') returning id into b;
 insert into public.catalog_feed_candidates(batch_id,external_product_id,title,description,category_hint,image_url,affiliate_url,price_cents,currency,status)
 select b,r.external_product_id,r.title,coalesce(r.description,''),coalesce(r.category_hint,''),r.image_url,r.affiliate_url,r.price_cents,'USD','staged'
 from jsonb_to_recordset(p_rows) as r(external_product_id text,title text,description text,category_hint text,image_url text,affiliate_url text,price_cents bigint);
 return n;
end;$$;
create function dealwovo_private.dealwovo_convert_feed_candidate(
 p_candidate_id uuid, p_category_id uuid, p_merchant_id uuid, p_slug text)
returns table(product_id uuid,offer_id uuid)
language plpgsql security definer set search_path='' as $$
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
 where b.id=v_candidate.batch_id for share of s;
 if coalesce(v_source_status,'') <> 'authorized' then raise exception 'source not authorized'; end if;
 if not dealwovo_private.safe_feed_url(v_candidate.affiliate_url) or (v_candidate.image_url is not null and not dealwovo_private.safe_feed_url(v_candidate.image_url)) then raise exception 'Invalid external HTTPS URL';end if;
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

revoke all on function dealwovo_private.stage_catalog_feed(uuid,jsonb),dealwovo_private.dealwovo_convert_feed_candidate(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function dealwovo_private.stage_catalog_feed(uuid,jsonb),dealwovo_private.dealwovo_convert_feed_candidate(uuid,uuid,uuid,text) to authenticated;
create or replace function public.stage_catalog_feed(p_source_id uuid,p_rows jsonb) returns integer
language sql security invoker set search_path='' as $$ select dealwovo_private.stage_catalog_feed(p_source_id,p_rows); $$;
create or replace function public.dealwovo_convert_feed_candidate(p_candidate_id uuid,p_category_id uuid,p_merchant_id uuid,p_slug text)
returns table(product_id uuid,offer_id uuid)
language sql security invoker set search_path='' as $$ select * from dealwovo_private.dealwovo_convert_feed_candidate(p_candidate_id,p_category_id,p_merchant_id,p_slug); $$;
revoke all on function public.stage_catalog_feed(uuid,jsonb),public.dealwovo_convert_feed_candidate(uuid,uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.stage_catalog_feed(uuid,jsonb),public.dealwovo_convert_feed_candidate(uuid,uuid,uuid,text) to authenticated;

revoke insert,update,delete on public.catalog_feed_batches,public.catalog_feed_candidates from public,anon,authenticated;
grant update(status) on public.catalog_feed_candidates to authenticated;
drop policy "feed batches admin only" on public.catalog_feed_batches;
create policy "feed batches admin read" on public.catalog_feed_batches for select to authenticated using((select dealwovo_private.is_catalog_admin()));
drop policy "feed candidates admin only" on public.catalog_feed_candidates;
create policy "feed candidates admin read" on public.catalog_feed_candidates for select to authenticated using((select dealwovo_private.is_catalog_admin()));
create policy "feed candidates reject staged" on public.catalog_feed_candidates for update to authenticated
using(status='staged' and (select dealwovo_private.is_catalog_admin())) with check(status='rejected' and (select dealwovo_private.is_catalog_admin()));

revoke insert,update,delete on public.catalog_feed_sources from public,anon,authenticated;
grant insert(name,provider,partner_ref,status,created_by) on public.catalog_feed_sources to authenticated;
grant update(authorization_note,status,authorized_by,authorized_at) on public.catalog_feed_sources to authenticated;
drop policy "feed sources admin only" on public.catalog_feed_sources;
create policy "feed sources admin read" on public.catalog_feed_sources for select to authenticated using((select dealwovo_private.is_catalog_admin()));
create policy "feed sources create own draft" on public.catalog_feed_sources for insert to authenticated with check(status='draft' and created_by=(select auth.uid()) and (select dealwovo_private.is_catalog_admin()));
create policy "feed sources owner review" on public.catalog_feed_sources for update to authenticated
using(exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'))
with check(exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
notify pgrst,'reload schema';
