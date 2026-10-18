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
| `.claude/agents/routing.yml` | `layer → agent` map. **Single source of truth** — Aijira's indexer, the routing guard, and `.claude/agents/README.md` all derive from it. Never hardcode an agent list anywhere else. |

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

A thin HTTP client for Aijira's agent API. Aijira owns the items, their status and their routing;
the script creates and moves items, lists what is ready and fetches dispatch packages. Every item
is addressed by its Aijira key (`AIJ-12`, or `AIJ-12.3` for a task). `show` also accepts an old ID
as an alias and resolves it to a key. There is **no local fallback**: when Aijira cannot be reached
the verb exits `5` and writes nothing. Config comes from `AIJIRA_URL` (default
`https://aijira.protoapp.xyz`), `AIJIRA_PRODUCT` (else resolved from the `origin` remote via
`GET /api/public/repos/:owner/:name`) and `AIJIRA_AGENT` (else `CLAUDE_CODE_SESSION_ID`, else
`<hostname>:<worktree dir>`), sent as `X-Aijira-Agent`. `CLAUDE_SESSION_URL`, when it is an
`https://` URL, goes as `X-Aijira-Session`.

`scripts/tickets --help` is the authoritative verb list. Every verb validates its arguments before
it sends a request, so a usage error sends nothing.

| Command | Does |
|---|---|
| `create <kind> "<title>" [--layer L] [--parent KEY] [--depends-on KEY,KEY] [--goal T] [--doc-path P] [--plan-path P] [--rules ID,ID] [--ac AC1,AC2] [--status backlog\|ready] [--after KEY] [--body-file PATH\|-]` | Creates an item (`initiative epic task feature bug chore spike`) and prints the bare key. `created <KEY>` and any rule warnings go to stderr |
| `edit KEY --version N [field flags] [--parent KEY \| --no-parent]` | Changes fields; `--version` is the version you last read. A stale version exits `7` with `current version N` |
| `move KEY STATUS [--version N]` | Sets the status: `backlog ready in_progress in_review done canceled` |
| `link KEY DEP [--version N]` / `unlink KEY DEP` | Adds / removes a dependency |
| `reorder KEY (--after KEY \| --first) [--version N]` | Moves the item in the backlog order |
| `cancel KEY [--version N]` | Cancels the item |
| `activate [PRODUCT]` | Switches a content-free product to items mode |
| `next [CODE\|EPIC-KEY]` | Lists ready tickets and their executors, scoped to the product code by default or to one epic |
| `show KEY\|ALIAS` | Prints the dispatch package, a `--- history ---` block and a local `--- rules ---` block. For an epic or initiative it prints the detail and history |
| `claim KEY` | Takes the claim and prints the package as `show` does; `claimed until <expires_at>` goes to stderr. A held or not-ready ticket exits `7` and prints no package |
| `renew KEY` / `release KEY` | Extends / gives up your claim (`renew` prints the new expiry to stderr; `release` prints nothing). Not the holder: exit `7` |
| `handoff KEY "<note>"` | Leaves a handoff note (1–4000 characters; `-` reads stdin). Empty or too long exits `1` before any request |
| `cost KEY\|--held --agent-seconds N --input-tokens N --output-tokens N --cache-read-tokens N --cache-write-tokens N --cost-usd X [--session-id S]` | Reports what a run cost (`POST …/items/:key/costs`; `recorded` to stderr). A missing or negative number exits `1` before any request; 404 exits `3`. `--held` asks `GET …/claims?agent=<name>` and, if nothing is live, falls back to the newest ticket this agent claimed in the last 24 h (`claim` appends to `.claude/logs/claims.jsonl`). No candidate exits `0` with a note; several exit `1`. `event-ledger.py` calls it on `SessionEnd`/`SubagentStop` with the transcript's totals, priced from `.claude/hooks/model-prices.json` (per-million-token rates by model-id prefix, longest prefix wins; an unlisted model sends `0` and the ledger line carries `unpriced: true`). `AIJIRA_REPORT_COST=0` keeps the ledger but skips the report; `.claude/logs/cost-reported.jsonl` makes a repeat fire once |
| `template <kind>` | Prints the served body template for a kind unchanged |
| `check [--key KEY] [--kind K] [--title T] [--layer L] [--parent KEY] [--rules ID,ID] [--ac AC1,AC2] [--body-file PATH\|-]` | Validates item fields without writing; one `<severity> <rule> <section>: <message>` line per finding on stdout. `--kind` and `--title` are required unless `--key` names an existing item. Exit `9` only when a finding has severity `error` |

`--json` replaces stdout with the machine shape. `scripts/ticket_corpus.py` holds the shared parsing
(plan tables, dependency cells, the rules channel, the routing subset reader); `scripts/plan-lint`
and `scripts/plan-assemble` import it too, so the three never disagree about what a plan says.

**Unlike the hooks, this CLI fails loud.** Hooks fail open because a crash there blocks the user;
a CLI that guesses corrupts the item store instead.

| Exit | Means |
|---|---|
| `0` | Success — warnings included |
| `1` | Usage error, including server 400s |
| `2` | Local invariant: a `--body-file` or file argument is unreadable |
| `3` | Unknown key, product or repo (404) |
| `4` | `show` or `claim` printed a package with unresolved rule IDs (advisory; the package is complete) |
| `5` | Aijira unreachable — names the URL tried; nothing written |
| `6` | Refused: 403 (message names the seen IP) or 400 `AGENT_NAME_REQUIRED` |
| `7` | Conflict (409): `CLAIM_HELD`, `NOT_READY`, `NOT_CLAIM_HOLDER`, `VERSION_CONFLICT`, `PRODUCT_NOT_MIGRATED`, … — the server message is printed verbatim |
| `8` | Other server error (5xx, unparsable body) |
| `9` | `check` found a violation of severity `error`; also a 400 `RULES_FAILED`, or `--rules` naming an ID the local registry cannot resolve |

### The bare-key-on-stdout contract

`create` prints **the key and nothing else** to stdout. Every human-readable line — `created …` and
rule warnings — goes to **stderr**. This is load-bearing, not cosmetic: it is what makes the capture
valve scriptable.

```bash
KEY=$(scripts/tickets create bug "flaky webhook retry" --layer api)
# stdout (all that $KEY captures):  AIJ-118
# stderr:  created AIJ-118
```

A `Ticket: <KEY>` trailer **closes** a ticket, so it belongs on the commit that completes the work,
never on the commit that follows the `create`.

Never add a decorative line to stdout in `create`, and never "helpfully" print a URL there.

### Who carries this skill

`feature-manager`, `backend-supervisor`, `frontend-supervisor`, `epic-supervisor` and
`codemod-supervisor` declare `skills: [shared-repo-tooling]` in their frontmatter. Those five are the
agents that (a) discover sidequests mid-run and (b) hold `Bash`, so they can actually *run* the
capture valve — `scripts/tickets create …` — instead of merely noticing the gap. Workers have no
`Bash` and are excluded deliberately: a worker that finds a sidequest reports it upward.

Agent definitions load at startup, so adding or removing a `skills:` entry takes effect only after a
session restart.

### The parsing subset

`.claude/agents/routing.yml` is read by a hand-rolled reader, because stdlib-only means no pyyaml.
The file is therefore restricted to a syntactic subset chosen so the hand-rolled reader and a real
YAML parser read it **identically**; the file documents the subset in its header. Anything outside
it is a hard error with file + line, never a guess: a construct the two readers disagree about is
precisely the drift this design prevents. `ticket_corpus.read_subset_yaml` raises it; the routing
guard catches it, degrades, and allows.

When extending the file, stay inside the subset. If you genuinely need a construct it forbids,
widen the subset *and* the reader deliberately — do not sneak it in.

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
- **The stdout contract** — capture with `KEY=$(…)` and echo the variable, rather than eyeballing the
  terminal, which shows stdout and stderr interleaved and hides a violation.
- **No local fallback** — a closed port exits `5`, prints no key and writes nothing.

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
