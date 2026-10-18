#!/usr/bin/env python3
"""PreToolUse guard: block `general-purpose` dispatch for work an agent already owns.

Exists because vendored plugin skills hardcode `Subagent (general-purpose):` in their
prompt templates (superpowers subagent-driven-development, requesting-code-review). Text
nearest the tool call wins over CLAUDE.md prose, so this is enforced mechanically rather
than by instruction.

Path ownership and every agent name in the deny message are read from
.claude/agents/routing.yml — the single source of truth this hook, `scripts/tickets`, and
.claude/agents/README.md all derive from. Three copies of routing (hook, README prose,
plan rows) is the drift routing.yml exists to end, so nothing here is hardcoded except the
degraded fallback below. That is also why render-service/ and zapier-integration/ are now
gated: they gained an owner, and a hardcoded regex could not know.

Fail open. A missing, unreadable, or out-of-subset routing.yml degrades to the historical
`base-server|webapp` regex and a static reason — never to no enforcement, never to a
crash. A hook that raises blocks the user's entire workflow.

Deliberate trade-off: exempt paths are checked BEFORE owned ones, so a prompt naming both
`.claude/` and `webapp` is allowed. Tooling prompts routinely name owned services in prose
(the shared-repo-tooling skill's own description names base-server and webapp), and self-blocking
the tooling executor is the worse failure. The ROUTING-OK escape hatch and the README
dispatch table are the backstop for the reverse case.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path
from typing import NamedTuple

ESCAPE_HATCH = "ROUTING-OK"
# `claude` is the catch-all type with every tool, so it gets the same treatment as
# general-purpose. `fork` is deliberately NOT guarded: a fork inherits the parent's context,
# CLAUDE.md and this repo's rules, so it is not the contract-less agent this guard exists for.
GUARDED_TYPES = ("general-purpose", "claude")
ROUTING_PATH = Path(__file__).resolve().parent.parent / "agents" / "routing.yml"

FALLBACK_OWNED = re.compile(r"\bbase-server\b|\bwebapp\b", re.IGNORECASE)
FALLBACK_REASON = f"""Blocked: `general-purpose` cannot be dispatched for base-server/ or webapp/ work.

.claude/agents/routing.yml could not be read, so this guard is degraded and cannot name
the executor for you. Open the Dispatch routing table in .claude/agents/README.md and pick
the agent whose task shape matches this ticket's layer. Someone should also fix that file.

Workers have no Bash: they write code, YOU run git/build/test/commit. That split is never
a reason to fall back to general-purpose.

If general-purpose is genuinely correct here, add the token {ESCAPE_HATCH} to the prompt
with a one-line justification."""


class Routing(NamedTuple):
    owned: dict
    exempt: list
    heads: dict


class _SubsetError(Exception):
    """routing.yml holds a construct outside the subset documented in its own header."""


class _Box:
    """A container whose kind (map vs list) is only known once its first entry lands."""

    __slots__ = ("entries", "items")

    def __init__(self):
        self.entries = {}
        self.items = []


def _strip_comment(line):
    out = []
    quoted = False
    prev = ""
    for ch in line:
        if ch == '"':
            quoted = not quoted
        elif ch == "#" and not quoted and (prev == "" or prev.isspace()):
            break
        out.append(ch)
        prev = ch
    return "".join(out)


def _split_entry(body):
    """Split on the first unquoted `:` followed by whitespace or end of line.

    Requiring the trailing space is what keeps a value of the form `skill:<name>` a plain
    scalar here and in a real YAML parser alike.
    """
    quoted = False
    for i, ch in enumerate(body):
        if ch == '"':
            quoted = not quoted
        elif ch == ":" and not quoted and (i + 1 == len(body) or body[i + 1] in " \t"):
            return body[:i].strip(), body[i + 1 :].strip()
    return None


def _reject_nested_mapping(scalar, lineno):
    """`a: b: c` is a YAML error, not a scalar `b: c`. Diverging there is how the two
    readers would silently disagree, so it is a subset violation here too."""
    if _split_entry(scalar) is not None:
        raise _SubsetError(f"line {lineno}: value opens a nested mapping — quote the key")


def _unquote(key):
    if len(key) >= 2 and key.startswith('"') and key.endswith('"'):
        return key[1:-1]
    if '"' in key:
        raise _SubsetError(f"unbalanced quotes in key {key!r}")
    return key


def _finalize(box):
    if box.items and box.entries:
        raise _SubsetError("section mixes `key: value` entries with `- value` items")
    if box.items:
        return list(box.items)
    return {k: _finalize(v) if isinstance(v, _Box) else v for k, v in box.entries.items()}


def _parse_subset(text):
    root = _Box()
    open_at = {0: root}
    section = None
    for lineno, raw in enumerate(text.splitlines(), 1):
        if "\t" in raw:
            raise _SubsetError(f"line {lineno}: tabs are outside the subset")
        line = _strip_comment(raw).rstrip()
        if not line.strip():
            continue
        indent = len(line) - len(line.lstrip(" "))
        if indent % 2 or indent > 4:
            raise _SubsetError(f"line {lineno}: illegal indent {indent}")
        if indent == 4 and section != "paths":
            raise _SubsetError(f"line {lineno}: third level is permitted only under paths:")
        parent = open_at.get(indent)
        if parent is None:
            raise _SubsetError(f"line {lineno}: entry has no open parent section")
        for deeper in [level for level in open_at if level > indent]:
            del open_at[deeper]

        body = line.strip()
        if body == "-" or body.startswith("- "):
            if indent == 0:
                raise _SubsetError(f"line {lineno}: list item at column 0")
            item = body[1:].strip()
            _reject_nested_mapping(item, lineno)
            parent.items.append(item)
            continue

        pair = _split_entry(body)
        if pair is None:
            raise _SubsetError(f"line {lineno}: not a `key: value` entry")
        key, value = pair
        key = _unquote(key)
        if not key:
            raise _SubsetError(f"line {lineno}: empty key")
        if key in parent.entries:
            raise _SubsetError(f"line {lineno}: duplicate key {key!r}")
        if indent == 0:
            section = key
        if value:
            _reject_nested_mapping(value, lineno)
            parent.entries[key] = value
        else:
            box = _Box()
            parent.entries[key] = box
            open_at[indent + 2] = box
    return _finalize(root)


def load_routing(path):
    """Read routing.yml. Returns None on ANY failure — this must never raise."""
    try:
        data = _parse_subset(Path(path).read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return None
        paths = data.get("paths")
        if not isinstance(paths, dict):
            return None

        owned_raw = paths.get("owned")
        if not isinstance(owned_raw, dict) or not owned_raw:
            return None  # nothing to gate on would be "disabled", not "degraded"
        owned = {}
        for token, agent in owned_raw.items():
            if not isinstance(agent, str) or not agent.strip():
                return None
            owned[token.strip().lower()] = agent.strip()

        exempt_raw = paths.get("exempt")
        if isinstance(exempt_raw, list):
            exempt = [t.strip().lower() for t in exempt_raw if isinstance(t, str) and t.strip()]
        elif exempt_raw in (None, {}):
            exempt = []
        else:
            return None

        heads_raw = data.get("heads")
        heads = (
            {k: v for k, v in heads_raw.items() if isinstance(v, str)}
            if isinstance(heads_raw, dict)
            else {}
        )
        return Routing(owned=owned, exempt=exempt, heads=heads)
    except Exception:
        return None


def build_owned_re(owned):
    if not owned:
        return re.compile(r"(?!x)x")
    # Longest token first: alternation takes the first alternative that matches at a position,
    # so a nested token (`base-server/internal/x`) must be tried before its parent (`base-server`).
    ordered = sorted(owned, key=len, reverse=True)
    return re.compile("|".join(rf"\b{re.escape(token)}\b" for token in ordered), re.IGNORECASE)


def matched_owners(text, routing):
    hits = {m.group(0).lower() for m in build_owned_re(routing.owned).finditer(text)}
    return [(token, agent) for token, agent in routing.owned.items() if token in hits]


def _heads_digest(heads, limit=14):
    grouped = {}
    for head, target in heads.items():
        grouped.setdefault(target, []).append(head)
    if not grouped:
        return []
    width = max(len(target) for target in grouped)
    return [
        f"  {target.ljust(width)}  {', '.join(members)}"
        for target, members in list(grouped.items())[:limit]
    ]


def build_reason(matches, routing):
    lines = [
        "Blocked: `general-purpose` (or the catch-all `claude`) cannot be dispatched for work",
        "this repo assigns to a specialized agent.",
        "",
        "Named in this prompt, with its owner from .claude/agents/routing.yml:",
        "",
    ]
    lines += [f"  {token:<20} {agent}" for token, agent in matches]

    digest = _heads_digest(routing.heads)
    if digest:
        lines += [
            "",
            "If the ticket has a layer, route on that instead — executor per layer keyword:",
            "",
        ]
        lines += digest

    lines += [
        "",
        "Workers have no Bash: they write code, YOU run git/build/test/commit. That split is",
        "never a reason to fall back to general-purpose.",
        "",
        f"If general-purpose is genuinely correct here, add the token {ESCAPE_HATCH} to the",
        "prompt with a one-line justification.",
    ]
    return "\n".join(lines)


def _deny(reason):
    json.dump(
        {
            "hookSpecificOutput": {
                "hookEventName": "PreToolUse",
                "permissionDecision": "deny",
                "permissionDecisionReason": reason,
            }
        },
        sys.stdout,
    )
    return 0


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0  # never block on a malformed payload

    try:
        if not isinstance(payload, dict) or payload.get("tool_name") not in ("Agent", "Task"):
            return 0

        tool_input = payload.get("tool_input")
        if not isinstance(tool_input, dict):
            return 0

        # An omitted subagent_type defaults to general-purpose.
        subagent = tool_input.get("subagent_type") or "general-purpose"
        if not isinstance(subagent, str) or subagent.strip() not in GUARDED_TYPES:
            return 0

        text = f"{tool_input.get('prompt', '')}\n{tool_input.get('description', '')}"
        if ESCAPE_HATCH in text:
            return 0

        routing = load_routing(ROUTING_PATH)
        if routing is None:
            print(
                f"agent-routing-guard: cannot read {ROUTING_PATH}; degraded to base-server|webapp",
                file=sys.stderr,
            )
            return _deny(FALLBACK_REASON) if FALLBACK_OWNED.search(text) else 0

        lowered = text.lower()
        if any(token in lowered for token in routing.exempt):
            return 0

        matches = matched_owners(text, routing)
        return _deny(build_reason(matches, routing)) if matches else 0
    except Exception:
        return 0  # degraded, never disabled — but a guard must never block the workflow


if __name__ == "__main__":
    sys.exit(main())
