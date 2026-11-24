-- Move privileged helpers out of exposed public schema.
-- Apply after 001 (foundation) and 002 (audit triggers).
create schema if not exists dealwovo_private;
revoke all on schema dealwovo_private from public,anon;
grant usage on schema dealwovo_private to authenticated;
alter function public.is_catalog_admin() set schema dealwovo_private;
alter function public.catalog_audit_change() set schema dealwovo_private;
revoke all on function dealwovo_private.is_catalog_admin() from public,anon;
grant execute on function dealwovo_private.is_catalog_admin() to authenticated;
revoke all on function dealwovo_private.catalog_audit_change() from public,anon,authenticated;
-- The trigger invokes this function as an internal database action.
-- RLS policies reference the same function OID and are preserved by ALTER FUNCTION SET SCHEMA.
