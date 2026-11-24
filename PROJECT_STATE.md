# Dealwovo — Project state and release checkpoint
Last reviewed: 2026-11-24. Read this checkpoint and the implementation references before continuing. This supersedes earlier status entries, not the underlying design decisions.

## Business baseline
Affiliate-first shopping discovery: year-round holiday deals, gift discovery, trending products and everyday essentials. No owned inventory or internal checkout at launch. Selective dropshipping is later. Human approval, documented affiliate rights, current offers and transparent disclosures are mandatory.

## Infrastructure and evidence
- Production: https://dealwovo.com. Vercel project dealwovo-storefront, team frhairshop. Last observed production deployment dpl_Fffzhh8DdveL96b2vk7X62EVZtW3; previous verified main commit 40b3c442689fa004e7d12e8a1e652a7edc8d5adf.
- Cumulative branch: feature/dealwovo-release-readiness. Latest verified preview ba81d15a76740f0196c93d03a8e200d9eb27176b, READY, https://dealwovo-storefront-eenf6ysz1-frhairshop.vercel.app. Build and deployment completed; homepage and health HTTP 200; social calendar with and without query filters redirected unauthenticated sessions to login. Signed-in browser acceptance remains open. Prior visual build c14453c confirmed 35 catalog, 11 Content Lab and 48 creative combination checks.
- Dependency recovery: isolated build 7f85d99 generated 71 cross-platform lock entries, installed with npm ci --include=dev, reported zero vulnerabilities from npm audit, and built successfully. Release branch contains exact direct versions and the validated lockfile. The audit is a point-in-time result, not a security certification; explicit full dev-dependency audit still to confirm.
- Supabase project pqjoujxjbyinmtsvqtxs: 20 migrations applied (019 visual and 020 social applied and rollback-tested). Four new visual/social tables have RLS, in addition to the 12 previously verified public application tables. One catalog admin; zero categories, merchants, products, offers, authorized feed sources, candidates, marketing runs and drafts at latest inspection. One active weekly planning job. No real affiliate authorization or revenue confirmed.
- Preview variables NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY previously confirmed; verify target and production scope separately. Never expose values or secrets.
- Security advisor: leaked password protection disabled (WARN); private marketing_ai_attempts RLS with no policies (intentional deny-by-default, INFO). Check plan support and authorization before changes.

## Implemented scope
- Catalog, public offer eligibility, safe HTTPS outbound redirect, admin review and audit foundation (001–005).
- Atomic affiliate CSV staging, Awin mapping, owner rights approval, private candidate conversion and direct write lockdown (006–007, 013–014). Synthetic rollback tests passed. Actual merchant rights and real authorized feed still needed.
- Marketing Agent OS (008–012): atomic owner planner, 30-minute manual cooldown, Monday 14:00 UTC weekly private drafts, US seasonal calendar, supervised Content Lab. Five attempts per rolling 24h plus 30-minute model cooldown tested. Model calls disabled pending approved budget; no external publishing. Free brief and mocked provider regression suite included in test-gated build.
- Offer Quality (015): catalog-wide totals, status filters, 50-row pagination. Rollback fixture 54 offers passed.
- Product Discovery (016): authorized staged candidates ranked by four metadata fields, 50-row pagination; 52-row rollback fixture passed. No demand scoring.
- Deal Evaluation (017): catalog-wide promotion triage and cross-retailer recorded USD price comparison, excludes expired/expiring/ineligible alternatives. Rollback tests passed; no verified savings or profit claims.
- Marketing Review (018): exact totals, 25-row filters and status audit history. Draft-to-reviewed-to-archived rollback test passed. No automatic publication.
- Visual Marketing Studio (019): owner-only private asset library, versioned original SVG templates, 48 theme/format/palette combinations, review/archival history, pagination and reviewed-only download endpoint. SQL rollback tests passed for creation, review, archive, immutable template fields, invalid transition and nonowner/anonymous denial. No image uploads, external media, AI image requests, or social posting. Authenticated browser acceptance and actual reviewed download remain open; SVG is not a universally supported social-upload format.
- Social Media Command Center (020): private Instagram, Facebook and Pinterest planning; reviewed copy and compatible reviewed graphic required, proposed UTC date within 180 days, duplicate draft/date prevention, combined owner preparation, archive and audit. Rollback tests passed for source review, incompatible formats, dates, duplicate, readiness, archived visual invalidation, archive, counts and nonowner denial; anon execute denied. Source selectors limited to latest 100 reviewed items. No provider connections, credentials, publishing, external jobs or ads. Signed-in browser acceptance pending.
- Nonadmin reporting RPC access denied in simulated JWT/database role tests. Browser sign-in remains unverified.
- Public HTTP acceptance: 24 route checks on commit 7d03df43c579c9045c1e9a9c19f05b2b6e35efbc, including public pages, health, robots, seven protected admin paths, login and invalid product/offer routes. Invalid redirect parameters rejected. Preview noindex confirmed. Temporary authenticated Vercel fetch links used, never shared.
- Subsequent source-level accessibility fixes: wrapping navigation, long text, active filters, focus, skip target and natural mobile keyboard navigation. Actual mobile browser layout/accessibility compliance remains unverified.

## Release gates — HOLD
1. Dependency lockfile gate passed. Continue routine npm ci --include=dev, npm audit --include=dev, npm test and npm run build on future changes; investigate new high/critical findings. Vercel Security Review API intermittently 403.
2. Latest candidate build and HTTP smoke checks; authenticated owner/editor/nonadmin browser flows, mobile viewport and keyboard/screen reader/contrast testing. Protected preview HTTP access is not equivalent to signed-in browser acceptance. Keep deployment protection enabled. No credential sharing in chat.
3. Verify production environment configuration, security advisor warning resolution, source image rights, legal/disclosure review and dependency audit. Compare cumulative release against current main; do not merge stacked draft PRs #3–10 independently.
4. Initialize approved taxonomy and documented authorized merchant/feed records using admin workflow; verify real product rights, variants, availability, retailer destination, first eligible outbound redirect and affiliate attribution. No fake commercial data.
5. Confirm natural weekly execution, paid model budget/authorization and live test only if approved; no external publishing without explicit authorization.
6. Obtain owner approval for production release. Test exact staged production build before assigning domain. Post-release monitoring and rollback plan required.

## Implementation references
- docs/PHASE3_SETUP.md, docs/PHASE3B_VERIFICATION.md
- docs/PHASE4A_VERIFIED_NAVIGATION.md, docs/PHASE4B_FEED_IMPORT.md, docs/PHASE4C_AWIN_READINESS.md, docs/PHASE4D_OFFER_QUALITY.md
- docs/DEALWOVO_2_DESIGN_SYSTEM.md, docs/MARKETING_AGENT_OS.md
- supabase/migrations/20261124_001_catalog_foundation.sql through 20261124_020_social_command_center.sql
- tests/catalog-regression.cjs, tests/content-lab-regression.cjs and tests/visual-template-regression.cjs

## Next action
V1.8 private planning preview verified. Build V1.9 SEO Intelligence as a private readiness workbench; keep public indexing disabled pending owner launch authorization. V2.0 revenue analytics follows with measured evidence only. Remaining launch gates include authenticated browser acceptance, PNG export, source rights, affiliate attribution and commercial approval. Owner requests consecutive execution within active sessions and actual preview links at verified milestones.
