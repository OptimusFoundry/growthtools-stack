#!/usr/bin/env python3
"""PreToolUse hint: point symbol-shaped lookups at LSP. Never blocks.

Replaces `lsp-preference-guard.py`, which denied Bash greps whose pattern looked
like a code symbol. Scoring that hook against a hand-labelled dataset
(`scripts/lsp_audit/`, 240 rows labelled by intent rather than pattern shape)
found 72.1% precision but 64.7% recall -- not the 100% recall CHORE-002 claimed,
because that validation labelled "is this symbol-SHAPED", which is the hook's own
logic restated and could only agree with itself.

At 72% precision, blocking costs more than it buys: the guard would have denied
13.8% of all Bash calls, and 32.4% of the read statements inside those calls did
not touch Go/TS at all -- a deny kills the whole compound command. So this emits
`additionalContext` and nothing else. There is no `permissionDecision` key on any
path, and therefore no escape hatch to learn to type reflexively.

Three channels, each sized from the corpus:

  Bash grep   8,263 Go/TS statements; 83.8% of LSP-answerable calls in the frame
  Grep tool     762 Go/TS calls; the densest LSP-answerable stratum labelled
  Read tool   6,263 whole-file Go/TS reads, of which 82.7% were never edited in
              that session and only 24% came from read-only reviewer agents --
              i.e. mostly opening a whole file to look one thing up

Classifier changes are each tied to a measured failure of the old one:
  * the bare-token rule (any 3+ char word, any casing) fired on `blueprint`,
    `ember`, `avatars`, `cost` -- theme names and config keys that happen to sit
    in a .ts file. A bare token now has to look structured (a case transition,
    an underscore, or a dotted qualifier).
  * "every `|` branch must qualify" let one dotted or regex branch disqualify a
    whole pattern: `func New\\|scriptmodel.Config\\|type Config`, `falai.New(`,
    `export interface CardProps`. Definition idioms now cover qualified names,
    `export` prefixes, receiver forms and `func.*Name`, and BRANCH_RULE selects
    between all-branches and any-definition-branch (see scripts/lsp_audit).
  * target detection required a literal `.go`/`.ts` in the segment, so
    `grep -rn "GetActiveAssetForBeat" base-server/internal/` was invisible, as was
    anything run after `cd base-server`. Targets now resolve against the payload's
    cwd.

Hints carry MARKER so a later re-mine can count hint-to-LSP conversion directly,
instead of re-sampling and guessing. That is CHORE-002's open follow-up, made
answerable by construction.

Fails open everywhere: a hook that raises is worse than a hook that says nothing.
Note the launcher in settings.json matters as much as this file -- `python3` exits
2 when its script is missing, and PreToolUse treats exit 2 as "block the call", so
an absent hook blocked *every* Bash call until the launcher was hardened.

Swift support (added later, this repo only): the original CODE_EXT/CODE_DIR_PARTS/
DEFN_PHRASE_RE calibration above is Go/TS-only, mined from a labelled census this
repo doesn't have (no scripts/lsp_audit/score_full.py or its corpus survived the
sync from upstream -- only this file and its selftest did). This repo's own
transcript history (~/.claude/projects/) was mined instead: 3,264 Bash calls, 443
distinct grep-on-.swift segments. Real patterns found: `struct Trip:`, `enum
SavedCategory`, `extension Button`, `static func mono`, `static let ink800` --
Swift's struct/protocol/extension weren't in the keyword list, and its
static/access-modifier prefixes (`static func`, `private var`) weren't handled.
Both fixed below. Not re-validated against a scored, labelled Swift corpus the
way the Go/TS rules were -- there isn't one to score against -- so treat this as
a lower-confidence extension of the same rules, not an equally-calibrated one.
"""

from __future__ import annotations

import json
import os
import posixpath
import re
import sys

MARKER = "[lsp-hint]"

# Where a whole-file read stops being cheap. Set from the labelled census, not
# from the median: at 200 this missed 4% of all misses outright (a 189-line store
# file is exactly the lookup an outline serves). Dropping to 100 gained 5.9pt of
# recall for 0.7pt of precision across 18k labelled rows.
LARGE_FILE_LINES = 100

MAX_HINTS_PER_SESSION = 12
# "all_branches" | "any_definition" -- both scored on every run of
# scripts/lsp_audit/score_full.py. This flipped twice: any_definition led on the
# 240-row sample, all_branches won once bare capitalised words qualified, and
# any_definition won again on the 18k-row labelled census (F1 84.5 vs 83.2). The
# sample was simply underpowered -- `all_branches` throws away a real definition
# branch whenever one structural branch rides along (`^func Test\|^}`), which the
# census shows costs ~20% of all misses. Re-run the scorer before changing it.
BRANCH_RULE = "any_definition"

CODE_EXT = (".go", ".ts", ".tsx", ".swift")
CODE_EXT_RE = re.compile(r"\.(go|ts|tsx|swift)\b")
INCLUDE_CODE_RE = re.compile(r"--include=['\"]?\*?\.(go|ts|tsx|swift)\b")
NONCODE_EXT_RE = re.compile(
    r"\.(scss|css|md|sql|jsonl?|ya?ml|txt|log|html|py|sh|toml|lock|mod|sum|env|example)\b"
)
CODE_DIR_PARTS = ("base-server", "webapp/src", "webapp/e2e", "render-service/src", "ios/AITravel")

NON_LOOKUP_FLAGS = re.compile(r"(^|\s)-[A-Za-z]*[cv][A-Za-z]*(\s|$)")

# A bare token must look like an identifier someone declared, not an English word.
STRUCTURED_TOKEN_RE = re.compile(
    r"^(?:"
    r"[A-Za-z_]\w*[a-z]\w*[A-Z]\w*"        # a case transition: camelCase / PascalCase runs
    r"|[A-Z][A-Z0-9]{2,}(?:_[A-Z0-9]+)*"   # ALL_CAPS
    r"|\w+_\w+"                            # snake_case
    r"|[A-Za-z_]\w*\.[A-Za-z_]\w*"         # qualified: pkg.Symbol / obj.Method
    r"|[A-Z][a-z]+[A-Za-z0-9]*"            # a single capitalised word: `Loader2`, `Card`
    r")$"
)

DEFN_PHRASE_RE = re.compile(
    r"^(?:export\s+)?(?:(?:static|private|public|internal|fileprivate|open)\s+)*(?:"
    r"type\s+[A-Za-z_]\w*\s+(?:struct|interface)\b"
    r"|func\s*(?:\([^)]*\)\s*)?[A-Za-z_.*]*\w*\s*\(?"
    r"|func[.*\\s]*[A-Za-z_]\w*"                       # regex form: `func.*CheckBalance`
    # Swift adds struct/protocol/extension to TS's interface/class/function/const/let/var/type/enum;
    # a trailing `:`/`{` is a Swift conformance list or brace immediately after the declared name
    # (`struct Trip:`, `struct Foo {`), which the corpus shows real greps include verbatim.
    r"|(?:interface|class|function|const|let|var|type|enum|struct|protocol|extension)\s+[A-Za-z_]\w*\b[:{]?"
    r"|[A-Za-z_]\w*\s+(?:struct\b|interface\b|=)"
    r")$"
)

# How grep -E spells a literal paren or dot. Both appear in real symbol
# patterns -- `func New\(`, `contentjobProcessor\.` -- and a surviving backslash
# defeats every identifier shape below.
_ESCAPED_CHAR_RE = re.compile(r"\\([().])")


def normalize_alt(alt: str) -> str:
    a = _ESCAPED_CHAR_RE.sub(r"\1", alt)
    a = re.sub(r"\\b", "", a).strip()
    a = a.lstrip("^").rstrip("$").strip()
    return re.sub(r"\s+", " ", a)


def alt_kind(alt: str) -> str:
    """'defn' | 'symbol' | 'text' for one alternation branch."""
    a = normalize_alt(alt)
    if not a:
        return "text"
    if DEFN_PHRASE_RE.match(a):
        return "defn"
    # a trailing `(` is a call site and a trailing `.` is member access
    # (`contentjobProcessor\.` -- "every use of this receiver"); both are still
    # symbol lookups, and both defeat a plain identifier match.
    bare = re.sub(r"[.(]+$", "", a).strip()
    if STRUCTURED_TOKEN_RE.match(bare):
        return "symbol"
    return "text"


def classify_pattern(pattern: str) -> str | None:
    """Return the symbol worth hinting about, or None."""
    p = re.sub(r"\\b", "", pattern or "").strip()
    if not p:
        return None
    alts = [a for a in re.split(r"\\?\|", p) if a.strip()]
    if not alts:
        return None
    kinds = [alt_kind(a) for a in alts]
    if BRANCH_RULE == "all_branches":
        ok = all(k != "text" for k in kinds)
    else:
        ok = any(k == "defn" for k in kinds) or (
            all(k != "text" for k in kinds) and any(k == "symbol" for k in kinds)
        )
    if not ok:
        return None
    for a, k in zip(alts, kinds):
        if k != "text":
            return normalize_alt(a)
    return None


# ------------------------------------------------------------------ targets

def resolve(cwd: str, operand: str) -> str:
    operand = (operand or "").strip().rstrip(":")
    if operand.startswith("~"):
        operand = os.path.expanduser(operand)
    if operand.startswith("/"):
        return posixpath.normpath(operand)
    return posixpath.normpath(posixpath.join(cwd or "/", operand))


def segment_targets_code(segment: str, cwd: str) -> bool:
    if INCLUDE_CODE_RE.search(segment) or CODE_EXT_RE.search(segment):
        return True
    for tok in segment.split():
        if tok.startswith("-") or not re.search(r"[/.]", tok):
            continue
        tok = tok.strip("'\"")
        if NONCODE_EXT_RE.search(posixpath.basename(tok)):
            continue
        p = resolve(cwd, tok)
        if any(part in p for part in CODE_DIR_PARTS) and not posixpath.splitext(p)[1]:
            return True
    return False


def find_grep_segments(command: str):
    segments, cur = [], []
    in_sq = in_dq = False
    i, n = 0, len(command)
    while i < n:
        ch = command[i]
        if in_sq:
            cur.append(ch); in_sq = ch != "'"; i += 1; continue
        if in_dq:
            cur.append(ch)
            if ch == '"' and command[i - 1] != "\\":
                in_dq = False
            i += 1; continue
        if ch == "'":
            in_sq = True; cur.append(ch); i += 1; continue
        if ch == '"':
            in_dq = True; cur.append(ch); i += 1; continue
        if ch in "\n;":
            segments.append("".join(cur)); cur = []; i += 1; continue
        if ch == "&" and i + 1 < n and command[i + 1] == "&":
            segments.append("".join(cur)); cur = []; i += 2; continue
        if ch == "|":
            segments.append("".join(cur)); cur = []
            i += 2 if (i + 1 < n and command[i + 1] == "|") else 1
            continue
        cur.append(ch); i += 1
    segments.append("".join(cur))
    return [s for s in segments if re.search(r"(^|[\s;|&(])e?grep\b", s)]


def extract_pattern(segment: str):
    for quote in ("'", '"'):
        m = re.search(
            r"""\be?grep\b\s+(?:-[A-Za-z]+(?:\s+\S+)?\s+)*%s([^%s]+)%s""" % (quote, quote, quote),
            segment,
        )
        if m:
            return m.group(1)
    m = re.search(r"\be?grep\b\s+(?:-[A-Za-z]+\s+)*([A-Za-z_][\w.]*)\s", segment + " ")
    return m.group(1) if m else None


def cwd_of(payload: dict) -> str:
    return payload.get("cwd") or os.getcwd()


# -------------------------------------------------------------------- state

def state_path(session_id: str) -> str:
    d = os.path.expanduser("~/.claude/lsp-hint-state")
    return os.path.join(d, (session_id or "unknown").replace("/", "_") + ".json")


def load_state(session_id: str) -> dict:
    try:
        with open(state_path(session_id)) as fh:
            s = json.load(fh)
            return s if isinstance(s, dict) else {}
    except Exception:
        return {}


def save_state(session_id: str, state: dict) -> None:
    try:
        p = state_path(session_id)
        os.makedirs(os.path.dirname(p), exist_ok=True)
        with open(p, "w") as fh:
            json.dump(state, fh)
    except Exception:
        pass  # a hint budget is not worth failing a tool call over


def should_emit(session_id: str, key: str) -> bool:
    """One hint per distinct subject per session, capped."""
    state = load_state(session_id)
    seen = state.get("seen") or []
    if key in seen or len(seen) >= MAX_HINTS_PER_SESSION:
        return False
    seen.append(key)
    state["seen"] = seen
    save_state(session_id, state)
    return True


# -------------------------------------------------------------------- hints

def symbol_hint(symbol: str) -> str:
    return f"""{MARKER} `{symbol}` looks like a code symbol, and LSP answers symbol
questions directly instead of by text match + reading the surrounding file:

  Where is it defined?   LSP goToDefinition / hover
  Who calls it?          LSP findReferences
  Which file holds it?   LSP workspaceSymbol (query: the symbol name)

LSP is a deferred tool -- load it once per session with
ToolSearch(query: "select:LSP", max_results: 1).

The search already ran; this is for the next one. If the target is a string
literal, a generated file, or otherwise not a symbol, grep was the right call."""


def read_hint(path: str, lines: int) -> str:
    return f"""{MARKER} reading all {lines} lines of `{posixpath.basename(path)}`. If the goal is
to locate something rather than study the whole file, LSP documentSymbol returns
its outline, and goToDefinition plus a ranged Read (offset/limit) fetches just the
part you need.

In the audited corpus 83% of whole-file Go/TS reads were of files never edited in
that session -- lookups, not changes.

LSP is deferred: ToolSearch(query: "select:LSP", max_results: 1)."""


# CHORE-004 counted 2,401 `find -name` pattern searches against 277 Glob calls --
# a 9:1 preference for shell over the built-in that does exactly this. Same shape
# as the LSP gap CH-010 fixed: the capability exists, nothing points at it.
FIND_NAME_RE = re.compile(r"(^|[\s;|&(])find\b[^|;&]*?\s-i?name\s+(['\"]?)([^'\"\s]+)\2")


def find_name_pattern(segment: str) -> str | None:
    if re.search(r"-(exec|delete|print0)\b", segment):
        return None  # doing something with the results, not just locating them
    m = FIND_NAME_RE.search(segment)
    return m.group(3) if m else None


# 999 rows were process/port checks, dominated by agents backgrounding their own
# `go test` and then scraping the process table to find out whether it had
# finished -- `ps aux | grep -E "go test" | grep -v grep; date`. Only a handful
# used a real wait loop. Nothing in the harness documented an alternative.
PROCESS_POLL_RE = re.compile(
    r"(^|[\s;|&(])ps\b[^|]*\|[^|]*grep[^|]*?['\"]?\b(go test|go build|npm run|npx|vite|playwright)\b"
)


def process_poll_target(segment: str) -> str | None:
    m = PROCESS_POLL_RE.search(segment)
    return m.group(2) if m else None


def glob_hint(pattern: str) -> str:
    return f"""{MARKER} `find -name {pattern}` is what the Glob tool does natively, and Glob
returns results sorted by modification time without a shell round-trip:

  Glob(pattern: "**/{pattern.lstrip('*/')}")

Across the audited corpus agents reached for `find` over Glob 9 times to 1. Use
Bash `find` when you need its predicates -- `-newer`, `-size`, `-exec`, pruning --
and Glob when you are just locating files by name."""


def wait_hint(target: str) -> str:
    return f"""{MARKER} polling the process table to see whether `{target}` has finished is
a busy-wait. Bash tool calls support this directly:

  Bash(command: "...", run_in_background: true)   -> returns immediately
  BashOutput(bash_id: "...")                      -> read what it has produced
                                                     you are re-invoked when it exits

That removes the `ps aux | grep` loop and the guesswork about whether the run is
still going. For the repo's build/test gate specifically, `scripts/gate [backend|
frontend]` runs it and returns a verdict rather than output to page through."""


def emit(context: str) -> int:
    json.dump(
        {"hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "additionalContext": context,
        }},
        sys.stdout,
    )
    return 0


# --------------------------------------------------------------------- main

CAT_RE = re.compile(r"(^|[\s;|&(])cat\b")


def cat_whole_file_target(segment: str, cwd: str) -> str | None:
    """`cat foo.go` is a whole-file read wearing a different hat.

    The census attributed 16.3% of all misses to this one gap: the hook covered
    the Read tool but not its shell equivalent. Redirections are excluded --
    `cat > f` and `cat >> f` write, and a heredoc body is data, not a read.
    """
    if not CAT_RE.search(segment) or ">" in segment or "<<" in segment:
        return None
    for tok in segment.split()[1:]:
        tok = tok.strip("'\"")
        if tok.startswith("-"):
            continue
        if tok.endswith(CODE_EXT):
            return resolve(cwd, tok)
    return None


def handle_bash(payload: dict, tool_input: dict, session: str) -> int:
    command = tool_input.get("command")
    if not isinstance(command, str) or not command.strip():
        return 0
    cwd = cwd_of(payload)

    for segment in re.split(r"[;|&\n]", command):
        path = cat_whole_file_target(segment, cwd)
        if not path:
            continue
        try:
            with open(path, errors="replace") as fh:
                lines = sum(1 for _ in fh)
        except OSError:
            continue
        if lines >= LARGE_FILE_LINES and should_emit(session, "read:" + path):
            return emit(read_hint(path, lines))

    for segment in re.split(r"[;&\n]", command):
        pattern = find_name_pattern(segment)
        if pattern and should_emit(session, "glob:" + pattern):
            return emit(glob_hint(pattern))

    for segment in re.split(r"[;&\n]", command):
        target = process_poll_target(segment)
        if target and should_emit(session, "poll:" + target):
            return emit(wait_hint(target))

    for segment in find_grep_segments(command):
        if NON_LOOKUP_FLAGS.search(segment):
            continue
        if not segment_targets_code(segment, cwd):
            continue
        symbol = classify_pattern(extract_pattern(segment))
        if symbol and should_emit(session, "sym:" + symbol):
            return emit(symbol_hint(symbol))
    return 0


def handle_grep(payload: dict, tool_input: dict, session: str) -> int:
    blob = " ".join(str(tool_input.get(k) or "") for k in ("path", "glob", "type"))
    path = str(tool_input.get("path") or "")
    is_code = bool(re.search(r"\b(go|ts|tsx)\b", blob)) or path.endswith(CODE_EXT)
    if not is_code:
        is_code = any(part in resolve(cwd_of(payload), path) for part in CODE_DIR_PARTS)
    if not is_code:
        return 0
    symbol = classify_pattern(tool_input.get("pattern"))
    if symbol and should_emit(session, "sym:" + symbol):
        return emit(symbol_hint(symbol))
    return 0


def handle_read(payload: dict, tool_input: dict, session: str) -> int:
    path = str(tool_input.get("file_path") or "")
    if not path.endswith(CODE_EXT):
        return 0
    if tool_input.get("offset") is not None or tool_input.get("limit") is not None:
        return 0  # already a targeted read
    try:
        with open(path, errors="replace") as fh:
            lines = sum(1 for _ in fh)
    except OSError:
        return 0
    if lines < LARGE_FILE_LINES:
        return 0
    if should_emit(session, "read:" + path):
        return emit(read_hint(path, lines))
    return 0


def main() -> int:
    try:
        payload = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        return 0
    try:
        if not isinstance(payload, dict):
            return 0
        tool_input = payload.get("tool_input")
        if not isinstance(tool_input, dict):
            return 0
        session = str(payload.get("session_id") or "unknown")
        handler = {
            "Bash": handle_bash,
            "Grep": handle_grep,
            "Read": handle_read,
        }.get(payload.get("tool_name"))
        return handler(payload, tool_input, session) if handler else 0
    except Exception:
        return 0


if __name__ == "__main__":
    sys.exit(main())
