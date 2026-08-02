#!/usr/bin/env bash
#
# fast-uitest.sh — run the full AITravelUITests suite as fast as this machine
# reliably allows: a parallel pass, then a serial retry of whatever the
# parallel pass's dispatcher failed to hand out.
#
# Why a retry phase, not just -parallel-testing-worker-count: on this project's
# Xcode 27 beta, an isolated `xcodebuild test -parallel-testing-enabled YES`
# run reproducibly hangs near the end of the suite — the driver finishes
# dispatching what it assigned to simulator clones but never picks up the last
# batch of queued classes, and sits idle producing no output. Confirmed at both
# 7 and 10 workers; the straggler classes run cleanly in seconds when retried
# standalone. So: run parallel for speed, detect the hang by log inactivity,
# kill it, and serially rerun exactly the classes that never got dispatched.
# See ios/docs/engineering/09-ui-e2e-testing.md § Parallel test execution.
#
# Usage:
#   .claude/scripts/fast-uitest.sh                # 7 workers, default sim
#   WORKERS=5 .claude/scripts/fast-uitest.sh       # override worker count
#   SIM_NAME='iPhone 17 Pro' SIM_OS=27.0 .claude/scripts/fast-uitest.sh
#
# Exit code: 0 only if every test in the suite ultimately passed.
set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || { echo "fast-uitest: not inside a git repo" >&2; exit 1; }
cd "$ROOT"
[ -d ios/AITravel.xcodeproj ] || { echo "fast-uitest: no ios/AITravel.xcodeproj under $ROOT" >&2; exit 1; }

WORKERS="${WORKERS:-7}"
SIM_NAME="${SIM_NAME:-iPhone 17 Pro}"
SIM_OS="${SIM_OS:-27.0}"
STALL_SECS="${STALL_SECS:-240}"
DEST="platform=iOS Simulator,name=${SIM_NAME},OS=${SIM_OS}"

WORKDIR="$(mktemp -d)"
PARALLEL_LOG="$WORKDIR/parallel.log"
RETRY_LOG="$WORKDIR/retry.log"
trap 'rm -rf "$WORKDIR"' EXIT

START=$(date +%s)

echo "fast-uitest: phase 1 — parallel pass (${WORKERS} workers)"
: > "$PARALLEL_LOG"
xcodebuild -project ios/AITravel.xcodeproj -scheme AITravel \
  -destination "$DEST" \
  -parallel-testing-enabled YES -parallel-testing-worker-count "$WORKERS" \
  CODE_SIGNING_ALLOWED=NO COMPILATION_CACHE_ENABLE_CACHING=YES test -only-testing:AITravelUITests >>"$PARALLEL_LOG" 2>&1 &
XCPID=$!

while kill -0 "$XCPID" 2>/dev/null; do
  sleep 15
  LAST_MOD=$(stat -f %m "$PARALLEL_LOG" 2>/dev/null || echo 0)
  NOW=$(date +%s)
  if [ $((NOW - LAST_MOD)) -gt "$STALL_SECS" ]; then
    echo "fast-uitest: no output for ${STALL_SECS}s — parallel dispatcher hung, killing and moving to retry phase"
    kill -9 "$XCPID" 2>/dev/null
    pkill -9 -f AITravelUITests-Runner 2>/dev/null
    break
  fi
done
wait "$XCPID" 2>/dev/null

PARALLEL_ELAPSED=$(( $(date +%s) - START ))
echo "fast-uitest: phase 1 done after ${PARALLEL_ELAPSED}s"

# Full (class, method) pairs declared in source vs. what actually reported a result.
# Retry targets individual methods (Class/method), not whole classes — a first
# pass that stalls with N classes still queued leaves most of those classes'
# tests already passed; re-running the whole class wastes time re-executing
# them. Method-level -only-testing keeps phase 2 to exactly what's missing.
python3 - "$ROOT/ios/AITravelUITests" "$PARALLEL_LOG" <<'PYEOF' > "$WORKDIR/missing_pairs.txt"
import re, sys, pathlib

src_dir, log_path = sys.argv[1], sys.argv[2]
all_pairs = set()
class_re = re.compile(r'^\s*(?:final\s+)?class\s+(\w+)\s*:\s*XCTestCase')
func_re = re.compile(r'^\s*func\s+(test\w+)\s*\(')

for f in pathlib.Path(src_dir).glob("*.swift"):
    current_class = None
    for line in f.read_text().splitlines():
        m = class_re.match(line)
        if m:
            current_class = m.group(1)
            continue
        m = func_re.match(line)
        if m and current_class:
            all_pairs.add(f"{current_class}/{m.group(1)}")

ran_pairs = set()
result_re = re.compile(r"Test case '([\w.]+)\(\)' (?:passed|failed)")
for line in pathlib.Path(log_path).read_text(errors="ignore").splitlines():
    m = result_re.search(line)
    if m:
        ran_pairs.add(m.group(1).replace(".", "/", 1))

for p in sorted(all_pairs - ran_pairs):
    print(p)
PYEOF

MISSING_PAIRS=$(cat "$WORKDIR/missing_pairs.txt")
PASS_1=$(grep -c "Test case '.*' passed" "$PARALLEL_LOG")
FAIL_1=$(grep -c "Test case '.*' failed" "$PARALLEL_LOG")
echo "fast-uitest: phase 1 results — passed=${PASS_1} failed=${FAIL_1}"

if [ -z "$MISSING_PAIRS" ]; then
  echo "fast-uitest: nothing missing — no retry phase needed"
else
  MISSING_COUNT=$(echo "$MISSING_PAIRS" | wc -l | tr -d ' ')
  echo "fast-uitest: phase 2 — retrying ${MISSING_COUNT} tests the dispatcher never ran:"
  echo "$MISSING_PAIRS" | sed 's/^/  - /'

  ONLY_TESTING_ARGS=()
  while IFS= read -r p; do
    ONLY_TESTING_ARGS+=("-only-testing:AITravelUITests/${p}")
  done <<< "$MISSING_PAIRS"

  : > "$RETRY_LOG"
  xcodebuild -project ios/AITravel.xcodeproj -scheme AITravel \
    -destination "$DEST" \
    CODE_SIGNING_ALLOWED=NO COMPILATION_CACHE_ENABLE_CACHING=YES test "${ONLY_TESTING_ARGS[@]}" >>"$RETRY_LOG" 2>&1
fi

TOTAL_ELAPSED=$(( $(date +%s) - START ))
PASS_2=$( [ -f "$RETRY_LOG" ] && grep -c "Test case '.*' passed" "$RETRY_LOG" || echo 0)
FAIL_2=$( [ -f "$RETRY_LOG" ] && grep -c "Test case '.*' failed" "$RETRY_LOG" || echo 0)
TOTAL_PASS=$((PASS_1 + PASS_2))
TOTAL_FAIL=$((FAIL_1 + FAIL_2))

echo "----"
echo "fast-uitest: DONE in ${TOTAL_ELAPSED}s — passed=${TOTAL_PASS} failed=${TOTAL_FAIL}"
if [ -s "$PARALLEL_LOG" ]; then
  grep -E "error:|Test case '.*' failed" "$PARALLEL_LOG"
fi
if [ -f "$RETRY_LOG" ] && [ -s "$RETRY_LOG" ]; then
  grep -E "error:|Test case '.*' failed" "$RETRY_LOG"
fi

[ "$TOTAL_FAIL" -eq 0 ]
