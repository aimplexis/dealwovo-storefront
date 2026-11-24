-- Owner attestations are not automated certification or production authorization.
create table public.release_gate_reviews (
 id bigint generated always as identity primary key,
 candidate_sha text not null check(candidate_sha ~ '^[0-9a-f]{40}$'),
 gate_key text not null check(gate_key in ('build','browser','accessibility','security','environment','legal','affiliate_rights','catalog','attribution','operations')),
 status text not null check(status in ('hold','reviewed')),
 evidence text not null check(length(btrim(evidence)) between 12 and 1200),
 reviewed_by uuid not null default auth.uid() references auth.users(id) on delete restrict,
 created_at timestamptz not null default now()
);
create index release_gate_reviews_candidate on public.release_gate_reviews(candidate_sha,gate_key,id desc);
create index release_gate_reviews_reviewer on public.release_gate_reviews(reviewed_by);
alter table public.release_gate_reviews enable row level security;
revoke all on public.release_gate_reviews from public,anon,authenticated;
grant select on public.release_gate_reviews to authenticated;
grant insert(candidate_sha,gate_key,status,evidence) on public.release_gate_reviews to authenticated;
grant usage on sequence public.release_gate_reviews_id_seq to authenticated;
create policy "owner reads release reviews" on public.release_gate_reviews for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create policy "owner records release reviews" on public.release_gate_reviews for insert to authenticated with check(reviewed_by=auth.uid() and (select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function public.release_readiness_report(p_candidate text) returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_candidate is null or p_candidate !~ '^[0-9a-f]{40}$' then raise exception 'Invalid release candidate' using errcode='22023';end if;
 with latest as (
 select distinct on (gate_key) id,gate_key,status,evidence,created_at from public.release_gate_reviews where candidate_sha=p_candidate order by gate_key,id desc
 )
 select jsonb_build_object('candidate',p_candidate,'inspectedAt',now(),
 'reviews',coalesce((select jsonb_agg(to_jsonb(l) order by gate_key) from latest l),'[]'::jsonb),
 'reviewCount',(select count(*) from public.release_gate_reviews where candidate_sha=p_candidate),
 'catalog',jsonb_build_object('categories',(select count(*) from public.catalog_categories where status='published'),
 'merchants',(select count(*) from public.catalog_merchants where status='approved'),
 'products',(select count(*) from public.catalog_products where status='published'),
 'authorizedSources',(select count(*) from public.catalog_feed_sources where status='authorized'),
 'currentOffers',(select count(*) from public.catalog_offers o join public.catalog_products p on p.id=o.product_id join public.catalog_categories c on c.id=p.category_id join public.catalog_merchants m on m.id=o.merchant_id where o.status='approved' and o.verified_at<=now() and o.expires_at>now() and p.status='published' and c.status='published' and m.status='approved'),
 'recordedTransactions',(select count(*) from (select distinct source_id,transaction_ref from public.marketing_commission_entries) x)))
 into result;
 return result;
end;$$;
revoke all on function public.release_readiness_report(text) from public,anon,authenticated;
grant execute on function public.release_readiness_report(text) to authenticated;
notify pgrst,'reload schema';
