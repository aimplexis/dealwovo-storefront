# Dealwovo Phase 3 — Catalog and Admin Deployment

## Current state
This branch is safe to preview with **no Supabase credentials**. The public `/shop` route displays an honest prelaunch empty state; `/admin` is fail-closed. No real affiliate products are seeded, prices fabricated, or production keys committed.

## Connect a dedicated Supabase project
1. Connect the Supabase integration in ChatGPT (or create a dedicated project at https://supabase.com/dashboard). Do not point to Frhairshop's existing database.
2. In Supabase SQL Editor, run `supabase/migrations/20261124_001_catalog_foundation.sql` **before** setting application credentials. Inspect the created RLS policies.
3. Create one account through **Supabase → Authentication → Users**. Record only its user UUID, never its password.
4. Grant the account owner access using Supabase SQL Editor:
   `insert into public.catalog_admins (user_id,role) values ('REAL-USER-UUID','owner');`
   This is intentionally a manual, privileged bootstrap; the web app cannot grant itself admin rights.
5. Set Vercel **Preview** environment variables for the feature branch:
   - `NEXT_PUBLIC_SUPABASE_URL`: from Supabase → Project settings → API
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`: publishable project key (or `NEXT_PUBLIC_SUPABASE_ANON_KEY` for a legacy anon key)
   Neither variable is a service-role key. NEVER use `service_role` / secret key in `NEXT_PUBLIC_` settings.
6. Trigger a **new preview build** after changing env vars; validate `/admin/login`, `/admin`, `/shop` and authenticated editing.
7. Only after RLS/QA, configure the same safe publishable variables in production and merge the approved branch.

## Admin workflow
- Access `/admin/login` (sign in with the pre-authorized Supabase Auth user).
- Create a **draft category**, **draft merchant**, and **draft product**.
- Add a **draft offer** with an approved-for-use affiliate destination.
- Review merchant, category, and product, then change their statuses to approved/published.
- Finally verify affiliate URL, merchant rights, price and availability independently; specify a future expiration and explicitly confirm verification before approving an offer. An offer that expires disappears automatically.
- Every mutation appends an audit event. Admin auth is checked **again** in every server action. Supabase RLS enforces it at the database layer.
- Shop pages never show a draft, paused, unverified, or expired offer.

## Manual RLS/security QA gate
- Anonymous: select from catalog_offers returns no drafts, paused, expired, or unverified rows.
- Anonymous: direct REST insert/update/delete to all catalog tables denied.
- Non-admin authenticated: no access to private catalog draft rows, writes, or admin events.
- Non-admin users cannot grant themselves membership in catalog_admins.
- Owner authenticated: can add drafts and publish, but must affirm verification for offers.
- Expired offer becomes invisible immediately (without cron).
- Logout invalidates access; refresh browser and confirm /admin redirects to login.
- Verify account session persistence, mobile layout, WCAG focus states, all affiliate URLs.
- Confirm no service-role keys appear in environment variables or source.
- Avoid SEO indexing until product content and legal disclosures are launch-ready.

## Data choices
- Authoritative product records are separate from merchant-specific offers; different retailers may list the same product.
- Prices are cents in USD; no comparison pricing is invented and no checkout happens on Dealwovo.
- Only a verified, unexpired, approved offer from an approved merchant and published product/category is publicly selectable.
- Affiliate outbound links are marked `rel="sponsored nofollow noopener noreferrer"`.
- No unnecessary tracking or personal data collection was added in this phase.

## Remaining work before launch
Supabase project connection, database migration execution, first admin bootstrap, authorized affiliate feed import, actual image/media usage rights, product verification and legal review, browser-based UX and security QA, monitoring, and production approval.
