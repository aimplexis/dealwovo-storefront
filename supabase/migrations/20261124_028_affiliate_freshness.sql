-- Existing affiliate infrastructure: revoke linked offers, invalidate changed verification, expire offers in bounded batches.
-- Public visibility already checks expiry at read time. No external requests.
create function dealwovo_private.linked_offer_source_active(p_offer uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select not exists(select 1 from public.catalog_feed_candidates c join public.catalog_feed_batches b on b.id=c.batch_id join public.catalog_feed_sources s on s.id=b.source_id where c.converted_offer_id=p_offer and s.status<>'authorized')
$$;
revoke all on function dealwovo_private.linked_offer_source_active(uuid) from public,anon,authenticated;
grant execute on function dealwovo_private.linked_offer_source_active(uuid) to anon,authenticated;
-- Keep the original public policy, add source condition to it (admin read policy remains separate).
alter policy "verified current offers are public" on public.catalog_offers using(
 status='approved' and verified_at is not null and verified_at<=now() and expires_at>now()
 and expires_at<=verified_at+interval '30 days'
 and (select dealwovo_private.linked_offer_source_active(id))
 and exists(select 1 from public.catalog_products p join public.catalog_categories c on c.id=p.category_id where p.id=product_id and p.status='published' and c.status='published')
 and exists(select 1 from public.catalog_merchants m where m.id=merchant_id and m.status='approved')
);
create function dealwovo_private.guard_offer_freshness() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='UPDATE' then
  if new.price_cents is distinct from old.price_cents or new.affiliate_url is distinct from old.affiliate_url or new.product_id is distinct from old.product_id or new.merchant_id is distinct from old.merchant_id or new.currency is distinct from old.currency then
   new.status:='draft';new.verified_at:=null;new.expires_at:=null;
  end if;
 end if;
 if new.status='approved' then
  if not dealwovo_private.linked_offer_source_active(new.id) or not dealwovo_private.safe_feed_url(new.affiliate_url) or new.verified_at is null or new.verified_at>clock_timestamp() or new.expires_at is null or new.expires_at<=clock_timestamp() or new.expires_at>new.verified_at+interval '30 days' then raise exception 'Fresh verification and authorized linked source required' using errcode='23514';end if;
 end if;
 return new;
end;$$;
revoke all on function dealwovo_private.guard_offer_freshness() from public,anon,authenticated;
create trigger guard_offer_freshness before insert or update on public.catalog_offers for each row execute function dealwovo_private.guard_offer_freshness();
-- Replace Awin-only revocation with equivalent coverage for every linked feed source.
create or replace function dealwovo_private.awin_source_pause() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.status='authorized' and new.status<>'authorized' then
  update public.catalog_offers o set status='paused',verified_at=null,expires_at=null where o.status='approved' and exists(select 1 from public.catalog_feed_candidates c join public.catalog_feed_batches b on b.id=c.batch_id where c.converted_offer_id=o.id and b.source_id=new.id);
 end if;
 return new;
end;$$;
-- Dedicated system audit preserves prior verification evidence; no invented human actor.
create table public.catalog_freshness_runs(
 id bigint generated always as identity primary key,
 inspected_at timestamptz not null default clock_timestamp(),
 paused_count integer not null default 0 check(paused_count between 0 and 250),
 expiring_count bigint not null default 0 check(expiring_count>=0),
 remaining_expired bigint not null default 0 check(remaining_expired>=0)
);
create table public.catalog_freshness_events(
 id bigint generated always as identity primary key,
 run_id bigint not null references public.catalog_freshness_runs(id) on delete restrict,
 offer_id uuid not null,
 previous_verified_at timestamptz,
 previous_expires_at timestamptz,
 reason text not null check(reason in ('expired','invalid_window','source_revoked')),
 unique(run_id,offer_id)
);
create index freshness_events_offer on public.catalog_freshness_events(offer_id);
alter table public.catalog_freshness_runs enable row level security;
alter table public.catalog_freshness_events enable row level security;
revoke all on public.catalog_freshness_runs,public.catalog_freshness_events from public,anon,authenticated;
grant select on public.catalog_freshness_runs,public.catalog_freshness_events to authenticated;
create policy "admin freshness runs" on public.catalog_freshness_runs for select to authenticated using((select dealwovo_private.is_catalog_admin()));
create policy "admin freshness events" on public.catalog_freshness_events for select to authenticated using((select dealwovo_private.is_catalog_admin()));
create function dealwovo_private.sweep_offer_freshness() returns bigint
language plpgsql security definer set search_path='' as $$
declare rid bigint;n integer; r record; t timestamptz:=clock_timestamp(); remaining bigint; watch bigint;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('dealwovo-freshness-sweep',0)) then return null;end if;
 insert into public.catalog_freshness_runs(inspected_at) values(t) returning id into rid;
 for r in select o.id,o.verified_at,o.expires_at,case when o.expires_at<=t then 'expired' when not dealwovo_private.linked_offer_source_active(o.id) then 'source_revoked' else 'invalid_window' end as reason
  from public.catalog_offers o where o.status='approved' and (o.expires_at<=t or o.verified_at is null or o.verified_at>t or o.expires_at is null or o.expires_at>o.verified_at+interval '30 days' or not dealwovo_private.linked_offer_source_active(o.id))
  order by o.expires_at nulls first,o.id limit 250 for update skip locked loop
  update public.catalog_offers set status='paused',verified_at=null,expires_at=null where id=r.id;
  insert into public.catalog_freshness_events(run_id,offer_id,previous_verified_at,previous_expires_at,reason) values(rid,r.id,r.verified_at,r.expires_at,r.reason);
 end loop;
 select count(*) into n from public.catalog_freshness_events where run_id=rid;
 select count(*) into remaining from public.catalog_offers where status='approved' and (expires_at<=t or verified_at is null or verified_at>t or expires_at is null or expires_at>verified_at+interval '30 days' or not dealwovo_private.linked_offer_source_active(id));
 select count(*) into watch from public.catalog_offers where status='approved' and verified_at<=t and expires_at>t and expires_at<=t+interval '72 hours' and expires_at<=verified_at+interval '30 days' and dealwovo_private.linked_offer_source_active(id);
 update public.catalog_freshness_runs set paused_count=n,remaining_expired=remaining,expiring_count=watch where id=rid;
 return rid;
end;$$;
revoke all on function dealwovo_private.sweep_offer_freshness() from public,anon,authenticated;
-- Hourly local database maintenance. No network calls, no reapproval, no price edits.
select cron.schedule('dealwovo-hourly-offer-freshness','15 * * * *','select dealwovo_private.sweep_offer_freshness();');
create function dealwovo_private.freshness_scheduler_status() returns boolean
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 return exists(select 1 from cron.job where jobname='dealwovo-hourly-offer-freshness' and active and schedule='15 * * * *' and command='select dealwovo_private.sweep_offer_freshness();');
end;$$;
create function public.freshness_scheduler_status() returns boolean language sql stable security invoker set search_path='' as $$select dealwovo_private.freshness_scheduler_status()$$;
revoke all on function dealwovo_private.freshness_scheduler_status(),public.freshness_scheduler_status() from public,anon,authenticated;
grant execute on function dealwovo_private.freshness_scheduler_status(),public.freshness_scheduler_status() to authenticated;
notify pgrst,'reload schema';
