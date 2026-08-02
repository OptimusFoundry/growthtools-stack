#!/usr/bin/env bash
#
# ios-worktree-warm.sh — create (or reuse) an iOS dev worktree under
# .claude/worktrees/<name> and warm its sourcekit-lsp index with a background
# build, so the swift-* scaffolders get fast, resolving LSP from their first
# call instead of falling back to grep/read.
#
# WHY A BUILD, NOT AN INDEX COPY: sourcekit-lsp resolves a file's symbols only
# from IndexStore *units* that were built against that file's absolute path. A
# worktree lives at a different absolute path than the main checkout and gets
# its own DerivedData index store, so copying the main checkout's 29 MB index
# would leave every goToDefinition / findReferences on the worktree's files
# UNRESOLVED — the units all point at the main checkout's paths. The only thing
# that produces resolvable units for a worktree is a build whose SRCROOT is the
# worktree. The Swift/clang module caches are shared globally, so this build is
# far cheaper than a cold-machine build.
#
# WHY `parse`, NOT JUST `config` (root-caused 2026-08-01): `xcode-build-server
# config` reconstructs per-file compiler args generically and — for this
# project — picks the macOS SDK instead of iphonesimulator, breaking every
# index-backed query (cross-file hover/goToDefinition/findReferences all
# return empty/null; same-file syntax-only hover still works, which is what
# makes this look like "LSP is fine, just cross-file is flaky"). Confirmed via
# a raw SOURCEKIT_LOGGING=3 trace: `config`'s buildServer.json makes
# sourcekit-lsp request compilerargs with `-sdk .../MacOSX.sdk/`, producing
# real `Cannot find type 'X' in scope` diagnostics under the wrong SDK.
# `xcode-build-server parse -s <build_root>` instead extracts the REAL
# per-file compile commands from the build's own .xcactivitylog (the one
# xcodebuild just produced against -destination iphonesimulator) into
# `.compile`, which is correct. So: `config` once (for workspace/scheme
# binding), then ALWAYS `parse -s <build_root>` after every full/clean build.
# An incremental rebuild with nothing to recompile produces an empty `.compile`
# from `parse` — harmless, since a stale-but-correct `.compile` from the prior
# full build is still valid at the same build_root.
#
# CAVEAT — mid-session staleness: sourcekit-lsp reads buildServer.json/.compile
# once at process init, not per-request. Claude Code's built-in `LSP` tool
# drives one shared, long-lived sourcekit-lsp process for the whole session,
# rooted wherever it first initialized — so fixing buildServer.json/.compile
# here does NOT retroactively fix an already-running session's built-in `LSP`
# tool (and `pkill sourcekit-lsp` to force a respawn wedges it for the rest of
# the session with no respawn — never do that, see memory
# ios-scaffolder-speed-fixes). It DOES fix: (a) any session that starts fresh
# after this script has run, and (b) `swift-lsp-query.py`, which spins up its
# own short-lived sourcekit-lsp process per call and so is never subject to
# this staleness — use it as the reliable path within an already-stale session.
#
# Usage: ios-worktree-warm.sh <name> [base-ref]
#   <name>      worktree dir + branch  (.claude/worktrees/<name>, branch wt/<name>)
#   [base-ref]  commit/branch to fork from (default: main checkout's HEAD)
#
# Safe to invoke from ANY worktree, including the one named by <name> — it
# resolves and cd's to the main checkout internally (line below) and, since
# this runs as a child process, that cd never affects your calling shell's
# cwd. No need to leave a linked worktree before running this.
set -euo pipefail

NAME="${1:?usage: ios-worktree-warm.sh <name> [base-ref]}"

# Always operate from the MAIN working tree (the first entry of `worktree list`
# is always the main checkout, even when invoked from a linked worktree).
MAIN="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"
cd "$MAIN"

BASE_REF="${2:-HEAD}"
WT="${MAIN}/.claude/worktrees/${NAME}"
BRANCH="wt/${NAME}"
DEST='platform=iOS Simulator,name=iPhone 17 Pro,OS=27.0'

if [ -d "$WT" ]; then
  echo "↻ reusing existing worktree: $WT"
else
  mkdir -p "${MAIN}/.claude/worktrees"
  if git show-ref --verify --quiet "refs/heads/${BRANCH}"; then
    git worktree add "$WT" "$BRANCH"
  else
    git worktree add "$WT" -b "$BRANCH" "$BASE_REF"
  fi
  echo "✔ created worktree: $WT  (branch $BRANCH from ${BASE_REF})"
fi

PROJ="${WT}/ios/AITravel.xcodeproj"
[ -d "$PROJ" ] || { echo "✘ $PROJ not found — is this the iOS monorepo?" >&2; exit 1; }

HAVE_XBS=0
if command -v xcode-build-server >/dev/null 2>&1; then
  HAVE_XBS=1
  # Bind workspace/scheme/build_root. This alone is NOT enough for correct
  # cross-file resolution on this project — see the `parse` step below.
  ( cd "$WT" && xcode-build-server config -project ios/AITravel.xcodeproj -scheme AITravel >/dev/null 2>&1 ) \
    && echo "✔ buildServer.json bound (workspace/scheme/build_root)" \
    || echo "⚠ xcode-build-server config failed — LSP will be fallback-only"
else
  echo "⚠ xcode-build-server not installed (brew install xcode-build-server) — cross-file LSP (findReferences/workspaceSymbol/goToDefinition) will not resolve; only same-file hover."
fi

LOG="${WT}/.warm-build.log"
echo "⟳ warming sourcekit-lsp index (background build → ${LOG}) …"
# Default DerivedData on purpose: sourcekit-lsp reads the default index store
# keyed by the worktree's project path. Do NOT pass -derivedDataPath here.
QUERY_SCRIPT="${MAIN}/.claude/scripts/swift-lsp-query.py"
FIXTURE="${WT}/ios/AITravel/Screens/YouPresenter.swift"
nohup bash -c '
  set -o pipefail
  xcodebuild -project "'"$PROJ"'" -scheme AITravel \
    -destination "'"$DEST"'" CODE_SIGNING_ALLOWED=NO COMPILATION_CACHE_ENABLE_CACHING=YES build
  status=$?
  if [ $status -ne 0 ]; then
    echo "✘ xcodebuild failed (exit $status) — LSP cannot warm without a successful build."
    exit $status
  fi
  echo "** WARM BUILD OK **"

  if [ '"$HAVE_XBS"' -eq 1 ]; then
    BUILD_ROOT=$(python3 -c "import json,sys; print(json.load(open(\"'"$WT"'/buildServer.json\"))[\"build_root\"])" 2>/dev/null || true)
    if [ -n "$BUILD_ROOT" ]; then
      ( cd "'"$WT"'" && xcode-build-server parse -s "$BUILD_ROOT" >/dev/null 2>&1 ) \
        && echo "✔ buildServer.json/.compile regenerated from real build log (correct SDK/destination)" \
        || echo "⚠ xcode-build-server parse failed — buildServer.json may still have the wrong SDK; cross-file LSP unreliable"
    fi
  fi

  if [ -f "'"$QUERY_SCRIPT"'" ] && [ -f "'"$FIXTURE"'" ]; then
    RESULT=$(python3 "'"$QUERY_SCRIPT"'" hover "'"$FIXTURE"'" 14 16 --root "'"$WT"'" 2>&1)
    if echo "$RESULT" | grep -q "\"kind\": \"markdown\""; then
      echo "** LSP READY ** (cross-file hover on AppStore resolved via swift-lsp-query.py)"
    else
      echo "✘ LSP VERIFICATION FAILED — cross-file resolution still broken. Result:"
      echo "$RESULT"
    fi
  else
    echo "⚠ skipped LSP self-check (swift-lsp-query.py or fixture file not found)"
  fi
' >"$LOG" 2>&1 &
echo "  build pid $! — LSP stays cold until this finishes (first build of this worktree)."
echo
echo "Next:"
echo "  cd \"$WT\""
echo "  tail -f \"$LOG\"      # watch for '** LSP READY **' — the real warm signal, not just BUILD SUCCEEDED"
echo "  # If this is a session that already used the built-in LSP tool before this script ran, that tool's"
echo "  # shared sourcekit-lsp process is stale and pkill will NOT fix it (wedges for the rest of the"
echo "  # session — never do it). Use .claude/scripts/swift-lsp-query.py via Bash for cross-file Swift"
echo "  # navigation instead; it spins up its own short-lived process per call so it's never stale."
echo "  # then architect with ios-plan-writer and execute via ios-supervisor"
