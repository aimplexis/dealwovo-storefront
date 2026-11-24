-- Deal evaluation uses the same stored eligibility rules as the quality report.
-- The comparison is a recorded price difference, never a savings or profit claim.
create function public.catalog_deal_report(p_page integer default 1,p_filter text default 'all')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if p_page is null or p_page<1 or p_page>1000000 or p_filter is null or p_filter not in ('all','hold','recheck','editorial-review') then raise exception 'Invalid report page or filter' using errcode='22023';end if;
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

 ), evaluated as materialized (
 select c.*,case when classification='eligible' then 'editorial-review' when classification='expiring' then 'recheck' else 'hold' end as priority,
 (currency='USD' and price_cents is not null and price_cents>0) as price_known
 from classified c
 ), filtered as (
 select *,case priority when 'hold' then 0 when 'recheck' then 1 else 2 end as sort_order
 from evaluated where p_filter='all' or priority=p_filter
 ), bounds as (
 select count(*) as matching,least(p_page::bigint,greatest(1,(count(*)+49)/50)) as page from filtered
 ), page_rows as (
 select * from filtered order by sort_order,id limit 50 offset ((select page from bounds)-1)*50
 ), comparisons as (
 select r.*,a."merchantName" as comparison_merchant,a.price_cents as comparison_price_cents,a.price_cents-r.price_cents as comparison_cents,a.verified_at as comparison_verified_at
 from page_rows r left join lateral (
 select e."merchantName",e.price_cents,e.verified_at from evaluated e
 where r.priority='editorial-review' and r.price_known and e.priority='editorial-review' and e.price_known
 and e.product_id=r.product_id and e.merchant_id<>r.merchant_id
 order by e.price_cents,e.id limit 1
 ) a on true
 )
 select jsonb_build_object('inspectedAt',now(),'totalOffers',count(*),'page',(select page from bounds),
 'matching',(select matching from bounds),'pageSize',50,
 'totals',jsonb_build_object('hold',count(*) filter(where priority='hold'),'recheck',count(*) filter(where priority='recheck'),'editorial-review',count(*) filter(where priority='editorial-review')),
 'items',coalesce((select jsonb_agg(to_jsonb(r)-'sort_order' order by sort_order,id) from comparisons r),'[]'::jsonb))
 into result from evaluated;
 return result;
end;$$;
revoke all on function public.catalog_deal_report(integer,text) from public,anon,authenticated;
grant execute on function public.catalog_deal_report(integer,text) to authenticated;
notify pgrst,'reload schema';
