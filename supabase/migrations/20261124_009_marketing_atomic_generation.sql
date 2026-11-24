-- Atomic manual marketing generation. Internal drafts only; no scheduling or external publication.
create function dealwovo_private.generate_marketing_drafts_atomic()
returns integer language plpgsql security definer set search_path='' as $$
declare
 v_run_id uuid;
 v_owner uuid := auth.uid();
 v_week date:=(now() at time zone 'UTC')::date;
 v_offers integer;
 v_products integer;
 v_sources integer;
begin
 if v_owner is null or not exists(select 1 from public.catalog_admins a where a.user_id=v_owner and a.role='owner') then
   raise exception 'owner required' using errcode='42501';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('dealwovo-marketing:' || v_owner::text,0));
 if exists(select 1 from public.marketing_agent_runs where initiated_by=v_owner and source='manual' and created_at > clock_timestamp()-interval '30 minutes') then
   return 0;
 end if;
 select count(*)::int into v_offers from public.catalog_offers o
 join public.catalog_products p on p.id=o.product_id
 join public.catalog_categories c on c.id=p.category_id
 join public.catalog_merchants m on m.id=o.merchant_id
 where o.status='approved' and o.verified_at<=now() and o.expires_at>now()
 and p.status='published' and c.status='published' and m.status='approved';
 select count(*)::int into v_products from public.catalog_products;
 select count(*)::int into v_sources from public.catalog_feed_sources where status='authorized';
 insert into public.marketing_agent_runs (initiated_by,source,focus,verified_offer_count,product_count,feed_source_count,draft_count,summary)
 values(v_owner,'manual','brand',v_offers,v_products,v_sources,4,
    case when v_offers=0 then 'Prelaunch: plan editorial content; do not promote unverified products.'
    else 'Verified offers exist: editorial drafts only; product-specific claims require separate evidence review.' end)
 returning id into v_run_id;
 insert into public.marketing_campaign_drafts(run_id,channel,agent,focus,campaign_name,hook,body,cta,supporting_evidence,compliance_note,suggested_day)
 values
 (v_run_id,'instagram','content_studio','brand','The Good Finds Club','Your next favorite discovery starts with a little curiosity.',
  'Meet Dealwovo: a place to explore thoughtful gifts, clever ideas and everyday inspiration. We are curating verified retailer finds before opening the catalog. Discover More. Save Smarter.',
  'Explore Dealwovo at dealwovo.com.',
  'Brand website and prelaunch catalog; no verified offers represented.',
  'Editorial promotion only. No claimed discounts, testimonials or products; no automatic publication.',v_week),
 (v_run_id,'facebook','campaign_strategist','gifts','Gifting Without Guesswork','Some gifts say more because they feel more thoughtful.',
  'Finding the right gift can start with knowing what matters to someone. Explore Dealwovo’s gift inspiration and discover creative ways to celebrate. Product listings will only appear after verification.',
  'Explore gift ideas on Dealwovo.',
  'Gift Finder editorial page exists; no verified product recommendation implied.',
  'No fake product recommendation or pricing claims; independent editorial inspiration.',v_week+2),
 (v_run_id,'pinterest','content_studio','living','Small Everyday Wonders','Little upgrades. A more inspired everyday.',
  'Collect ideas for home, daily rituals and thoughtful everyday moments with Dealwovo. Our curated retailer catalog is being prepared.',
  'Browse everyday inspiration.',
  'Everyday category exists; not a live product promotion.',
  'Use only licensed imagery; do not imply stock, discounts or retailer approval.',v_week+4),
 (v_run_id,'blog','seo_guardian','tech','Editorial Guide','How to explore clever everyday tech without the hype',
  'Draft outline: start with a real problem; prioritize compatibility, accessibility, warranty and seller trust; compare options only with source evidence; disclose affiliate relationships near links. Do not publish without editorial review.',
  'Read the editorial standards and explore tech inspiration.',
  'Tech editorial category exists; no source-backed trend ranking is connected.',
  'Research citations and original writing are required before publishing.',v_week+4);
 return 4;
end;$$;

revoke all on function dealwovo_private.generate_marketing_drafts_atomic() from public,anon,authenticated;
grant execute on function dealwovo_private.generate_marketing_drafts_atomic() to authenticated;
create function public.generate_marketing_drafts_atomic()
returns integer language sql security invoker set search_path='' as $$
 select dealwovo_private.generate_marketing_drafts_atomic();
$$;
revoke all on function public.generate_marketing_drafts_atomic() from public,anon,authenticated;
grant execute on function public.generate_marketing_drafts_atomic() to authenticated;
-- Direct inserts would bypass atomicity, evidence checks and cooldown.
revoke insert on public.marketing_agent_runs,public.marketing_campaign_drafts from public,anon,authenticated;
notify pgrst, 'reload schema';
