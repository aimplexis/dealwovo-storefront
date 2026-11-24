# Dealwovo Phase 4B — Controlled Partner Feed Intake

## Architecture
- Only registered, explicitly authorized product-feed sources can receive a manual CSV import.
- The Import Studio is under `/admin/imports`, using the same verified Supabase Auth identity and allowlisted administrator role as the Catalog Command Center.
- The source authorization requires the owner's written attestation of official partner permission, product images, links and permitted marketing scope. This does **not** independently establish that network approval exists.
- Strict CSV format: `external_product_id,title,description,category_hint,image_url,affiliate_url,price_usd`.
- Maximum 100 rows and 100 KB per file, UTF-8; comma and quoted-cell parsing supported, duplicates within the batch rejected.
- No automatic affiliate network connections, scraping, checkout, product publication, or price claims.
- SQL RLS denies `anon` access to all feed sources, batches, and candidates. Admin actions revalidate the Auth user; owner only can authorize sources. A database trigger also enforces the owner-only permission to avoid relying solely on the UI.
- A candidate is promoted only when an administrator explicitly chooses a catalog category, a registered merchant, and an original slug. The transactional Postgres function creates a **draft** product and a **draft** offer together.
- Publishing/verified pricing remains the separate human approval gate in `/admin`. Current affiliate tracking reports and commissions remain unconnected.

## DB migration
- `20261124_006_feed_intake_staging.sql`: three private-to-anon RLS protected tables, audit triggers, and draft conversion RPC.
- `20261124_007_feed_authorization_owner_guard.sql`: enforce owner-only transition to/from authorized feed sources at the database layer.
- Run on the **dedicated Dealwovo Supabase project**, not a shared project; validate security advisor and rollback test cases.
- All migration changes are additive; production `dealwovo.com` is not connected to this database.

## Preview checks before merging
- Unauthenticated `/admin/imports` redirects to login.
- Anon has no SELECT, INSERT or UPDATE on any feed tables.
- Non-admin authenticated user cannot insert or read feed tables.
- Editor cannot self-authorize a feed source via REST.
- Owner can create draft source, attach rights evidence, and mark it authorized.
- Import rejects malformed columns, duplicate external_product_id, invalid URLs, too many rows and oversize files.
- Valid private candidate import never changes public products.
- Conversion creates draft product + offer and records audit events; public Shop stays empty.
- Repeated conversion of the same candidate fails.
- Use transaction-only test records and roll back; never invent live retailer partners.

## Actual affiliate launch prerequisites
1. Apply and get approved by at least one actual affiliate partner; verify the feed agreement and image usage rights.
2. Register that partner with appropriate documented permission evidence.
3. Import a small licensed CSV, review candidate fields, and promote drafts.
4. Verify actual prices and availability, approve the products and offers through the existing admin human review.
5. Test external merchant redirects and network conversion reporting, then evaluate production rollout.
