#!/usr/bin/env python3
"""PreToolUse(Bash) guard for agents that hold Bash but no Write/Edit tool.

Attached through each such agent's own frontmatter `hooks:` block, never settings.json — the
main session and the worker agents legitimately author files. For supervisors, critics,
reviewers and auditors, "no Write/Edit tool" is the design, and prose telling them not to route
around it through the shell was not enough: plan-critic kept authoring probe files with
`cat <<EOF > …` (see the agent-factory nested-pipeline census). `scripts/agents-frontmatter-check`
fails CI when a Bash-without-Write agent is missing this hook.

Scope is deliberately narrow: shell *authoring* of files inside the repository — output
redirection, `tee`, in-place `sed`/`perl`, and `patch`. Writes outside the repo (TMPDIR, the
session scratchpad) are allowed, as are formatters and build tools that happen to write
(`gofmt -w`, `npm run build`) — those are gate steps, not authoring. It is a guard against a
habit, not a sandbox.

Fail open: an unparseable command or payload allows the call.
"""

from __future__ import annotations

import json
import os
import re
import shlex
import subprocess
import sys

OPERATORS = {"|", "||", "&", "&&", ";", ";;", "(", ")", "|&"}
WRITE_REDIRECTS = {">", ">>", ">|", "&>", "&>>"}
SAFE_TARGETS = {"/dev/null", "/dev/stdout", "/dev/stderr", "/dev/tty"}
HEREDOC = re.compile(r"<<-?\s*(['\"]?)([A-Za-z_][A-Za-z0-9_]*)\1")

REASON = (
    "Blocked: this agent has no Write/Edit tool by design, and `{what}` would author a file inside "
    "the repository through the shell. Dispatch the worker that owns that file instead "
    "(e.g. backend-code-editor / frontend-code-editor for non-test source, the matching "
    "test-writer for tests). If you only need scratch output, write it under $TMPDIR or the "
    "session scratchpad, which this guard allows."
)


def strip_heredoc_bodies(command: str) -> str:
    lines = command.split("\n")
    out, pending = [], []
    for line in lines:
        if pending:
            if line.strip() == pending[0]:
                pending.pop(0)
            continue
        out.append(line)
        pending.extend(m.group(2) for m in HEREDOC.finditer(line))
    return "\n".join(out)


def tokenize(command: str) -> list[str]:
    # Non-POSIX keeps quotes on the token, so a quoted '>' stays an argument, not a redirect.
    lexer = shlex.shlex(strip_heredoc_bodies(command), posix=False, punctuation_chars="|&;()<>")
    lexer.whitespace_split = True
    lexer.commenters = ""
    return list(lexer)


def repo_root(cwd: str) -> str | None:
    try:
        out = subprocess.run(
            ["git", "-C", cwd, "rev-parse", "--show-toplevel"],
            capture_output=True, text=True, timeout=5,
        )
    except (OSError, subprocess.SubprocessError):
        return None
    root = out.stdout.strip()
    return os.path.realpath(root) if out.returncode == 0 and root else None


def unquote(token: str) -> str:
    if len(token) >= 2 and token[0] == token[-1] and token[0] in "'\"":
        return token[1:-1]
    return token


def inside(path: str, cwd: str, root: str) -> bool:
    path = unquote(path)
    if not path or "$" in path or path.startswith("&") or path in SAFE_TARGETS:
        return False
    full = os.path.realpath(os.path.join(cwd, os.path.expanduser(path)))
    return full == root or full.startswith(root + os.sep)


def segments(tokens: list[str]) -> list[list[str]]:
    segs, cur = [], []
    for tok in tokens:
        if tok in OPERATORS:
            if cur:
                segs.append(cur)
            cur = []
        else:
            cur.append(tok)
    if cur:
        segs.append(cur)
    return segs


def find_violation(command: str, cwd: str, root: str) -> str | None:
    tokens = tokenize(command)
    for i, tok in enumerate(tokens[:-1]):
        if tok in WRITE_REDIRECTS and inside(tokens[i + 1], cwd, root):
            return f"{tok} {tokens[i + 1]}"

    for seg in segments(tokens):
        seg = [t for j, t in enumerate(seg)
               if t not in WRITE_REDIRECTS and (j == 0 or seg[j - 1] not in WRITE_REDIRECTS)]
        if not seg:
            continue
        prog = os.path.basename(unquote(seg[0]))
        args = seg[1:]
        files = [a for a in args if not a.startswith("-")]
        if prog == "tee":
            hit = next((f for f in files if inside(f, cwd, root)), None)
            if hit:
                return f"tee {hit}"
        elif prog in ("sed", "gsed", "perl"):
            in_place = any(
                a.startswith("-i") or a == "--in-place" or (prog == "perl" and re.fullmatch(r"-\w*i\w*", a))
                for a in args
            )
            existing = [f for f in files if os.path.exists(os.path.join(cwd, unquote(f)))]
            hit = next((f for f in existing if inside(f, cwd, root)), None)
            if in_place and hit:
                return f"{prog} -i {hit}"
        elif prog == "patch" and "--dry-run" not in args:
            return "patch"
    return None


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        command = payload.get("tool_input", {}).get("command", "")
        cwd = payload.get("cwd") or os.getcwd()
        if not isinstance(command, str) or not command.strip():
            return 0
        root = repo_root(cwd)
        if not root:
            return 0
        what = find_violation(command, os.path.realpath(cwd), root)
    except Exception:
        return 0
    if what:
        json.dump(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": REASON.format(what=what),
                }
            },
            sys.stdout,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())
