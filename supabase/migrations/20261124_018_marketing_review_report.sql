-- Read-only marketing review snapshot, with exact counts and bounded audit history.
create function public.marketing_review_report(p_page integer default 1,p_filter text default 'draft')
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if p_page is null or p_page<1 or p_page>1000000 or p_filter is null or p_filter not in ('all','draft','reviewed','archived') then raise exception 'Invalid report page or filter' using errcode='22023';end if;
 with filtered as (
 select d.* from public.marketing_campaign_drafts d where p_filter='all' or d.status=p_filter
 ), bounds as (
 select count(*) as matching,least(p_page::bigint,greatest(1,(count(*)+24)/25)) as page from filtered
 ), page_rows as (
 select * from filtered order by created_at desc,id limit 25 offset ((select page from bounds)-1)*25
 ), with_history as (
 select d.id,d.channel,d.agent,d.campaign_name,d.focus,d.hook,d.body,d.cta,d.supporting_evidence,d.compliance_note,d.status,d.suggested_day,d.created_at,d.reviewed_at,
 coalesce((select jsonb_agg(jsonb_build_object('previous_status',e.previous_status,'new_status',e.new_status,'created_at',e.created_at) order by e.created_at,e.id) from public.marketing_review_events e where e.draft_id=d.id),'[]'::jsonb) as history
 from page_rows d
 )
 select jsonb_build_object(
 'totalRuns',(select count(*) from public.marketing_agent_runs),
 'latestRun',(select jsonb_build_object('created_at',r.created_at,'source',r.source,'summary',r.summary,'verified_offer_count',r.verified_offer_count) from public.marketing_agent_runs r order by r.created_at desc,r.id limit 1),
 'totals',jsonb_build_object('all',count(*),'draft',count(*) filter(where status='draft'),'reviewed',count(*) filter(where status='reviewed'),'archived',count(*) filter(where status='archived')),
 'matching',(select matching from bounds),'page',(select page from bounds),'pageSize',25,
 'items',coalesce((select jsonb_agg(to_jsonb(w) order by w.created_at desc,w.id) from with_history w),'[]'::jsonb))
 into result from public.marketing_campaign_drafts;
 return result;
end;$$;
revoke all on function public.marketing_review_report(integer,text) from public,anon,authenticated;
grant execute on function public.marketing_review_report(integer,text) to authenticated;
notify pgrst,'reload schema';
