-- Run only against the disposable supplier acceptance database.
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
insert into public.retail_suppliers(legal_name,kind,website,country,contact_email,method,categories)
values ('Fixture Supplier','wholesaler','https://example.com','US','test@example.com','csv','Home');
insert into public.retail_supplier_products(supplier_id,sku,title,category_hint,wholesale_cents,retail_cents,shipping_cents,reported_quantity,source_reference,observed_at)
select id,'FIX-1','Fixture product','Home',1000,2500,300,10,'original evidence',now()-interval '2 hours' from public.retail_suppliers;
insert into public.retail_supplier_observations(product_id,observed_at,wholesale_cents,shipping_cents,reported_quantity,source_reference)
select id,now()-interval '20 minutes',1200,400,0,'latest evidence' from public.retail_supplier_products;
insert into public.retail_supplier_observations(product_id,observed_at,wholesale_cents,shipping_cents,reported_quantity,source_reference)
select id,now()-interval '40 minutes',1100,350,5,'earlier evidence' from public.retail_supplier_products;
do $$
begin
 if not exists(select 1 from public.retail_supplier_current_products where sku='FIX-1' and wholesale_cents=1200 and retail_cents=2500 and shipping_cents=400 and reported_quantity=0) then raise exception 'Latest evidence or retail integrity failed'; end if;
 if (select count(*) from public.retail_supplier_observations)<>2 then raise exception 'History not preserved'; end if;
 if not exists(select 1 from public.retail_supplier_products where wholesale_cents=1000 and reported_quantity=10) then raise exception 'Original record changed'; end if;
 begin
  insert into public.retail_supplier_observations(product_id,observed_at,wholesale_cents,source_reference) select id,now()-interval '20 minutes',999,'conflict evidence' from public.retail_supplier_products;
  raise exception 'Duplicate observation accepted';
 exception when unique_violation then null; end;
 begin
  insert into public.retail_supplier_observations(product_id,observed_at,wholesale_cents,source_reference) select id,now()+interval '1 hour',999,'future evidence' from public.retail_supplier_products;
  raise exception 'Future observation accepted';
 exception when check_violation then null; end;
 begin
  insert into public.retail_supplier_observations(product_id,observed_at,wholesale_cents,source_reference) select id,now()-interval '25 hours',999,'stale evidence' from public.retail_supplier_products;
  raise exception 'Stale observation accepted';
 exception when check_violation or insufficient_privilege then null; end;
 begin
  update public.retail_supplier_observations set wholesale_cents=999;
  raise exception 'History update permitted';
 exception when insufficient_privilege then null; end;
end $$;
insert into public.retail_supplier_observations(product_id,observed_at,wholesale_cents,shipping_cents,reported_quantity,source_reference)
select id,now()-interval '1 minute',1300,null,null,'unknown evidence' from public.retail_supplier_products;
do $$ begin
 if not exists(select 1 from public.retail_supplier_current_products where wholesale_cents=1300 and retail_cents=2500 and shipping_cents is null and reported_quantity is null) then raise exception 'Unknown data incorrectly backfilled'; end if;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.retail_supplier_current_products) or exists(select 1 from public.retail_supplier_observations) then raise exception 'Non-owner can read supplier data'; end if;
 begin
  insert into public.retail_supplier_observations(product_id,observed_at,wholesale_cents,source_reference) values('00000000-0000-4000-8000-000000000099',now(),100,'editor attempt');
  raise exception 'Non-owner append permitted';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.retail_supplier_current_products; raise exception 'Anonymous view accessible'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.retail_supplier_observations; raise exception 'Anonymous history accessible'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS supplier observation acceptance' as result;
