-- Disposable database only.
begin;
insert into public.retail_stripe_test_orders(id,total_cents,created_at) values
 ('00000000-0000-4000-8000-000000000001',2500,now()-interval '1 hour'),
 ('00000000-0000-4000-8000-000000000002',2500,now()-interval '1 hour');
do $$
declare a uuid:='00000000-0000-4000-8000-000000000001'; b uuid:='00000000-0000-4000-8000-000000000002'; t timestamptz:=now()-interval '1 minute';
begin
 begin perform public.bind_stripe_test_session(a,'cs_live_fixture',2500); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Invalid test session' then raise; end if; end;
 begin perform public.bind_stripe_test_session(a,'cs_test_a',2499); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Invalid test session' then raise; end if; end;
 if not public.bind_stripe_test_session(a,'cs_test_a',2500) then raise exception 'Bind failed'; end if;
 if not public.bind_stripe_test_session(a,'cs_test_a',2500) then raise exception 'Bind replay failed'; end if;
 begin perform public.bind_stripe_test_session(b,'cs_test_a',2500); raise exception 'TEST FAILURE'; exception when unique_violation then null; end;
 begin perform public.bind_stripe_test_session(a,'cs_test_other',2500); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Test session already bound' then raise; end if; end;
 perform public.bind_stripe_test_session(b,'cs_test_b',2500);
 begin perform public.record_stripe_test_payment(a,'cs_test_b','evt_wrong','pi_a',2500,'USD',t); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Invalid test payment evidence' then raise; end if; end;
 begin perform public.record_stripe_test_payment(a,'cs_test_a','evt_wrong','pi_a',2499,'USD',t); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Invalid test payment evidence' then raise; end if; end;
 begin perform public.record_stripe_test_payment(a,'cs_test_a','evt_wrong','pi_a',2500,'EUR',t); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Invalid test payment evidence' then raise; end if; end;
 begin perform public.record_stripe_test_payment(a,'cs_test_a','evt_wrong','pi_a',2500,'USD',now()+interval '1 minute'); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Invalid test payment evidence' then raise; end if; end;
 if public.record_stripe_test_payment(a,'cs_test_a','evt_a','pi_a',2500,'USD',t)<>'recorded' then raise exception 'First payment failed'; end if;
 if public.record_stripe_test_payment(a,'cs_test_a','evt_a','pi_a',2500,'USD',t)<>'duplicate' then raise exception 'Replay failed'; end if;
 if public.record_stripe_test_payment(a,'cs_test_a','evt_a2','pi_a',2500,'USD',t)<>'already_paid' then raise exception 'Equivalent event failed'; end if;
 begin perform public.record_stripe_test_payment(a,'cs_test_a','evt_a','pi_other',2500,'USD',t); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Conflicting test event' then raise; end if; end;
 begin perform public.record_stripe_test_payment(a,'cs_test_a','evt_other','pi_other',2500,'USD',t); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Conflicting test payment' then raise; end if; end;
 begin perform public.record_stripe_test_payment(b,'cs_test_b','evt_a','pi_b',2500,'USD',t); raise exception 'TEST FAILURE'; exception when raise_exception then if sqlerrm<>'Conflicting test event' then raise; end if; end;
 begin perform public.record_stripe_test_payment(b,'cs_test_b','evt_b','pi_a',2500,'USD',t); raise exception 'TEST FAILURE'; exception when unique_violation then null; end;
 if not exists(select 1 from public.retail_stripe_test_orders where id=b and payment_ref is null and paid_at is null) or (select count(*) from public.retail_stripe_test_events)<>2 then raise exception 'Rollback/history failed'; end if;
end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
do $$ begin
 if (select count(*) from public.retail_stripe_test_orders)<>2 or (select count(*) from public.retail_stripe_test_events)<>2 then raise exception 'Owner reads failed'; end if;
 begin update public.retail_stripe_test_orders set total_cents=50; raise exception 'TEST FAILURE'; exception when insufficient_privilege then null; end;
 begin delete from public.retail_stripe_test_events; raise exception 'TEST FAILURE'; exception when insufficient_privilege then null; end;
 begin perform public.bind_stripe_test_session('00000000-0000-4000-8000-000000000001','cs_test_a',2500); raise exception 'TEST FAILURE'; exception when insufficient_privilege then null; end;
 begin perform public.record_stripe_test_payment('00000000-0000-4000-8000-000000000001','cs_test_a','evt_a','pi_a',2500,'USD',now()); raise exception 'TEST FAILURE'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.retail_stripe_test_orders) or exists(select 1 from public.retail_stripe_test_events) then raise exception 'Editor exposure'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.retail_stripe_test_orders; raise exception 'TEST FAILURE'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.retail_stripe_test_events; raise exception 'TEST FAILURE'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS Stripe test payment acceptance' as result;
