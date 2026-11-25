-- Discovery evidence: application users may append, never alter history.
create table public.discovery_evidence (
 id uuid primary key default gen_random_uuid(),
 candidate_id uuid not null references public.catalog_feed_candidates(id) on delete restrict,
 dimension text not null check (dimension in ('usefulness','quality','relevance','value','distinctiveness','retailer','year_round')),
 rating integer not null check (rating between 0 and 100),
 source_url text not null check (length(source_url) between 9 and 2000 and source_url ~ '^https://[^/@[:space:]]+([/?#][^[:space:]]*)?$'),
 observed_on date not null,
 note text not null check (length(btrim(note)) >= 20 and length(note) <= 1200),
 reviewer_id uuid not null default auth.uid(),
 recorded_at timestamptz not null default clock_timestamp(),
 check (observed_on <= (recorded_at at time zone 'UTC')::date and observed_on >= (recorded_at at time zone 'UTC')::date - 30)
);
create index discovery_evidence_candidate_history on public.discovery_evidence(candidate_id,dimension,recorded_at desc,id desc);
alter table public.discovery_evidence enable row level security;
revoke all on public.discovery_evidence from public,anon,authenticated,service_role;
grant select on public.discovery_evidence to authenticated;
grant insert(candidate_id,dimension,rating,source_url,observed_on,note) on public.discovery_evidence to authenticated;
create policy discovery_evidence_staff_read on public.discovery_evidence for select to authenticated
using ((select dealwovo_private.is_catalog_admin()));
create policy discovery_evidence_staff_append on public.discovery_evidence for insert to authenticated
with check ((select dealwovo_private.is_catalog_admin()) and reviewer_id=(select auth.uid()) and exists (
 select 1 from public.catalog_feed_candidates c
 join public.catalog_feed_batches b on b.id=c.batch_id
 join public.catalog_feed_sources s on s.id=b.source_id
 where c.id=candidate_id and c.status='staged' and s.status='authorized'
));
comment on table public.discovery_evidence is 'Private human-reviewed research history; not product approval. Latest observation per dimension is evaluated at read time.';
