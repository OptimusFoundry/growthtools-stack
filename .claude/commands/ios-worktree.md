---
description: Create (or reuse) an iOS dev worktree under .claude/worktrees/ and warm+verify its sourcekit-lsp index with a background build, so ios-* scaffolders get resolving LSP from their first call.
argument-hint: <name> [base-ref]
allowed-tools: Bash(.claude/scripts/ios-worktree-warm.sh:*), Bash(.claude/scripts/swift-lsp-query.py:*), Bash(git worktree:*), Bash(tail:*)
---

Set up an isolated iOS worktree with a pre-warmed, VERIFIED sourcekit-lsp index.

1. Run the script: `.claude/scripts/ios-worktree-warm.sh $ARGUMENTS`
   It creates `.claude/worktrees/<name>` on branch `wt/<name>` (forked from the main checkout's HEAD
   unless a base-ref is given) and kicks off a **background** `xcodebuild build` in that worktree,
   followed by an automatic LSP self-check (see below). The script returns immediately; the build +
   check keep running detached.
2. Report to the user: the worktree path, the branch, and that LSP is cold until
   `<worktree>/.warm-build.log` prints `** LSP READY **`. Hold off dispatching `ios-supervisor` (and,
   transitively, its `ios-*` scaffolders) into the worktree until then — cold LSP is exactly what makes
   them fall back to grep/read.

**`BUILD SUCCEEDED` is NOT the readiness signal — `** LSP READY **` is.** Confirmed 2026-08-01: Claude
Code's built-in `LSP` tool talks to one shared, long-lived sourcekit-lsp process that reliably fails
cross-file `goToDefinition` / `findReferences` / `hover` in this repo, REGARDLESS of build freshness —
reproduced against both a stale main checkout and a just-finished worktree build. A standalone
sourcekit-lsp process given the identical file/root/buildServer.json resolves the same queries
correctly, so the build/index/xcode-build-server chain was never the problem — the shared process the
built-in tool drives is. The warm script now proves readiness itself: after the build, it spins up a
short-lived sourcekit-lsp probe (`.claude/scripts/swift-lsp-query.py`) against a known cross-file
fixture (`AppStore`, used in `Screens/YouPresenter.swift`, declared in `Store/AppStore.swift`) and only
logs `** LSP READY **` if that resolves.

**For cross-file Swift navigation, use `.claude/scripts/swift-lsp-query.py` via Bash instead of the
built-in `LSP` tool** — pass every agent you dispatch into the worktree this instruction:

```
.claude/scripts/swift-lsp-query.py <hover|definition|references|documentSymbol|workspaceSymbol> \
  <file> <line> <character> [--root <worktree>/ios] [--query <name>]
```

It prints a JSON result on stdout (or `{"error": "..."}` on failure/timeout). The built-in `LSP` tool
remains fine for same-file `hover` and `documentSymbol` — it's specifically cross-file resolution that's
broken. Re-check with the built-in tool occasionally; if it starts resolving cross-file queries again,
this workaround (and the corresponding memory note) can be retired.

**Why a build and not an index copy:** sourcekit-lsp resolves a worktree's files only from IndexStore
units built against that worktree's absolute paths. Copying the main checkout's index leaves every
`goToDefinition`/`findReferences` on the worktree unresolved. The background build is what produces
resolvable units; the global Swift/clang module cache keeps it far cheaper than a cold build.

**Then** follow the hard workflow rule: worktree → `ios-plan-writer` (architect) → `ios-plan-critic`
(critic, M/L plans) → `ios-supervisor` (execute, dispatched directly on the plan) → finish-branch.
Never hand-edit `ios/` Swift in the worktree.
