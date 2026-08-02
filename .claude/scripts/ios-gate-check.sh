#!/usr/bin/env bash
#
# ios-gate-check.sh — post-dispatch-wave verification for ios-supervisor.
#
# Two independent problems this catches, both confirmed root causes of wasted
# rebuild/rediagnosis time (see docs/superpowers/plans/2026-07-26-ios-pipeline-reliability.md):
#
#   1. A dispatched scaffolder silently writes to the MAIN checkout instead of
#      the assigned worktree, then reports success — the worktree file is simply
#      unchanged and the build/test still passes on stale code.
#   2. `xcodebuild test`'s trailing `** TEST FAILED **` / `** TEST EXECUTE FAILED **`
#      banner fires whenever ANY test was skipped (XCTSkip), even with zero real
#      failures — so trusting the banner alone reports a false regression.
#
# Usage:
#   ios-gate-check.sh verify-writes <worktree-path> <main-repo-path>
#   ios-gate-check.sh parse-test-log <log-file>

set -euo pipefail

cmd="${1:-}"

case "$cmd" in
  verify-writes)
    worktree="${2:?usage: ios-gate-check.sh verify-writes <worktree-path> <main-repo-path>}"
    main="${3:?usage: ios-gate-check.sh verify-writes <worktree-path> <main-repo-path>}"

    for path_check in "$worktree:worktree" "$main:main"; do
      p="${path_check%%:*}"; label="${path_check##*:}"
      if ! git -C "$p" rev-parse --is-inside-work-tree >/dev/null 2>&1; then
        echo "ios-gate-check: FAIL — $label path '$p' is not a git working tree (typo, or a relative path resolved against the wrong cwd)." >&2
        exit 3
      fi
    done

    main_dirty="$(git -C "$main" status --porcelain -- ios/ 2>/dev/null || true)"
    if [ -n "$main_dirty" ]; then
      echo "ios-gate-check: FAIL — main checkout has uncommitted ios/ changes; a dispatched" >&2
      echo "agent likely wrote to $main instead of the worktree at $worktree:" >&2
      echo "$main_dirty" >&2
      exit 1
    fi

    worktree_dirty="$(git -C "$worktree" status --porcelain -- ios/ 2>/dev/null || true)"
    if [ -z "$worktree_dirty" ]; then
      echo "ios-gate-check: WARN — worktree $worktree has no uncommitted ios/ changes." >&2
      echo "If the last wave was supposed to write files, this is a wrong-checkout write — check $main." >&2
      exit 2
    fi

    echo "ios-gate-check: OK — main checkout clean, worktree has the expected changes:"
    echo "$worktree_dirty"
    ;;

  parse-test-log)
    log="${2:?usage: ios-gate-check.sh parse-test-log <log-file>}"
    [ -f "$log" ] || { echo "ios-gate-check: no such file: $log" >&2; exit 1; }

    # XCTest ground truth — per-suite "Executed N tests, with N failures" lines, EXCLUDING
    # the 'All tests' and '<Target>.xctest' aggregate lines (those duplicate every real
    # suite's count, so counting them would triple-count a single real failure).
    xctest_suite_lines="$(awk '
      /^Test Suite .* (passed|failed) at/ { cur=$0 }
      /Executed [0-9]+ tests?, with [0-9]+ failures?/ {
        if (cur !~ /Test Suite .All tests./ && cur !~ /\.xctest.[ \t]+(passed|failed)/) print
      }
    ' "$log")"
    xctest_failures=0
    if [ -n "$xctest_suite_lines" ]; then
      xctest_failures="$(echo "$xctest_suite_lines" | grep -oE "with [0-9]+ failures?" | grep -oE "[0-9]+" | awk '{s+=$1} END {print s+0}')"
    fi

    # Swift Testing ground truth — a SEPARATE report stream (used by every `import Testing`
    # suite) that never emits an "Executed N tests" line, so it is invisible to the XCTest
    # parsing above. Count individual failed-test markers; also treat a failing top-level
    # summary as at least one real failure in case the per-test marker format changes.
    swift_testing_failures="$(grep -cE "^✘ Test " "$log" || true)"
    if [ "$swift_testing_failures" -eq 0 ] && grep -qE "Test run with [0-9]+ tests? in [0-9]+ suites? failed" "$log"; then
      swift_testing_failures=1
    fi

    if [ -z "$xctest_suite_lines" ] && [ "$swift_testing_failures" -eq 0 ] \
       && ! grep -qE "Test run with [0-9]+ tests? in [0-9]+ suites? (passed|failed)" "$log"; then
      echo "ios-gate-check: no per-suite 'Executed N tests' lines and no Swift Testing summary found in $log — inspect manually." >&2
      exit 1
    fi

    real_failures=$((xctest_failures + swift_testing_failures))

    [ -n "$xctest_suite_lines" ] && echo "$xctest_suite_lines"
    echo "---"
    echo "ios-gate-check: XCTest failures = $xctest_failures, Swift Testing failures = $swift_testing_failures, total real failures = $real_failures"
    if [ "$real_failures" -gt 0 ]; then
      echo "ios-gate-check: FAIL — $real_failures real test failure(s). Do not trust the trailing banner alone; this count is the ground truth." >&2
      exit 1
    fi
    echo "ios-gate-check: PASS — 0 real failures (trailing banner may still say FAILED if any test was skipped — that is expected, not a regression)."
    ;;

  *)
    echo "usage: ios-gate-check.sh {verify-writes|parse-test-log} ..." >&2
    exit 1
    ;;
esac
