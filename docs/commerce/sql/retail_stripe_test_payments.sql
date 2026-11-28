-- Staged test-only payment ledger. Never writes to the commercial retail_orders table.
-- Database operator only until an authenticated test backend is separately approved.
begin;
create table public.retail_stripe_test_orders(
 id uuid primary key default gen_random_uuid(),
 total_cents integer not null check(total_cents between 50 and 100000000),
 currency text not null default 'USD' check(currency='USD'),
 checkout_session_id text unique check(checkout_session_id ~ '^cs_test_[A-Za-z0-9_]{1,200}$'),
 payment_ref text unique check(payment_ref ~ '^pi_[A-Za-z0-9_]{1,200}$'),
 paid_at timestamptz,
 created_at timestamptz not null default now(),
 check((payment_ref is null and paid_at is null) or (payment_ref is not null and paid_at is not null and checkout_session_id is not null and paid_at>=created_at))
);
create table public.retail_stripe_test_events(
 event_id text primary key check(event_id ~ '^evt_[A-Za-z0-9_]{1,200}$'),
 order_id uuid not null references public.retail_stripe_test_orders(id),
 session_id text not null,
 payment_ref text not null,
 amount_cents integer not null check(amount_cents between 50 and 100000000),
 observed_at timestamptz not null,
 recorded_at timestamptz not null default now()
);
alter table public.retail_stripe_test_orders enable row level security;
alter table public.retail_stripe_test_events enable row level security;
revoke all on public.retail_stripe_test_orders,public.retail_stripe_test_events from public,anon,authenticated;
grant select on public.retail_stripe_test_orders,public.retail_stripe_test_events to authenticated;
create policy stripe_test_owner_read on public.retail_stripe_test_orders for select to authenticated using(exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
create policy stripe_test_event_owner_read on public.retail_stripe_test_events for select to authenticated using(exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
create function public.bind_stripe_test_session(p_order uuid,p_session text,p_amount integer)
returns boolean language plpgsql security invoker set search_path='' as $$
declare o public.retail_stripe_test_orders%rowtype;
begin
 select * into o from public.retail_stripe_test_orders where id=p_order for update;
 if not found or p_session is null or p_session !~ '^cs_test_[A-Za-z0-9_]{1,200}$' or p_amount is distinct from o.total_cents then raise exception 'Invalid test session'; end if;
 if o.checkout_session_id=p_session then return true; end if;
 if o.checkout_session_id is not null or o.payment_ref is not null then raise exception 'Test session already bound'; end if;
 update public.retail_stripe_test_orders set checkout_session_id=p_session where id=p_order;
 return true;
end $$;
-- Caller must verify Stripe signature, test mode and checkout session evidence first.
create function public.record_stripe_test_payment(p_order uuid,p_session text,p_event text,p_payment text,p_amount integer,p_currency text,p_at timestamptz)
returns text language plpgsql security invoker set search_path='' as $$
declare o public.retail_stripe_test_orders%rowtype; e public.retail_stripe_test_events%rowtype;
begin
 select * into o from public.retail_stripe_test_orders where id=p_order for update;
 if not found or o.checkout_session_id is null or p_session is distinct from o.checkout_session_id or p_amount is distinct from o.total_cents or p_currency is distinct from 'USD' or p_event is null or p_event !~ '^evt_[A-Za-z0-9_]{1,200}$' or p_payment is null or p_payment !~ '^pi_[A-Za-z0-9_]{1,200}$' or p_at is null or p_at<date_trunc('second',o.created_at) or p_at>now() then raise exception 'Invalid test payment evidence'; end if;
 select * into e from public.retail_stripe_test_events where event_id=p_event;
 if found then
  if e.order_id=p_order and e.session_id=p_session and e.payment_ref=p_payment and e.amount_cents=p_amount and e.observed_at=p_at then return 'duplicate'; end if;
  raise exception 'Conflicting test event';
 end if;
 if o.payment_ref is not null and o.payment_ref<>p_payment then raise exception 'Conflicting test payment'; end if;
 if o.payment_ref is null then
  update public.retail_stripe_test_orders set payment_ref=p_payment,paid_at=greatest(p_at,o.created_at) where id=p_order;
 end if;
 insert into public.retail_stripe_test_events(event_id,order_id,session_id,payment_ref,amount_cents,observed_at) values(p_event,p_order,p_session,p_payment,p_amount,p_at);
 return case when o.payment_ref is null then 'recorded' else 'already_paid' end;
end $$;
revoke all on function public.bind_stripe_test_session(uuid,text,integer) from public,anon,authenticated;
revoke all on function public.record_stripe_test_payment(uuid,text,text,text,integer,text,timestamptz) from public,anon,authenticated;
commit;
