begin;
create table public.retail_suppliers (
 id uuid primary key default gen_random_uuid(),
 legal_name text not null check (char_length(btrim(legal_name)) between 2 and 160),
 kind text not null check (kind in ('manufacturer','wholesaler','distributor','brand')),
 website text not null check (char_length(website) between 10 and 500 and website ~ '^https://[^[:space:]]+$'),
 country text not null check (country ~ '^[A-Z]{2}$'),
 contact_email text not null check (char_length(contact_email) between 5 and 254 and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 method text not null check (method in ('manual','csv','feed','api','shopify','woocommerce','other')),
 categories text not null check (char_length(btrim(categories)) between 2 and 1000),
 created_at timestamptz not null default now(),
 created_by uuid not null default auth.uid(),
 unique(website,legal_name)
);
alter table public.retail_suppliers enable row level security;
revoke all on public.retail_suppliers from public, anon, authenticated;
grant select on public.retail_suppliers to authenticated;
grant insert (legal_name,kind,website,country,contact_email,method,categories) on public.retail_suppliers to authenticated;
create policy retail_supplier_owner_read on public.retail_suppliers for select to authenticated using (exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
create policy retail_supplier_owner_insert on public.retail_suppliers for insert to authenticated with check (created_by=(select auth.uid()) and exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
commit;