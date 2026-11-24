-- Atomic preparation of at most 25 explicitly selected candidates.
create function public.prepare_feed_drafts(p_rows jsonb) returns integer language plpgsql security invoker set search_path='' as $$
declare r record; n integer;
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then raise exception 'Administrator required' using errcode='42501';end if;
 if p_rows is null or jsonb_typeof(p_rows)<>'array' then raise exception 'Invalid selection' using errcode='22023';end if;
 n:=jsonb_array_length(p_rows);
 if n<1 or n>25 or octet_length(p_rows::text)>25000 then raise exception 'Select 1 to 25 products' using errcode='22023';end if;
 if (select count(distinct x->>'candidate_id') from jsonb_array_elements(p_rows) x)<>n then raise exception 'Duplicate or missing candidates' using errcode='22023';end if;
 for r in select * from jsonb_to_recordset(p_rows) as x(candidate_id uuid,category_id uuid,merchant_id uuid,slug text) order by candidate_id loop
  perform public.dealwovo_convert_feed_candidate(r.candidate_id,r.category_id,r.merchant_id,r.slug);
 end loop;
 return n;
end;$$;
revoke all on function public.prepare_feed_drafts(jsonb) from public,anon,authenticated;
grant execute on function public.prepare_feed_drafts(jsonb) to authenticated;
notify pgrst,'reload schema';
