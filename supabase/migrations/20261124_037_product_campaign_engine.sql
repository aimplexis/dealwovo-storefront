-- Product-bound campaign packs. Internal preparation only; no external delivery or model calls.
create view dealwovo_private.campaign_eligible_offers as
select distinct on(o.id) o.id as offer_id,p.id as product_id,s.id as source_id,p.slug,p.title,c.name as department,m.name as merchant,s.name as source_name,o.verified_at,o.expires_at,
jsonb_build_array(o.updated_at,p.updated_at,c.updated_at,m.updated_at,s.updated_at,fc.id,fb.id,s.id,o.verified_at,o.expires_at) as version_key
from public.catalog_offers o join public.catalog_products p on p.id=o.product_id join public.catalog_categories c on c.id=p.category_id join public.catalog_merchants m on m.id=o.merchant_id
join public.catalog_feed_candidates fc on fc.converted_offer_id=o.id and fc.converted_product_id=p.id and fc.status='converted'
join public.catalog_feed_batches fb on fb.id=fc.batch_id join public.catalog_feed_sources s on s.id=fb.source_id
where o.status='approved' and o.verified_at<=now() and o.expires_at>now() and o.expires_at<=o.verified_at+interval '30 days'
and p.status='published' and c.status='published' and m.status='approved' and s.status='authorized' and s.authorized_at is not null and s.authorized_by is not null
and dealwovo_private.linked_offer_source_active(o.id) and dealwovo_private.safe_feed_url(o.affiliate_url)
and p.slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(p.slug)<=150
order by o.id,s.id,fc.id;
revoke all on dealwovo_private.campaign_eligible_offers from public,anon,authenticated,service_role;
create table public.product_campaign_packs(
 id uuid primary key default gen_random_uuid(),
 week_of date not null,
 offer_id uuid not null,
 product_id uuid not null,
 source_id uuid not null,
 product_slug text not null,
 product_title text not null,
 department text not null,
 merchant text not null,
 source_name text not null,
 verified_at timestamptz not null,
 expires_at timestamptz not null,
 version_key jsonb not null,
 template_version integer not null default 1 check(template_version=1),
 assets jsonb not null check(jsonb_typeof(assets)='object' and octet_length(assets::text)<=24000),
 status text not null default 'draft' check(status in ('draft','reviewed','archived')),
 created_at timestamptz not null default now(),
 unique(week_of,product_id)
);
create index product_campaign_created on public.product_campaign_packs(created_at desc,id);
create index product_campaign_offer on public.product_campaign_packs(offer_id);
create table public.product_campaign_reviews(
 id bigint generated always as identity primary key,
 pack_id uuid not null references public.product_campaign_packs(id) on delete restrict,
 status text not null check(status in ('reviewed','archived')),
 note text not null check(length(btrim(note)) between 25 and 1200),
 reviewer uuid not null references auth.users(id),
 created_at timestamptz not null default now()
);
create index product_campaign_review_pack on public.product_campaign_reviews(pack_id,created_at desc,id desc);
create index product_campaign_reviewer on public.product_campaign_reviews(reviewer);
alter table public.product_campaign_packs enable row level security;
alter table public.product_campaign_reviews enable row level security;
revoke all on public.product_campaign_packs,public.product_campaign_reviews from public,anon,authenticated;
grant select on public.product_campaign_packs,public.product_campaign_reviews to authenticated;
create policy "owner reads product campaign packs" on public.product_campaign_packs for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "owner reads campaign pack reviews" on public.product_campaign_reviews for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
-- Immutable copy snapshot: one product link, no copied descriptions, raw affiliate URL, price, discount, ratings or availability claims.
create function dealwovo_private.product_campaign_assets(p_title text,p_slug text,p_department text) returns jsonb language plpgsql immutable set search_path='' as $$
declare title text:=left(regexp_replace(p_title,'[[:cntrl:]]',' ','g'),180);url text:='https://dealwovo.com/product/'||p_slug;disclosure text:='Dealwovo may earn a commission from qualifying retailer purchases.';guide text:='Compare the exact model, features, seller, final price, delivery and return terms before buying.';
begin
 return jsonb_build_object(
 'seo',jsonb_build_object('title',left(title||' shopping guide',80),'description',left('Explore '||title||'. Review the exact product details and retailer terms before choosing.',160),'brief','Research the specific use case, model, materials or compatibility, documented limitations, and alternatives. Add original useful analysis and cited sources before publishing; no invented testing or rankings. Link to '||url||'. '||disclosure),
 'instagram',jsonb_build_object('caption',disclosure||E'\nA little shopping inspiration: '||title||'. '||guide||E'\nExplore the details: '||url,'visual','Use only product-specific imagery with documented rights; show the exact model. Add visible affiliate disclosure. No price or discount overlays.'),
 'facebook',jsonb_build_object('caption',disclosure||E'\nLooking into '||title||'? '||guide||' Find the product page at '||url,'visual','Use an approved product image or original neutral graphic. No fabricated testimonials.'),
 'pinterest',jsonb_build_object('title',left(title,100),'description',disclosure||' Explore this shopping idea and check the product details before buying.','destination',url,'visual','Create an original vertical pin. Show only approved product imagery and visible disclosure; no unverified savings.'),
 'tiktok',jsonb_build_object('script',E'0–3s: Display affiliate disclosure. Introduce the product: '||title||E'.\n3–12s: Show licensed product imagery, name the exact model if confirmed; do not pretend to demonstrate use.\n12–20s: '||guide||E'\n20–25s: Explore the product details on Dealwovo.','caption',disclosure||' Product details: '||url),
 'youtube',jsonb_build_object('title',left('Shopping checklist: '||title,100),'script','Open with spoken and visible affiliate disclosure. Introduce '||title||'. Explain what shoppers should check without claiming personal testing. '||guide||' Direct viewers to the product page.','description',disclosure||' '||url),
 'newsletter',jsonb_build_object('subject',left('A thoughtful shopping find: '||title,120),'body',disclosure||E'\nExplore '||title||'. '||guide||E'\nProduct details: '||url||E'\n[Verified sender, postal address and functional unsubscribe required before sending.]'),
 'creative',jsonb_build_object('theme',p_department,'brief','One exact product; neutral editorial design. Produce square, vertical and portrait versions using original or documented licensed imagery. Do not imply first-hand use. Check text contrast, legibility and visible disclosures.'));
end;$$;
revoke all on function dealwovo_private.product_campaign_assets(text,text,text) from public,anon,authenticated;
-- Shared bounded weekly pool, atomic selection and duplicate prevention. Daily internal drafting can fill gaps after new products arrive.
create function dealwovo_private.prepare_product_campaigns(p_offer uuid default null) returns integer language plpgsql security definer set search_path='' as $$
declare w date:=date_trunc('week',now() at time zone 'UTC')::date;n integer;remaining integer;
begin
 perform pg_advisory_xact_lock(hashtextextended('dealwovo-product-campaign-packs',0));
 select greatest(0,10-count(*)::integer) into remaining from public.product_campaign_packs where week_of=w;
 if remaining=0 then return 0;end if;
 insert into public.product_campaign_packs(week_of,offer_id,product_id,source_id,product_slug,product_title,department,merchant,source_name,verified_at,expires_at,version_key,assets)
 select w,e.offer_id,e.product_id,e.source_id,e.slug,e.title,e.department,e.merchant,e.source_name,e.verified_at,e.expires_at,e.version_key,dealwovo_private.product_campaign_assets(e.title,e.slug,e.department)
 from (select distinct on(v.product_id) v.* from dealwovo_private.campaign_eligible_offers v
 where (p_offer is null or v.offer_id=p_offer) and not exists(select 1 from public.product_campaign_packs p where p.week_of=w and p.product_id=v.product_id)
 order by v.product_id,v.verified_at desc,v.offer_id) e
 order by e.verified_at desc,e.offer_id limit least(remaining,case when p_offer is null then 5 else 1 end)
 on conflict(week_of,product_id) do nothing;
 get diagnostics n=row_count;return n;
end;$$;
revoke all on function dealwovo_private.prepare_product_campaigns(uuid) from public,anon,authenticated,service_role;
create function dealwovo_private.owner_prepare_product_campaigns(p_offer uuid default null) returns integer language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 return dealwovo_private.prepare_product_campaigns(p_offer);
end;$$;
create function public.prepare_product_campaigns(p_offer uuid default null) returns integer language sql security invoker set search_path='' as $$select dealwovo_private.owner_prepare_product_campaigns(p_offer)$$;
create function dealwovo_private.review_product_campaign(p_id uuid,p_status text,p_note text) returns boolean language plpgsql security definer set search_path='' as $$
declare pack public.product_campaign_packs%rowtype;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_status is null or p_status not in ('reviewed','archived') or p_note is null or length(btrim(p_note)) not between 25 and 1200 then raise exception 'Invalid review' using errcode='22023';end if;
 select * into pack from public.product_campaign_packs where id=p_id for update;
 if not found or pack.status='archived' or (p_status='reviewed' and pack.status<>'draft') then return false;end if;
 if p_status='reviewed' and not exists(select 1 from dealwovo_private.campaign_eligible_offers v where v.offer_id=pack.offer_id and v.product_id=pack.product_id and v.source_id=pack.source_id and v.version_key=pack.version_key) then return false;end if;
 update public.product_campaign_packs set status=p_status where id=pack.id;
 insert into public.product_campaign_reviews(pack_id,status,note,reviewer) values(pack.id,p_status,btrim(p_note),auth.uid());
 return true;
end;$$;
create function public.review_product_campaign(p_id uuid,p_status text,p_note text) returns boolean language sql security invoker set search_path='' as $$select dealwovo_private.review_product_campaign(p_id,p_status,p_note)$$;
create function dealwovo_private.product_campaign_report() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 return jsonb_build_object('eligibleOffers',(select count(*) from dealwovo_private.campaign_eligible_offers),
 'weekCount',(select count(*) from public.product_campaign_packs where week_of=date_trunc('week',now() at time zone 'UTC')::date),
 'candidates',coalesce((select jsonb_agg(to_jsonb(q)) from (select offer_id,title,merchant,source_name from dealwovo_private.campaign_eligible_offers order by verified_at desc,offer_id limit 50) q),'[]'::jsonb),
 'packs',coalesce((select jsonb_agg(to_jsonb(q)) from (select p.id,p.week_of,p.product_title,p.product_slug,p.department,p.merchant,p.source_name,p.verified_at,p.expires_at,p.status,p.assets,p.created_at,
 exists(select 1 from dealwovo_private.campaign_eligible_offers v where v.offer_id=p.offer_id and v.product_id=p.product_id and v.source_id=p.source_id and v.version_key=p.version_key) as current,
 (select jsonb_build_object('status',r.status,'note',r.note,'created_at',r.created_at) from public.product_campaign_reviews r where r.pack_id=p.id order by r.created_at desc,r.id desc limit 1) as review
 from public.product_campaign_packs p order by p.created_at desc,p.id limit 30) q),'[]'::jsonb),
 'scheduler',exists(select 1 from cron.job where jobname='dealwovo-product-campaign-drafts' and active));
end;$$;
create function public.product_campaign_report() returns jsonb language sql stable security invoker set search_path='' as $$select dealwovo_private.product_campaign_report()$$;
revoke all on function dealwovo_private.owner_prepare_product_campaigns(uuid),public.prepare_product_campaigns(uuid),dealwovo_private.review_product_campaign(uuid,text,text),public.review_product_campaign(uuid,text,text),dealwovo_private.product_campaign_report(),public.product_campaign_report() from public,anon,authenticated;
grant execute on function dealwovo_private.owner_prepare_product_campaigns(uuid),public.prepare_product_campaigns(uuid),dealwovo_private.review_product_campaign(uuid,text,text),public.review_product_campaign(uuid,text,text),dealwovo_private.product_campaign_report(),public.product_campaign_report() to authenticated;
select cron.schedule('dealwovo-product-campaign-drafts','40 14 * * *','select dealwovo_private.prepare_product_campaigns(null);');
notify pgrst,'reload schema';
