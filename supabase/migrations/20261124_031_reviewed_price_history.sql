-- Private observations of actual reviewed catalog prices; never scrape or infer discounts.
create table dealwovo_private.offer_price_observations(
 id bigint generated always as identity primary key,
 offer_id uuid not null,
 identity_key text not null,
 verified_at timestamptz not null,
 observed_at timestamptz not null default clock_timestamp(),
 price_cents bigint check(price_cents is null or price_cents>=0),
 currency text not null,
 unique(offer_id,verified_at,identity_key)
);
alter table dealwovo_private.offer_price_observations enable row level security;
revoke all on dealwovo_private.offer_price_observations from public,anon,authenticated;
create index price_observation_latest on dealwovo_private.offer_price_observations(offer_id,verified_at desc,id desc);
create function dealwovo_private.price_identity(p public.catalog_products,m public.catalog_merchants,o public.catalog_offers) returns text
language sql stable set search_path='' as $$
 select encode(sha256(convert_to(jsonb_build_array(p.id,p.slug,p.title,p.description,p.image_url,p.category_id,m.id,m.name,m.website_url,o.affiliate_url,o.currency)::text,'UTF8')),'hex')
$$;
revoke all on function dealwovo_private.price_identity(public.catalog_products,public.catalog_merchants,public.catalog_offers) from public,anon,authenticated;
create function dealwovo_private.record_reviewed_price() returns trigger language plpgsql security definer set search_path='' as $$
declare p public.catalog_products%rowtype;m public.catalog_merchants%rowtype;k text;
begin
 if new.status<>'approved' or new.verified_at is null or new.verified_at>clock_timestamp() or new.expires_at is null or new.expires_at<=clock_timestamp() or new.expires_at>new.verified_at+interval '30 days' or not dealwovo_private.linked_offer_source_active(new.id) then return new;end if;
 select * into p from public.catalog_products where id=new.product_id;
 select * into m from public.catalog_merchants where id=new.merchant_id;
 if p.status is distinct from 'published' or m.status is distinct from 'approved' or not exists(select 1 from public.catalog_categories where id=p.category_id and status='published') then return new;end if;
 k:=dealwovo_private.price_identity(p,m,new);
 insert into dealwovo_private.offer_price_observations(offer_id,identity_key,verified_at,price_cents,currency) values(new.id,k,new.verified_at,new.price_cents,new.currency) on conflict do nothing;
 return new;
end;$$;
revoke all on function dealwovo_private.record_reviewed_price() from public,anon,authenticated;
create trigger record_reviewed_price after insert or update on public.catalog_offers for each row execute function dealwovo_private.record_reviewed_price();
-- Seed only existing eligible approvals, not fabricated past observations.
insert into dealwovo_private.offer_price_observations(offer_id,identity_key,verified_at,price_cents,currency)
select o.id,dealwovo_private.price_identity(p,m,o),o.verified_at,o.price_cents,o.currency
from public.catalog_offers o join public.catalog_products p on p.id=o.product_id join public.catalog_categories c on c.id=p.category_id join public.catalog_merchants m on m.id=o.merchant_id
where o.status='approved' and o.verified_at<=now() and o.expires_at>now() and o.expires_at<=o.verified_at+interval '30 days' and p.status='published' and c.status='published' and m.status='approved' and dealwovo_private.linked_offer_source_active(o.id)
on conflict do nothing;
-- The current and immediately previous distinct verification must match identity and currency.
-- An unknown previous price, same-time conflict, or identity change suppresses the comparison.
create function dealwovo_private.reviewed_price_changes(p_ids uuid[]) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if p_ids is null or cardinality(p_ids)>120 or array_position(p_ids,null) is not null then raise exception 'Invalid offer IDs' using errcode='22023';end if;
 return coalesce((
 select jsonb_agg(jsonb_build_object('offerId',o.id,'currentCents',o.price_cents,'currentVerifiedAt',o.verified_at,'previousCents',prev.price_cents,'previousVerifiedAt',prev.verified_at))
 from public.catalog_offers o join public.catalog_products p on p.id=o.product_id join public.catalog_categories c on c.id=p.category_id join public.catalog_merchants m on m.id=o.merchant_id
 join lateral (select h.* from dealwovo_private.offer_price_observations h where h.offer_id=o.id order by h.verified_at desc,h.id desc limit 1) cur on true
 join lateral (select h.* from dealwovo_private.offer_price_observations h where h.offer_id=o.id and h.verified_at<cur.verified_at order by h.verified_at desc,h.id desc limit 1) prev on true
 where o.id=any(p_ids) and o.status='approved' and o.verified_at<=now() and o.expires_at>now() and o.expires_at<=o.verified_at+interval '30 days'
 and p.status='published' and c.status='published' and m.status='approved' and dealwovo_private.linked_offer_source_active(o.id)
 and o.currency='USD' and o.price_cents>0 and cur.price_cents=o.price_cents and cur.currency=o.currency and cur.verified_at=o.verified_at
 and cur.identity_key=dealwovo_private.price_identity(p,m,o) and prev.identity_key=cur.identity_key and prev.currency='USD' and prev.price_cents>0 and prev.verified_at>=now()-interval '90 days'
 and not exists(select 1 from dealwovo_private.offer_price_observations h where h.offer_id=o.id and h.verified_at in (cur.verified_at,prev.verified_at) and h.id not in(cur.id,prev.id))
 ),'[]'::jsonb);
end;$$;
create function public.reviewed_price_changes(p_ids uuid[]) returns jsonb language sql stable security invoker set search_path='' as $$select dealwovo_private.reviewed_price_changes(p_ids)$$;
revoke all on function dealwovo_private.reviewed_price_changes(uuid[]),public.reviewed_price_changes(uuid[]) from public,anon,authenticated;
grant execute on function dealwovo_private.reviewed_price_changes(uuid[]),public.reviewed_price_changes(uuid[]) to anon,authenticated;
notify pgrst,'reload schema';
