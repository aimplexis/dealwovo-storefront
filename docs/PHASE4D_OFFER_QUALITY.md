# Dealwovo Phase 4D — Offer Quality Command Center

## Purpose
A private, human-supervised dashboard that makes it easier to manage catalog trust before and after launching real retailer offers. The feature does not invent products, claim external price or inventory verification, or connect to unapproved affiliates.

## Preview route
`/admin/quality` requires a Supabase Auth user in the catalog_admins allowlist. The report is force-dynamic, noindex, and only queries data accessible through existing admin RLS policies. A failure to read any required table displays an error rather than fake zero alerts.

## Database eligibility rules
- **Eligible:** approved offer, verified in the past, expires in more than 72 hours, linked to a published product in a published category and an approved merchant.
- **Expires soon:** same as eligible, but the verification expires in 72 hours or less. These offers remain visible until expiry under existing public RLS.
- **Expired:** approved offer has an expired verification window. Public RLS hides it even though its database status remains approved.
- **Blocked:** approved offer is missing valid timestamps or has a product/category/merchant that is not public/approved.
- **Draft / paused:** not publicly eligible.

The classification function is pure and deterministic (`src/lib/catalog/quality.ts`). It supports unit tests without querying Supabase. The dashboard currently reads at most **500 recent records per table** and shows a warning if any table hits that limit; comprehensive pagination is required at scale.

## Human remediation
- An authorized admin can click **Pause offer now**. The server revalidates their user and role, updates only an approved offer, clears approval timestamps, and invalidates Shop/admin caches. The existing RLS and audit trigger apply.
- Resuming/approving still requires a new manual verification in the Catalog Command Center.
- No automatic publication, remote URL probing, forced takedowns, automated price changes, or claimed commission tracking.

## Verification checklist
- Unauthenticated visitors do not reach private metrics.
- Empty catalog shows onboarding steps rather than fake alerts.
- Approved current offer with all dependencies: eligible; expiring within 72 hours: expiring; expired: expired; inactive merchant or draft product: blocked.
- Draft and paused offers do not appear in eligible count.
- Clicking Pause updates an approved offer and clears its verification timestamps, which immediately disables outbound navigation.
- Error response or incomplete results show warnings and no false claims.
- Performance at more than 500 records requires pagination; see UI warning.
- Supabase security advisor and original public Shop checks must pass.
- Human UI sign-in and click tests remain necessary before production release.

## Release gates
Affiliate authorization and first licensed product feed remain unconfirmed. The database currently has no products or affiliate offers. Preview only; do not merge to production until live browser authentication, first approved merchant, and user review are complete.
