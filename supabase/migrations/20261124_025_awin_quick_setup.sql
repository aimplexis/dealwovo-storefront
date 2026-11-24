-- Awin legacy CSV onboarding: one publisher/advertiser binding and draft merchant per program.
-- No network API, credential collection or public product creation.
alter table public.catalog_feed_sources
 add column awin_publisher_id text,
 add column awin_advertiser_id text,
 add column awin_merchant_id uuid references public.catalog_merchants(id) on delete restrict,
 add constraint awin_binding_complete check(
 (awin_publisher_id is null and awin_advertiser_id is null and awin_merchant_id is null)
 or (provider='awin' and awin_publisher_id ~ '^[1-9][0-9]{0,18}$' and awin_advertiser_id ~ '^[1-9][0-9]{0,18}$' and awin_merchant_id is not null and awin_publisher_id is not null and awin_advertiser_id is not null));
create unique index awin_program_unique on public.catalog_feed_sources(awin_publisher_id,awin_advertiser_id) where provider='awin';
create index awin_source_merchant on public.catalog_feed_sources(awin_merchant_id);
create function dealwovo_private.register_awin_partner(p_name text,p_website text,p_publisher text,p_advertiser text) returns uuid
language plpgsql security definer set search_path='' as $$
declare m uuid; s uuid;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_name is null or length(btrim(p_name)) not between 3 and 120 or p_publisher is null or p_publisher !~ '^[1-9][0-9]{0,18}$' or p_advertiser is null or p_advertiser !~ '^[1-9][0-9]{0,18}$' or (p_website is not null and not dealwovo_private.safe_feed_url(p_website)) then raise exception 'Invalid Awin program details' using errcode='22023';end if;
 insert into public.catalog_merchants(name,website_url,status) values(btrim(p_name),p_website,'draft') returning id into m;
 insert into public.catalog_feed_sources(name,provider,partner_ref,status,created_by,awin_publisher_id,awin_advertiser_id,awin_merchant_id)
 values(btrim(p_name),'awin',p_advertiser,'draft',auth.uid(),p_publisher,p_advertiser,m) returning id into s;
 return s;
end;$$;
create function public.register_awin_partner(p_name text,p_website text,p_publisher text,p_advertiser text) returns uuid
language sql security invoker set search_path='' as $$ select dealwovo_private.register_awin_partner(p_name,p_website,p_publisher,p_advertiser) $$;
revoke all on function dealwovo_private.register_awin_partner(text,text,text,text),public.register_awin_partner(text,text,text,text) from public,anon,authenticated;
grant execute on function dealwovo_private.register_awin_partner(text,text,text,text),public.register_awin_partner(text,text,text,text) to authenticated;
-- Match literal tracking parameters exactly, not embedded destinations or duplicate parameters.
create function dealwovo_private.awin_link_matches(v text,publisher text,advertiser text) returns boolean
language plpgsql immutable set search_path='' as $$
declare pairs text[]; pubkey text; advkey text; pubcount integer; advcount integer; pubval text; advval text;
begin
 if v is null or publisher is null or advertiser is null or not dealwovo_private.safe_feed_url(v) then return false;end if;
 if v ~ '^https://(www\.)?awin1\.com/pclick\.php\?' then pubkey:='a';advkey:='m';
 elsif v ~ '^https://(www\.)?awin1\.com/cread\.php\?' then pubkey:='awinaffid';advkey:='awinmid';
 else return false;end if;
 pairs:=string_to_array(split_part(substring(v from strpos(v,'?')+1),'#',1),'&');
 if exists(select 1 from unnest(pairs) x where split_part(x,'=',1) !~ '^[A-Za-z0-9_]+$') then return false;end if;
 select count(*) filter(where lower(split_part(x,'=',1))=pubkey),count(*) filter(where lower(split_part(x,'=',1))=advkey),
 max(substring(x from strpos(x,'=')+1)) filter(where split_part(x,'=',1)=pubkey),
 max(substring(x from strpos(x,'=')+1)) filter(where split_part(x,'=',1)=advkey)
 into pubcount,advcount,pubval,advval from unnest(pairs) x;
 return coalesce(pubcount=1 and advcount=1 and pubval=publisher and advval=advertiser,false);
end;$$;
revoke all on function dealwovo_private.awin_link_matches(text,text,text) from public,anon,authenticated;
create function dealwovo_private.awin_candidate_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare s record; m uuid;
begin
 select f.id,f.provider,f.status,f.awin_publisher_id,f.awin_advertiser_id,f.awin_merchant_id into s
 from public.catalog_feed_batches b join public.catalog_feed_sources f on f.id=b.source_id where b.id=new.batch_id;
 if s.provider is distinct from 'awin' then return new;end if;
 if tg_op='INSERT' then
  if s.status<>'authorized' or s.awin_merchant_id is null or not dealwovo_private.awin_link_matches(new.affiliate_url,s.awin_publisher_id,s.awin_advertiser_id) then raise exception 'Configured authorized Awin partner and matching tracking link required' using errcode='23514';end if;
  perform pg_advisory_xact_lock(hashtextextended(s.id::text||':'||new.external_product_id,0));
  if exists(select 1 from public.catalog_feed_candidates c join public.catalog_feed_batches b on b.id=c.batch_id where b.source_id=s.id and c.external_product_id=new.external_product_id and c.status in ('staged','converted')) then raise exception 'Awin product already staged or converted' using errcode='23505';end if;
 elsif new.status='converted' then
  select merchant_id into m from public.catalog_offers where id=new.converted_offer_id;
  if s.awin_merchant_id is null or m is distinct from s.awin_merchant_id then raise exception 'Select the retailer bound to this Awin program' using errcode='23514';end if;
 end if;
 return new;
end;$$;
revoke all on function dealwovo_private.awin_candidate_guard() from public,anon,authenticated;
create trigger awin_candidate_guard before insert or update of status on public.catalog_feed_candidates for each row execute function dealwovo_private.awin_candidate_guard();
-- Prevent source-linked offers from being switched to another retailer or tracking account.
create function dealwovo_private.awin_offer_guard() returns trigger language plpgsql security definer set search_path='' as $$
declare s record;
begin
 select f.status,f.awin_publisher_id,f.awin_advertiser_id,f.awin_merchant_id into s
 from public.catalog_feed_candidates c join public.catalog_feed_batches b on b.id=c.batch_id join public.catalog_feed_sources f on f.id=b.source_id where c.converted_offer_id=old.id and f.provider='awin' limit 1;
 if found and (new.merchant_id is distinct from s.awin_merchant_id or not dealwovo_private.awin_link_matches(new.affiliate_url,s.awin_publisher_id,s.awin_advertiser_id) or (new.status='approved' and s.status<>'authorized')) then raise exception 'Awin offer must retain authorized program binding' using errcode='23514';end if;
 return new;
end;$$;
revoke all on function dealwovo_private.awin_offer_guard() from public,anon,authenticated;
create trigger awin_offer_guard before update of affiliate_url,merchant_id,status on public.catalog_offers for each row execute function dealwovo_private.awin_offer_guard();
create function dealwovo_private.awin_source_pause() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.provider='awin' and old.status='authorized' and new.status<>'authorized' then
  update public.catalog_offers o set status='paused',verified_at=null,expires_at=null where o.status='approved' and exists(select 1 from public.catalog_feed_candidates c join public.catalog_feed_batches b on b.id=c.batch_id where c.converted_offer_id=o.id and b.source_id=new.id);
 end if;
 return new;
end;$$;
revoke all on function dealwovo_private.awin_source_pause() from public,anon,authenticated;
create trigger awin_source_pause after update of status on public.catalog_feed_sources for each row execute function dealwovo_private.awin_source_pause();
notify pgrst,'reload schema';
