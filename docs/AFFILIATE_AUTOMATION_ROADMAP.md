# Dealwovo Affiliate OS — approved expansion
2026-11-24. Target 9.5/10 maturity only after live acceptance; not a forecast or current score.
## Execution order and gates
1. Unified connection wizard and partner status; existing manual Amazon/Awin/other flows remain.
2. Sensitive server-only Vercel variables (AWIN_API_TOKEN, AWIN_PUBLISHER_ID); explicit AWIN_LIVE_ENABLED=false default, no actual secrets inserted. Single publisher and source scope. Later credential rotation, access auditing, connection health, per-job limits and kill switch.
3. Awin read-only transaction connection probe. Verify actual response and auth before enabling. Support documented transaction/validation/amendment windows <=31 days; normalize exact IDs, status, USD integer cents, no buyer identities, hold unknown fields, not paid unless reported. Bound requests, no redirects, redacted errors, retry/backoff, rate caps and job leases.
4. Authorized enhanced JSONL feed adapter, fixed provider endpoints, bounded download/parsing, page/checkpoint semantics, stock evidence and source provenance; legacy CSV fallback. Feed synchronization, freshness, deduplication, price/availability review, category suggestions. Missing partial records never imply stock loss. No scraping.
5. Automated commission reconciliation via existing append-only ledger. First normalized USD statement import compares rows, skips duplicates, rejects conflict atomically, owner approves. Next native Awin transaction adapter, source-scoped observations, exact revision dates, idempotent imports, scheduled backfill and reconciliation; payments API and breakdowns separately, settlement evidence and discrepancies, no inference of bank deposits.
6. Product/campaign attribution using opaque consent-aware refs only where partner allows; unassigned bucket, no fabricated conversion or click attribution. Operating expense ledger, paid vs accrued distinction, net profit and campaign ROI from verified inputs. Revenue recovery, anomaly alerts, forecasts only after sufficient observed history.
7. Amazon Creators API connector after actual eligibility and program review, no scraping or unauthorised price/image use. CJ/Impact/others only after individual approval.
8. Product discovery and explainable opportunity scoring (demand 25, commission 20, price 15, seasonality 15, reliability 10, conversion 10, availability 5; unknown stays unknown). Holiday/gift/trend/everyday orchestration. Marketing preparation, campaign recommendations and revenue optimization. No spending, external publishing or new program agreements without approval.
9. Autonomous supervisor with observe/recommend/act lanes, time and batch caps, explicit permissions, escalation, immutable audit, daily/weekly executive summaries; schedule only approved provider calls. Maintain manual fallback. Complete browser tests, source rights, security, actual attribution and financial reconciliation, explicit release approval.
## Current implementation
Connection hub, disabled-by-default read-only scoped transaction probe, normalized statement reconciliation UI/RPC. Native APIs, automatic downloading, recurring external synchronization, payment allocation and profit/attribution remain pending. No actual provider connections, bank access or credential collection. Do not raise measured maturity until verified.
## References
https://help.awin.com/apidocs/api-authentication
https://help.awin.com/apidocs/returns-a-list-of-transactions-for-a-given-publisher
https://help.awin.com/apidocs/list-payments
https://help.awin.com/apidocs/retail-publisher-productapidocumentation-1
