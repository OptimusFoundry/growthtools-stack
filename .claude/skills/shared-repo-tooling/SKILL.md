---
name: shared-repo-tooling
description: Build or modify repo-level tooling in this monorepo — Python scripts under scripts/, PreToolUse/commit hooks under .claude/hooks/ and .githooks/, and harness config under .claude/. Use when work targets tooling rather than base-server (Go) or webapp (React), which have their own specialized agents. Covers the ticket CLI, the agent-routing guard, and anything that reads .claude/agents/routing.yml.
context: fork
agent: general-purpose
---

# Repo Tooling

You are building tooling that the development harness itself depends on. It is infrastructure: when
it breaks, it breaks silently and every downstream dispatch inherits the fault. Correctness and
legibility beat cleverness.

## Where things live

| Path | What |
|---|---|
| `scripts/` | Developer-facing CLIs (`scripts/tickets`) |
| `.claude/hooks/` | Claude Code lifecycle hooks (PreToolUse etc.), wired in `.claude/settings.json` |
| `.githooks/` | Git hooks (`commit-msg`), installed via `./.githooks/install.sh` |
| `.claude/agents/routing.yml` | `layer → agent` map. **Single source of truth** — the routing guard, the ticket CLI, and `.claude/agents/README.md` all derive from it. Never hardcode an agent list anywhere else. |

## Hard constraints

- **Python 3 stdlib only.** No pip installs, no new dependencies. `.claude/hooks/agent-routing-guard.py`
  is the reference implementation — match its shape.
- **Target Python 3.9, not your shell's `python3`.** Stock macOS ships 3.9.6 at `/usr/bin/python3`;
  Homebrew's 3.14 is merely what happens to be first on `PATH`. `scripts/tickets` shipped broken once
  on exactly this — three PEP 604 `X | None` annotations at class scope, which 3.9 evaluates at
  class-definition time and rejects with `TypeError` on import. It now carries
  `from __future__ import annotations` as the guard. Verify on **both** interpreters before
  claiming a tooling change works.
- **Hooks must fail open.** A malformed payload, a missing file, or an unexpected shape must exit 0
  and allow the action. A hook that crashes blocks the user's entire workflow. Never let an
  exception escape.
- **Never silently default a routing decision.** An unmapped layer surfaces as "needs routing".
  Defaulting to `general-purpose` is the exact failure this tooling exists to prevent.
- **Generated files are never hand-edited.** If a file is generated (`docs/TICKETS.md`), the
  generator is the only writer, regeneration must be idempotent, and the file must say so at the top.
- Comment sparingly — explain *why*, never *what*. See the root `CLAUDE.md` Comments rule.

## Hook I/O contract

A `PreToolUse` hook receives the tool call as JSON on stdin and either exits 0 silently (allow) or
prints a decision object:

```json
{"hookSpecificOutput": {"hookEventName": "PreToolUse",
  "permissionDecision": "deny", "permissionDecisionReason": "..."}}
```

The reason string is shown to the model, so it must be **actionable** — say what to do instead, not
merely what was refused.

## Ticket CLI (`scripts/tickets`)

Four subcommands, all live:

| Command | Does |
|---|---|
| `file "<title>" --layer <layer> [--kind bug\|chore\|spike] [--blocking] [--parent <ID>] [--note <text>]` | Files a standalone ticket in `docs/tickets/`, prints its bare ID |
| `next [PARENT]` | Lists dependency-ready tickets and their executors (optionally scoped to one parent) |
| `sync` | Regenerates `docs/TICKETS.md` and reports |
| `show <ID>` | Prints a self-contained dispatch package for one ticket |

**Unlike the hooks, this CLI fails loud.** Hooks fail open because a crash there blocks the user;
a CLI that guesses corrupts the corpus instead.

| Exit | Means |
|---|---|
| `0` | Success — **including every warning class** |
| `1` | Usage error (unknown command, missing/invalid argument, no args) |
| `2` | Invariant violation (`routing.yml` outside the parsing subset, ID collision, `_intent.yml` asserting `done`) |
| `3` | `show <ID>` where `<ID>` is unknown |

Warnings are data, never exit codes. A corpus with an unparsed plan, a dangling dependency, or a
hand-edited Status cell is still a corpus worth reporting on — that is what keeps `sync` runnable in
CI and in a dirty worktree.

### The bare-ID-on-stdout contract

`file` prints **the ID and nothing else** to stdout. Every human-readable line — `filed …`, the layer
resolution, warnings, the `commit with:` hint — goes to **stderr**. This is load-bearing, not
cosmetic: it is what makes the capture valve scriptable.

```bash
ID=$(scripts/tickets file "flaky webhook retry" --layer api)
# stdout (all that $ID captures):  BUG-001
# stderr:  filed BUG-001  docs/tickets/BUG-001.md
#          layer 'api' -> backend-code-editor
#          commit with: Ticket: BUG-001
```

Never add a decorative line to stdout in `file`, and never "helpfully" print the path there.

### Who carries this skill

`feature-manager`, `backend-supervisor`, `frontend-supervisor`, `epic-supervisor` and
`codemod-supervisor` declare `skills: [shared-repo-tooling]` in their frontmatter. Those five are the
agents that (a) discover sidequests mid-run and (b) hold `Bash`, so they can actually *run* the
capture valve — `scripts/tickets file …` — instead of merely noticing the gap. Workers have no
`Bash` and are excluded deliberately: a worker that finds a sidequest reports it upward.

Agent definitions load at startup, so adding or removing a `skills:` entry takes effect only after a
session restart.

### The parsing subset

`.claude/agents/routing.yml` and `docs/tickets/_intent.yml` are read by a hand-rolled reader, because
stdlib-only means no pyyaml. Both files are therefore restricted to a syntactic subset chosen so the
hand-rolled reader and a real YAML parser read them **identically** — each file documents its own
subset in its header. Anything outside it is a hard error with file + line, never a guess: a
construct the two readers disagree about is precisely the drift this design prevents. The CLI
surfaces it and exits `2`; a hook catches it, degrades, and allows.

When extending either file, stay inside the subset. If you genuinely need a construct it forbids,
widen the subset *and* both readers deliberately — do not sneak it in.

### `docs/TICKETS.md` is generated

Its only writer is `scripts/tickets sync`. Do not hand-edit it; the next run overwrites it wholesale,
and the file says so on line 1.

**`sync` must stay byte-idempotent** — no timestamps, no host/user/branch, no volatile SHA,
deterministic ordering throughout. That property is the whole reason "regenerate instead of merge"
is a legitimate conflict resolution for this file. Any change that makes two consecutive runs differ
is a bug, however cosmetic it looks.

## Testing — pipe-test, always

There is no test framework here. Verify by piping a synthesized payload straight into the script and
checking both the exit code and the observable effect:

```bash
printf '%s' '{"tool_name":"Agent","tool_input":{"subagent_type":"general-purpose",
  "prompt":"edit base-server"}}' | python3 .claude/hooks/agent-routing-guard.py
```

Cover, at minimum: the happy path, the path that must be blocked, an exempt path, malformed input,
and a missing/empty file. State the actual commands and their real output in your report — never
claim a check passed without showing it.

For `scripts/tickets`, additionally prove:

- **Idempotence** — run `sync` twice and show `git diff` is empty on the second run.
- **Both interpreters** — `/usr/bin/python3 scripts/tickets sync` *and* `python3 scripts/tickets sync`.
- **The stdout contract** — capture with `ID=$(…)` and echo the variable, rather than eyeballing the
  terminal, which shows stdout and stderr interleaved and hides a violation.

`file` and `sync` both write to the repo. To exercise them without dirtying the corpus, copy
`scripts/tickets` plus `.claude/agents/`, `.claude/skills/`, `docs/TRACKER.md`, `docs/plans/` and
`docs/tickets/` into a scratch directory and `git init` it — the CLI resolves its root by running
`git rev-parse --show-toplevel` from the **script's own directory**, so a copied script operates
entirely on the copy.

## Dispatching this skill

**`ROUTING-OK` is no longer required.** `.claude/`, `.githooks/`, `scripts/` and `landing/` are
`paths.exempt` in `.claude/agents/routing.yml`, so the routing guard allows a `general-purpose`
dispatch whose prompt names them. Historically this skill needed the override token; that footnote
is obsolete.

The caveat is **exempt-wins**: the guard allows the dispatch as soon as *any* exempt path appears,
even if the prompt also names `base-server` or `webapp`. That is a deliberate trade-off — the
alternative self-blocks the tooling executor — but it is permission, not licence. The exemption
covers tooling prompts that merely *mention* those services; genuine Go or React work still belongs
to a specialized agent (`backend-code-editor`, `frontend-code-editor`, …). If you find yourself
editing a `.go` or `.tsx` file under those trees, you are in the wrong agent — stop and re-route.

## Report back

State exactly: files created or modified, the commands you ran with their real output, which cases
you covered, and anything you left out of scope. If you could not verify something, say so plainly
rather than implying it passed.
