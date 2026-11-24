# Dealwovo Phase 4A — Verified product navigation (preview only)

## What this delivers
- Real verified products appear on `/shop`, with product titles pointing to `/product/[slug]`.
- The detail page uses the public publishable Supabase client and respects Row Level Security; it returns 404 unless a published product has at least one approved, unexpired retailer offer.
- Clicking an approved offer navigates through `/out/[offerId]`. This handler re-checks status and expiry at **click time**, uses the stored approved HTTPS destination (never a query-supplied URL), and responds with an uncached temporary redirect.
- Paused or expired offers receive a 404, not a redirect to stale marketing claims.
- Minimal operational event logs contain only offer UUIDs; clicks are **not** sales or verified affiliate conversions. No visitor IP or user agent is added to app logs by this feature.
- The existing guest cart/checkout remains disabled; affiliate purchases happen on merchant websites.

## QA checklist
- Invalid offer UUID: HTTP 404.
- Draft/expired/paused offer: HTTP 404.
- Valid approved offer: HTTP 302 to stored HTTPS affiliate URL.
- No URL parameter can override redirect target; no redirect to localhost/private network.
- Product page for slug without verified offers: 404.
- A legitimate current offer displays the merchant/price, disclosure and functional button.
- Admin editing an approved offer resets status to draft, making its old outbound link unavailable.
- Test real merchant media rights and affiliation before publishing any item.
- Test mobile layout and keyboard focus. Run manual authenticated login QA after user signs in.

## Next integrations
Obtain at least one actual retailer/affiliate program approval and its documented feed/API agreement. Build provider-specific import adapters with a staging/approval layer before showing feed products. Commission attribution and conversions should come from the authorized affiliate network reports, not raw click logs.

This change is isolated on `feature/phase4-verified-product-navigation` and should not be merged into production while Phase 3B still awaits browser-level admin QA.
