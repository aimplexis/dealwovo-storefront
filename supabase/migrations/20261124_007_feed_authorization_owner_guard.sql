-- Phase 4B defense in depth: feed rights must only be authorized by an owner.
create or replace function dealwovo_private.enforce_feed_authorization()
returns trigger language plpgsql security invoker set search_path='' as $$
declare owner_role text;
begin
 if (TG_OP='INSERT' and new.status='authorized')
   or (TG_OP='UPDATE' and (new.status='authorized' or old.status='authorized')) then
  select a.role into owner_role from public.catalog_admins a
   where a.user_id=(select auth.uid());
  if coalesce(owner_role,'') <> 'owner' then
   raise exception 'only catalog owners may authorize or alter authorized sources' using errcode='42501';
  end if;
  if new.status='authorized' and (new.authorized_by is distinct from (select auth.uid())
      or new.authorized_at is null or length(new.authorization_note)<25) then
   raise exception 'rights confirmation and owner identity are required';
  end if;
 end if;
 return new;
end;
$$;
revoke all on function dealwovo_private.enforce_feed_authorization() from public,anon,authenticated;
create trigger enforce_feed_authorization before insert or update on public.catalog_feed_sources
 for each row execute function dealwovo_private.enforce_feed_authorization();
