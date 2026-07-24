#!/usr/bin/env bash
#
# Move the Hardware database to a nearer region (ap-south-1 / Mumbai).
#
# WHY: the project lives in ap-southeast-1 (Singapore). Measured from the shop,
# one trivial query round trip is ~250ms, of which only ~55ms is TLS+connect —
# the rest is distance. Mumbai is roughly a third of the way, so every query in
# the app gets faster by the same factor. The database itself answers in <1ms.
#
# SAFETY: this only CREATES and POPULATES a new project. It never deletes or
# modifies the existing one, so the rollback is "put the old values back in
# .env". Cut over only after the verification step at the end passes.
#
# Usage:
#   ORG_SLUG=<org> DB_PASSWORD=<strong-password> bash scripts/migrate-region.sh
#
set -euo pipefail
cd "$(dirname "$0")/.."

: "${ORG_SLUG:?set ORG_SLUG (see: curl https://api.supabase.com/v1/organizations)}"
: "${DB_PASSWORD:?set DB_PASSWORD to a strong postgres password}"
REGION="${REGION:-ap-south-1}"
NAME="${NAME:-Hardware}"
DATA_SQL="${DATA_SQL:?set DATA_SQL to the path of data-export.sql}"

set -a; source .env; set +a
API=https://api.supabase.com/v1
AUTH=(-H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json")

json() { python3 -c 'import json,sys;print(json.dumps(sys.stdin.read()))'; }

echo "==> Creating $NAME in $REGION (org $ORG_SLUG)"
NEW=$(curl -s -X POST "$API/projects" "${AUTH[@]}" --max-time 120 -d "$(python3 - <<EOF
import json,os
print(json.dumps({
  "organization_id": os.environ["ORG_SLUG"],
  "name": os.environ.get("NAME","Hardware"),
  "region": os.environ.get("REGION","ap-south-1"),
  "db_pass": os.environ["DB_PASSWORD"],
}))
EOF
)")
REF=$(printf '%s' "$NEW" | python3 -c "import json,sys;print(json.load(sys.stdin).get('id',''))")
[ -n "$REF" ] || { echo "create failed: $NEW"; exit 1; }
echo "    new ref: $REF"

echo "==> Waiting for it to come up (a few minutes)"
for i in $(seq 1 60); do
  ST=$(curl -s "$API/projects/$REF" "${AUTH[@]}" --max-time 30 \
       | python3 -c "import json,sys;print(json.load(sys.stdin).get('status','?'))")
  echo "    [$i] $ST"
  [ "$ST" = "ACTIVE_HEALTHY" ] && break
  sleep 20
done
[ "$ST" = "ACTIVE_HEALTHY" ] || { echo "did not become healthy"; exit 1; }

run_sql() {  # run_sql <file> <label>
  local body; body=$(python3 -c "import json,sys;print(json.dumps({'query':open(sys.argv[1]).read()}))" "$1")
  local res; res=$(curl -s -X POST "$API/projects/$REF/database/query" "${AUTH[@]}" --max-time 180 -d "$body")
  case "$res" in
    *'"message"'*) echo "    FAILED $2"; echo "$res" | head -c 400; exit 1;;
    *) echo "    ok $2";;
  esac
}

echo "==> Applying $(ls supabase/migrations/*.sql | wc -l | tr -d ' ') migrations in order"
for f in supabase/migrations/*.sql; do run_sql "$f" "$(basename "$f")"; done

echo "==> Loading data"
run_sql "$DATA_SQL" "data-export.sql"

echo "==> Verifying row counts against the old project"
for t in categories suppliers items stock_entries app_settings tab_lock; do
  a=$(curl -s -X POST "$API/projects/vfdmndkeiqnblxzmjwnm/database/query" "${AUTH[@]}" --max-time 60 \
      -d "{\"query\":\"select count(*) c from public.$t;\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['c'])")
  b=$(curl -s -X POST "$API/projects/$REF/database/query" "${AUTH[@]}" --max-time 60 \
      -d "{\"query\":\"select count(*) c from public.$t;\"}" | python3 -c "import json,sys;print(json.load(sys.stdin)[0]['c'])")
  printf '    %-16s old=%-4s new=%-4s %s\n' "$t" "$a" "$b" "$([ "$a" = "$b" ] && echo OK || echo MISMATCH)"
done

echo
echo "==> New project keys (put these in .env, keep the old ones commented out):"
curl -s "$API/projects/$REF/api-keys" "${AUTH[@]}" --max-time 30 \
  | python3 -c "
import json,sys
for k in json.load(sys.stdin):
    print(f\"    {k.get('name')}: {k.get('api_key')}\")
"
echo "    NEXT_PUBLIC_SUPABASE_URL=https://$REF.supabase.co"
echo
echo "Users are NOT copied (auth.users lives outside the public schema)."
echo "Re-seed the admin against the new project (after updating .env) with:"
echo "  SEED_ADMIN_EMAIL=... SEED_ADMIN_PASSWORD=... node --env-file=.env scripts/seed-admin-rest.mjs"
echo
echo "The old project is untouched — to roll back, restore the previous .env values."
