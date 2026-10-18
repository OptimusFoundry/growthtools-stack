"""Plan and rule parsing shared by scripts/tickets, scripts/plan-lint and scripts/plan-assemble.

Python 3.9-safe, stdlib only. Holds what a plan or a rule declaration means; items, status and
indexing live in Aijira. Imports nothing from scripts/tickets.
"""

from __future__ import annotations

import re
import subprocess
from dataclasses import dataclass
from pathlib import Path

SKILLS_REL = ".claude/skills"
AGENTS_REL = ".claude/agents"
# routing.yml sections that may open a third level (`paths:` → `owned:` / `exempt:`).
NESTED_SECTIONS = ("paths",)
SKILL_PREFIX = "skill:"
DASH = "—"


class SubsetError(Exception):
    """routing.yml (or a ticket front matter block) fell outside the parsing subset."""

    def __init__(self, path, line, msg):
        location = f"{path}:{line}" if line else str(path)
        super().__init__(f"{location}: {msg}")
        self.path = path
        self.line = line
        self.msg = msg


def _repo_root():
    script_dir = Path(__file__).resolve().parent
    try:
        proc = subprocess.run(
            ["git", "rev-parse", "--show-toplevel"],
            cwd=script_dir,
            capture_output=True,
            text=True,
            timeout=10,
        )
    except (OSError, subprocess.SubprocessError):
        return script_dir.parent
    # cwd is the script's own directory, never the process cwd: that is what makes the CLI work
    # from anywhere and still resolve to the worktree the script itself lives in.
    if proc.returncode != 0 or not proc.stdout.strip():
        return script_dir.parent
    return Path(proc.stdout.strip())


ROOT = _repo_root()


def _strip_comment(line):
    in_quote = False
    for i, ch in enumerate(line):
        if ch == '"':
            in_quote = not in_quote
        elif ch == "#" and not in_quote and (i == 0 or line[i - 1] in " \t"):
            return line[:i].rstrip()
    return line.rstrip()


_NON_SCALAR_LEAD = "[{&*!|>'\"%@`"


def _check_scalar(path, lineno, value):
    if value[0] in _NON_SCALAR_LEAD:
        raise SubsetError(
            path,
            lineno,
            f"{value!r} is not a plain unquoted scalar "
            "(no quotes, flow collections, anchors, aliases, tags, or block scalars)",
        )
    if value.endswith(":") or re.search(r":(?=\s)", value):
        raise SubsetError(path, lineno, f"{value!r} opens a nested mapping, which is outside the subset")


def _split_entry(path, lineno, body):
    """Return (key, value|None) splitting on the first unquoted `:` that opens a mapping.

    A `:` only opens a mapping when followed by whitespace or end of line — that is what lets
    `skill:shared-repo-tooling` stay a plain scalar, and it is the one place a naive first-colon split
    would read the file differently from a real YAML parser.
    """
    if body.startswith('"'):
        end = body.find('"', 1)
        if end == -1:
            raise SubsetError(path, lineno, "unterminated quoted key")
        key = body[1:end]
        rest = body[end + 1 :]
        if not rest.startswith(":") or (len(rest) > 1 and rest[1] not in " \t"):
            raise SubsetError(path, lineno, "expected `: ` after a quoted key")
        value = rest[1:].strip()
    else:
        match = re.search(r":(?=\s|$)", body)
        if match is None:
            raise SubsetError(path, lineno, f"expected `key: value`, got {body!r}")
        key = body[: match.start()].strip()
        value = body[match.end() :].strip()
        bad = [c for c in " ():#" if c in key]
        if bad:
            raise SubsetError(path, lineno, f"key {key!r} contains {''.join(bad)!r} and must be double-quoted")
    if not key:
        raise SubsetError(path, lineno, "empty key")
    return key, (value or None)


def _list_item(path, lineno, body):
    if body == "-" or not body[1:].strip():
        raise SubsetError(path, lineno, "empty list item")
    if body[1] not in " \t":
        raise SubsetError(path, lineno, f"expected `- value`, got {body!r}")
    item = body[1:].strip()
    _check_scalar(path, lineno, item)
    return item


def read_subset_yaml(path):
    """Parse the documented routing.yml subset. Raises SubsetError(path, 1-based line, msg).

    Line 0 means the failure has no line — an unreadable file or a wrong-shaped section.
    """
    path = Path(path)
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as exc:
        raise SubsetError(path, 0, f"cannot read: {exc.strerror or exc}") from exc
    return parse_subset(text, path)


def parse_subset(text, path, offset=0):
    """The subset reader over already-read text. `offset` keeps reported line numbers pointing at
    the real file when the block is embedded, as ticket front matter is."""
    root = {}
    section = section_name = section_kind = None
    nested = nested_name = nested_kind = None

    def open_container(parent, key, kind, kind_seen, lineno):
        """Swap a freshly-opened `{}` for a `[]` the first time a `- item` shows up under it."""
        if kind_seen is not None and kind_seen != kind:
            raise SubsetError(path, lineno, f"`{key}:` mixes `key: value` entries with `- items`")
        if kind == "list" and isinstance(parent[key], dict):
            parent[key] = []
        return parent[key]

    for lineno, raw in enumerate(text.splitlines(), 1 + offset):
        if "\t" in raw:
            raise SubsetError(path, lineno, "tab character; the subset is spaces-only")
        line = _strip_comment(raw)
        body = line.strip()
        if not body:
            continue
        if body in ("---", "..."):
            raise SubsetError(path, lineno, "multi-document marker is outside the subset")
        indent = len(line) - len(line.lstrip(" "))

        if indent == 0:
            key, value = _split_entry(path, lineno, body)
            if key in root:
                raise SubsetError(path, lineno, f"duplicate key {key!r}")
            nested = nested_name = nested_kind = None
            if value is None:
                # A section with zero entries normalizes to {} (real YAML yields null here);
                # every consumer does a dict lookup, and `None.get` is the crash to avoid.
                root[key] = {}
                section, section_name, section_kind = root[key], key, None
            else:
                _check_scalar(path, lineno, value)
                root[key] = value
                section = section_name = section_kind = None
            continue

        if indent == 2:
            if section_name is None:
                raise SubsetError(path, lineno, "entry at 2-space indent with no open section")
            nested = nested_name = nested_kind = None
            if body.startswith("-"):
                section = open_container(root, section_name, "list", section_kind, lineno)
                section_kind = "list"
                section.append(_list_item(path, lineno, body))
                continue
            section = open_container(root, section_name, "map", section_kind, lineno)
            section_kind = "map"
            key, value = _split_entry(path, lineno, body)
            if key in section:
                raise SubsetError(path, lineno, f"duplicate key {key!r} in `{section_name}:`")
            if value is None:
                if section_name not in NESTED_SECTIONS:
                    raise SubsetError(
                        path,
                        lineno,
                        f"`{key}:` opens a third level under `{section_name}:`; "
                        f"the subset allows that only under {', '.join(NESTED_SECTIONS)}",
                    )
                section[key] = {}
                nested, nested_name, nested_kind = section[key], key, None
            else:
                _check_scalar(path, lineno, value)
                section[key] = value
            continue

        if indent == 4:
            if nested_name is None:
                raise SubsetError(path, lineno, "4-space indent outside a nested block")
            if body.startswith("-"):
                nested = open_container(section, nested_name, "list", nested_kind, lineno)
                nested_kind = "list"
                nested.append(_list_item(path, lineno, body))
                continue
            nested = open_container(section, nested_name, "map", nested_kind, lineno)
            nested_kind = "map"
            key, value = _split_entry(path, lineno, body)
            if key in nested:
                raise SubsetError(path, lineno, f"duplicate key {key!r} in `{nested_name}:`")
            if value is None:
                raise SubsetError(path, lineno, f"`{key}:` nests deeper than the subset allows")
            _check_scalar(path, lineno, value)
            nested[key] = value
            continue

        raise SubsetError(path, lineno, f"unexpected indent {indent}; the subset allows 0, 2, or 4")

    return root


TABLE_HEADER = "| Ticket | Epic | Layer | Depends-on | AC refs | Status |"
TABLE_COLUMNS = 6
SEPARATOR_RE = re.compile(r"^\|[\s:|-]+\|$")

LOCAL_PAT = r"[A-Z]{1,3}\d{1,3}"
ITEM_KEY_RE = re.compile(r"^([A-Z]{2,5})-([1-9][0-9]*)(?:\.([1-9][0-9]*))?$")
DEP_RANGE_RE = re.compile(r"([A-Z]{1,3})(\d{1,3})\s*[–—-]\s*\1?(\d{1,3})")
DEP_TOKEN_RE = re.compile(rf"\b{LOCAL_PAT}\b")
DEP_PROSE_RE = re.compile(r"\([^)]*\)")
DEP_FILLER_RE = re.compile(r"[\s,;.–—-]+")


@dataclass(frozen=True)
class Warn:
    """Named Warn, not Warning, so it cannot shadow the builtin exception class."""

    kind: str
    source: str
    detail: str



@dataclass(frozen=True)
class Row:
    local: str
    epic: str
    layer: str
    deps_cell: str
    ac_refs: str
    status_cell: str
    source: str
    line: int


def _rel(path, root=None):
    try:
        return Path(path).relative_to(root or ROOT).as_posix()
    except ValueError:
        return str(path)


def split_row_cells(line):
    """Cells of one table row; `\\|` is a literal pipe inside a cell, not a separator."""
    text = line.strip()
    cells, cur, i = [], [], 0
    if text.startswith("|"):
        i = 1
    while i < len(text):
        ch = text[i]
        if ch == "\\" and text[i + 1 : i + 2] == "|":
            cur.append("|")
            i += 2
            continue
        if ch == "|":
            cells.append("".join(cur).strip())
            cur = []
        else:
            cur.append(ch)
        i += 1
    tail = "".join(cur).strip()
    if tail or not text.endswith("|") or text.endswith("\\|"):
        cells.append(tail)
    return cells


def parse_plan_tables(plan_path, root=None):
    """Rows from every canonical table in one plan file, plus warnings. Never raises."""
    path = Path(plan_path)
    rel = _rel(path, root)
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError as exc:
        return [], [Warn("unreadable plan", rel, f"cannot read: {exc.strerror or exc}")]

    rows, warnings, tables = [], [], 0
    i = 0
    while i < len(lines):
        if lines[i].strip() != TABLE_HEADER:
            i += 1
            continue
        tables += 1
        i += 1
        if i < len(lines) and SEPARATOR_RE.match(lines[i].strip()):
            i += 1
        while i < len(lines) and lines[i].startswith("|"):
            cells = split_row_cells(lines[i])
            if len(cells) != TABLE_COLUMNS:
                warnings.append(
                    Warn("malformed row", f"{rel}:{i + 1}", f"{len(cells)} cells, expected {TABLE_COLUMNS}")
                )
                break
            rows.append(Row(cells[0], cells[1], cells[2], cells[3], cells[4], cells[5], rel, i + 1))
            i += 1

    if not tables:
        warnings.append(Warn("tableless plan", rel, "no canonical ticket table; contributes no tickets"))
    return rows, warnings


V1_EPIC_RE = re.compile(r"^(?:EP|CH)-\d{3}$")
HEADER_EPIC_RE = re.compile(r"\*\*Epic:\*\*\s*`?([^\s`]+)`?")
ITEM_KEY_PAT = r"[A-Z]{2,5}-[1-9][0-9]*(?:\.[1-9][0-9]*)?"
DEP_KEY_RE = re.compile(rf"(?<![A-Za-z0-9-]){ITEM_KEY_PAT}(?![A-Za-z0-9.-])")
TICKET_LIST_RE = re.compile(rf"^\d+\.\s+({ITEM_KEY_PAT})\s+{DASH}\s+(.+)$")
LABEL_HEADING_RE = re.compile(r"^##\s+(.+?)\s*$")
FENCE_RE = re.compile(r"^\s*(```|~~~)")


def plan_header_epic(text):
    """The head's `**Epic:**` value verbatim, or None. Callers decide whether it is an item key:
    `EP-NNN`/`CH-NNN` match ITEM_KEY_RE too, so test V1_EPIC_RE first."""
    head = []
    for line in (text or "").splitlines():
        if line.startswith("## "):
            break
        head.append(line)
    match = HEADER_EPIC_RE.search("\n".join(head))
    return match.group(1) if match else None


def parse_deps_v2(cell):
    """(local tokens, item keys, warnings): keys verbatim, then ranges and bare local tokens."""
    locals_, keys, warnings = [], [], []

    def take_key(match):
        if match.group(0) not in keys:
            keys.append(match.group(0))
        return " "

    def add(local):
        if local not in locals_:
            locals_.append(local)

    def expand(match):
        prefix, start, end = match.group(1), int(match.group(2)), int(match.group(3))
        step = 1 if end >= start else -1
        for number in range(start, end + step, step):
            add(f"{prefix}{number}")
        return " "

    def take(match):
        add(match.group(0))
        return " "

    text = DEP_TOKEN_RE.sub(take, DEP_RANGE_RE.sub(expand, DEP_KEY_RE.sub(take_key, cell or "")))
    leftover = DEP_FILLER_RE.sub("", DEP_PROSE_RE.sub("", text)).strip()
    if leftover:
        warnings.append(Warn("unparsed dependency", cell or "", f"{cell!r} left {leftover!r} unaccounted for"))
    return locals_, keys, warnings


def tickets_list_lines(text):
    """[(line number, text)] of the non-blank lines in the last `## Tickets` section, or None when
    the plan has no such section."""
    lines = (text or "").splitlines()
    starts = [i for i, line in enumerate(lines) if line.strip() == "## Tickets"]
    if not starts:
        return None
    found = []
    for i in range(starts[-1] + 1, len(lines)):
        if SECTION_END_RE.match(lines[i]):
            break
        if lines[i].strip():
            found.append((i + 1, lines[i].strip()))
    return found


def plan_ticket_keys(text):
    """Ordered [(key, title, line)] from a v2 plan's `## Tickets` list. Lines of another shape are
    skipped here; plan-lint reports them."""
    out = []
    for lineno, line in tickets_list_lines(text) or []:
        match = TICKET_LIST_RE.match(line)
        if match:
            out.append((match.group(1), match.group(2).strip(), lineno))
    return out


def labels_from_body(body):
    """A body with each `## <Label>` block folded into one `**<Label>:** …` line, the shape the
    Mirrors, placeholder and migration checks read."""
    out, label, block, fenced = [], None, [], False

    def flush():
        if label is not None:
            out.append(f"**{label}:** {' '.join(block)}".rstrip())

    for line in (body or "").splitlines():
        if FENCE_RE.match(line):
            fenced = not fenced
        heading = None if fenced else LABEL_HEADING_RE.match(line)
        if heading:
            flush()
            label, block = heading.group(1), []
        elif label is None:
            out.append(line)
        elif line.strip():
            block.append(line.strip())
    flush()
    return "\n".join(out)

RULE_SEP = ":"

# `(?=\s)` is load-bearing: without it an escaped family label `- **AP-\*** ` captures as `AP-`,
# and every reference to that family reads as a miss while the parse still reports success.
RULE_BULLET_RE = re.compile(r"^- \*\*(.+?)\*\*(?=\s)")
RULE_POINTER_RE = re.compile(r"^→\s*")
RULE_FENCE_RE = re.compile(r"^\s*```")


@dataclass(frozen=True)
class Rule:
    qualified: str
    skill: str
    rule_id: str
    text: str  # the bullet verbatim, soft wraps unfolded and its pointer kept
    pointer: str  # `<doc>#<anchor>`, "" when the bullet carries none
    source_line: str


def _rule_from_block(skill_name, rule_id, lineno, parts):
    pointer = ""
    for part in parts:
        if RULE_POINTER_RE.match(part):
            pointer = RULE_POINTER_RE.sub("", part).strip().strip("`")
    return Rule(
        qualified=skill_name + RULE_SEP + rule_id,
        skill=skill_name,
        rule_id=rule_id,
        text=" ".join(part for part in parts if part),
        pointer=pointer,
        source_line=f"{skill_name}/SKILL.md:{lineno}",
    )


def skill_rules(skill_name, root=None):
    """One skill's rules, keyed by bare ID.

    A missing skill directory or SKILL.md yields {} rather than raising: the caller reports an
    unknown *skill*, which is a more useful message than one miss per requested ID.
    """
    path = Path(root or ROOT) / SKILLS_REL / skill_name / "SKILL.md"
    try:
        lines = path.read_text(encoding="utf-8").splitlines()
    except OSError:
        return {}
    rules = {}
    fenced = False
    rule_id = ""
    lineno = 0
    parts = []
    for index, line in enumerate(lines, 1):
        # A fenced example of the rule-line shape is documentation, not a declaration.
        if RULE_FENCE_RE.match(line):
            fenced = not fenced
            continue
        if fenced:
            continue
        match = RULE_BULLET_RE.match(line)
        if match:
            if rule_id:
                rules[rule_id] = _rule_from_block(skill_name, rule_id, lineno, parts)
            rule_id = match.group(1).replace("\\", "").strip()
            lineno = index
            parts = [line[match.end() :].strip()]
            continue
        if not rule_id:
            continue
        if line.strip() and line[:1].isspace():
            parts.append(line.strip())
            continue
        rules[rule_id] = _rule_from_block(skill_name, rule_id, lineno, parts)
        rule_id = ""
    if rule_id:
        rules[rule_id] = _rule_from_block(skill_name, rule_id, lineno, parts)
    return rules


_RULE_REGISTRY_CACHE = {}


def load_rule_registry(root=None):
    """Every skill's rules keyed `<skill>:<ID>`, memoised: show, sync and next may each call it."""
    base = Path(root or ROOT)
    key = str(base)
    if key not in _RULE_REGISTRY_CACHE:
        registry = {}
        for path in sorted((base / SKILLS_REL).glob("*/SKILL.md")):
            for rule in skill_rules(path.parent.name, base).values():
                registry[rule.qualified] = rule
        _RULE_REGISTRY_CACHE[key] = registry
    return _RULE_REGISTRY_CACHE[key]


def _rule_miss(wanted, declared_by, skill_ids):
    skill, sep, _ = wanted.partition(RULE_SEP)
    if not sep:
        owners = sorted(declared_by.get(wanted, ()))
        if not owners:
            return "bare ID — qualify it; declared by no skill"
        return "bare ID — qualify it; declared by: " + ", ".join(owners)
    if skill not in skill_ids:
        return f"no skill named '{skill}'"
    listed = ", ".join(sorted(skill_ids[skill]))
    return f"'{skill}' declares: {listed}"


def resolve_rules(ids, registry):
    """(found, unknown) in declaration order; unknown entries are `<id> — <reason>` strings.

    Which skills exist is read off the registry, so a skill absent from it reports once as an
    unknown skill instead of once per requested ID. A repeat is expanded once and noted, never
    dropped silently — a silent pick is indistinguishable from a correct answer.
    """
    declared_by = {}
    skill_ids = {}
    for rule in registry.values():
        declared_by.setdefault(rule.rule_id, set()).add(rule.skill)
        skill_ids.setdefault(rule.skill, set()).add(rule.rule_id)
    found = []
    unknown = []
    seen = set()
    noted = set()
    for raw in ids:
        wanted = str(raw).strip()
        if not wanted:
            continue
        if wanted in seen:
            if wanted not in noted:
                noted.add(wanted)
                unknown.append(f"{wanted} — declared more than once; expanded once")
            continue
        seen.add(wanted)
        rule = registry.get(wanted)
        if rule is None:
            unknown.append(wanted + " — " + _rule_miss(wanted, declared_by, skill_ids))
        else:
            found.append(rule)
    return tuple(found), tuple(unknown)


RULE_DECL_RE = re.compile(r"^\*\*Rules:\*\*\s*(.+)$", re.MULTILINE)
# `**Rules:**` predates this channel as a free-prose label in older plans, so *shape* decides whether
# a line declares anything: an identifier starting with a letter, ending in a letter/digit/`*`, and
# made only of characters an ID can contain — no whitespace, no brackets, no trailing punctuation.
# `*` and `…` are in the class because `AAP-*` and `V-2…V-9` are real registry keys.
# The test is shape, never resolvability, so a real typo is still a declaration and still fails loud.
# The looseness is one-way on purpose: over-accepting surfaces as UNKNOWN, whereas over-rejecting
# would drop a genuine declaration in silence — the one failure this whole channel exists to prevent.
RULE_TOKEN_RE = re.compile(r"^[A-Za-z](?:[A-Za-z0-9.:…*-]*[A-Za-z0-9*])?$")
AGENT_SKILLS_RE = re.compile(r"^skills:\s*\[(.*)\]\s*$")
NO_RULES = "(no rules declared)"
RULES_CAP = 4096
ORACLE_LINE = "oracle: `shared-docs-oracle` — invoke for the source section behind any rule above"


def split_rule_ids(payload):
    """`a, b, `c`` -> ("a", "b", "c"). Backticks are stripped: prose writes IDs in code spans."""
    ids = []
    for token in str(payload or "").split(","):
        token = token.strip().strip("`").strip()
        if token:
            ids.append(token)
    return tuple(ids)


def is_rule_decl(tokens):
    """Whether a `**Rules:**` payload declares IDs, as opposed to labelling prose.

    All-or-nothing per line: every token must be identifier-shaped. A payload that mixes an ID with
    prose is therefore not a declaration, which `sync` reports as "no rules declared" for that
    ticket — visible, not silent.
    """
    return bool(tokens) and all(RULE_TOKEN_RE.match(token) for token in tokens)


def parse_rule_decl(text):
    """Declared IDs from a plan section body.

    Several `**Rules:**` lines concatenate in declaration order rather than the last winning: a
    section may split its declaration across sub-bullets, and dropping the rest would silently
    narrow the worker's context — the one failure this whole channel exists to prevent.

    Prose payloads are skipped without a warning. Legacy plans used this exact line as a free-text
    label, and a channel that cries wolf on valid legacy tickets teaches the controller to ignore
    exit 4 — which would silently re-open the hole the fail-loud tier closes.
    """
    ids = []
    for match in RULE_DECL_RE.finditer(text or ""):
        tokens = split_rule_ids(match.group(1))
        if is_rule_decl(tokens):
            ids.extend(tokens)
    return tuple(ids)


def declared_rules(ticket, section):
    """Declared IDs for either origin. `section` is the caller's already-fetched plan section, so
    this never re-reads the plan file."""
    if ticket.origin == "plan":
        return parse_rule_decl(section or "")
    return tuple(ticket.rules)


def executor_namespaces(agent, root=None):
    """Skill names the resolved executor preloads — names only, never rule content.

    Declaration is authoritative; this derived line only tells the worker which oracle namespaces
    are already in its floor. A `skill:<name>` executor *is* its skill, so it reports that one.
    """
    if not agent:
        return ()
    if agent.startswith(SKILL_PREFIX):
        return (agent[len(SKILL_PREFIX) :],)
    for path in sorted((Path(root or ROOT) / AGENTS_REL).rglob(agent + ".md")):
        try:
            lines = path.read_text(encoding="utf-8").splitlines()
        except OSError:
            return ()
        if not lines or lines[0].strip() != "---":
            return ()
        for line in lines[1:]:
            if line.strip() == "---":
                break
            match = AGENT_SKILLS_RE.match(line)
            if match:
                return tuple(name.strip() for name in match.group(1).split(",") if name.strip())
        return ()
    return ()


def render_rules_block(found, unknown, namespaces):
    """The `--- rules ---` body: found rules verbatim, then the misses, then the derived pointers."""
    if not found and not unknown:
        return NO_RULES
    tail = [f"UNKNOWN  {entry}" for entry in unknown]
    tail.append("namespaces: " + (" ".join(namespaces) if namespaces else DASH))
    tail.append(ORACLE_LINE)
    # Bytes, not characters: rule text is dense in `→` and `—`, each 3 bytes, so a character
    # count would let the block run ~10% past a cap whose whole point is a bounded payload.
    budget = RULES_CAP - sum(len(line.encode("utf-8")) + 1 for line in tail)
    kept, elided, size = [], 0, 0
    for position, rule in enumerate(found):
        line = rule.qualified + "  " + rule.text
        # Truncate at a rule boundary, never mid-line: a counted omission is legible, whereas a
        # severed rule reads as a complete one and is followed as written.
        if size + len(line.encode("utf-8")) + 1 > budget:
            elided = len(found) - position
            break
        kept.append(line)
        size += len(line.encode("utf-8")) + 1
    if elided:
        kept.append(f"... {elided} more rules elided — declare fewer")
    return "\n".join(kept + tail)


SECTION_END_RE = re.compile(r"^#{1,2}\s")
