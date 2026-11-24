-- Cover foreign-key paths identified by Supabase performance advisor.
create index if not exists idx_catalog_admin_events_actor on public.catalog_admin_events(actor_id);
create index if not exists idx_catalog_offers_merchant on public.catalog_offers(merchant_id);
create index if not exists idx_catalog_products_category on public.catalog_products(category_id);
