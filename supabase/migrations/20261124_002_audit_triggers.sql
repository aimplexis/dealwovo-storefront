-- Immutable audit events are inserted atomically by triggers, not by app forms.
-- Authenticated clients may SELECT audit rows but must not forge them.
drop policy if exists "admins can append audit" on public.catalog_admin_events;
revoke insert,update,delete on public.catalog_admin_events from anon,authenticated;
create or replace function public.catalog_audit_change()
returns trigger language plpgsql security definer set search_path='' as $$
declare current_actor uuid;
begin
 current_actor := (select auth.uid());
 if current_actor is not null then
  insert into public.catalog_admin_events(actor_id,entity_type,entity_id,operation)
   values (current_actor, TG_ARGV[0],
    case when TG_OP='DELETE' then old.id else new.id end,
    lower(TG_OP));
 end if;
 if TG_OP='DELETE' then return old; end if;
 return new;
end;
$$;
revoke execute on function public.catalog_audit_change() from public;
create trigger catalog_categories_audit after insert or update or delete on public.catalog_categories
 for each row execute function public.catalog_audit_change('category');
create trigger catalog_merchants_audit after insert or update or delete on public.catalog_merchants
 for each row execute function public.catalog_audit_change('merchant');
create trigger catalog_products_audit after insert or update or delete on public.catalog_products
 for each row execute function public.catalog_audit_change('product');
create trigger catalog_offers_audit after insert or update or delete on public.catalog_offers
 for each row execute function public.catalog_audit_change('offer');
