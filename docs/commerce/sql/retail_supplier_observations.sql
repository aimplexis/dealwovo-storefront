-- Staged schema: apply only after isolated acceptance and explicit database approval.
begin;
create table public.retail_supplier_observations (
 product_id uuid not null references public.retail_supplier_products(id),
 observed_at timestamptz not null check (observed_at <= now() and observed_at >= now()-interval '24 hours'),
 wholesale_cents integer not null check (wholesale_cents between 1 and 100000000),
 shipping_cents integer check (shipping_cents between 0 and 100000000),
 reported_quantity integer check (reported_quantity between 0 and 10000000),
 source_reference text not null check (char_length(btrim(source_reference)) between 3 and 500),
 created_by uuid not null default auth.uid(),
 created_at timestamptz not null default now(),
 primary key(product_id,observed_at)
);
alter table public.retail_supplier_observations enable row level security;
revoke all on public.retail_supplier_observations from public,anon,authenticated;
grant select on public.retail_supplier_observations to authenticated;
grant insert(product_id,observed_at,wholesale_cents,shipping_cents,reported_quantity,source_reference) on public.retail_supplier_observations to authenticated;
create policy owner_read on public.retail_supplier_observations for select to authenticated using(exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
create policy owner_append on public.retail_supplier_observations for insert to authenticated with check(created_by=(select auth.uid()) and exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner') and exists(select 1 from public.retail_supplier_products p where p.id=product_id and p.observed_at<retail_supplier_observations.observed_at));
-- Latest timestamp wins even when independent imports finish out of order.
-- Original identity, metadata and Dealwovo retail price are never overwritten.
create view public.retail_supplier_current_products with (security_invoker=true) as
select p.id,p.supplier_id,p.sku,p.title,p.retail_cents,
 case when o.product_id is null then p.wholesale_cents else o.wholesale_cents end as wholesale_cents,
 case when o.product_id is null then p.shipping_cents else o.shipping_cents end as shipping_cents,
 case when o.product_id is null then p.reported_quantity else o.reported_quantity end as reported_quantity,
 coalesce(o.observed_at,p.observed_at) as observed_at,
 coalesce(o.source_reference,p.source_reference) as source_reference,
 p.created_at
from public.retail_supplier_products p
left join lateral (select x.* from public.retail_supplier_observations x where x.product_id=p.id order by x.observed_at desc limit 1) o on true;
revoke all on public.retail_supplier_current_products from public,anon,authenticated;
grant select on public.retail_supplier_current_products to authenticated;
commit;
