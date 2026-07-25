#!/usr/bin/env bash
# Runs every suite against a local copy of the site.
#
#   cd tests && ./run.sh
#
# Needs playwright and a Chromium. If the browser is not where playwright
# expects it, point CHROME at one:
#   CHROME=/path/to/chrome ./run.sh
#
# To run against the live site instead of a local server:
#   BASE=https://wudwerd.github.io/spain-2026-family-holiday ./run.sh

set -u
cd "$(dirname "$0")"

BASE="${BASE:-http://127.0.0.1:4173}"
SERVER_PID=""

if [ "$BASE" = "http://127.0.0.1:4173" ]; then
  if ! curl -sf -o /dev/null "$BASE/"; then
    echo "starting a local server on 4173"
    (cd .. && python3 -m http.server 4173 >/dev/null 2>&1) &
    SERVER_PID=$!
    for _ in $(seq 1 20); do curl -sf -o /dev/null "$BASE/" && break; sleep 0.5; done
  fi
fi

export BASE
pass=0; fail=0
for t in mrzunit real split bk camui backup before deeplink pk durability; do
  [ -f "$t.mjs" ] || continue
  printf '\n=== %s ===\n' "$t"
  if node "$t.mjs"; then pass=$((pass+1)); else fail=$((fail+1)); echo "  ^ FAILED"; fi
done

[ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null

printf '\n%s passed, %s failed\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
