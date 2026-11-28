-- Staged only. No checkout, provider or live activation. Trusted server writer only.
begin;
create table public.retail_orders(
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.retail_supplier_products(id),
 quantity integer not null check(quantity between 1 and 10),
 total_cents integer not null check(total_cents between 1 and 100000000),
 currency text not null default 'USD' check(currency='USD'),
 state text not null default 'awaiting_payment' check(state in ('awaiting_payment','paid','submission_pending','submission_uncertain','accepted','shipped','delivered','exception','cancelled')),
 payment_ref text unique,
 supplier_order_ref text,
 tracking_ref text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 version integer not null default 0 check(version>=0),
 check(updated_at>=created_at)
);
create table public.retail_order_events(
 order_id uuid not null references public.retail_orders(id),
 version integer not null check(version>0),
 kind text not null,
 evidence_ref text not null check(char_length(btrim(evidence_ref)) between 3 and 200),
 observed_at timestamptz not null,
 recorded_at timestamptz not null default now(),
 resulting_state text not null,
 primary key(order_id,version),
 unique(order_id,kind,evidence_ref)
);
alter table public.retail_orders enable row level security;
alter table public.retail_order_events enable row level security;
revoke all on public.retail_orders,public.retail_order_events from public,anon,authenticated;
-- No browser writes or customer data access. Owners can inspect private records.
grant select on public.retail_orders,public.retail_order_events to authenticated;
create policy retail_order_owner_read on public.retail_orders for select to authenticated using(exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
create policy retail_event_owner_read on public.retail_order_events for select to authenticated using(exists(select 1 from public.catalog_admins a where a.user_id=(select auth.uid()) and a.role='owner'));
-- Future trusted backend must independently authenticate provider evidence. SQL does not authenticate external receipts.
-- No grants to client roles; database operator only until a dedicated writer is approved.
create function public.record_retail_order_event(p_order uuid,p_version integer,p_kind text,p_ref text,p_at timestamptz,p_amount integer default null,p_currency text default null,p_supplier_ref text default null,p_tracking_ref text default null)
returns integer language plpgsql security invoker set search_path='' as $$
declare o public.retail_orders%rowtype; next_state text;
begin
 select * into o from public.retail_orders where id=p_order for update;
 if not found or p_version is distinct from o.version or p_at is null or p_at<=o.updated_at or p_at>now() or p_ref is null or char_length(p_ref) not between 3 and 200 or p_ref<>btrim(p_ref) or p_ref ~ '[[:cntrl:]]' then raise exception 'Invalid or stale order event'; end if;
 case p_kind
 when 'payment_verified' then
  if o.state<>'awaiting_payment' or o.payment_ref is not null or p_amount is distinct from o.total_cents or p_currency is distinct from 'USD' then raise exception 'Payment mismatch'; end if;
  next_state:='paid'; o.payment_ref:=p_ref;
 when 'submission_requested' then
  if o.state<>'paid' or o.payment_ref is null then raise exception 'Submission blocked'; end if;
  next_state:='submission_pending';
 when 'submission_uncertain' then
  if o.state<>'submission_pending' then raise exception 'Invalid uncertainty'; end if;
  next_state:='submission_uncertain';
 when 'supplier_accepted' then
  if o.state not in ('submission_pending','submission_uncertain') or o.payment_ref is null or o.supplier_order_ref is not null or p_supplier_ref is null or char_length(p_supplier_ref) not between 3 and 200 or p_supplier_ref<>btrim(p_supplier_ref) or p_supplier_ref ~ '[[:cntrl:]]' then raise exception 'Invalid supplier acceptance'; end if;
  next_state:='accepted'; o.supplier_order_ref:=p_supplier_ref;
 when 'shipment_verified' then
  if o.state<>'accepted' or o.supplier_order_ref is null or p_supplier_ref is distinct from o.supplier_order_ref or p_tracking_ref is null or char_length(p_tracking_ref) not between 3 and 200 or p_tracking_ref<>btrim(p_tracking_ref) or p_tracking_ref ~ '[[:cntrl:]]' then raise exception 'Invalid shipment'; end if;
  next_state:='shipped'; o.tracking_ref:=p_tracking_ref;
 when 'delivery_verified' then
  if o.state<>'shipped' or o.supplier_order_ref is null or o.tracking_ref is null or p_supplier_ref is distinct from o.supplier_order_ref or p_tracking_ref is distinct from o.tracking_ref then raise exception 'Invalid delivery'; end if;
  next_state:='delivered';
 when 'exception_reported' then
  if o.state not in ('paid','submission_pending','submission_uncertain','accepted','shipped') then raise exception 'Invalid exception'; end if;
  next_state:='exception';
 when 'cancellation_verified' then
  if o.state<>'awaiting_payment' or o.payment_ref is not null then raise exception 'Paid cancellation needs separate refund workflow'; end if;
  next_state:='cancelled';
 else raise exception 'Unknown order event';
 end case;
 update public.retail_orders set state=next_state,payment_ref=o.payment_ref,supplier_order_ref=o.supplier_order_ref,tracking_ref=o.tracking_ref,updated_at=p_at,version=o.version+1 where id=p_order;
 insert into public.retail_order_events(order_id,version,kind,evidence_ref,observed_at,resulting_state) values(p_order,o.version+1,p_kind,p_ref,p_at,next_state);
 return o.version+1;
end $$;
revoke all on function public.record_retail_order_event(uuid,integer,text,text,timestamptz,integer,text,text,text) from public,anon,authenticated;
commit;
