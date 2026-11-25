-- Owner-only commercial readiness report. No automatic release authority.
create function dealwovo_private.revenue_launch_metrics() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 with eligible as (
 select o.id,o.product_id from public.catalog_offers o join public.catalog_products p on p.id=o.product_id join public.catalog_categories c on c.id=p.category_id join public.catalog_merchants m on m.id=o.merchant_id
 where o.status='approved' and o.verified_at<=now() and o.expires_at>now() and o.expires_at<=o.verified_at+interval '30 days'
 and p.status='published' and c.status='published' and m.status='approved' and dealwovo_private.linked_offer_source_active(o.id)
 ),latest as (
 select distinct on(source_id,transaction_ref) status,commission_cents,currency from public.marketing_commission_entries order by source_id,transaction_ref,revision desc
 )
 select jsonb_build_object('inspectedAt',now(),
 'categories',(select count(*) from public.catalog_categories where status='published'),
 'draftCategories',(select count(*) from public.catalog_categories where status='draft'),
 'merchants',(select count(*) from public.catalog_merchants where status='approved'),
 'authorizedSources',(select count(*) from public.catalog_feed_sources where status='authorized'),
 'awinSources',(select count(*) from public.catalog_feed_sources where status='authorized' and provider='awin'),
 'amazonSources',(select count(*) from public.catalog_feed_sources where status='authorized' and provider='amazon'),
 'draftProducts',(select count(*) from public.catalog_products where status='draft'),
 'eligibleProducts',(select count(distinct product_id) from eligible),
 'eligibleOffers',(select count(*) from eligible),
 'amazonReviewed',(select count(*) from public.catalog_amazon_links a join public.catalog_feed_sources s on s.id=a.source_id where a.status='reviewed' and a.reviewed_at<=now() and a.expires_at>now() and s.status='authorized' and s.provider='amazon' and a.tracking_id=s.amazon_tracking_id),
 'reviewedCampaigns',(select count(*) from public.marketing_campaign_drafts where status='reviewed'),
 'reviewedNewsletterIssues',(select count(*) from public.newsletter_issues where status='reviewed'),
 'transactions',(select count(*) from latest),
 'positiveApprovedTransactions',(select count(*) from latest where status in ('approved','paid') and commission_cents>0 and currency='USD'),
 'networkPaidTransactions',(select count(*) from latest where status='paid' and commission_cents>0 and currency='USD'),
 'approvedCents',(select coalesce(sum(commission_cents),0)::text from latest where status='approved' and currency='USD'),
 'paidCents',(select coalesce(sum(commission_cents),0)::text from latest where status='paid' and currency='USD'))
 into result;return result;
end;$$;
create function public.revenue_launch_metrics() returns jsonb language sql stable security invoker set search_path='' as $$select dealwovo_private.revenue_launch_metrics()$$;
revoke all on function dealwovo_private.revenue_launch_metrics(),public.revenue_launch_metrics() from public,anon,authenticated;
grant execute on function dealwovo_private.revenue_launch_metrics(),public.revenue_launch_metrics() to authenticated;
notify pgrst,'reload schema';
