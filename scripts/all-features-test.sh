#!/usr/bin/env bash
set -euo pipefail

# ------------------------------------------------------------------------------
# Config
# ------------------------------------------------------------------------------
BASE="${BASE_URL:-http://localhost:3333}"
EMAIL="${EMAIL:-user$RANDOM@reliabill.test}"
PASSWORD="${PASSWORD:-test123}"
DOCS_DOWNLOAD_DIR="${DOCS_DOWNLOAD_DIR:-$(mktemp -d)}"
API_TOKEN="${API_TOKEN:-}"

# Strict prepare response check
STRICT_PREPARE="${STRICT_PREPARE:-0}"

# Rate limit hammer config
RL_N="${RL_N:-200}"
RL_PAR="${RL_PAR:-100}"

# ------------------------------------------------------------------------------
# Requirements
# ------------------------------------------------------------------------------
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 1; }; }
need curl
need node

# ------------------------------------------------------------------------------
# Helpers
# ------------------------------------------------------------------------------
log()   { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()    { printf "\033[1;32m✓ %s\033[0m\n" "$*"; }
fail()  { printf "\033[1;31m✗ %s\033[0m\n" "$*"; exit 1; }

api() { # method path [json]
  local method="$1"; shift
  local path="$1"; shift
  local data="${1:-}"
  local hdrs=(-H "Content-Type: application/json")
  if [[ -n "${API_TOKEN:-}" ]]; then hdrs+=(-H "Authorization: Bearer $API_TOKEN"); fi
  if [[ -n "$data" ]]; then
    curl -sS -X "$method" "$BASE$path" "${hdrs[@]}" --data "$data"
  else
    curl -sS -X "$method" "$BASE$path" "${hdrs[@]}"
  fi
}

status_of() { # method path [json]
  local method="$1"; shift
  local path="$1"; shift
  local data="${1:-}"
  local auth=()
  [[ -n "${API_TOKEN:-}" ]] && auth=(-H "Authorization: Bearer $API_TOKEN")
  if [[ -n "$data" ]]; then
    curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$path" -H "Content-Type: application/json" "${auth[@]}" --data "$data"
  else
    curl -s -o /dev/null -w "%{http_code}" -X "$method" "$BASE$path" -H "Content-Type: application/json" "${auth[@]}"
  fi
}

# Extract value from JSON using Node
json_get() { # json path
  local json="$1"; local path="$2"
  PATHSTR="$path" node -e '
    const fs=require("fs");
    const s=fs.readFileSync(0,"utf8");
    let o; try{o=JSON.parse(s)}catch{process.exit(2)}
    const p=(process.env.PATHSTR||"").split(".").filter(Boolean);
    let v=o; for(const k of p){ v = (v==null) ? undefined : v[k]; }
    if (v==null) process.exit(3);
    if (typeof v==="object") console.log(JSON.stringify(v)); else console.log(String(v));
  ' <<< "$json" 2>/dev/null || true
}

json_has() { # json path msg
  local json="$1"; local path="$2"; local msg="$3"
  local out; out="$(json_get "$json" "$path")"
  [[ -n "$out" ]] && ok "$msg" || fail "$msg"
}

# Convenience to pretty-print JSON with Node
json_pp() {
  node -e 'const fs=require("fs"); const s=fs.readFileSync(0,"utf8"); try{console.log(JSON.stringify(JSON.parse(s),null,2));}catch{console.log(s)}'
}

assert_eq() { # expected actual message
  local exp="$1" act="$2" msg="$3"
  [[ "$exp" == "$act" ]] && ok "$msg" || fail "$msg (expected '$exp', got '$act')"
}

assert_file_min_bytes() { # file min_bytes message
  local f="$1" min="$2" msg="$3"
  local size; size=$(wc -c < "$f" | tr -d '[:space:]')
  [[ "$size" -ge "$min" ]] && ok "$msg ($size bytes)" || fail "$msg (only $size bytes)"
}

# Portable dates via Node
TODAY=$(node -e 'console.log(new Date().toISOString().slice(0,10))')
NEXT_MONTH=$(node -e 'let d=new Date(); d.setDate(d.getDate()+30); console.log(d.toISOString().slice(0,10))')

# ------------------------------------------------------------------------------
# Start
# ------------------------------------------------------------------------------
log "Base URL: $BASE"
log "Downloads dir: $DOCS_DOWNLOAD_DIR"
mkdir -p "$DOCS_DOWNLOAD_DIR"

# Health / Version
log "Check /health and /version"
code=$(status_of GET /health)
assert_eq "200" "$code" "GET /health -> 200"
ver_json=$(api GET /version)
json_has "$ver_json" "version" "GET /version returns version"
json_has "$ver_json" "time"    "GET /version returns time"

# Auth
if [[ -z "${API_TOKEN:-}" ]]; then
  log "Register user"
  reg_body=$(cat <<JSON
{"email":"$EMAIL","password":"$PASSWORD"}
JSON
)
  reg_json=$(api POST /auth/register "$reg_body")
  json_has "$reg_json" "id" "registered user has id"
  json_has "$reg_json" "email" "registered user has email"

  log "Login to get token"
  login_body=$(cat <<JSON
{"email":"$EMAIL","password":"$PASSWORD"}
JSON
)
  login_json=$(api POST /auth/verify-credentials "$login_body")
  API_TOKEN=$(json_get "$login_json" "accessToken")
  [[ -n "$API_TOKEN" && "$API_TOKEN" != "null" ]] || fail "accessToken not returned"
  ok "obtained JWT"
fi

log "GET /auth/me"
me_json=$(api GET /auth/me)
USER_ID=$(json_get "$me_json" "id")
[[ -n "$USER_ID" ]] || fail "missing user id from /auth/me"; ok "user id: $USER_ID"

# Company
log "Create company"
comp_body=$(cat <<'JSON'
{"legalName":"Acme BV","vat":"BE0123456789","iban":"BE71096123456769","street":"Main 1","city":"Brussels","postalCode":"1000","country":"BE"}
JSON
)
comp_json=$(api POST /companies "$comp_body")
json_has "$comp_json" "id" "company created"

log "Get my company"
comp_me_json=$(api GET /companies/me)
json_has "$comp_me_json" "legalName" "company/me returns legalName"

log "Update my company"
comp_upd=$(cat <<'JSON'
{"legalName":"Acme Belgium BV","city":"Bruxelles"}
JSON
)
upd_json=$(api PUT /companies/me "$comp_upd")
[[ "$(json_get "$upd_json" "legalName")" == "Acme Belgium BV" ]] || fail "company update failed"
ok "company updated"

# Clients
log "Create client A"
clientA_body=$(cat <<'JSON'
{"name":"Client SA","vat":"BE9876543210","email":"acc@client.test","street":"Rue 2","city":"Liège","postalCode":"4000","country":"BE"}
JSON
)
clientA_json=$(api POST /clients "$clientA_body")
CLIENT_A_ID=$(json_get "$clientA_json" "id"); [[ -n "$CLIENT_A_ID" ]] || fail "client A not created"; ok "client A: $CLIENT_A_ID"

log "Create client B"
clientB_body=$(cat <<'JSON'
{"name":"Globex NV","email":"ap@globex.test","street":"Keizer 3","city":"Antwerpen","postalCode":"2000","country":"BE"}
JSON
)
clientB_json=$(api POST /clients "$clientB_body")
CLIENT_B_ID=$(json_get "$clientB_json" "id"); [[ -n "$CLIENT_B_ID" ]] || fail "client B not created"; ok "client B: $CLIENT_B_ID"

log "List clients (search+paginate)"
clients_list=$(api GET "/clients?page=1&limit=10&query=Client")
json_has "$clients_list" "items" "clients list returns items"

log "Update client A"
clientA_upd=$(cat <<'JSON'
{"name":"Client SA Updated"}
JSON
)
clientA_upd_json=$(api PUT "/clients/$CLIENT_A_ID" "$clientA_upd")
[[ "$(json_get "$clientA_upd_json" "name")" == "Client SA Updated" ]] || fail "client A update failed"
ok "client A updated"

# Invoices
log "Create invoice 1 (Client A)"
inv1_body=$(cat <<JSON
{"clientId":"$CLIENT_A_ID","issueDate":"$TODAY","dueDate":"$NEXT_MONTH","currency":"EUR","lines":[{"description":"Development","quantity":8,"unitPrice":100,"vatRate":21},{"description":"Design","quantity":4,"unitPrice":80,"vatRate":6}]}
JSON
)
inv1_json=$(api POST /invoices "$inv1_body")
INV1_ID=$(json_get "$inv1_json" "id"); [[ -n "$INV1_ID" ]] || fail "invoice 1 not created"; ok "invoice1: $INV1_ID"

log "Create invoice 2 (Client B)"
inv2_body=$(cat <<JSON
{"clientId":"$CLIENT_B_ID","issueDate":"$TODAY","dueDate":"$NEXT_MONTH","currency":"EUR","lines":[{"description":"Consulting","quantity":2,"unitPrice":150,"vatRate":21}]}
JSON
)
inv2_json=$(api POST /invoices "$inv2_body")
INV2_ID=$(json_get "$inv2_json" "id"); [[ -n "$INV2_ID" ]] || fail "invoice 2 not created"; ok "invoice2: $INV2_ID"

log "Get invoice 1"
inv1_get=$(api GET "/invoices/$INV1_ID")
( [[ -n "$(json_get "$inv1_get" "totalIncl")" ]] || [[ -n "$(json_get "$inv1_get" "totals.totalIncl")" ]] ) \
  || fail "invoice 1 totals missing"
ok "invoice 1 has totals"

log "List invoices paginated"
invs_page=$(api GET "/invoices?page=1&limit=10")
json_has "$invs_page" "items" "invoice list returns items"

# Prepare docs
log "Prepare documents (UBL+PDF) for invoice 1"
prep_json=$(api POST "/invoices/$INV1_ID/prepare")
prep_status="$(json_get "$prep_json" "status" | tr '[:lower:]' '[:upper:]')"
if [[ "$STRICT_PREPARE" == "1" ]]; then
  [[ "$prep_status" == "READY" ]] || { echo "Prepare response:"; echo "$prep_json" | json_pp; fail "prepare did not return READY (STRICT)"; }
  ok "prepare returned READY (strict)"
else
  if [[ "$prep_status" != "READY" ]]; then
    echo "Prepare response (non-strict mode, will try downloads anyway):"
    echo "$prep_json" | json_pp
  else
    ok "prepare returned READY"
  fi
fi

# Show invoice after prepare
log "Fetch invoice 1 after prepare"
inv1_post_prep=$(api GET "/invoices/$INV1_ID")
echo "$inv1_post_prep" | json_pp >/dev/null

# Download artifacts
log "Download XML and PDF for invoice 1"
xml_path="$DOCS_DOWNLOAD_DIR/$INV1_ID.xml"
pdf_path="$DOCS_DOWNLOAD_DIR/$INV1_ID.pdf"
curl -fSs "$BASE/invoices/$INV1_ID/download-xml" -H "Authorization: Bearer $API_TOKEN" -o "$xml_path" || {
  echo "XML download failed. Invoice record (for debugging):"; echo "$inv1_post_prep" | json_pp; fail "XML download failed";
}
curl -fSs "$BASE/invoices/$INV1_ID/download-pdf" -H "Authorization: Bearer $API_TOKEN" -o "$pdf_path" || {
  echo "PDF download failed. Invoice record (for debugging):"; echo "$inv1_post_prep" | json_pp; fail "PDF download failed";
}
assert_file_min_bytes "$xml_path" 200 "XML non-empty"
assert_file_min_bytes "$pdf_path" 200 "PDF non-empty"

# Negative: download before prepare should fail
log "Attempt to download invoice 2 docs before prepare (should 404)"
code_xml=$(status_of GET "/invoices/$INV2_ID/download-xml")
code_pdf=$(status_of GET "/invoices/$INV2_ID/download-pdf")
[[ "$code_xml" == "404" || "$code_xml" == "400" ]] || fail "expected 404/400 for xml before prepare, got $code_xml"
[[ "$code_pdf" == "404" || "$code_pdf" == "400" ]] || fail "expected 404/400 for pdf before prepare, got $code_pdf"
ok "downloads correctly fail before prepare"

# Send + logs + refresh
log "Send invoice 1 (stub Hermes if env is empty)"
send_json=$(api POST "/invoices/$INV1_ID/send")
( [[ -n "$(json_get "$send_json" "messageId")" ]] || [[ -n "$(json_get "$send_json" "hermesMessageId")" ]] || [[ -n "$(json_get "$send_json" "id")" ]] ) \
  || { echo "Send response:"; echo "$send_json" | json_pp; fail "send did not return message id"; }
ok "send returned message id"

log "Fetch delivery logs (expect PREPARE and SEND at least)"
logs_json=$(api GET "/invoices/$INV1_ID/logs")
LEN=$(PATHSTR="length" node -e 'const fs=require("fs"); const o=JSON.parse(fs.readFileSync(0,"utf8")); console.log(Array.isArray(o)?o.length:0);' <<< "$logs_json")
[[ "$LEN" -ge 2 ]] || { echo "$logs_json" | json_pp; fail "expected at least 2 logs"; }
ok "logs length >= 2"

log "Refresh status"
ref_json=$(api GET "/invoices/$INV1_ID/refresh-status")
json_has "$ref_json" "status" "refresh-status returned status"

# Error cases
log "Error: due before issue (expect 400)"
bad_body=$(cat <<JSON
{"clientId":"$CLIENT_A_ID","issueDate":"2025-12-31","dueDate":"2025-01-15","currency":"EUR","lines":[{"description":"x","quantity":1,"unitPrice":1,"vatRate":21}]}
JSON
)
code=$(status_of POST /invoices "$bad_body")
assert_eq "400" "$code" "invalid dates -> 400"

log "Error: no lines (expect 400)"
bad_body2=$(cat <<JSON
{"clientId":"$CLIENT_A_ID","issueDate":"2025-01-01","dueDate":"2025-02-01","currency":"EUR","lines":[]}
JSON
)
code=$(status_of POST /invoices "$bad_body2")
assert_eq "400" "$code" "no lines -> 400"

# ------------------------------------------------------------------------------
# Rate limit hammer (parallel, 429s)
# ------------------------------------------------------------------------------
log "Rate limit: hard burst to POST /auth/verify-credentials"
tmp_hammer="$(mktemp -d)"
echo "Temp dir: $tmp_hammer"
echo "User    : $EMAIL"
echo "Burst   : $RL_N requests, parallel: $RL_PAR"

do_hammer() {
  local i="$1"
  local hdr="$tmp_hammer/$i.headers"
  curl -sS -D "$hdr" -o /dev/null \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}" \
    "$BASE/auth/verify-credentials" || true
}

running=0
for i in $(seq 1 "$RL_N"); do
  do_hammer "$i" &
  running=$((running+1))
  if (( running % RL_PAR == 0 )); then wait; fi
done
wait

HDR="$(cat "$tmp_hammer"/*.headers 2>/dev/null || true)"
count_status () {
  local code="$1"
  printf "%s" "$HDR" | awk -v code="$code" '
    BEGIN{c=0}
    /^HTTP\// { if ($2==code) c++; else if ($2=="" && $0 ~ (" "code" ")) c++ }
    END{print c+0}'
}
OKC="$(count_status 200)"
UNAUTHC="$(count_status 401)"
RLC="$(count_status 429)"
OTHERC=$(printf "%s" "$HDR" | awk 'BEGIN{c=0} /^HTTP\// { if ($2!="200" && $2!="401" && $2!="429") c++ } END{print c+0}')

echo "Results:"
echo "  200 OK           : $OKC"
echo "  401 Unauthorized : $UNAUTHC"
echo "  429 Too Many     : $RLC"
echo "  Other            : $OTHERC"

LAST_FILE="$(ls -1 "$tmp_hammer"/*.headers 2>/dev/null | sort -V | tail -1 || true)"
if [[ -n "$LAST_FILE" && -f "$LAST_FILE" ]]; then
  echo "Last response headers:"
  grep -iE '^(HTTP/|x-ratelimit|retry-after|date|content-type)' "$LAST_FILE" || echo "(no X-RateLimit headers)"
else
  echo "No header files captured."
fi

ok "ALL CHECKS COMPLETED"
echo "Artifacts:"
echo "  XML: $xml_path"
echo "  PDF: $pdf_path"
