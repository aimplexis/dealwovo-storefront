-- Run only after the disposable fixture and staged catalog search function.
set role anon;
do $$
declare result jsonb; ids integer[]; invalid text;
begin
 result:=public.search_public_catalog('headphones','electronics','lt:7550','price_low',1,'');
 select array_agg((v->>'id')::integer order by ord) into ids from jsonb_array_elements(result->'offers') with ordinality as x(v,ord);
 if ids is distinct from array[1] then raise exception 'Exclusive budget mismatch: %',ids; end if;
 result:=public.search_public_catalog('headphones','electronics','lte:7550','price_low',1,'');
 select array_agg((v->>'id')::integer order by ord) into ids from jsonb_array_elements(result->'offers') with ordinality as x(v,ord);
 if ids is distinct from array[1,2] then raise exception 'Inclusive budget mismatch: %',ids; end if;
 foreach invalid in array array['lte:0','lt:-1','lte:001','lte:100000001','lte:1.5','lte:1e3','lte:999999999999999999999','bogus'] loop
  result:=public.search_public_catalog('headphones','all',invalid,'recent',1,'');
  if jsonb_array_length(result->'offers')<>0 then raise exception 'Invalid budget accepted: %',invalid; end if;
 end loop;
 result:=public.search_public_catalog('headphones','all','100','price_low',1,'Fixture retailer');
 if jsonb_array_length(result->'offers')<>3 then raise exception 'Legacy budget or eligibility mismatch'; end if;
 result:=public.search_public_catalog('headphones','all','lte:7550','recent',1,'Unknown retailer');
 if jsonb_array_length(result->'offers')<>0 then raise exception 'Retailer filter mismatch'; end if;
 result:=public.search_public_catalog('pagination fixture','all','lte:200','price_low',1,'');
 if jsonb_array_length(result->'offers')<>24 or result->>'hasMore'<>'true' then raise exception 'First page mismatch'; end if;
 result:=public.search_public_catalog('pagination fixture','all','lte:200','price_low',2,'');
 select array_agg((v->>'id')::integer order by ord) into ids from jsonb_array_elements(result->'offers') with ordinality as x(v,ord);
 if ids is distinct from array[125,126] or result->>'hasMore'<>'false' then raise exception 'Second page mismatch'; end if;
 raise notice 'PASS precise budget boundaries, invalid input, offer eligibility, retailer matching and pagination';
end $$;
reset role;
