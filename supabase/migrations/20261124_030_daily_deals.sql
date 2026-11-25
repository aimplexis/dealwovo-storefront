-- Owner-attested daily promotions; no savings or reference price claims.
create table public.catalog_daily_deals(
 id uuid primary key default gen_random_uuid(),
 feature_day date not null,
 offer_id uuid not null references public.catalog_offers(id) on delete restrict,
 offer_version timestamptz not null,
 product_version timestamptz not null,
 merchant_version timestamptz not null,
 starts_at timestamptz not null,
 ends_at timestamptz not null,
 evidence_note text not null check(char_length(btrim(evidence_note)) between 30 and 1200),
 reviewed_by uuid not null references auth.users(id),
 reviewed_at timestamptz not null default now(),
 revoked_at timestamptz,
 revoked_by uuid references auth.users(id),
 check(ends_at>starts_at),
 check((revoked_at is null)=(revoked_by is null))
);
create unique index daily_deal_active_day on public.catalog_daily_deals(feature_day) where revoked_at is null;
create index daily_deal_offer on public.catalog_daily_deals(offer_id);
create index daily_deal_reviewer on public.catalog_daily_deals(reviewed_by);
create index daily_deal_revoker on public.catalog_daily_deals(revoked_by);
alter table public.catalog_daily_deals enable row level security;
revoke all on public.catalog_daily_deals from public,anon,authenticated;
grant select on public.catalog_daily_deals to authenticated;
create policy "owner reads daily deals" on public.catalog_daily_deals for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.create_daily_deal(p_offer uuid,p_day date,p_start timestamptz,p_end timestamptz,p_note text) returns uuid
language plpgsql security definer set search_path='' as $$
declare o public.catalog_offers%rowtype;p public.catalog_products%rowtype;m public.catalog_merchants%rowtype;rid uuid;t timestamptz:=now();d date:=(now() at time zone 'UTC')::date;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_day is null or p_day<d or p_day>d+7 or p_start is null or p_end is null or p_end<=greatest(t,p_start) or p_start>=((p_day+1)::timestamp at time zone 'UTC') or p_end<=(p_day::timestamp at time zone 'UTC') or p_note is null or char_length(btrim(p_note)) not between 30 and 1200 then raise exception 'Invalid promotion window or evidence' using errcode='22023';end if;
 select * into o from public.catalog_offers where id=p_offer for share;
 if not found or o.status<>'approved' or o.verified_at is null or o.verified_at>t or o.expires_at is null or o.expires_at<p_end or o.expires_at>o.verified_at+interval '30 days' or o.currency<>'USD' or o.price_cents is null or o.price_cents<=0 or not dealwovo_private.linked_offer_source_active(o.id) then raise exception 'Current priced eligible offer required' using errcode='23514';end if;
 select * into p from public.catalog_products where id=o.product_id for share;
 select * into m from public.catalog_merchants where id=o.merchant_id for share;
 if p.status is distinct from 'published' or m.status is distinct from 'approved' or not exists(select 1 from public.catalog_categories where id=p.category_id and status='published') then raise exception 'Published dependencies required' using errcode='23514';end if;
 insert into public.catalog_daily_deals(feature_day,offer_id,offer_version,product_version,merchant_version,starts_at,ends_at,evidence_note,reviewed_by) values(p_day,o.id,o.updated_at,p.updated_at,m.updated_at,p_start,p_end,btrim(p_note),auth.uid()) returning id into rid;
 return rid;
end;$$;
create function dealwovo_private.revoke_daily_deal(p_id uuid) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 update public.catalog_daily_deals set revoked_at=now(),revoked_by=auth.uid() where id=p_id and revoked_at is null;return found;
end;$$;
create function public.create_daily_deal(p_offer uuid,p_day date,p_start timestamptz,p_end timestamptz,p_note text) returns uuid language sql security invoker set search_path='' as $$select dealwovo_private.create_daily_deal(p_offer,p_day,p_start,p_end,p_note)$$;
create function public.revoke_daily_deal(p_id uuid) returns boolean language sql security invoker set search_path='' as $$select dealwovo_private.revoke_daily_deal(p_id)$$;
revoke all on function dealwovo_private.create_daily_deal(uuid,date,timestamptz,timestamptz,text),dealwovo_private.revoke_daily_deal(uuid),public.create_daily_deal(uuid,date,timestamptz,timestamptz,text),public.revoke_daily_deal(uuid) from public,anon,authenticated;
grant execute on function dealwovo_private.create_daily_deal(uuid,date,timestamptz,timestamptz,text),dealwovo_private.revoke_daily_deal(uuid),public.create_daily_deal(uuid,date,timestamptz,timestamptz,text),public.revoke_daily_deal(uuid) to authenticated;
-- Narrow atomic public projection: explicit conditions, no evidence or internal account data.
create function dealwovo_private.current_daily_deal() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('day',d.feature_day,'validUntil',least(d.ends_at,o.expires_at,(d.feature_day+1)::timestamp at time zone 'UTC'),'offer',jsonb_build_object('id',o.id,'price_cents',o.price_cents,'currency',o.currency,'verified_at',o.verified_at,'expires_at',o.expires_at,'product',jsonb_build_object('id',p.id,'slug',p.slug,'title',p.title,'description',p.description,'image_url',p.image_url,'category',jsonb_build_object('slug',c.slug,'name',c.name)),'merchant',jsonb_build_object('name',m.name)))
 from public.catalog_daily_deals d join public.catalog_offers o on o.id=d.offer_id join public.catalog_products p on p.id=o.product_id join public.catalog_categories c on c.id=p.category_id join public.catalog_merchants m on m.id=o.merchant_id
 where d.feature_day=(now() at time zone 'UTC')::date and d.revoked_at is null and d.starts_at<=now() and d.ends_at>now()
 and o.status='approved' and o.verified_at<=now() and o.expires_at>now() and o.expires_at<=o.verified_at+interval '30 days' and o.currency='USD' and o.price_cents>0
 and d.offer_version=o.updated_at and d.product_version=p.updated_at and d.merchant_version=m.updated_at
 and p.status='published' and c.status='published' and m.status='approved' and dealwovo_private.linked_offer_source_active(o.id)
 limit 1
$$;
create function public.current_daily_deal() returns jsonb language sql stable security invoker set search_path='' as $$select dealwovo_private.current_daily_deal()$$;
revoke all on function dealwovo_private.current_daily_deal(),public.current_daily_deal() from public,anon,authenticated;
grant execute on function dealwovo_private.current_daily_deal(),public.current_daily_deal() to anon,authenticated;
notify pgrst,'reload schema';
