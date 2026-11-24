# Dealwovo — Project state and release checkpoint

Last verified: 2026-11-24. Maintain this document after every development phase. A new ChatGPT conversation must read this and the linked implementation docs before making changes.

## Business baseline
Affiliate-first shopping discovery; no owned inventory, internal checkout or unauthorized offers at launch. Four discovery pillars: Holiday Deals, Gift Finder, Trending Now, Everyday Essentials. Seasonal campaigns year-round; selective dropshipping is a later decision. Human approval, verified offers and transparent affiliate disclosures are mandatory.

## Verified infrastructure
- Production: https://dealwovo.com; Vercel project dealwovo-storefront; production commit 40b3c442689fa004e7d12e8a1e652a7edc8d5adf was READY. Domain and www redirect verified in Vercel.
- Supabase project dealwovo: ACTIVE_HEALTHY, nine public catalog tables, RLS enabled on all nine, seven migrations applied; one catalog administrator, zero categories, merchants, products, offers or feed records at inspection.
- Security advisor warning: leaked password protection disabled. Check plan support before enabling; no plan upgrade without approval.
- Latest cumulative preview commit 88ce851325855a47d7b8c23e2d4766e9c49ac188 (Marketing Agent OS) was READY in Vercel; it is 18 commits ahead and zero behind the observed production commit. Build success is not end-to-end acceptance.
- Release-readiness branch starts from this cumulative preview, not from an obsolete storefront-only branch. Main and production are unchanged.

## Existing stacked work
PRs #3 (catalog foundation), #4 (WOW experience), #5 (verified product navigation), #6 (feed staging), #7 (Awin CSV adapter), #8 (offer quality), #9 (premium hybrid), #10 (mobile accessibility). Marketing Agent OS branch adds one commit on top of #10. Do not merge each stacked PR independently without reviewing dependencies. The cumulative release candidate requires a fresh diff and preview review.

## Implementation references
- docs/PHASE3_SETUP.md and docs/PHASE3B_VERIFICATION.md
- docs/PHASE4A_VERIFIED_NAVIGATION.md
- docs/PHASE4B_FEED_IMPORT.md
- docs/PHASE4C_AWIN_READINESS.md
- docs/PHASE4D_OFFER_QUALITY.md
- docs/DEALWOVO_2_DESIGN_SYSTEM.md
- docs/MARKETING_AGENT_OS.md

## Release gates — HOLD until verified
1. Confirm current main SHA and compare cumulative candidate against it; reconcile conflicts if any.
2. Validate required Vercel variable names and scopes without exposing values; confirm correct Supabase target.
3. Review migration 008 marketing agent OS separately; not observed applied. Check scheduling, privileges and rollback before applying; do not activate cron without explicit review.
4. Run fresh candidate build, lint/typecheck and available tests; check public pages, protected admin routes and invalid outbound URLs. Verify mobile rendering and keyboard navigation.
5. Confirm administrator login and unauthorized access denial with appropriate test identities. Review RLS policies, not merely enabled flags.
6. Initialize agreed taxonomy via existing authorized admin workflow. No fake merchant/product/offer records or unauthorized affiliate feeds.
7. Validate real merchant approvals, permitted assets, current offers, affiliate attribution and disclosures before live commercial launch.
8. Marketing drafts stay private and supervised. No autonomous external posting, messaging, paid AI or spending without separate approval.
9. Obtain owner approval for production merge/deploy. Verify production afterward and update this document.

## Next action
Inspect the cumulative candidate configuration and migration 008; complete read-only release review and identify the smallest safe corrections. Do not publish offers or merge to main as part of this checkpoint.

## Follow-up: Marketing Studio database activation
- Release branch Supabase URL and publishable key configured for preview only; deployment dpl_BoLUDC7PcG76Jn81yNsjhnSX1uVY READY: https://dealwovo-storefront-3f41pkg3f-frhairshop.vercel.app.
- Applied existing migration 008 (dealwovo_marketing_agent_os) after confirming all three marketing tables absent and owner guard present. All three tables now have RLS; six policies total; anonymous SELECT and INSERT denied on each. Security advisor reports only existing leaked-password protection warning.
- Weekly planner function installed, but no cron schedule activated. Authenticated browser smoke test, atomic manual generation and database-enforced cooldown remain pending. Production deployment unchanged; shared Dealwovo database schema updated.

## Marketing Agent OS V1.1 — atomic generation
- Migration 009 applied; owner-only private definer with public invoker wrapper, fixed search path, transaction advisory lock, 30-minute cooldown, no direct authenticated inserts. Application invokes RPC and accurately labels weekly scheduling inactive.
- Transactional SQL test with simulated JWT claims passed: non-owner denied, owner produced one run and four drafts, immediate repeat returned zero; rolled back. Anonymous RPC and direct authenticated inserts denied. Existing leaked-password warning only. Actual browser session test and concurrent-request stress test remain pending.
- Old marketing previews using direct insert are superseded; use new release branch preview. No external publication, scheduling, paid AI, production deployment or catalog activation.
