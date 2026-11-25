-- Newsletter preparation only. Actual collection and delivery are held.
create table dealwovo_private.newsletter_activation(
 singleton boolean primary key default true check(singleton),
 collection_enabled boolean not null default false
);
insert into dealwovo_private.newsletter_activation(singleton) values(true);
alter table dealwovo_private.newsletter_activation enable row level security;
revoke all on dealwovo_private.newsletter_activation from public,anon,authenticated,service_role;
create table dealwovo_private.newsletter_subscribers(
 id uuid primary key default gen_random_uuid(),
 email text not null unique check(length(email) between 3 and 254 and email=lower(btrim(email)) and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 interest text not null check(interest in ('all','gifts','tech','essentials','holiday')),
 status text not null default 'pending' check(status in ('pending','confirmed','unsubscribed')),
 consent_version text not null check(consent_version='newsletter-v1'),
 requested_at timestamptz not null default now(),
 confirmed_at timestamptz,
 unsubscribed_at timestamptz,
 confirmation_hash text unique check(confirmation_hash ~ '^[a-f0-9]{64}$'),
 confirmation_expires_at timestamptz,
 unsubscribe_hash text not null unique check(unsubscribe_hash ~ '^[a-f0-9]{64}$'),
 check(confirmation_hash is null or confirmation_hash<>unsubscribe_hash)
);
create table dealwovo_private.newsletter_consent_events(
 id bigint generated always as identity primary key,
 subscriber_id uuid not null references dealwovo_private.newsletter_subscribers(id) on delete restrict,
 event text not null check(event in ('requested','confirmed','unsubscribed')),
 consent_version text not null,
 interest text not null,
 created_at timestamptz not null default now()
);
create index newsletter_consent_subscriber on dealwovo_private.newsletter_consent_events(subscriber_id,created_at);
alter table dealwovo_private.newsletter_subscribers enable row level security;
alter table dealwovo_private.newsletter_consent_events enable row level security;
revoke all on dealwovo_private.newsletter_subscribers,dealwovo_private.newsletter_consent_events from public,anon,authenticated,service_role;
-- Future trusted delivery backend only. Hashes must come from independent 256-bit random tokens.
create function public.newsletter_request(p_email text,p_interest text,p_confirm_hash text,p_unsubscribe_hash text,p_consent_version text) returns boolean
language plpgsql security definer set search_path='' as $$
declare s uuid;
begin
 if not exists(select 1 from dealwovo_private.newsletter_activation where singleton and collection_enabled) then raise exception 'Newsletter collection held' using errcode='42501';end if;
 if p_consent_version is distinct from 'newsletter-v1' or p_email is null or p_interest is null or p_interest not in ('all','gifts','tech','essentials','holiday') or p_confirm_hash is null or p_unsubscribe_hash is null or p_confirm_hash !~ '^[a-f0-9]{64}$' or p_unsubscribe_hash !~ '^[a-f0-9]{64}$' or p_confirm_hash=p_unsubscribe_hash then raise exception 'Invalid subscription request' using errcode='22023';end if;
 -- No implicit reactivation, preference changes or token rotation for an existing address.
 insert into dealwovo_private.newsletter_subscribers(email,interest,consent_version,confirmation_hash,confirmation_expires_at,unsubscribe_hash)
 values(lower(btrim(p_email)),p_interest,p_consent_version,p_confirm_hash,now()+interval '48 hours',p_unsubscribe_hash)
 on conflict(email) do nothing returning id into s;
 if s is null then return false;end if;
 insert into dealwovo_private.newsletter_consent_events(subscriber_id,event,consent_version,interest) values(s,'requested',p_consent_version,p_interest);
 return true;
end;$$;
create function public.newsletter_confirm(p_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare s dealwovo_private.newsletter_subscribers%rowtype;
begin
 if not exists(select 1 from dealwovo_private.newsletter_activation where singleton and collection_enabled) then return false;end if;
 if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then return false;end if;
 update dealwovo_private.newsletter_subscribers set status='confirmed',confirmed_at=now(),confirmation_hash=null,confirmation_expires_at=null
 where confirmation_hash=p_hash and status='pending' and confirmation_expires_at>now() returning * into s;
 if not found then return false;end if;
 insert into dealwovo_private.newsletter_consent_events(subscriber_id,event,consent_version,interest) values(s.id,'confirmed',s.consent_version,s.interest);return true;
end;$$;
create function public.newsletter_unsubscribe(p_hash text) returns boolean language plpgsql security definer set search_path='' as $$
declare s dealwovo_private.newsletter_subscribers%rowtype;
begin
 if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then return false;end if;
 update dealwovo_private.newsletter_subscribers set status='unsubscribed',unsubscribed_at=now(),confirmation_hash=null,confirmation_expires_at=null where unsubscribe_hash=p_hash and status<>'unsubscribed' returning * into s;
 if not found then return exists(select 1 from dealwovo_private.newsletter_subscribers where unsubscribe_hash=p_hash and status='unsubscribed');end if;
 insert into dealwovo_private.newsletter_consent_events(subscriber_id,event,consent_version,interest) values(s.id,'unsubscribed',s.consent_version,s.interest);return true;
end;$$;
revoke all on function public.newsletter_request(text,text,text,text,text),public.newsletter_confirm(text),public.newsletter_unsubscribe(text) from public,anon,authenticated,service_role;
grant execute on function public.newsletter_request(text,text,text,text,text),public.newsletter_confirm(text),public.newsletter_unsubscribe(text) to service_role;
-- Drafts are generated without subscriber access or outbound email.
create table public.newsletter_issues(
 id uuid primary key default gen_random_uuid(),
 week_of date not null,
 interest text not null check(interest in ('all','gifts','tech','essentials','holiday')),
 subject text not null,
 intro text not null,
 guide_path text not null check(guide_path in ('/shop','/gifts','/trending','/essentials','/deals')),
 items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)<=5),
 status text not null default 'draft' check(status in ('draft','reviewed','archived')),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 reviewed_by uuid references auth.users(id),
 unique(week_of,interest)
);
create index newsletter_issue_reviewer on public.newsletter_issues(reviewed_by);
alter table public.newsletter_issues enable row level security;
revoke all on public.newsletter_issues from public,anon,authenticated;
grant select on public.newsletter_issues to authenticated;
create policy "owner reads newsletter drafts" on public.newsletter_issues for select to authenticated using((select exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner')));
create function dealwovo_private.prepare_newsletter_week() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;w date:=date_trunc('week',now() at time zone 'UTC')::date;
begin
 if not pg_try_advisory_xact_lock(hashtextextended('dealwovo-newsletter-week',0)) then return 0;end if;
 insert into public.newsletter_issues(week_of,interest,subject,intro,guide_path,items)
 select w,s.interest,s.subject,s.intro,s.path,coalesce((
 select jsonb_agg(jsonb_build_object('productId',q.id,'slug',q.slug,'title',q.title,'reviewedAt',q.verified_at) order by q.verified_at desc,q.id)
 from (select * from (select distinct on(p.id) p.id,p.slug,p.title,o.verified_at
 from public.catalog_offers o join public.catalog_products p on p.id=o.product_id join public.catalog_categories c on c.id=p.category_id join public.catalog_merchants m on m.id=o.merchant_id
 where o.status='approved' and o.verified_at<=now() and o.expires_at>now() and o.expires_at<=o.verified_at+interval '30 days'
 and p.status='published' and c.status='published' and m.status='approved' and dealwovo_private.linked_offer_source_active(o.id)
 and (s.interest='all' or (s.interest='gifts' and lower(p.title||' '||p.description) ~ '\m(gift|gifts|gifting)\M') or (s.interest='holiday' and lower(p.title||' '||p.description) ~ '\m(holiday|christmas|seasonal)\M') or (s.interest='tech' and c.slug in ('electronics','technology','tech','electronics-gadgets')) or (s.interest='essentials' and c.slug in ('home','kitchen','essentials','beauty','everyday-essentials','home-living')))
 order by p.id,o.verified_at desc,o.id) unique_products order by verified_at desc,id limit 5) q
 ),'[]'::jsonb)
 from (values ('all','Your weekly good finds','A thoughtful edit of ideas worth exploring.','/shop'),('gifts','A little gift inspiration','Find something thoughtful for the people you love.','/gifts'),('tech','Clever little discoveries','Explore useful technology and gadget ideas.','/trending'),('essentials','Make everyday a little better','Discover practical ideas for home and daily routines.','/essentials'),('holiday','Make the season memorable','Explore seasonal inspiration for meaningful moments.','/deals')) s(interest,subject,intro,path)
 on conflict(week_of,interest) do nothing;
 get diagnostics n=row_count;return n;
end;$$;

revoke all on function dealwovo_private.prepare_newsletter_week() from public,anon,authenticated,service_role;
create function dealwovo_private.prepare_newsletter_owner() returns integer language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 return dealwovo_private.prepare_newsletter_week();
end;$$;
create function public.prepare_newsletter_owner() returns integer language sql security invoker set search_path='' as $$select dealwovo_private.prepare_newsletter_owner()$$;
create function dealwovo_private.review_newsletter_issue(p_id uuid,p_status text) returns boolean language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_status not in ('reviewed','archived') or p_status is null then return false;end if;
 update public.newsletter_issues set status=p_status,reviewed_at=now(),reviewed_by=auth.uid() where id=p_id and (status='draft' or (status='reviewed' and p_status='archived'));return found;
end;$$;
create function public.review_newsletter_issue(p_id uuid,p_status text) returns boolean language sql security invoker set search_path='' as $$select dealwovo_private.review_newsletter_issue(p_id,p_status)$$;
create function dealwovo_private.newsletter_status() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 return jsonb_build_object('collectionEnabled',(select collection_enabled from dealwovo_private.newsletter_activation where singleton),'pending',(select count(*) from dealwovo_private.newsletter_subscribers where status='pending'),'confirmed',(select count(*) from dealwovo_private.newsletter_subscribers where status='confirmed'),'unsubscribed',(select count(*) from dealwovo_private.newsletter_subscribers where status='unsubscribed'),'scheduled',exists(select 1 from cron.job where jobname='dealwovo-weekly-newsletter-drafts' and active));
end;$$;
create function public.newsletter_status() returns jsonb language sql stable security invoker set search_path='' as $$select dealwovo_private.newsletter_status()$$;
revoke all on function dealwovo_private.prepare_newsletter_owner(),public.prepare_newsletter_owner(),dealwovo_private.review_newsletter_issue(uuid,text),public.review_newsletter_issue(uuid,text),dealwovo_private.newsletter_status(),public.newsletter_status() from public,anon,authenticated;
grant execute on function dealwovo_private.prepare_newsletter_owner(),public.prepare_newsletter_owner(),dealwovo_private.review_newsletter_issue(uuid,text),public.review_newsletter_issue(uuid,text),dealwovo_private.newsletter_status(),public.newsletter_status() to authenticated;
select cron.schedule('dealwovo-weekly-newsletter-drafts','20 14 * * 1','select dealwovo_private.prepare_newsletter_week();');
notify pgrst,'reload schema';
