-- Seasonal editorial context, shared by the manual and scheduled planners.
-- US retail calendar; preparation windows are editorial defaults, not sales forecasts.
create function dealwovo_private.easter_date(y integer) returns date
language plpgsql immutable strict set search_path='' as $$
declare a integer:=y%19; b integer:=y/100; c integer:=y%100;
 d integer:=b/4; e integer:=b%4; f integer:=(b+8)/25;
 g integer:=(b-f+1)/3; h integer:=(19*a+b-d-g+15)%30;
 i integer:=c/4; k integer:=c%4; l integer:=(32+2*e+2*i-h-k)%7;
 m integer:=(a+11*h+22*l)/451; n integer:=h+l-7*m+114;
begin return make_date(y,n/31,n%31+1); end; $$;

create function dealwovo_private.seasonal_calendar(as_of date)
returns table(event_name text,event_date date,prep_days integer,theme text,categories text)
language sql stable set search_path='' as $$
 with years as (
 select y from generate_series(extract(year from as_of)::int,extract(year from as_of)::int+1) y
 ), dates as (
 select y,make_date(y,11,1)+( (4-extract(dow from make_date(y,11,1))::int+7)%7)+21 as thanksgiving,
 make_date(y,5,1)+((7-extract(dow from make_date(y,5,1))::int)%7)+7 as mothers,
 make_date(y,6,1)+((7-extract(dow from make_date(y,6,1))::int)%7)+14 as fathers,
 dealwovo_private.easter_date(y) as easter from years
 )
 select v.event_name,v.event_date,v.prep_days,v.theme,v.categories
 from dates d cross join lateral (values
 ('New Year',make_date(d.y,1,1),14,'Fresh starts and everyday organization','Home, organization, wellness'),
 ('Valentine''s Day',make_date(d.y,2,14),28,'Thoughtful gifts for loved ones','Gifts, accessories, home'),
 ('Easter',d.easter,28,'Spring celebrations and family gifting','Home, family, seasonal decor'),
 ('Mother''s Day',d.mothers,28,'Thoughtful appreciation gifts','Gifts, beauty, home'),
 ('Father''s Day',d.fathers,28,'Practical and personal gifts','Tech, tools, accessories'),
 ('Independence Day',make_date(d.y,7,4),21,'Summer gatherings and everyday essentials','Outdoor, kitchen, travel'),
 ('Back-to-school planning',make_date(d.y,8,15),42,'School preparation and organization','Office, tech, essentials'),
 ('Halloween',make_date(d.y,10,31),35,'Creative seasonal inspiration','Decor, family, accessories'),
 ('Thanksgiving & Black Friday',d.thanksgiving+1,35,'Holiday discovery and smart shopping','Tech, home, gifts'),
 ('Cyber Monday',d.thanksgiving+4,21,'Thoughtful online shopping and tech discovery','Electronics, gadgets, home'),
 ('Christmas',make_date(d.y,12,25),42,'Thoughtful gifts and holiday gatherings','Gifts, home, kitchen'),
 ('After-Christmas discovery',make_date(d.y,12,28),3,'Year-end discovery and practical essentials','Home, organization, essentials')
 ) v(event_name,event_date,prep_days,theme,categories)
 where v.event_date>=as_of
 order by v.event_date,v.event_name;
$$;
revoke all on function dealwovo_private.easter_date(integer),dealwovo_private.seasonal_calendar(date) from public,anon,authenticated;

-- Both existing planners insert into the same run/draft tables. Context is derived
-- from database time, not from an untrusted client. Existing records are unchanged.
create function dealwovo_private.attach_season_to_run()
returns trigger language plpgsql security invoker set search_path='' as $$
declare e record;
begin
 select * into e from dealwovo_private.seasonal_calendar((new.created_at at time zone 'UTC')::date) c
 where c.event_date-(new.created_at at time zone 'UTC')::date<=c.prep_days limit 1;
 if found then new.summary:=left(new.summary||' Seasonal focus: '||e.event_name||' ('||e.event_date::text||').',1000); end if;
 return new;
end; $$;
revoke all on function dealwovo_private.attach_season_to_run() from public,anon,authenticated;
create trigger marketing_season_run before insert on public.marketing_agent_runs
for each row execute function dealwovo_private.attach_season_to_run();

create function dealwovo_private.attach_season_to_draft()
returns trigger language plpgsql security invoker set search_path='' as $$
declare e record; run_day date; v_offer_count integer;
begin
 select (created_at at time zone 'UTC')::date,verified_offer_count into run_day,v_offer_count
 from public.marketing_agent_runs where id=new.run_id;
 select * into e from dealwovo_private.seasonal_calendar(run_day) c where c.event_date-run_day<=c.prep_days limit 1;
 if found then
  new.campaign_name:=left(e.event_name||' / '||new.campaign_name,130);
  new.hook:=case new.channel when 'instagram' then 'A little inspiration for '||e.event_name||'.'
   when 'facebook' then 'Planning ahead for '||e.event_name||'?'
   when 'pinterest' then e.event_name||': ideas worth saving.'
   else 'A thoughtful shopping guide for '||e.event_name end;
  new.body:=case new.channel
   when 'instagram' then 'Explore ideas for '||lower(e.theme)||'. Start with what matters to you and save inspiration for later. Explore Dealwovo.'
   when 'facebook' then 'Make your plans more intentional. Explore editorial ideas around '||lower(e.theme)||'. Compare retailer details independently before buying.'
   when 'pinterest' then 'Create an inspiration board around '||lower(e.theme)||'. Suggested discovery categories: '||e.categories||'. Use licensed visuals only.'
   else 'Draft guide: '||e.theme||'. Research current retailer evidence, compare only verified options, disclose affiliate relationships, and confirm all claims before publication.' end;
  new.supporting_evidence:='US editorial calendar: '||e.event_name||' on '||e.event_date::text||'. Catalog snapshot: '||v_offer_count::text||' verified offers; no offer claims made.';
  new.compliance_note:='Private seasonal inspiration only. No asserted discounts, inventory, shipping guarantees or rankings. Human evidence and licensing review required before publication.';
  new.suggested_day:=least(greatest(coalesce(new.suggested_day,run_day),run_day),e.event_date);
 end if;
 return new;
end; $$;
revoke all on function dealwovo_private.attach_season_to_draft() from public,anon,authenticated;
create trigger marketing_season_draft before insert on public.marketing_campaign_drafts
for each row execute function dealwovo_private.attach_season_to_draft();

-- Read-only admin calendar API. The private helper is not a public endpoint.
create function dealwovo_private.marketing_season_preview()
returns table(event_name text,event_date date,prep_days integer,theme text,categories text,days_until integer)
language plpgsql stable security definer set search_path='' as $$
declare today date:=(now() at time zone 'UTC')::date;
begin
 if auth.uid() is null or not dealwovo_private.is_catalog_admin() then raise exception 'catalog administrator required' using errcode='42501'; end if;
 return query select c.event_name,c.event_date,c.prep_days,c.theme,c.categories,c.event_date-today
 from dealwovo_private.seasonal_calendar(today) c limit 6;
end; $$;
revoke all on function dealwovo_private.marketing_season_preview() from public,anon,authenticated;
grant execute on function dealwovo_private.marketing_season_preview() to authenticated;
create function public.marketing_season_preview()
returns table(event_name text,event_date date,prep_days integer,theme text,categories text,days_until integer)
language sql stable security invoker set search_path='' as $$ select * from dealwovo_private.marketing_season_preview(); $$;
revoke all on function public.marketing_season_preview() from public,anon,authenticated;
grant execute on function public.marketing_season_preview() to authenticated;
notify pgrst,'reload schema';
