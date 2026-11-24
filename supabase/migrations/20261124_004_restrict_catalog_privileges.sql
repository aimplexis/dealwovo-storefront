-- Least-privilege correction: RLS does not prevent TRUNCATE, REFERENCES or TRIGGER.
-- Supabase default grants exposed these operations on new catalog tables.
revoke all on table
 public.catalog_admins, public.catalog_admin_events,
 public.catalog_categories, public.catalog_merchants,
 public.catalog_products, public.catalog_offers
 from anon, authenticated;

grant select on public.catalog_admins, public.catalog_admin_events to authenticated;
grant select on public.catalog_categories, public.catalog_merchants,
 public.catalog_products, public.catalog_offers to anon,authenticated;
grant insert,update,delete on public.catalog_categories, public.catalog_merchants,
 public.catalog_products, public.catalog_offers to authenticated;
revoke all on sequence public.catalog_admin_events_id_seq from anon,authenticated;
revoke execute on function public.touch_catalog_updated_at() from public,anon,authenticated;
revoke all on schema dealwovo_private from public,anon;
grant usage on schema dealwovo_private to authenticated;
revoke all on function dealwovo_private.is_catalog_admin() from public,anon;
grant execute on function dealwovo_private.is_catalog_admin() to authenticated;
revoke all on function dealwovo_private.catalog_audit_change() from public,anon,authenticated;
