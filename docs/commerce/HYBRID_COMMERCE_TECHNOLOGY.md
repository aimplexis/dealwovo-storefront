# Hybrid commerce technology direction — November 26, 2026

Status: proposed integration architecture; not live commerce, provider approval, or release authorization.

## Commercial objective
One year-round discovery storefront with two explicitly distinct purchase paths: authorized affiliate retailer referrals and selected supplier-fulfilled retail sales. Keep existing Next.js, Vercel and Supabase investments. Prefer proven provider infrastructure over additional internal dashboards, synthetic research, or custom checkout.

## Verified technology references
- Shopify Fall 2026 developer release: https://www.shopify.com/news/fall-26-edition-developer
- Headless storefront and hosted cart checkout: https://shopify.dev/docs/storefronts/headless/overview and https://shopify.dev/docs/storefronts/headless/building-with-the-storefront-api/cart/manage
- Shopify Collective retailer capabilities and eligibility: https://help.shopify.com/en/manual/online-sales-channels/shopify-collective/retailers and https://help.shopify.com/en/manual/online-sales-channels/shopify-collective/retailers/requirements-and-considerations/
- Alternative supplier integration: https://apps.shopify.com/DSers
- Amazon Creators API: https://affiliate-program.amazon.com/creatorsapi/docs/
- Awin publisher product feeds: https://help.awin.com/developers/docs/product-feed-publisher-guide-intro
- Google merchant restrictions for affiliate links: https://support.google.com/merchants/answer/12756116
- Google product markup: https://developers.google.com/search/docs/appearance/structured-data/product
- Google AI search guidance: https://developers.google.com/search/docs/appearance/ai-features
- OpenAI merchant discovery and merchant-owned checkout direction: https://chatgpt.com/merchants/
- Supabase hybrid search: https://supabase.com/docs/guides/ai/hybrid-search

## Implementation sequence and acceptance
1. Verify existing release candidate; inspect actual source permissions and eligible inventory. Obtain owner confirmation of a permitted affiliate provider; import 10–20 real items using licensed feed or authorized manual method. Test expired offer exclusion, attribution allowed by partner and actual retailer handoff. No simulated earnings.
2. Evaluate a Shopify development environment, plan costs, Collective eligibility and supplier agreements before connecting any store. Use an official Storefront API version and hosted checkout, not custom card collection. No subscription, paid app, production credentials or supplier agreement without owner approval.
3. Implement distinct purchase modes only once actual providers exist. Affiliate CTA identifies retailer and commission disclosure; retail CTA uses live eligible Shopify variant and hosted checkout. Affiliate products cannot enter retail cart. Retail inventory, variants, prices, shipping and orders have Shopify as source of truth. No fabricated availability. Test order, cancellation, refund, supplier tracking and duplicate webhook delivery before activation.
4. Validate samples, supplier delivery, returns, product safety, landed cost and contribution margin before publishing a dropship product. Dealwovo remains responsible for customer service and applicable retail obligations.
5. Activate organic Search only after approved release and policy review. Use accurate visible product data, canonical URLs and original buying advice; no fabricated ratings or bulk thin affiliate pages. Merchant Center only for eligible retail products, not standard affiliate links. Apply for merchant feed discovery only where permitted. No promise of ranking or partner acceptance.
6. Add keyword plus semantic search only after representative inventory exists and measured retrieval defects justify embeddings. Evaluate relevance, zero-result rate, latency and cost using real shopper queries. Ground answers in current catalog; do not invent products, stock or prices.
7. Consider UCP and other agentic interfaces only after underlying merchant catalog, checkout and operational policies are proven. Do not build standalone ACP checkout merely to chase an announced protocol.

## Commercial metrics
Track eligible catalog, qualified sessions, retailer clicks, partner-reported qualifying sales, net confirmed commissions, retail paid orders, refund rates, fulfillment performance, contribution profit, acquisition cost and repeat visits. Use approved privacy-respecting measurement and reconcile partner statements; forecasts are not actual revenue.

## Holds
Private preview, English US, no shareable preview access, no paid subscriptions, no live checkout, no production release, no indexing, no external posting, no Amazon reactivation without separate approval. Existing affiliate-first rollout remains the initial launch sequence; hybrid is the intended subsequent architecture. No vendor account or API access is presumed.
