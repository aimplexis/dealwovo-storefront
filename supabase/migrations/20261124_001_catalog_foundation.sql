-- Dealwovo Phase 3: affiliate-first catalog. Run against an isolated Supabase project.
-- Policies intentionally default to DENY; anonymous users only see published / verified / unexpired offers.
create extension if not exists pgcrypto;

create table if not exists public.catalog_admins (
 user_id uuid primary key references auth.users(id) on delete cascade,
 role text not null check (role in ('owner','editor')),
 created_at timestamptz not null default now()
);
alter table public.catalog_admins enable row level security;
revoke all on public.catalog_admins from anon;
grant select on public.catalog_admins to authenticated;
create policy "admin membership visible only to self"
 on public.catalog_admins for select to authenticated using (user_id=(select auth.uid()));

-- Deliberately SECURITY DEFINER: this function checks membership without recursive RLS.
-- Only a database operator with SQL Editor access can initially grant roles.
create or replace function public.is_catalog_admin()
returns boolean language sql stable security definer
set search_path=''
as $$
 select exists(select 1 from public.catalog_admins where user_id=(select auth.uid()) and role in ('owner','editor'));
$$;
revoke all on function public.is_catalog_admin() from public;
grant execute on function public.is_catalog_admin() to authenticated;

create table if not exists public.catalog_categories (
 id uuid primary key default gen_random_uuid(),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 name text not null check(length(name) between 2 and 100),
 status text not null default 'draft' check (status in ('draft','published')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.catalog_merchants (
 id uuid primary key default gen_random_uuid(),
 name text not null check(length(name) between 2 and 130),
 website_url text check(website_url is null or website_url ~* '^https://[^[:space:]]+$'),
 status text not null default 'draft' check(status in ('draft','approved','disabled')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.catalog_products (
 id uuid primary key default gen_random_uuid(),
 category_id uuid not null references public.catalog_categories(id) on delete restrict,
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 title text not null check(length(title) between 3 and 180),
 description text not null default '',
 image_url text check(image_url is null or image_url ~* '^https://[^[:space:]]+$'),
 status text not null default 'draft' check(status in ('draft','published','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.catalog_offers (
 id uuid primary key default gen_random_uuid(),
 product_id uuid not null references public.catalog_products(id) on delete restrict,
 merchant_id uuid not null references public.catalog_merchants(id) on delete restrict,
 affiliate_url text not null check(affiliate_url ~* '^https://[^[:space:]]+$'),
 price_cents bigint check(price_cents is null or price_cents >= 0),
 currency text not null default 'USD' check(currency='USD'),
 status text not null default 'draft' check(status in ('draft','approved','paused')),
 verified_at timestamptz,
 expires_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 constraint approved_requires_valid_verification
 check (status <> 'approved' or (verified_at is not null and expires_at is not null and expires_at > verified_at))
);
create table if not exists public.catalog_admin_events (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id) on delete restrict,
 entity_type text not null check(entity_type in ('category','merchant','product','offer')),
 entity_id uuid not null,
 operation text not null check(length(operation) between 2 and 60),
 created_at timestamptz not null default now()
);

create index if not exists idx_catalog_product_status_category on public.catalog_products(status,category_id);
create index if not exists idx_catalog_offer_status_dates on public.catalog_offers(status,expires_at);
create index if not exists idx_catalog_offer_product on public.catalog_offers(product_id);
create index if not exists idx_catalog_admin_event_recent on public.catalog_admin_events(created_at desc);

create or replace function public.touch_catalog_updated_at()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end;
$$;
create trigger touch_catalog_categories before update on public.catalog_categories
 for each row execute function public.touch_catalog_updated_at();
create trigger touch_catalog_merchants before update on public.catalog_merchants
 for each row execute function public.touch_catalog_updated_at();
create trigger touch_catalog_products before update on public.catalog_products
 for each row execute function public.touch_catalog_updated_at();
create trigger touch_catalog_offers before update on public.catalog_offers
 for each row execute function public.touch_catalog_updated_at();

alter table public.catalog_categories enable row level security;
alter table public.catalog_merchants enable row level security;
alter table public.catalog_products enable row level security;
alter table public.catalog_offers enable row level security;
alter table public.catalog_admin_events enable row level security;

-- Anon may read only published classifications and approved merchants/products.
create policy "published categories are public" on public.catalog_categories
 for select to anon,authenticated using(status='published');
create policy "approved merchants are public" on public.catalog_merchants
 for select to anon,authenticated using(status='approved');
create policy "published products are public" on public.catalog_products
 for select to anon,authenticated using(
 status='published' and exists(select 1 from public.catalog_categories c where c.id=category_id and c.status='published')
);
-- The offer policy is the final public safety gate.
create policy "verified current offers are public" on public.catalog_offers
 for select to anon,authenticated using(
 status='approved' and verified_at is not null and verified_at <= now()
 and expires_at > now()
 and exists(select 1 from public.catalog_products p
  join public.catalog_categories c on c.id=p.category_id
  where p.id=product_id and p.status='published' and c.status='published')
 and exists(select 1 from public.catalog_merchants m
  where m.id=merchant_id and m.status='approved')
);

create policy "admins can read categories" on public.catalog_categories for select to authenticated using((select public.is_catalog_admin()));
create policy "admins can read merchants" on public.catalog_merchants for select to authenticated using((select public.is_catalog_admin()));
create policy "admins can read products" on public.catalog_products for select to authenticated using((select public.is_catalog_admin()));
create policy "admins can read offers" on public.catalog_offers for select to authenticated using((select public.is_catalog_admin()));
create policy "admins can write categories" on public.catalog_categories for all to authenticated
 using((select public.is_catalog_admin())) with check((select public.is_catalog_admin()));
create policy "admins can write merchants" on public.catalog_merchants for all to authenticated
 using((select public.is_catalog_admin())) with check((select public.is_catalog_admin()));
create policy "admins can write products" on public.catalog_products for all to authenticated
 using((select public.is_catalog_admin())) with check((select public.is_catalog_admin()));
create policy "admins can write offers" on public.catalog_offers for all to authenticated
 using((select public.is_catalog_admin())) with check((select public.is_catalog_admin()));
create policy "admins can read audit" on public.catalog_admin_events for select to authenticated
 using((select public.is_catalog_admin()));
create policy "admins can append audit" on public.catalog_admin_events for insert to authenticated
 with check((select public.is_catalog_admin()) and actor_id=(select auth.uid()));

-- The audit log is append-only through the API; only SQL administrators can alter it.
revoke update,delete on public.catalog_admin_events from anon,authenticated;
revoke all on public.catalog_admins from anon;
revoke insert,update,delete on public.catalog_admins from authenticated;
grant select on public.catalog_admins to authenticated;
grant select on public.catalog_categories,public.catalog_merchants,public.catalog_products,public.catalog_offers to anon,authenticated;
grant insert,update,delete on public.catalog_categories,public.catalog_merchants,public.catalog_products,public.catalog_offers to authenticated;
grant select,insert on public.catalog_admin_events to authenticated;
grant usage,select on sequence public.catalog_admin_events_id_seq to authenticated;

-- FIRST ADMIN: create a user in Supabase Authentication, then execute in SQL Editor
-- insert into public.catalog_admins(user_id,role) values ('REPLACE-WITH-REAL-USER-UUID','owner');
-- No role assignments are ever available via public client APIs.
