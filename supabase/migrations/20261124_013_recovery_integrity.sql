-- Recovery migration: transactional feed intake and immutable review evidence.
create index if not exists marketing_review_events_reviewer on public.marketing_review_events(reviewer_id);
create index if not exists marketing_ai_attempts_created on dealwovo_private.marketing_ai_attempts(created_at desc);

create or replace function dealwovo_private.guard_marketing_review()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.status is distinct from old.status then
  if auth.uid() is null or not exists(select 1 from public.catalog_admins a where a.user_id=auth.uid() and a.role='owner') then
   raise exception 'Owner review required' using errcode='42501';
  end if;
  if not ((old.status='draft' and new.status in ('reviewed','archived')) or (old.status='reviewed' and new.status='archived')) then
   raise exception 'Invalid review transition' using errcode='23514';
  end if;
  new.reviewed_by:=auth.uid();new.reviewed_at:=clock_timestamp();
 elsif new.reviewed_by is distinct from old.reviewed_by or new.reviewed_at is distinct from old.reviewed_at then
  raise exception 'Review evidence cannot change without a status change';
 end if;
 return new;
end;$$;
revoke all on function dealwovo_private.guard_marketing_review() from public,anon,authenticated;

-- Atomic batch and candidate insertion under existing administrator RLS.
-- Existing direct grants remain temporarily for compatibility with prior previews.
create function public.stage_catalog_feed(p_source_id uuid,p_rows jsonb) returns integer
language plpgsql security invoker set search_path='' as $$
declare n integer; b uuid; s text;
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Rows must be an array';end if;
 n:=jsonb_array_length(p_rows);
 if n<1 or n>100 or octet_length(p_rows::text)>600000 then raise exception 'Invalid batch size';end if;
 if exists(select 1 from jsonb_array_elements(p_rows) r where r->>'currency' is distinct from 'USD') then raise exception 'USD currency required';end if;
 select status into s from public.catalog_feed_sources where id=p_source_id for share;
 if s is distinct from 'authorized' then raise exception 'Source not authorized';end if;
 insert into public.catalog_feed_batches(source_id,created_by,row_count,status) values(p_source_id,auth.uid(),n,'staged') returning id into b;
 insert into public.catalog_feed_candidates(batch_id,external_product_id,title,description,category_hint,image_url,affiliate_url,price_cents,currency,status)
 select b,r.external_product_id,r.title,coalesce(r.description,''),coalesce(r.category_hint,''),r.image_url,r.affiliate_url,r.price_cents,'USD','staged'
 from jsonb_to_recordset(p_rows) as r(external_product_id text,title text,description text,category_hint text,image_url text,affiliate_url text,price_cents bigint);
 return n;
end;$$;
revoke all on function public.stage_catalog_feed(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.stage_catalog_feed(uuid,jsonb) to authenticated;
notify pgrst,'reload schema';
