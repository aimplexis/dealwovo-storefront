begin;
create table public.retail_supplier_products (
 id uuid primary key default gen_random_uuid(),
 supplier_id uuid not null references public.retail_suppliers(id),
 sku text not null check (char_length(btrim(sku)) between 1 and 120),
 title text not null check (char_length(btrim(title)) between 3 and 180),
 description text not null default '' check (char_length(description)<=3000),
 category_hint text not null check (char_length(btrim(category_hint)) between 2 and 120),
 image_url text check (image_url is null or (char_length(image_url)<=2000 and image_url ~ '^https://[^[:space:]]+$')),
 wholesale_cents integer not null check (wholesale_cents between 1 and 100000000),
 retail_cents integer not null check (retail_cents between 1 and 100000000),
 shipping_cents integer check (shipping_cents between 0 and 100000000),
 reported_quantity integer check (reported_quantity between 0 and 10000000),
 source_reference text not null check (char_length(btrim(source_reference)) between 3 and 500),
 observed_at timestamptz not null check (observed_at<=now()),
 currency text not null default 'USD' check(currency='USD'),
 created_at timestamptz not null default now(),
 created_by uuid not null default auth.uid(),
 unique(supplier_id,sku)
);
alter table public.retail_supplier_products enable row level security;
revoke all on public.retail_supplier_products from public,anon,authenticated;
grant select on public.retail_supplier_products to authenticated;
grant insert(supplier_id,sku,title,description,category_hint,image_url,wholesale_cents,retail_cents,shipping_cents,reported_quantity,source_reference,observed_at) on public.retail_supplier_products to authenticated;
create policy supplier_product_owner_read on public.retail_supplier_products for select to authenticated using(exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
create policy supplier_product_owner_insert on public.retail_supplier_products for insert to authenticated with check(created_by=(select auth.uid()) and exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
commit;