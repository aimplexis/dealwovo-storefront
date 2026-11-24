# Dealwovo Phase 4C — Awin publisher-feed readiness

## Decision and scope
- Dealwovo's first recommended network to **apply to** is Awin. Membership and individual advertiser/product-feed usage rights must be established through Awin before any actual product ingestion.
- This branch adds a **manual Awin Create-a-Feed CSV adapter**, not an authorized Awin account, a live feed API integration, or affiliate earnings.
- No credentials, feeds, publisher IDs, advertiser IDs, commission data, or retailer claims have been inserted.
- Awin publisher products remain subject to the existing source authorization control, RLS-protected private staging and draft-only promotion.
- We do **not** infer prices are USD: without an explicit `currency=USD` column, numeric Awin prices are intentionally imported as `null` for human checking. Non-USD rows are rejected.

## Awin product-feed mapping
| Awin export column | Dealwovo candidate |
| --- | --- |
| product_id | external_product_id |
| product_name | title |
| description or product_description | description |
| merchant_category or merchant_product_category_path | category_hint |
| image_url | image_url |
| aw_deep_link | affiliate_url |
| price or search_price (only when currency=USD) | price_cents |

Minimum headers: `product_id,product_name,aw_deep_link`.
Additional columns are accepted in any order. The adapter rejects duplicate IDs, invalid HTTPS links, unsupported currencies, invalid prices, and malformed rows. All imported records are private candidates only.

## User steps for the first real program
1. Apply as a publisher at Awin with `https://dealwovo.com` and a truthful editorial-discovery description. Be clear that the product catalog is in prelaunch and no verified offers are currently live.
2. Once network membership is approved, apply to suitable individual advertisers and confirm that the appropriate product-feed and image usage rights are granted.
3. Download a permitted **publisher** product feed through Awin Create-a-Feed. Keep any private download key, publisher ID or API token outside source control.
4. Open the Dealwovo **preview** Admin → Affiliate Import Studio. Create an Awin source, record the documented rights, choose the source, and upload a small CSV.
5. Review candidates privately, convert individually to draft products/offers, and verify prices against the retailer. Approve the public product/offer only when correct, licensed and not stale.
6. Confirm a real outbound redirect resolves and affiliate conversions are tracked by Awin's reporting before launch. Never equate a raw click with a paid conversion.

## Outstanding release gates
- Approved publisher account and advertiser program permissions are **not confirmed**.
- Browser sign-in and complete import workflow remain to be tested manually with the owner's credentials (never share password).
- Supabase leaked-password protection warning remains.
- No production `dealwovo.com` deployment or environment variables changed.

## Primary references (accessed Nov 24, 2026)
- Awin publisher product feed overview: https://help.awin.com/developers/docs/product-feed-publisher-guide-intro
- Awin Product Feed list and download: https://help.awin.com/developers/docs/downloading-a-list-of-your-product-feeds
- Awin publisher FAQ: https://help.awin.com/developers/docs/faqs-for-publishers
- Awin publisher signup: https://success.awin.com/s/article/How-do-I-join-Awin-as-a-Publisher?language=en_US
