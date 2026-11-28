-- Disposable PostgreSQL only.
begin;
insert into public.retail_stripe_test_orders(id,total_cents,created_at)
values ('00000000-0000-4000-8000-000000000081',2500,now()-interval '1 hour');
set local role dealwovo_stripe_test_writer;
do $$
declare a uuid:='00000000-0000-4000-8000-000000000081'; t timestamptz:=now()-interval '1 minute';
begin
 if not exists(select 1 from public.retail_stripe_test_orders where id=a and total_cents=2500) then raise exception 'Writer read failed'; end if;
 if not public.bind_stripe_test_session(a,'cs_test_writer',2500) then raise exception 'Writer bind failed'; end if;
 if public.record_stripe_test_payment(a,'cs_test_writer','evt_writer','pi_writer',2500,'USD',t)<>'recorded' then raise exception 'Writer payment failed'; end if;
 if public.record_stripe_test_payment(a,'cs_test_writer','evt_writer','pi_writer',2500,'USD',t)<>'duplicate' then raise exception 'Writer replay failed'; end if;
 if (select count(*) from public.retail_stripe_test_events where order_id=a)<>1 then raise exception 'Writer event history mismatch'; end if;
 begin update public.retail_stripe_test_orders set total_cents=50 where id=a; raise exception 'TEST FAILURE: amount update'; exception when insufficient_privilege then null; end;
 begin insert into public.retail_stripe_test_orders(total_cents) values(50); raise exception 'TEST FAILURE: order creation'; exception when insufficient_privilege then null; end;
 begin delete from public.retail_stripe_test_orders where id=a; raise exception 'TEST FAILURE: order deletion'; exception when insufficient_privilege then null; end;
 begin delete from public.retail_stripe_test_events where order_id=a; raise exception 'TEST FAILURE: event deletion'; exception when insufficient_privilege then null; end;
 begin update public.retail_stripe_test_events set amount_cents=50 where order_id=a; raise exception 'TEST FAILURE: event update'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.retail_orders; raise exception 'TEST FAILURE: commercial order access'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.retail_order_events; raise exception 'TEST FAILURE: commercial event access'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.retail_supplier_products; raise exception 'TEST FAILURE: supplier access'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.catalog_admins; raise exception 'TEST FAILURE: administrator access'; exception when insufficient_privilege then null; end;
 begin perform public.record_retail_order_event(a,0,'payment_verified','test-payment',t,2500,'USD'); raise exception 'TEST FAILURE: commercial RPC'; exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
 if exists(select 1 from pg_roles where rolname='dealwovo_stripe_test_writer' and (rolsuper or rolbypassrls or rolcanlogin or rolinherit or rolcreaterole or rolcreatedb)) then raise exception 'Writer role too privileged'; end if;
 if pg_has_role('authenticated','dealwovo_stripe_test_writer','MEMBER') or pg_has_role('anon','dealwovo_stripe_test_writer','MEMBER') then raise exception 'Client role inherits writer'; end if;
 if not pg_has_role('authenticator','dealwovo_stripe_test_writer','MEMBER') then raise exception 'Gateway role missing membership'; end if;
end $$;
rollback;
select 'PASS Stripe writer authorization and isolation' as result;
