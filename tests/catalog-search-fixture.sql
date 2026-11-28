-- Synthetic records for isolated PostgreSQL CI only. Never import into a commercial catalog.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
create table public.catalog_categories(id integer primary key,slug text,name text,status text);
create table public.catalog_merchants(id integer primary key,name text,status text);
create table public.catalog_products(id integer primary key,slug text,title text,description text,image_url text,category_id integer,status text);
create table public.catalog_offers(id integer primary key,product_id integer,merchant_id integer,price_cents integer,currency text,status text,verified_at timestamptz,expires_at timestamptz);
insert into public.catalog_categories values (1,'electronics','Electronics','published'),(2,'private','Private','draft');
insert into public.catalog_merchants values (1,'Fixture retailer','approved'),(2,'Private retailer','draft');
insert into public.catalog_products values (1,'fixture','Fixture headphones','Synthetic audio',null,1,'published'),(2,'private-product','Fixture headphones','Synthetic audio',null,1,'draft'),(3,'private-category','Fixture headphones','Synthetic audio',null,2,'published');
insert into public.catalog_offers select id,1,1,price,'USD','approved',now()-interval '1 day',now()+interval '1 day' from (values(1,7549),(2,7550),(3,7551),(4,0),(5,null),(6,-1)) v(id,price);
insert into public.catalog_offers values
(7,1,1,100,'EUR','approved',now()-interval '1 day',now()+interval '1 day'),
(8,1,1,100,'USD','approved',now()-interval '2 days',now()-interval '1 day'),
(9,1,1,100,'USD','draft',now()-interval '1 day',now()+interval '1 day'),
(10,2,1,100,'USD','approved',now()-interval '1 day',now()+interval '1 day'),
(11,3,1,100,'USD','approved',now()-interval '1 day',now()+interval '1 day'),
(12,1,2,100,'USD','approved',now()-interval '1 day',now()+interval '1 day'),
(13,1,1,100,'USD','approved',now()+interval '1 hour',now()+interval '1 day'),
(14,1,1,100,'USD','approved',now()-interval '1 day',now()+interval '40 days');
insert into public.catalog_products values (4,'pagination-fixture','Pagination fixture','Synthetic',null,1,'published');
insert into public.catalog_offers select n,4,1,n,'USD','approved',now()-interval '1 day',now()+interval '1 day' from generate_series(101,126) n;
grant select on public.catalog_categories,public.catalog_merchants,public.catalog_products,public.catalog_offers to anon;
