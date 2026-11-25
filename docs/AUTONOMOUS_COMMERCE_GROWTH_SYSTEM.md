# Dealwovo Autonomous Commerce & Growth System
Founder directive, 2026-11-24: maximize sustainable commercial contribution with a comprehensive SEO, acquisition, merchandising, affiliate, selective dropshipping and human-supervised AI workforce. Extend COMMERCIAL_TOOLSET_ROADMAP.md and REVENUE_FIRST_OPERATING_MANDATE.md. This is a proposed implementation specification, not completed functionality, authorization or earnings guarantee.

## 1. North star and sequencing
Net contribution from qualifying affiliate commissions and eventually direct-sale orders, after reversals, fulfillment, refunds, payments, acquisition, software and attributable labor. Track cash separately. Revenue is not visits or gross merchandise value. Establish pilot assortment of 10–20 authorized products now; 100 distinct eligible products is a target, not a launch prerequisite. Balanced holiday deals and gifting year-round, trending and evergreen essentials. United States initial audience. No independent expansion of generic administration.
P0 parallel work: actual account/advertiser authorization; sourced product opportunity research; commercially useful product-specific editorial assets; technical indexing release preparation; privacy/partner-approved attribution; first organic campaigns after approval.
P1: measured traffic acquisition and SEO intelligence, controlled search publication, reliable product feeds, consented retention, aggregate funnel reporting and expense accounting.
P2: scale validated profitable collections and channels, supervised automation and optional dropshipping pilot. No mass content, automatic spend or unapproved production releases.

## 2. SEO engine — workstreams and acceptance
- Technical SEO: current robots disallow all and page noindex/nofollow are intentional prelaunch holds. Prepare fail-closed production-only indexing configuration with explicit release approval and verified domain/environment. Preview/admin/API/outbound/search/wishlist/private utility routes remain excluded; robots disallow does not itself remove previously indexed pages. Validate HTTP statuses, canonical URLs, no redirect loops, clean slug routes, crawlable pagination, internal links, mobile layout and Core Web Vitals (field vs lab distinguished). Use an eligibility-gated XML sitemap for canonical, useful, public pages only, no fabricated lastmod; bounded product/category pagination, omit unavailable/empty/thin pages. Validate with Search Console and Bing Webmaster Tools; IndexNow only for eligible changed URLs after approval. No Google Indexing API for ordinary commerce pages.
- Search intelligence: Google Trends relative interest and seasonality, Google Keyword Planner/authorized Google Ads API estimates, Search Console first-party queries/impressions/clicks after domain verification, Bing search performance, optional Ahrefs/Semrush or DataForSEO only after cost approval. Evidence record must include query, geography, period, source, observation date, unit, uncertainty. Never equate relative trend score with sales, or ads competition with organic SEO difficulty.
- Content opportunity: cluster buyer intent (comparison, recipient, budget, use case, problem, occasion, category), map one primary intent to each URL, avoid cannibalization, propose original content briefs and evidence-backed buying guides. Examples: practical gifts under $25, compact kitchen tools, travel organizers. Hypotheses until researched. No copied retailer reviews, fake testing, fabricated rankings, mass doorway pages or link buying. Disclose research methodology and affiliate relationships, distinguish actual hands-on testing from researched comparisons. No keyword stuffing.
- On-page: useful headings, descriptive titles/meta, accessible image alt, original editorial photography or licensed imagery, descriptive links, breadcrumbs, helpful FAQ where appropriate without promising rich results, author/reviewer and update dates only when real, comparison methodology, distinct retailer CTAs. Qualify affiliate links as sponsored; maintain disclosures next to commercial recommendations. Do not claim unsupported stock, reference prices or savings.
- Structured data: Organization/WebSite/BreadcrumbList where accurate, Article for true editorial guides, eligible Product snippets for affiliate product pages only with documented required fields matching visible content and partner terms; no fake ratings/reviews/stock/price. Merchant listing schema and Merchant Center direct-sale feeds only for qualifying direct-purchase dropship products, not ordinary US affiliate redirects. Keep seller, shipping and returns accurate.
- Content lifecycle: proposed -> sourced -> drafted -> factual/legal/rights QA -> owner-reviewed -> published (approved production channel only) -> observed -> refresh/retire. Do not auto-publish bulk AI text. Internal link suggestions, broken-link checks, stale offers, duplicate intent detection, image rights, evidence expiry. Refresh based on real changes, not fake dates. Track pages indexed, clicks, CTR, conversions and contribution by page/collection. Do not promise rank or AI citations.
- AI search visibility: original, helpful factual content and crawlability, accessible text/images/video, entity consistency and clear source provenance. No special AI keyword stuffing, fake mentions, or guarantees. Monitor observed referrals separately when data available.

## 3. Traffic acquisition portfolio
| Channel | Execution | KPI |
|---|---|---|
| Google/Bing organic | Search intent guides, product and category architecture, seasonal landing pages, technical health | qualified search clicks, attributable contribution |
| Pinterest | Original shoppable inspiration, gift boards, seasonal pin assets, approved business API or manual publishing | qualified referral sessions and outbound CTR |
| TikTok/Reels/Shorts | Demonstrations only with real evidence, original/licensed video, 15–45 second useful shopping tips, captions and disclosure | qualified visits, revenue per 1000 views |
| Facebook/Instagram | Helpful product collections, creator collaborations, community participation within platform rules | referral visits and attributed orders |
| Newsletter and price alerts | Existing held infrastructure, double confirmation, sender identity, opt-out, frequency and partner channel policy | incremental repeat visits and approved commissions |
| Referral and creator partnerships | vetted creators, approved link/campaign IDs, clear material-connection disclosure, no spam or fake engagement | net contribution per partner |
| Digital PR and useful resources | original buying guides/data, relevant earned links, no link schemes | qualified referral traffic |
| Paid search/social | later after verified economics, written budget and advertiser/program permission, trademark/bidding rules | incremental net contribution, not ROAS alone |
Platform access and current API permissions must be verified before integration. No external posts, messages, subscriptions or spend activated. Repurpose one verified research brief into site guide, product copy, pin, short-video script, social and opt-in email; each channel has its own rights/claim review. Schedule by US shopping calendar and evidence, not arbitrary daily mass publishing.

## 4. Affiliate & selective dropshipping boundaries
Affiliate first: retailer is seller, external checkout, commission ledger and partner-authorized product feeds/links; no self-purchases or invented conversions. Verify Amazon Associates/Awin first, then Impact/CJ/other actual partners. Track terms for channel use, images/prices, link formats, API eligibility, reversals and attribution. Amazon editorial links and regular feed offers remain separately gated. No scraping or unauthorized proxying.
Dropshipping pilot later: use only evidenced demand and vetted suppliers (sample/quality checks, traceability, product safety, US shipping reliability, landed cost, returns, stock synchronization). Separate offer type, owned checkout and merchant-of-record responsibility; clear seller, shipping/returns, sales tax and compliance review, payment and chargeback controls, supplier order and tracking integration, refunds, support and fulfillment reconciliation. Evaluate supplier integrations such as DSers/AutoDS/Spocket only after actual supplier and platform compatibility, quotes and due diligence; evaluate Stripe or Shopify checkout architecture based on merchant responsibilities and cost, not install redundant stacks. No orders or payment activation without separate approval. FTC shipment representations and delay/refund obligations require actual operational capacity. Google Merchant Center direct purchase and accurate policies only for eligible owned sales, no US affiliate listings disguised as merchant offers. No high-risk/recalled/counterfeit goods. Validate sample orders and positive unit economics before pilot. No mixed seller ambiguity.

## 5. Agent workforce and orchestration
One supervisor, shared typed operational database, versioned evidence library and retrieval, explicit job state/idempotency. Agents are logical roles not separate costly model deployments. Reuse existing deterministic catalog and marketing tools; LLM for synthesis, planning and copy, never source of truth for prices/revenue. All outputs have source/date/confidence and assigned owner. Typed tool allowlists, tenant/role isolation, untrusted retrieved content treated as data, secret vault, no arbitrary browser shell or unrestricted external actions. Queue leases, retries/backoff, time/token/batch caps, per-provider budget, dedupe, audit and rollback, safe failure, human escalation.
| Agent | Output | Tools |
|---|---|---|
| Growth Overseer | daily ranked worklist and exceptions | KPI evidence, queue, approval board |
| Market Research | demand evidence, intent clusters | Trends, keyword reports, public research |
| Product Hunter | evidence-scored opportunity shortlist | authorized catalog/market research |
| Partner/Sourcing | approved provider feed/import candidates | existing Amazon/Awin import, later authorized adapters |
| Deal & Freshness | real price observations, expiring offers | quality/freshness/price history |
| Merchandiser | useful collections/placements/alternatives | catalog, gift/assistant/daily modules |
| SEO Technical | crawl and index readiness, defects | repo, sitemap, GSC/Bing approved access |
| SEO Strategist | intent map, guide brief, gap analysis | actual search evidence |
| Content/Creative | original guides, graphics/video scripts | Content Lab, Visual Studio, approved assets |
| Editorial Trust | claim checks and rights/disclosure review | source evidence, policies, quality tests |
| Distribution | channel-specific draft/post schedule | existing social studio; approved integrations only |
| Shopping Concierge | catalog-grounded recommendations | current eligible products |
| Retention | consented segmentation and drafts | wishlist, held newsletter/price watch |
| Conversion Analyst | funnel experiments and recommendations | aggregate events, attribution, tests |
| Revenue/Finance | revisions, reconciliation, cost/contribution | existing ledger, later expense and bank evidence |
| Supplier/Fulfillment | stock/ship/return exceptions | later vetted direct-sale adapters |
| Customer Support | issue triage, drafts, escalation | later orders/support queue |
Observe: automatic reads of approved internal data. Recommend: draft content, opportunities and cost/experiment recommendations. Act: allowlisted internal staging, approved low-risk deterministic freshness/maintenance; external fetch only scoped authorized APIs and caps; external publication under explicit approved workflow and kill switch. Human approval for partner agreements, product/price/publication approval, production/indexing, paid tools, paid campaigns, new suppliers, checkout, orders/refunds or policy changes. Do not equate fully automated routine work with unbounded autonomy.

## 6. Measurement and economic control
Measure qualified sessions, page/collection impressions, actual user-initiated retailer outbound clicks (not Next prefetch, bot or redirect logs alone), affiliate network orders/commission/reversals, unattributed bucket, revenue per session, repeat visits, cost per qualified click, earnings per outbound click, cash reconciliation. Partner-approved opaque click refs only; no unauthorized user tracking, fingerprinting, personal data in links, or conversion inference. Privacy-approved analytics (e.g. GA4 with appropriate consent or privacy-first aggregate analytics); Search Console metrics are separate from analytics sessions. A/B tests with defined success metric, exposure/denominator, sample sufficiency and no false statistical certainty. Affiliate break-even cost per qualified outbound click = conversion probability x qualifying order value x commission x (1-reversal probability) minus attributable costs per click. Dropship contribution/order = revenue less landed product/shipping/payment/refund reserve/support/acquisition cost. Never mix GMV, commissions and profit. No spending until actual rates and gates support approved budget. Use deterministic calculations for money.
Daily internal review: expired offers and failures, candidate research, approved assets and gaps, marketing performance, contribution and next actions. Weekly: cohort/channel/collection review, evidence-based refresh, commission reconciliation, small controlled experiments; no auto scale or spend. Separate user authorization for external actions.

## 7. Tool choices
Start with Google Search Console, Trends, Keyword Planner, Bing Webmaster Tools, PageSpeed Insights/Lighthouse, Rich Results Test, manual authorized reports, existing GitHub/Vercel/Supabase. Use official APIs only where account access permits. Optional paid SEO suite (Ahrefs or Semrush, not both initially), SERP data provider (DataForSEO or equivalent), creative/video, email sender (Resend/Postmark or equivalent subject to commercial policies), approved social scheduling provider; evaluate costs and rights before subscription. Prefer deterministic workflows and one budgeted model gateway with routing/fallback, structured outputs and evaluations. No new accounts or subscriptions purchased.
Official references:
- https://developers.google.com/search/docs/specialty/ecommerce
- https://developers.google.com/search/docs/essentials/spam-policies
- https://developers.google.com/search/docs/specialty/ecommerce/write-high-quality-reviews
- https://developers.google.com/search/docs/fundamentals/using-gen-ai-content
- https://developers.google.com/search/docs/fundamentals/ai-optimization-guide
- https://developers.google.com/search/docs/appearance/structured-data/product-snippet
- https://developers.google.com/search/docs/appearance/structured-data/merchant-listing
- https://support.google.com/merchants/answer/12756116
- https://developers.google.com/webmaster-tools
- https://developers.google.com/search/apis/trends (alpha; verify access)
- https://developers.google.com/google-ads/api/docs/keyword-planning/overview
- https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console
- https://www.bing.com/webmasters/help/indexnow-0z209wby
- https://www.ftc.gov/business-guidance/resources/business-guide-ftcs-mail-internet-or-telephone-order-merchandise-rule

## 8. Immediate acceptance tasks
A. Real account/program approval evidence, first 10–20 products and product research in parallel; publish empty departments only by owner approval. B. Build product opportunity evidence engine and original buying-guide workflow, not another redundant dashboard. C. Prepare SEO technical release policy and canonical public sitemap behind explicit hold, verify browser/build/privacy/legal gates, verified production domain and Search Console property; no premature indexing. D. Add privacy/partner-reviewed click attribution and real campaign asset preparation; approved organic distribution and launch. E. Reconcile first real commission, then retention/automation integrations, profitability and selective dropship pilot. No milestone marked commercially achieved solely by code. Existing build inspection blocker: previous Vercel 403; resolve before promotion. All provider approvals, current catalog, live metrics and cash remain unverified.
