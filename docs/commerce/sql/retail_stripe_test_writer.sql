-- Staged only: isolated acceptance and explicit activation approval required.
-- No credentials, JWT signing keys, or live commerce permissions are provisioned here.
begin;
create role dealwovo_stripe_test_writer nologin noinherit nobypassrls;
grant usage on schema public to dealwovo_stripe_test_writer;
grant dealwovo_stripe_test_writer to authenticator;
grant select on public.retail_stripe_test_orders,public.retail_stripe_test_events to dealwovo_stripe_test_writer;
grant update(checkout_session_id,payment_ref,paid_at) on public.retail_stripe_test_orders to dealwovo_stripe_test_writer;
grant insert(event_id,order_id,session_id,payment_ref,amount_cents,observed_at) on public.retail_stripe_test_events to dealwovo_stripe_test_writer;
create policy stripe_writer_order_read on public.retail_stripe_test_orders for select to dealwovo_stripe_test_writer using(true);
create policy stripe_writer_order_update on public.retail_stripe_test_orders for update to dealwovo_stripe_test_writer using(true) with check(true);
create policy stripe_writer_event_read on public.retail_stripe_test_events for select to dealwovo_stripe_test_writer using(true);
create policy stripe_writer_event_insert on public.retail_stripe_test_events for insert to dealwovo_stripe_test_writer with check(true);
grant execute on function public.bind_stripe_test_session(uuid,text,integer) to dealwovo_stripe_test_writer;
grant execute on function public.record_stripe_test_payment(uuid,text,text,text,integer,text,timestamptz) to dealwovo_stripe_test_writer;
-- Writer is a trusted test-only server principal. Column grants still allow direct
-- test ledger updates; do not expose its token to clients. It is not a live payment writer.
commit;
