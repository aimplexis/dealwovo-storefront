begin;
create table public.retail_supplier_reviews (
 id uuid primary key default gen_random_uuid(),
 supplier_id uuid not null references public.retail_suppliers(id),
 decision text not null check(decision in ('qualified','hold','rejected')),
 identity_ref text not null check(char_length(btrim(identity_ref)) between 3 and 500),
 rights_ref text not null check(char_length(btrim(rights_ref)) between 3 and 500),
 fulfillment_ref text not null check(char_length(btrim(fulfillment_ref)) between 3 and 500),
 returns_ref text not null check(char_length(btrim(returns_ref)) between 3 and 500),
 terms_ref text not null check(char_length(btrim(terms_ref)) between 3 and 500),
 safety_ref text not null check(char_length(btrim(safety_ref)) between 3 and 500),
 asset_light_confirmed boolean not null,
 reviewed_at timestamptz not null default now(),
 reviewed_by uuid not null default auth.uid(),
 check(decision <> 'qualified' or asset_light_confirmed)
);
create index retail_supplier_review_latest on public.retail_supplier_reviews(supplier_id,reviewed_at desc,id desc);
alter table public.retail_supplier_reviews enable row level security;
revoke all on public.retail_supplier_reviews from public,anon,authenticated;
grant select on public.retail_supplier_reviews to authenticated;
grant insert(supplier_id,decision,identity_ref,rights_ref,fulfillment_ref,returns_ref,terms_ref,safety_ref,asset_light_confirmed) on public.retail_supplier_reviews to authenticated;
create policy supplier_review_owner_read on public.retail_supplier_reviews for select to authenticated using(exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
create policy supplier_review_owner_insert on public.retail_supplier_reviews for insert to authenticated with check(reviewed_by=(select auth.uid()) and exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
commit;