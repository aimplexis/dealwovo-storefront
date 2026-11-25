-- Route evidence writes through a restricted, validated owner RPC so the private URL check is not exposed.
revoke insert on public.commerce_opportunity_evidence from authenticated;
revoke insert(opportunity_id,dimension,source_url,observed_on,geography,note,rating) on public.commerce_opportunity_evidence from authenticated;
revoke usage on sequence public.commerce_opportunity_evidence_id_seq from authenticated;
create function dealwovo_private.append_opportunity_evidence(p_id uuid,p_dimension text,p_url text,p_date date,p_geo text,p_note text,p_rating smallint) returns bigint
language plpgsql security definer set search_path='' as $$
declare n bigint;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_date is null or p_date>(now() at time zone 'UTC')::date or p_url is null or not dealwovo_private.safe_feed_url(p_url) then raise exception 'Invalid observation' using errcode='22023';end if;
 insert into public.commerce_opportunity_evidence(opportunity_id,dimension,source_url,observed_on,geography,note,rating,recorded_by)
 values(p_id,p_dimension,p_url,p_date,btrim(p_geo),btrim(p_note),p_rating,auth.uid()) returning id into n;
 return n;
end;$$;
create function public.append_opportunity_evidence(p_id uuid,p_dimension text,p_url text,p_date date,p_geo text,p_note text,p_rating smallint) returns bigint language sql security invoker set search_path='' as $$select dealwovo_private.append_opportunity_evidence(p_id,p_dimension,p_url,p_date,p_geo,p_note,p_rating)$$;
revoke all on function dealwovo_private.append_opportunity_evidence(uuid,text,text,date,text,text,smallint),public.append_opportunity_evidence(uuid,text,text,date,text,text,smallint) from public,anon,authenticated;
grant execute on function dealwovo_private.append_opportunity_evidence(uuid,text,text,date,text,text,smallint),public.append_opportunity_evidence(uuid,text,text,date,text,text,smallint) to authenticated;
-- Latest dimension observations independent of historical row volume.
create function public.latest_opportunity_evidence() returns setof public.commerce_opportunity_evidence language sql stable security invoker set search_path='' as $$
 select distinct on(opportunity_id,dimension) * from public.commerce_opportunity_evidence order by opportunity_id,dimension,observed_on desc,id desc
$$;
revoke all on function public.latest_opportunity_evidence() from public,anon,authenticated;
grant execute on function public.latest_opportunity_evidence() to authenticated;
notify pgrst,'reload schema';
