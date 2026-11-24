-- Optional, explicitly selected editorial department. No category or public product created automatically.
alter table public.catalog_amazon_links add column category_key text check(category_key is null or category_key in ('electronics','home','kitchen','beauty','fashion','toys','wellness','sports','pets','office','travel','essentials'));
grant insert(category_key) on public.catalog_amazon_links to authenticated;
notify pgrst,'reload schema';
