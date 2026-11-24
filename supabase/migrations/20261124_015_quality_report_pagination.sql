-- Offer Quality: classify all visible offers in one consistent database snapshot.
-- Only administrators may execute this read-only, security-invoker report.
create function public.catalog_quality_report(p_page integer default 1,p_filter text default 'attention')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then
  raise exception 'Administrator required' using errcode='42501';
 end if;
 if p_page is null or p_page<1 or p_page>1000000 or p_filter is null or p_filter not in ('attention','all','eligible','expiring','expired','blocked','draft','paused') then
  raise exception 'Invalid report page or filter' using errcode='22023';
 end if;
 with classified as materialized (
  select o.id,o.product_id,o.merchant_id,o.status,o.verified_at,o.expires_at,o.price_cents,o.currency,o.created_at,o.updated_at,
   coalesce(p.title,'Unknown product') as "productTitle",coalesce(m.name,'Unknown retailer') as "merchantName",p.slug as "productSlug",
   extract(epoch from (o.expires_at-now()))/3600 as "expiresInHours",
   case when o.status='draft' then 'draft' when o.status='paused' then 'paused'
    when o.status<>'approved' then 'blocked'
    when o.expires_at<=now() then 'expired'
    when o.expires_at is null or o.verified_at is null or o.verified_at>now()
      or p.status is distinct from 'published' or c.status is distinct from 'published' or m.status is distinct from 'approved' then 'blocked'
    when o.expires_at<=now()+interval '72 hours' then 'expiring'
    else 'eligible' end as classification,
   case when o.status='draft' then array['Awaiting offer verification']
    when o.status='paused' then array['Paused by an administrator']
    when o.status<>'approved' then array['Unrecognized offer status']
    when o.expires_at<=now() then array['Verification window expired']
    else array_remove(array[
     case when o.expires_at is null then 'No valid verification expiry' end,
     case when o.verified_at is null or o.verified_at>now() then 'No valid past verification timestamp' end,
     case when p.status is distinct from 'published' then 'Product is not published' end,
     case when c.status is distinct from 'published' then 'Category is not published' end,
     case when m.status is distinct from 'approved' then 'Retailer is not approved' end,
     case when o.expires_at<=now()+interval '72 hours' then 'Verification expires within 72 hours' end
    ],null) end as reasons
  from public.catalog_offers o
  left join public.catalog_products p on p.id=o.product_id
  left join public.catalog_categories c on c.id=p.category_id
  left join public.catalog_merchants m on m.id=o.merchant_id
 ), filtered as (
  select *,case classification when 'expired' then 0 when 'blocked' then 1 when 'expiring' then 2 when 'draft' then 3 when 'paused' then 4 else 5 end as sort_order
  from classified where p_filter='all' or (p_filter='attention' and classification<>'eligible') or classification=p_filter
 ), bounds as (
  select count(*) as matching,least(p_page::bigint,greatest(1,(count(*)+49)/50)) as page from filtered
 ), page_rows as (
  select f.* from filtered f order by sort_order,expires_at nulls last,id limit 50 offset ((select page from bounds)-1)*50
 )
 select jsonb_build_object(
  'inspectedAt',now(),'page',(select page from bounds),'matching',(select matching from bounds),'pageSize',50,
  'totals',jsonb_build_object('expired',count(*) filter(where classification='expired'),'blocked',count(*) filter(where classification='blocked'),'expiring',count(*) filter(where classification='expiring'),'eligible',count(*) filter(where classification='eligible'),'draft',count(*) filter(where classification='draft'),'paused',count(*) filter(where classification='paused')),
  'totalOffers',count(*),
  'categories',(select count(*) from public.catalog_categories),
  'merchants',(select count(*) from public.catalog_merchants),
  'products',(select count(*) from public.catalog_products),
  'authorizedSources',(select count(*) from public.catalog_feed_sources where status='authorized'),
  'items',coalesce((select jsonb_agg(to_jsonb(r)-'sort_order' order by sort_order,expires_at nulls last,id) from page_rows r),'[]'::jsonb)
 ) into result from classified;
 return result;
end;
$$;
revoke all on function public.catalog_quality_report(integer,text) from public,anon,authenticated;
grant execute on function public.catalog_quality_report(integer,text) to authenticated;
notify pgrst,'reload schema';
