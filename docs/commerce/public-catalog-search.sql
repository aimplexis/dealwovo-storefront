create or replace function public.search_public_catalog(p_query text,p_category text,p_budget text,p_sort text,p_page integer,p_retailer text default '')
returns jsonb language sql stable security invoker set search_path = '' as $$
with matched as (
 select o.id,o.price_cents,o.currency,o.verified_at,o.expires_at,p.title,
 jsonb_build_object('id',p.id,'slug',p.slug,'title',p.title,'description',p.description,'image_url',p.image_url,'category',jsonb_build_object('slug',c.slug,'name',c.name)) as product,
 jsonb_build_object('id',m.id,'name',m.name) as merchant
 from public.catalog_offers o join public.catalog_products p on p.id=o.product_id join public.catalog_categories c on c.id=p.category_id join public.catalog_merchants m on m.id=o.merchant_id
 where o.status='approved' and p.status='published' and c.status='published' and m.status='approved'
 and o.verified_at<=now() and o.expires_at>now() and o.expires_at<=o.verified_at+interval '30 days'
 and (p_category='all' or c.slug=p_category)
 and (coalesce(p_retailer,'')='' or lower(m.name)=lower(left(p_retailer,100)))
 and (p_budget='all' or (o.currency='USD' and o.price_cents>0 and case p_budget when '25' then o.price_cents<2500 when '50' then o.price_cents<5000 when '100' then o.price_cents<10000 when '150plus' then o.price_cents>=15000 else false end))
 and not exists (select 1 from regexp_split_to_table(lower(trim(left(coalesce(p_query,''),100))), '[[:space:]]+') as word where word<>'' and strpos(lower(concat_ws(' ',p.title,p.description,c.name,m.name)),word)=0)
 and p_page between 1 and 500 and p_sort in ('recent','price_low','price_high','name')
), paged as (
 select *,row_number() over(order by case when p_sort in ('price_low','price_high') then case when currency='USD' and price_cents>0 then 0 else 1 end end,
 case when p_sort='price_low' and currency='USD' and price_cents>0 then price_cents end asc nulls last,
 case when p_sort='price_high' and currency='USD' and price_cents>0 then price_cents end desc nulls last,
 case when p_sort='name' then lower(title) end,verified_at desc,id) as rn
 from matched
 order by rn limit 25 offset ((greatest(1,least(coalesce(p_page,1),500))-1)*24)
)
select jsonb_build_object('offers',coalesce((select jsonb_agg(to_jsonb(paged)-'rn'-'title' order by rn) from paged where rn<=((greatest(1,least(coalesce(p_page,1),500))-1)*24+24)),'[]'::jsonb),'hasMore',(select count(*)>24 from paged));
$$;
revoke all on function public.search_public_catalog(text,text,text,text,integer,text) from public,authenticated,service_role;
grant execute on function public.search_public_catalog(text,text,text,text,integer,text) to anon;