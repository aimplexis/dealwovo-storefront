-- Canonical shopping departments. Add missing draft rows; never overwrite existing categories.
insert into public.catalog_categories(slug,name,status)
select v.slug,v.name,'draft' from (values
 ('electronics','Electronics & Gadgets'),
 ('home','Home & Living'),
 ('kitchen','Kitchen & Dining'),
 ('beauty','Beauty & Personal Care'),
 ('fashion','Fashion & Accessories'),
 ('toys','Toys & Games'),
 ('wellness','Health & Wellness'),
 ('sports','Sports & Outdoors'),
 ('pets','Pets & Accessories'),
 ('office','Office & Productivity'),
 ('travel','Travel & Accessories'),
 ('essentials','Everyday Essentials')
) as v(slug,name)
on conflict(slug) do nothing;
-- Owner may explicitly publish a reviewed empty department; use individual catalog review if it contains products.
create function dealwovo_private.publish_empty_departments(p_slugs text[]) returns integer
language plpgsql security definer set search_path='' as $$
declare n integer; r record;
begin
 if auth.uid() is null or not exists(select 1 from public.catalog_admins where user_id=auth.uid() and role='owner') then raise exception 'Owner required' using errcode='42501';end if;
 if p_slugs is null or cardinality(p_slugs) not between 1 and 12 or array_position(p_slugs,null) is not null or (select count(distinct x) from unnest(p_slugs) x)<>cardinality(p_slugs) then raise exception 'Invalid department selection' using errcode='22023';end if;
 if (select count(*) from (values ('electronics','Electronics & Gadgets'),
 ('home','Home & Living'),
 ('kitchen','Kitchen & Dining'),
 ('beauty','Beauty & Personal Care'),
 ('fashion','Fashion & Accessories'),
 ('toys','Toys & Games'),
 ('wellness','Health & Wellness'),
 ('sports','Sports & Outdoors'),
 ('pets','Pets & Accessories'),
 ('office','Office & Productivity'),
 ('travel','Travel & Accessories'),
 ('essentials','Everyday Essentials')) as v(slug,name) where v.slug=any(p_slugs))<>cardinality(p_slugs) then raise exception 'Unknown department' using errcode='22023';end if;
 -- Lock category rows before checking products, so concurrent FK insertion cannot bypass the empty-category check.
 for r in select c.id,c.slug,c.name,c.status,v.name as expected from public.catalog_categories c join (values ('electronics','Electronics & Gadgets'),
 ('home','Home & Living'),
 ('kitchen','Kitchen & Dining'),
 ('beauty','Beauty & Personal Care'),
 ('fashion','Fashion & Accessories'),
 ('toys','Toys & Games'),
 ('wellness','Health & Wellness'),
 ('sports','Sports & Outdoors'),
 ('pets','Pets & Accessories'),
 ('office','Office & Productivity'),
 ('travel','Travel & Accessories'),
 ('essentials','Everyday Essentials')) as v(slug,name) on v.slug=c.slug where c.slug=any(p_slugs) order by c.slug for update of c loop
  if r.name<>r.expected or r.status<>'draft' or exists(select 1 from public.catalog_products p where p.category_id=r.id) then raise exception 'Department requires individual review' using errcode='23514';end if;
 end loop;
 update public.catalog_categories c set status='published' where c.slug=any(p_slugs) and c.status='draft';
 get diagnostics n=row_count;
 if n<>cardinality(p_slugs) then raise exception 'Department selection changed' using errcode='23514';end if;
 return n;
end;$$;
create function public.publish_empty_departments(p_slugs text[]) returns integer language sql security invoker set search_path='' as $$select dealwovo_private.publish_empty_departments(p_slugs)$$;
revoke all on function dealwovo_private.publish_empty_departments(text[]),public.publish_empty_departments(text[]) from public,anon,authenticated;
grant execute on function dealwovo_private.publish_empty_departments(text[]),public.publish_empty_departments(text[]) to authenticated;
notify pgrst,'reload schema';
