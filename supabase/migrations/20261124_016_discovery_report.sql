-- Private catalog-wide discovery ranking. No external retrieval or publication.
create function public.catalog_discovery_report(p_page integer default 1,p_filter text default 'all')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if p_page is null or p_page<1 or p_page>1000000 or p_filter is null or p_filter not in ('all','complete','incomplete') then raise exception 'Invalid page or filter' using errcode='22023';end if;
 with ranked as materialized (
 select c.id,c.title,c.description,c.category_hint,c.image_url,c.price_cents,c.currency,c.created_at,c.external_product_id,
 s.name as source_name,s.provider,
 (case when length(btrim(c.description))>0 then 1 else 0 end +
 case when length(btrim(c.category_hint))>0 then 1 else 0 end +
 case when c.image_url is not null and length(btrim(c.image_url))>0 then 1 else 0 end +
 case when c.price_cents is not null and c.currency='USD' then 1 else 0 end) as score
 from public.catalog_feed_candidates c join public.catalog_feed_batches b on b.id=c.batch_id
 join public.catalog_feed_sources s on s.id=b.source_id where c.status='staged' and s.status='authorized'
 ), filtered as (
 select * from ranked where p_filter='all' or (p_filter='complete' and score=4) or (p_filter='incomplete' and score<4)
 ), bounds as (
 select count(*) as matching,least(p_page::bigint,greatest(1,(count(*)+49)/50)) as page from filtered
 ), page_rows as (
 select * from filtered order by score desc,created_at desc,id limit 50 offset ((select page from bounds)-1)*50
 )
 select jsonb_build_object('authorizedSources',(select count(*) from public.catalog_feed_sources where status='authorized'),
 'stagedCandidates',(select count(*) from public.catalog_feed_candidates where status='staged'),
 'eligibleCandidates',count(*),'completeCandidates',count(*) filter(where score=4),
 'matching',(select matching from bounds),'page',(select page from bounds),'pageSize',50,
 'items',coalesce((select jsonb_agg(to_jsonb(r) order by score desc,created_at desc,id) from page_rows r),'[]'::jsonb))
 into result from ranked;
 return result;
end;$$;
revoke all on function public.catalog_discovery_report(integer,text) from public,anon,authenticated;
grant execute on function public.catalog_discovery_report(integer,text) to authenticated;
notify pgrst,'reload schema';
