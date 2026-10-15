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
| `scripts/` | Developer-facing CLIs (`scripts/tickets`, with its parsing module `scripts/ticket_corpus.py`) |
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
- **Generated files are never hand-edited.** If a file is generated, the
  generator is the only writer, regeneration must be idempotent, and the file must say so at the top.
- Comment sparingly — explain *why*, never *what*. See the root `AGENTS.md` Comments rule.

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

A thin HTTP client for Aijira's agent API. Aijira owns the index, status and routing; the script
allocates IDs, lists what is ready and fetches dispatch packages. There is **no local fallback**:
when Aijira cannot be reached the verb exits `5` and allocates and writes nothing. Config comes
from `AIJIRA_URL` (default `https://aijira.protoapp.xyz`), `AIJIRA_PRODUCT` (else resolved from the
`origin` remote via `GET /api/public/repos/:owner/:name`) and `AIJIRA_AGENT` (else
`CLAUDE_CODE_SESSION_ID`, else `<hostname>:<worktree dir>`), sent as `X-Aijira-Agent`.

| Command | Does |
|---|---|
| `id <KIND> [--parent <ID>]` | Allocates an ID (EP CH IN FEAT BUG CHORE SPIKE, or `task` with a parent), prints it bare |
| `file --type task\|feature\|bug\|chore\|spike "<title>" [--layer <layer>] [--parent <ID>] [--depends-on <ID,ID>] [--note <text>]` | Allocates an ID, fetches the served template, writes `docs/tickets/<ID>.md` at the repo toplevel (`--note` goes under the first `##`), prints the bare ID, then reports on stderr how many format rules fail (exit stays 0). `task` requires `--parent`; `--kind` is an alias of `--type`; the default type is `bug`. A template that cannot be fetched falls back to a built-in body with a warning |
| `next [PARENT]` | Lists dependency-ready tickets and their executors (optionally scoped to one parent) |
| `show <ID> [--plan <path>]` | Prints the server's dispatch package plus a local `--- rules ---` block; `--plan` is the explicit offline mode for plans not yet on the default branch |
| `claim <ID>` | Takes the claim and prints the package exactly as `show` does (exit `4` rule unchanged); `claimed until <expires_at>` goes to stderr. A held or not-ready ticket exits `7` and prints no package |
| `renew <ID>` / `release <ID>` | Extends / gives up your claim (`renew` prints the new expiry to stderr; `release` prints nothing). Not the holder: exit `7` |
| `handoff <ID> "<note>"` | Leaves a handoff note (1–4000 characters; `-` reads stdin). Empty or too long exits `1` before any request |
| `cost <ID>\|--held --agent-seconds N --input-tokens N --output-tokens N --cache-read-tokens N --cache-write-tokens N --cost-usd X [--session-id S]` | Reports what a run cost (`POST …/tickets/:ticket/costs`; `recorded` to stderr). A missing or negative number exits `1` before any request; 404 exits `3`. `--held` asks `GET …/claims?agent=<name>` and, if nothing is live, falls back to the newest ticket this agent claimed in the last 24 h (`claim` appends to `.claude/logs/claims.jsonl`). No candidate exits `0` with a note; several exit `1`. `event-ledger.py` calls it on `SessionEnd`/`SubagentStop` with the transcript's totals, priced from `.claude/hooks/model-prices.json` (per-million-token rates by model-id prefix, longest prefix wins; an unlisted model sends `0` and the ledger line carries `unpriced: true`). `AIJIRA_REPORT_COST=0` keeps the ledger but skips the report; `.claude/logs/cost-reported.jsonl` makes a repeat fire once |
| `template <type>` | Prints the served ticket template for `task\|feature\|bug\|chore\|spike` unchanged; unknown type exits `3` |
| `check <file>` | Posts the file to the format check; one `<severity> <rule> <section>: <message>` line per violation on stdout, `needs spec: yes\|no` on stderr. Exit `9` only when a violation has severity `error`; warnings alone exit `0` |

`--json` replaces stdout with the machine shape. `scripts/ticket_corpus.py` holds the shared parsing
(plan tables, `parse_deps`, the rules channel, the front-matter subset reader); `scripts/plan-lint`
imports it too, so the two never disagree about what a plan says.

**Unlike the hooks, this CLI fails loud.** Hooks fail open because a crash there blocks the user;
a CLI that guesses corrupts the corpus instead.

| Exit | Means |
|---|---|
| `0` | Success — warnings included |
| `1` | Usage error, including server 400s |
| `2` | Local invariant: target ticket file exists, plan unreadable, front matter not re-readable |
| `3` | Unknown ID, product or repo (404) |
| `4` | `show` or `claim` printed a package with unresolved rule IDs (advisory; the package is complete) |
| `5` | Aijira unreachable — names the URL tried; nothing allocated or written |
| `6` | Refused: 403 (message names the seen IP) or 400 `AGENT_NAME_REQUIRED` |
| `7` | Conflict (409): `NOT_INDEXED`, `CLAIM_HELD`, `NOT_READY`, `NOT_CLAIM_HOLDER` — the server message is printed verbatim |
| `8` | Other server error (5xx, unparsable body) |
| `9` | `check` found at least one violation of severity `error` (warnings alone exit `0`) |

### The bare-ID-on-stdout contract

`id` and `file` print **the ID and nothing else** to stdout. Every human-readable line — `filed …`,
warnings, the trailer hint — goes to **stderr**. This is load-bearing, not
cosmetic: it is what makes the capture valve scriptable.

```bash
ID=$(scripts/tickets file "flaky webhook retry" --layer api)
# stdout (all that $ID captures):  BUG-001
# stderr:  filed BUG-001  docs/tickets/BUG-001.md
#          when the work is done, put `Ticket: BUG-001` on the commit that completes it ...
```

The `Ticket:` trailer **closes** a ticket, so the hint says it belongs on the commit that completes
the work, never on the commit that files the ticket.

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

### No generated ticket index

`docs/TICKETS.md` and `tickets sync` are gone. The same views are Aijira's public JSON API,
`GET /api/md/<product>.md` and its UI; pushing a plan to the default branch indexes it.

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

For `scripts/tickets`, run `scripts/tickets-selftest`; do not hand-build fixture repos. It drives
the real CLI as a subprocess against a stdlib `http.server` stub on `127.0.0.1`, so it never touches
the network. Additionally prove:

- **Both interpreters** — `/usr/bin/python3 scripts/tickets-selftest` *and* `python3 scripts/tickets-selftest`.
- **The stdout contract** — capture with `ID=$(…)` and echo the variable, rather than eyeballing the
  terminal, which shows stdout and stderr interleaved and hides a violation.
- **No local fallback** — a closed port exits `5`, prints no ID and writes no file.

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
