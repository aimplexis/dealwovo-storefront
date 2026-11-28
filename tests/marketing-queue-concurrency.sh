#!/usr/bin/env bash
set -euo pipefail
: "${DB_CONTAINER:?Disposable PostgreSQL container required}"
db(){ docker exec -i "$DB_CONTAINER" psql -X -qAt -v ON_ERROR_STOP=1 -U postgres -d dealwovo_queue_test "$@"; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
db <<'SQL'
insert into public.marketing_social_plans values ('40000000-0000-4000-8000-000000000002','prepared',(now() at time zone 'UTC')::date,'20000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001');
insert into public.marketing_execution_jobs(id,plan_id,scheduled_at,expires_at,state,account_id,channel,release_approved_at,release_approved_by,rights_verified,destination_verified,disclosure_reviewed,media_ready)
values ('50000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000002',now()-interval '1 minute',now()+interval '1 hour','pending','fixture-account','facebook',now()-interval '2 minutes','10000000-0000-4000-8000-000000000001',true,true,true,true);
update public.marketing_execution_control set enabled=true;
SQL
# Hold the row lock after claiming so the second independent session contends.
db > "$tmp/first" <<'SQL' &
set role service_role;
begin;
select count(*) from public.claim_marketing_execution('50000000-0000-4000-8000-000000000002','fixture-account');
select pg_sleep(3);
commit;
SQL
first=$!
# Wait for the first transaction to acquire the claim before launching contender.
ready=0
for i in {1..30}; do
  if [[ "$(db -c "select count(*) from pg_stat_activity where query like 'select pg_sleep(3)%' and wait_event='PgSleep'")" == 1 ]]; then ready=1; break; fi
  sleep 0.1
done
if [[ "$ready" != 1 ]]; then wait "$first"; echo 'First session did not enter lock hold'; exit 1; fi
db > "$tmp/second" <<'SQL' &
set role service_role;
select count(*) from public.claim_marketing_execution('50000000-0000-4000-8000-000000000002','fixture-account');
SQL
second=$!
wait "$first"
wait "$second"
test "$(head -n 1 "$tmp/first")" = 1
test "$(head -n 1 "$tmp/second")" = 0
test "$(db -c "select count(*) from public.marketing_execution_jobs where id='50000000-0000-4000-8000-000000000002' and state='dispatching' and claim_token is not null")" = 1
db -c "update public.marketing_execution_control set enabled=false"
echo 'PASS independent PostgreSQL sessions: exactly one successful claim'
