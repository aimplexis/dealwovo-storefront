-- Disposable database only. All fixtures rolled back.
begin;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',true);
insert into public.retail_suppliers(id,legal_name,kind,website,country,contact_email,method,categories)
values ('00000000-0000-4000-8000-000000000010','Fixture Supplier','wholesaler','https://example.com','US','test@example.com','csv','Home');
insert into public.retail_supplier_products(id,supplier_id,sku,title,category_hint,wholesale_cents,retail_cents,shipping_cents,reported_quantity,source_reference,observed_at)
values ('00000000-0000-4000-8000-000000000011','00000000-0000-4000-8000-000000000010','FIX-1','Fixture product','Home',1000,2500,300,10,'fixture evidence',now()-interval '2 hours');
insert into public.retail_orders(id,product_id,quantity,total_cents,created_at,updated_at)
select ('00000000-0000-4000-8000-00000000002'||n)::uuid,'00000000-0000-4000-8000-000000000011',1,2500,now()-interval '1 hour',now()-interval '1 hour' from generate_series(1,3) n;
do $$
declare a uuid:='00000000-0000-4000-8000-000000000021'; b uuid:='00000000-0000-4000-8000-000000000022'; c uuid:='00000000-0000-4000-8000-000000000023'; t timestamptz:=now()-interval '50 minutes';
begin
 begin perform public.record_retail_order_event(a,0,'submission_requested','unpaid',t); raise exception 'TEST FAILURE: unpaid submission'; exception when raise_exception then if sqlerrm<>'Submission blocked' then raise; end if; end;
 begin perform public.record_retail_order_event(a,0,'payment_verified','bad-payment',t,2499,'USD'); raise exception 'TEST FAILURE: amount'; exception when raise_exception then if sqlerrm<>'Payment mismatch' then raise; end if; end;
 begin perform public.record_retail_order_event(a,0,'payment_verified','bad-currency',t,2500,'EUR'); raise exception 'TEST FAILURE: currency'; exception when raise_exception then if sqlerrm<>'Payment mismatch' then raise; end if; end;
 if public.record_retail_order_event(a,0,'payment_verified','payment-1',t,2500,'USD')<>1 then raise exception 'Payment version mismatch'; end if;
 begin perform public.record_retail_order_event(b,0,'payment_verified','payment-1',t,2500,'USD'); raise exception 'TEST FAILURE: duplicate payment'; exception when unique_violation then null; end;
 if not exists(select 1 from public.retail_orders where id=b and state='awaiting_payment' and version=0 and payment_ref is null) or exists(select 1 from public.retail_order_events where order_id=b) then raise exception 'Duplicate payment rollback failed'; end if;
 begin perform public.record_retail_order_event(a,0,'submission_requested','stale-version',t+interval '1 minute'); raise exception 'TEST FAILURE: stale version'; exception when raise_exception then if sqlerrm<>'Invalid or stale order event' then raise; end if; end;
 begin perform public.record_retail_order_event(a,1,'submission_requested','future-event',now()+interval '1 minute'); raise exception 'TEST FAILURE: future event'; exception when raise_exception then if sqlerrm<>'Invalid or stale order event' then raise; end if; end;
 begin perform public.record_retail_order_event(a,1,'cancellation_verified','paid-cancel',t+interval '1 minute'); raise exception 'TEST FAILURE: paid cancellation'; exception when raise_exception then if sqlerrm<>'Paid cancellation needs separate refund workflow' then raise; end if; end;
 perform public.record_retail_order_event(a,1,'submission_requested','submit-1',t+interval '1 minute');
 perform public.record_retail_order_event(a,2,'submission_uncertain','timeout-1',t+interval '2 minutes');
 begin perform public.record_retail_order_event(a,3,'submission_requested','retry-1',t+interval '3 minutes'); raise exception 'TEST FAILURE: uncertain retry'; exception when raise_exception then if sqlerrm<>'Submission blocked' then raise; end if; end;
 perform public.record_retail_order_event(a,3,'supplier_accepted','accept-1',t+interval '3 minutes',null,null,'supplier-order-1');
 begin perform public.record_retail_order_event(a,4,'shipment_verified','wrong-ship',t+interval '4 minutes',null,null,'wrong-order','tracking-1'); raise exception 'TEST FAILURE: wrong supplier'; exception when raise_exception then if sqlerrm<>'Invalid shipment' then raise; end if; end;
 perform public.record_retail_order_event(a,4,'shipment_verified','ship-1',t+interval '4 minutes',null,null,'supplier-order-1','tracking-1');
 begin perform public.record_retail_order_event(a,5,'delivery_verified','wrong-delivery',t+interval '5 minutes',null,null,'supplier-order-1','wrong-tracking'); raise exception 'TEST FAILURE: wrong tracking'; exception when raise_exception then if sqlerrm<>'Invalid delivery' then raise; end if; end;
 perform public.record_retail_order_event(a,5,'delivery_verified','deliver-1',t+interval '5 minutes',null,null,'supplier-order-1','tracking-1');
 if not exists(select 1 from public.retail_orders where id=a and state='delivered' and version=6 and payment_ref='payment-1' and supplier_order_ref='supplier-order-1' and tracking_ref='tracking-1') or (select count(*) from public.retail_order_events where order_id=a)<>6 then raise exception 'Order and event history mismatch'; end if;
 perform public.record_retail_order_event(c,0,'cancellation_verified','cancel-1',t);
 if not exists(select 1 from public.retail_orders where id=c and state='cancelled') then raise exception 'Unpaid cancellation failed'; end if;
end $$;
set local role authenticated;
do $$ begin
 if (select count(*) from public.retail_orders)<>3 or (select count(*) from public.retail_order_events)<>7 then raise exception 'Owner read failed'; end if;
 begin update public.retail_orders set state='paid'; raise exception 'TEST FAILURE: direct update'; exception when insufficient_privilege then null; end;
 begin delete from public.retail_order_events; raise exception 'TEST FAILURE: event deletion'; exception when insufficient_privilege then null; end;
 begin perform public.record_retail_order_event('00000000-0000-4000-8000-000000000022',0,'payment_verified','fake-payment',now(),2500,'USD'); raise exception 'TEST FAILURE: owner RPC'; exception when insufficient_privilege then null; end;
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002',true);
do $$ begin
 if exists(select 1 from public.retail_orders) or exists(select 1 from public.retail_order_events) then raise exception 'Nonowner exposure'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.retail_orders; raise exception 'TEST FAILURE: anonymous read'; exception when insufficient_privilege then null; end;
 begin perform 1 from public.retail_order_events; raise exception 'TEST FAILURE: anonymous history'; exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS retail order transaction integrity' as result;
