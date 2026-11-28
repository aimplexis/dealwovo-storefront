# Audit remediation — 2026-11-27 US Eastern
Decision: HOLD production and speculative development. Fix and verify existing defects first.
Evidence: preview branch feature/intelligent-shopping-conversion; worker fixes e9cdb8b59113307b26f25eb0e1d1771e7a542847; regression suite 032ae76e587678bcfcbaba54cb37f46c9e856ef4; required test command 757eb5859ea1c83a17d0885497da40c36b2f1602 (build status pending at inspection).
Fresh read-only counts: products 0, offers 0, feed sources 0, suppliers 0, commission entries 0. No fabricated records.
Security advisor: leaked password protection disabled (WARN); 8 private tables with RLS and no policy (INFO). Inspect grants and intended service-only access; do not weaken RLS to silence informational findings.
## Open gates
- Technical: validate exact candidate build, execute worker regressions, isolated queue migration and service-only access, atomic claim/recovery/completion and revocation tests; no external calls or scheduler yet. Queue SQL is staged, not deployed.
- Auth: owner/editor/nonstaff/anonymous browser acceptance; verify password protection or approved compensating controls; review MFA, logs, rate limits, recovery.
- Browser: public navigation, keyboard, mobile/desktop widths, contrast, errors, broken links, stale-offer rejection, performance; record actual observations.
- Commercial: authorized affiliate source, first real verified catalog, permitted destinations, genuine network-reported transactions and commission reconciliation. No self-purchases.
- Supplier: approved provider, SKU, terms, unit economics, sandbox quote/order/payment/tracking/returns; no live orders or payment activation.
- Marketing: persistent approval and execution storage, authorized channel, test publication and real metrics; no blind retries or unauthorized posts.
- Newsletter and price notifications: preserve disabled external delivery until verified sender, consent, unsubscribe, legal review and test delivery.
- Legal: verified entity, support contact, privacy and terms, current affiliate and channel rights; owner/legal approval.
- Release: owner acceptance, rollback and security evidence, explicit production approval.
No production promotion, database writes, additional spending, real purchases, or publication in this remediation checkpoint. Reopen a gate if evidence expires or candidate changes. Missing authorization is not a software pass.
