#!/usr/bin/env bash
#
# refresh-lsp-index.sh [checkout-path] — refresh the sourcekit-lsp index for a
# specific checkout (main or a worktree) so the next agent's cross-file LSP
# (findReferences / workspaceSymbol) lands on fresh units. sourcekit-lsp absorbs
# the new units automatically — no restart.
#
# The coordinator calls this between dispatch waves. It is SAFE to over-call:
#   • takes an EXPLICIT path (default: cwd) — no cwd-guessing, so it always
#     targets the checkout the scaffolders actually edited (a hook keyed to the
#     main session's cwd would rebuild the wrong worktree);
#   • debounces — no-ops if no ios/ Swift changed since the last refresh;
#   • coalesces — if a refresh build is already running, leaves it alone (never
#     two concurrent xcodebuilds into one DerivedData);
#   • backgrounds the build and returns immediately, so dispatch isn't blocked.
#
# Usage:
#   refresh-lsp-index.sh                      # refresh the cwd checkout
#   refresh-lsp-index.sh .claude/worktrees/x  # refresh a specific worktree
set -euo pipefail

TARGET="${1:-$PWD}"
cd "$TARGET" 2>/dev/null || { echo "refresh-lsp-index: no such path: $TARGET" >&2; exit 0; }

# Only act in the iOS monorepo with LSP actually wired.
ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
cd "$ROOT"
[ -d ios/AITravel.xcodeproj ] || exit 0
[ -f buildServer.json ]       || { echo "refresh-lsp-index: no buildServer.json in $ROOT — run 'xcode-build-server config' first (cross-file LSP would be fallback-only)." >&2; exit 0; }

LOCKDIR="$ROOT/.claude/.lsp-refresh.lock.d"
STAMP="$ROOT/.claude/.lsp-refresh.stamp"
LOG="$ROOT/.claude/.lsp-refresh.log"

# Debounce: skip if nothing under ios/ changed since the last refresh.
if [ -f "$STAMP" ] && [ -z "$(find ios -name '*.swift' -newer "$STAMP" -print -quit 2>/dev/null)" ]; then
  echo "refresh-lsp-index: no ios/ Swift changes since last refresh — index is current."
  exit 0
fi

# Coalesce via an atomic mkdir lock that holds the live build pid.
if ! mkdir "$LOCKDIR" 2>/dev/null; then
  pid="$(cat "$LOCKDIR/pid" 2>/dev/null || true)"
  # empty pid = a build is just starting (pid not written yet) → treat as held.
  if [ -z "$pid" ] || kill -0 "$pid" 2>/dev/null; then
    echo "refresh-lsp-index: a refresh build is already running — skipping."
    exit 0
  fi
  # stale lock (recorded pid is dead): reclaim it.
  rm -rf "$LOCKDIR"
  mkdir "$LOCKDIR" 2>/dev/null || { echo "refresh-lsp-index: lost a lock race — skipping."; exit 0; }
fi

echo "refresh-lsp-index: refreshing index for $ROOT (background → $LOG)…"
(
  xcodebuild -project ios/AITravel.xcodeproj -scheme AITravel \
    -destination 'platform=iOS Simulator,name=iPhone 17 Pro,OS=27.0' \
    CODE_SIGNING_ALLOWED=NO COMPILATION_CACHE_ENABLE_CACHING=YES build >"$LOG" 2>&1
  touch "$STAMP"
  rm -rf "$LOCKDIR"
) </dev/null >/dev/null 2>&1 &
echo "$!" > "$LOCKDIR/pid"   # foreground records the build pid before returning
disown 2>/dev/null || true
echo "refresh-lsp-index: started (pid $!). sourcekit-lsp picks up the fresh units when it finishes."
