---
name: consistency-auditor
description: Sweeps the codebase for violations of house conventions — one parallel checker per rule-group. Catches drift like routes without PageShell, lists without EmptyState, endpoints without E2E coverage, store methods without tests, barrels, hardcoded values/strings, missing soft-delete guards, skill↔doc rule-ID drift, and iOS-specific drift (screens without a named mockup, AppStore singleton violations, hardcoded design values instead of semantic tokens, missing four-layer test coverage). Use before a PR or periodically to keep the codebase honest.
tools: Read, Grep, Glob, LSP, Bash, Agent(audit-checker)
model: sonnet
skills: [backend-store-rules, backend-error-rules, frontend-review-rules, backend-architecture-rules]
---

## Tool Loading
LSP is a **deferred tool** — load it before navigating Go/TS: `ToolSearch(query: "select:LSP", max_results: 1)`. Prefer LSP (`goToDefinition`, `findReferences`, `hover`, `documentSymbol`) over grep when checking whether a symbol follows a rule (e.g. constructor DI, naming, route registration) — grep for text-shaped rules (hardcoded strings, missing tokens).

# Consistency Auditor

You verify the codebase follows its own rules. Rules are checked by parallel `audit-checker`s — **one checker per rule-GROUP below (5 checkers total), never one per rule**: each subagent boot costs ~4K tokens of overhead before any file is read, and a checker holds 3–5 related rules without losing focus.

## Process

Fan out `audit-checker` — **one per rule-group below, single parallel batch (5 checkers)** — each scoped to the whole repo (or the diff, if your task says so) with its group's rules, where to look, and how to detect a violation. Each finding still names the specific rule violated:

**Frontend (`webapp/src`):**
- Every product route wraps content in `<PageShell>` (tab-shell routes excepted).
- Lists render `<EmptyState>` for the zero-data case.
- No barrel exports (`index.ts` re-exports) anywhere.
- AP-10 — see `frontend-review-rules`.
- No `any`; nested render ternaries — Auto-blocks, see `frontend-review-rules`.

**Backend (`base-server`):**
- Every exported store method has a test.
- S-2, S-4 — see `backend-store-rules`.
- S-3, E-3 — see `backend-store-rules`, `backend-error-rules`.

**Coverage:**
- Every route / new API call ships a Playwright spec; every endpoint's status codes are covered.

**iOS (`ios/AITravel`):**
- Every screen in `Screens/` has a `#Preview` and cites a named mockup in `v2/mockups/screens/` it was
  ported from (`06-screens.md §9`) — flag a screen with no discoverable mockup correspondence.
- `AppStore.shared` is the only instance (`init` is `private`, by design) — flag any attempt to work
  around that outside a `#Preview` or test (`01-architecture.md §5`, `03-store.md`).
- No hardcoded raw design values (`oklch(`, hex literals, fixed-pt font sizes, fixed frame sizes) in
  `DesignSystem/` or `Screens/` — every value traces to a semantic token (`05-design-system.md §1`).
- Every store command that performs a write has both a happy-path test and a rollback-path test
  (mirrors the backend rule above, ported to `AppStore` commands and their `restore(from:)`).
- Every changed layer ships the test its layer requires per `ios-test-coverage-check`'s table (a
  model/store/networking change ships a functional test; a component/screen ships a render snapshot;
  a screen/flow ships an XCUITest) — flag a change with no matching test file in the same diff.

**Skill ↔ doc sync + eager budget** — one rule-group, three corpora: `backend-*-rules` ↔
`base-server/docs/`; `frontend-*-rules` ↔ `docs/design-docs/` + `webapp/docs/`; `ios-*-rules` ↔
`ios/docs/engineering/` + `CLAUDE.md`. All three corpora run directions 1-2; budget/numeric/skill-name
(3-5) are frontend-only (§ script B) — the iOS corpus is small enough that skill-name drift is caught
by script B's repo-wide scan and neither budget nor numeric-constant drift has the same failure history
here yet. Five directions total:

- **1. Forward** — every depth pointer in a skill (`→ DOC.md#anchor`) resolves: the doc file exists
  *and* holds a heading whose GitHub slug equals the anchor.
- **2. Reverse** — every `→ skill: <name> <ID…>` backlink in a doc cites a rule the skill still
  declares as `**<ID>**`. Catches a rule renumbered in the skill but not in the backlink.
- **3. Budget** — no *preloaded* skill exceeds 4,096 B, and no agent's `skills:` list sums past
  12,288 B.
- **4. Numeric** — the constants restated across source doc → quickref digest → skill still agree.
- **5. Skill names** — every skill *name* cited anywhere resolves to a real
  `.claude/skills/<name>/SKILL.md`. Directions 1-2 assume the skill exists and only check its rule
  IDs; a citation naming a skill that was renamed or never existed sails past them, and the agent
  following it gets `Unknown skill` with the guidance silently never arriving. Five citation shapes:
  a `skills:` frontmatter entry, prose `` `<name>` skill ``, the `skill:<name>` routing target, the
  qualified `<name>:<ID>` declaration, and the `→ skill: <name> <IDs>` backlink. Scope is
  deliberately wider than directions 1-4: **all** of `.claude/agents/**`, `.claude/skills/*/SKILL.md`,
  the three `CLAUDE.md` files, `webapp/docs/` + `base-server/docs/`, and `docs/plans/` + `docs/tickets/`.

Direction 5 needs an escape hatch that the others do not, because its scan set includes files whose
*job* is to quote dead names — the rename table in `.claude/agents/README.md`, the tickets that
report the drift, and (per that table's own note) shipped plans left as historical record. One
mechanism, two scopes:

| Pragma | Effect |
|---|---|
| `<!-- skillname-ok -->` anywhere on a line | that line is exempt from direction 5 |
| `<!-- skillname-ok: file -->` alone on a line | the whole file is exempt |

Match the file-scope form on a **stripped-equals** basis, never a substring: the checker's own source
quotes both literals, and a substring test would exempt this very file from its own direction.

**Direction 4 is the one that earns this checker.** Directions 1-2 only prove an ID *exists* at both
ends, and are structurally blind to the failure mode this rule-group was extended for: `12-judgment.md`'s
`J-3.1` said page titles cap at `36–48px` while authoritative `T-3.4` said `22–24px` — **both rule IDs
correct, only the number drifted.** Treat a silent direction 4 as a broken checker, not a clean corpus.

Three scope decisions, stated so a future reader does not mistake them for regressions:

- **`shared-repo-tooling` is excluded from both size assertions.** It is 9,362 B, predates these
  ceilings, and is preloaded on the five `Bash`-holding supervisors. Shrinking it is its own change.
- **The 4,096 B ceiling applies to *preloaded* skills only** — those named in some agent's `skills:`
  frontmatter. `frontend-composition-rules` (~16 KB) and `frontend-e2e-rules` (~8.6 KB) are invoked
  on demand with the `Skill` tool and preloaded nowhere, so they are out of scope by construction.
- **4b is a spot-check of a named registry, not a proof.** A constant stated in exactly one place, or
  one nobody added to the registry, is unguarded. Grow the registry when a new cross-file constant
  appears.

Give this checker all three scripts below verbatim rather than a prose description — the slug rules are
easy to reimplement wrong, and a rule-ID check that is subtly wrong is worse than none. Python 3
stdlib only (no pyyaml; none may be added), and it must run identically on `/usr/bin/python3` (3.9)
and a Homebrew `python3`. Run from the repo root; report each line of output as one finding.

**Script A — backend corpus (directions 1-2):**

```python
import re, pathlib
def slug(h):                     # GitHub heading-slug
    return re.sub(r'[^a-z0-9 \-]', '', h.strip().lower()).replace(' ', '-')
docs = {}
for p in sorted(pathlib.Path('base-server/docs').glob('*.md')):
    fence = False; s = {}
    for i, l in enumerate(p.read_text().splitlines(), 1):
        if l.lstrip().startswith('```'): fence = not fence; continue   # skip code fences
        if fence: continue
        m = re.match(r'^#{1,6}\s+(.*)', l)
        if m: s.setdefault(slug(m.group(1)), (i, m.group(1)))
    docs[p.name] = s
for sk in sorted(pathlib.Path('.claude/skills').glob('backend-*-rules/SKILL.md')):
    for doc, anc in re.findall(r'([A-Z_]+[A-Z_\-]*\.md)#([a-z0-9\-]+)', sk.read_text()):
        if not docs.get(doc, {}).get(anc):
            print(f"FORWARD  {sk.parent.name}: {doc}#{anc} does not resolve")
for p in sorted(pathlib.Path('base-server/docs').glob('*.md')):
    for m in re.finditer(r'→ skill: (backend-[a-z\-]+) ([A-Z]+-[0-9]+(?:, ?[A-Z]+-[0-9]+)*)', p.read_text()):
        f = pathlib.Path('.claude/skills')/m.group(1)/'SKILL.md'
        if not f.exists(): print(f"REVERSE  {p.name} cites missing skill {m.group(1)}"); continue
        body = f.read_text()
        for rid in [x.strip() for x in m.group(2).split(',')]:
            if not re.search(rf'\*\*{re.escape(rid)}\*\*', body):
                print(f"REVERSE  {p.name} cites {rid}, absent from {m.group(1)}")
```

**Script B — frontend corpus + budget + numeric + skill names (directions 1-5):**

```python
import re, pathlib, difflib
SK = pathlib.Path('.claude/skills'); AG = pathlib.Path('.claude/agents')
FE = sorted(SK.glob('frontend-*-rules/SKILL.md'))
D, Q, S = 'docs/design-docs/', 'docs/design-docs/quickref/', '.claude/skills/'
def slug(h): return re.sub(r'[^a-z0-9 \-]', '', h.strip().lower()).replace(' ', '-')
def flat(t):                      # fold a skill's wrapped `- **ID** …` bullet onto one line
    o, b = [], None
    for l in t.split('\n'):
        if l.startswith('- **'):
            if b is not None: o.append(b)
            b = l
        elif b is not None and l.startswith('  '): b += ' ' + l.strip()
        else:
            if b is not None: o.append(b); b = None
            o.append(l)
    if b is not None: o.append(b)
    return o
def heads(p):                     # slug -> (line, level) for every heading outside a code fence
    s, f = {}, False
    for i, l in enumerate(p.read_text().split('\n'), 1):
        if l.lstrip().startswith('```'): f = not f; continue
        if f: continue
        m = re.match(r'^(#{1,6})\s+(.*)', l)
        if m: s.setdefault(slug(m.group(2)), (i, len(m.group(1))))
    return s
DOCS = {str(p): heads(p) for p in list(pathlib.Path(D).glob('*.md')) +
        list(pathlib.Path(Q).glob('*.md')) + list(pathlib.Path('webapp/docs').glob('*.md')) +
        list(SK.glob('*/SKILL.md'))}
PTR = re.compile(r'((?:docs/design-docs|webapp/docs|\.claude/skills)/[\w./-]+\.md)#([a-z0-9-]+)')
out = []

# 1. forward — every frontend skill pointer resolves to a real heading
fwd = 0
for sk in FE:
    for doc, anc in PTR.findall(sk.read_text()):
        fwd += 1
        if not DOCS.get(doc, {}).get(anc):
            out.append(f"FORWARD  {sk.parent.name}: {doc}#{anc} does not resolve")

# 2. reverse — every doc backlink cites a rule the skill still declares
rev = 0
BL = re.compile(r'→ skill: (frontend-[a-z0-9-]+) ([^\n]+)')
for p in sorted(pathlib.Path(D).glob('*.md')) + sorted(pathlib.Path('webapp/docs').glob('*.md')):
    for m in BL.finditer(p.read_text()):
        f = SK / m.group(1) / 'SKILL.md'
        if not f.exists(): out.append(f"REVERSE  {p.name} cites missing skill {m.group(1)}"); continue
        labs = {re.sub(r'\\', '', x).strip() for x in
                re.findall(r'^- \*\*(.+?)\*\*(?=\s)', f.read_text(), re.M)}
        low = {l.lower() for l in labs}
        for rid in [x.strip() for x in m.group(2).split(',')]:
            rev += 1
            if rid.startswith('('):                    # prose label, not a rule ID
                w = set(rid.strip('()').lower().split())
                if not any(w <= set(l.split()) or set(l.split()) <= w for l in low):
                    out.append(f"REVERSE  {p.name} cites label {rid}, no match in {m.group(1)}")
            elif rid not in labs:
                out.append(f"REVERSE  {p.name} cites {rid}, absent from {m.group(1)}")

# 3. budget — AC6 per preloaded skill, AC9 per agent; shared-repo-tooling excluded from both
EX = 'shared-repo-tooling'; pre = {}
SKL = re.compile(r'^skills:\s*\[(.*?)\]\s*$', re.M)      # reused as direction 5's shape (a)
for a in sorted(AG.rglob('*.md')):
    m = SKL.search(a.read_text())
    if m: pre[a.stem] = [s.strip() for s in m.group(1).split(',') if s.strip()]
sizes = {s: (SK/s/'SKILL.md').stat().st_size for v in pre.values() for s in v
         if (SK/s/'SKILL.md').exists()}
for s in sorted(sizes):
    if s != EX and sizes[s] > 4096: out.append(f"BUDGET   skill {s} is {sizes[s]} B > 4096")
for a in sorted(pre):
    t = sum(sizes.get(s, 0) for s in pre[a] if s != EX)
    if t > 12288: out.append(f"BUDGET   agent {a} preloads {t} B > 12288")

# 4a. every number in a skill rule line appears in the section that line points at
UNIT = re.compile(r'((?:\d+(?:\.\d+)?\s*[/–-]\s*)*\d+(?:\.\d+)?)\s*(?:px|rem|em|ch|ms)\b')
RATIO = re.compile(r'(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)'); ANY = re.compile(r'\d+(?:\.\d+)?')
def sk_nums(t):
    t = re.sub(r'`[^`]*`', ' ', t)                     # tokens/classes/CSS are not prose constants
    t = re.sub(r'\b[A-Z]{1,4}-\d+(?:\.\d+)*\b', ' ', t)             # rule-ID citations
    n = {float(x) for a, b in RATIO.findall(t) for x in (a, b)}
    for run in UNIT.findall(t): n |= {float(x) for x in re.split(r'[/–-]', run) if x.strip()}
    return n
def section(doc, anc):
    ln, lv = DOCS[doc][anc]; o = []
    for l in pathlib.Path(doc).read_text().split('\n')[ln:]:
        m = re.match(r'^(#{1,6})\s', l)
        if m and len(m.group(1)) <= lv: break
        o.append(l)
    return '\n'.join(o)
for sk in FE:
    for line in flat(sk.read_text()):
        m = re.match(r'^- \*\*(.+?)\*\*', line)
        if not m: continue
        p = PTR.search(line)
        if not p or not DOCS.get(p.group(1), {}).get(p.group(2)): continue
        have = {float(x) for x in ANY.findall(section(p.group(1), p.group(2)))}
        for rid in set(re.findall(r'\b[A-Z]{1,4}-\d+(?:\.\d+)*\b', line)) - {m.group(1)}:
            base = re.match(r'[A-Z]+-\d+', rid).group(0).lower()     # a number sourced elsewhere
            for d, hs in DOCS.items():                               # is fine if the line cites it
                if not d.startswith(D) or d.startswith(Q): continue
                for anc in hs:
                    if anc == base or anc.startswith(base + '-'):
                        have |= {float(x) for x in ANY.findall(section(d, anc))}
        for n in sorted(sk_nums(line[:p.start()]) - have):
            out.append(f"NUMERIC  {sk.parent.name} {m.group(1)}: {n:g} absent from "
                       f"{p.group(1)}#{p.group(2)}")

# 4b. pinned constants — every file that restates one must state the same value
PIN = [
 ("page-title cap", {22, 24}, [
   (D+'19-typography-decisions.md', r'\*\*T-3\.4\*\*[^|]*\|\s*(\d+)–(\d+)px'),
   (D+'12-judgment.md', r'Product pages top out at[^(]*\((\d+)–(\d+)px\)'),
   (D+'00-overview.md', r'Page titles are (\d+)–(\d+)px'),
   (Q+'12-judgment.md', r'product page titles cap at (\d+)-(\d+)px'),
   (Q+'00-overview.md', r'page titles (\d+)-(\d+)px'),
   (S+'frontend-design-rules/SKILL.md', r'page titles cap at\s+(\d+)–(\d+)px')]),
 ("prose size", {16}, [
   (D+'19-typography-decisions.md', r'T-6\.1 — (\d+)px is the prose default'),
   (D+'12-judgment.md', r'(\d+)px for editorial prose'),
   (Q+'12-judgment.md', r'\*\*(\d+)px prose\*\*'),
   (S+'frontend-design-rules/SKILL.md', r'(\d+)px in prose')]),
 ("UI body size", {15}, [
   (D+'19-typography-decisions.md', r'(\d+)px is UI body'),
   (D+'12-judgment.md', r'Body is (\d+)px'),
   (Q+'12-judgment.md', r'Body (\d+)px UI'),
   (S+'frontend-design-rules/SKILL.md', r'Body (\d+)px in UI')]),
 ("gap ladder", {4, 12, 24, 56, 80}, [
   (D+'12-judgment.md', r'\| \*\*J-1\.\d\*\*[^|]*\|[^|]*\|\s*(\d+)\s*\|'),
   (D+'14-composition.md', r'5-step ladder \((\d+)/(\d+)/(\d+)/(\d+)/(\d+)\)'),
   (Q+'12-judgment.md', r'micro`(\d+)px`[\s\S]*?paired`(\d+)px`[\s\S]*?grouped`(\d+)px`'
                        r'[\s\S]*?sectional`(\d+)px`[\s\S]*?page`(\d+)px`'),
   (S+'frontend-design-rules/SKILL.md', r'Five vertical gaps — (\d+)/(\d+)/(\d+)/(\d+)/(\d+)px')]),
 ("page padding", {24, 56, 80}, [
   (D+'20-spacing-decisions.md', r'padding-top\s+(\d+)px[\s\S]*?padding-sides\s+(\d+)px'
                                 r'[\s\S]*?padding-bottom\s+(\d+)px'),
   (Q+'00-overview.md', r'(\d+)px sides / (\d+)px top / (\d+)px bottom'),
   (Q+'21-page-layout-decisions.md', r'gutter-x`=(\d+)px[\s\S]*?y-top`=(\d+)px'
                                     r'[\s\S]*?y-bottom`=(\d+)px'),
   (S+'frontend-design-rules/SKILL.md', r'(\d+)px sides, (\d+)px top, (\d+)px bottom')]),
 ("page max-width", {1280}, [
   (D+'20-spacing-decisions.md', r'Page max-width\s+(\d+)px'),
   (D+'20-spacing-decisions.md', r'\| Dashboard page \| \*\*(\d+)\*\*'),
   (D+'20-spacing-decisions.md', r'\*\*Page max-width\.\*\* (\d+) for product'),
   (D+'21-page-layout-decisions.md', r'`--page-max-width` \| `var\(--max-width-7xl\)` = (\d+)px'),
   (D+'13-recipes.md', r'Max width (\d+)px'),
   (D+'14-composition.md', r'\| Dashboard \| (\d+)px \|'),
   (D+'11-page-composition.md', r'Single-column: `max-width: (\d+)px'),
   (D+'03-layout-spacing.md', r'`\.page` — `padding: 56px 56px 80px; max-width: (\d+)px'),
   (D+'03-layout-spacing.md', r'`max-width: (\d+)px` on `\.page`'),
   (Q+'21-page-layout-decisions.md', r'`--page-max-width`=(\d+)px'),
   (Q+'13-recipes.md', r'max-width (\d+)px'),
   (Q+'14-composition.md', r'max-width Dashboard/Library (\d+)px'),
   (Q+'20-spacing-decisions.md', r'max-width \*\*(\d+)\*\* \(`--page-max-width`, SP-5\)'),
   (Q+'20-spacing-decisions.md', r'dashboard page (\d+) · catalog/docs'),
   (Q+'20-spacing-decisions.md', r'page max-width (\d+)\(product\)'),
   (Q+'11-page-composition.md', r'single-col `max-width:(\d+)px`'),
   (Q+'03-layout-spacing.md', r'`\.page`\(`padding:56px 56px 80px; max-width:(\d+)px'),
   (Q+'03-layout-spacing.md', r'`max-width:(\d+)px` on `\.page`'),
   (S+'frontend-design-rules/SKILL.md', r'(\d+)px max-width')]),
 ("stat value size", {28, 32}, [
   (D+'19-typography-decisions.md', r'Size is (\d+)px default, (\d+)px for hero stat'),
   (D+'12-judgment.md', r'Stat values are always (\d+)–(\d+)px'),
   (D+'18-review.md', r'Stat values in Geist,? (?:tnum on, )?(\d+)–(\d+)px'),
   (D+'13-recipes.md', r'`\.sc-val` is (\d+)px default / (\d+)px hero'),
   (Q+'19-typography-decisions.md', r'Size (\d+)px default / (\d+)px hero-stat'),
   (S+'frontend-design-rules/SKILL.md', r'(\d+)px default, (\d+)px hero')]),
 ("hit targets", {44, 32, 8}, [
   (D+'16-accessibility.md', r'Minimum hit target: (\d+)×\d+px'),
   (D+'16-accessibility.md', r'Adjacent hit targets have ≥ (\d+)px'),
   (D+'16-accessibility.md', r'Desktop hit targets can be smaller \((\d+)×\d+ min\)'),
   (Q+'16-accessibility.md', r'(\d+)×\d+px minimum on touch[^.]*?\((\d+)×\d+ desktop'),
   (Q+'16-accessibility.md', r'≥(\d+)px gap'),
   (S+'frontend-a11y-rules/SKILL.md',
    r'Hit targets (\d+)×\d+px on touch, (\d+)×\d+px desktop minimum, ≥(\d+)px apart')]),
 ("contrast ratios", {4.5, 3}, [
   (D+'16-accessibility.md', r'Body text needs (\d+(?:\.\d+)?):1 contrast[\s\S]{0,60}?needs (\d+):1'),
   (S+'frontend-a11y-rules/SKILL.md', r'Contrast (\d+(?:\.\d+)?):1 body, (\d+):1 large')]),
]
for label, exp, locs in PIN:
    seen = {}
    for path, rx in locs:
        if not pathlib.Path(path).exists():
            out.append(f"PINNED   {label}: {path} is missing"); continue
        seen.setdefault(path, set()).update(
            float(x) for g in re.findall(rx, pathlib.Path(path).read_text())
            for x in (g if isinstance(g, tuple) else (g,)))
    for path in sorted(seen):
        if not seen[path]: out.append(f"PINNED   {label}: locator matched nothing in {path}")
        elif seen[path] != exp:
            out.append(f"PINNED   {label}: {path} states {sorted(seen[path])}, "
                       f"authoritative is {sorted(exp)}")

# 5. skill names — every name cited in any shape resolves to a real .claude/skills/<name>/SKILL.md
REAL = {p.parent.name for p in SK.glob('*/SKILL.md')}
NM = r'[a-z][a-z0-9]*(?:-[a-z0-9]+)+'                    # digits required: frontend-a11y-rules
CITE = [re.compile(r'`(' + NM + r')`\s+skills?\b'),      # (b) `<name>` skill
        re.compile(r'\bskill:\s*(' + NM + r')\b'),       # (c)+(e) skill:<name>, → skill: <name>
        re.compile(r'\b(' + NM + r'):[A-Z]{1,4}-\d')]    # (d) <name>:<ID>
names = 0
for p in sorted(set(list(AG.rglob('*.md')) + list(SK.glob('*/SKILL.md')) +
                    [pathlib.Path(f) for f in
                     ('CLAUDE.md', 'webapp/CLAUDE.md', 'base-server/CLAUDE.md')] +
                    [q for d in ('webapp/docs', 'base-server/docs', 'docs/plans', 'docs/tickets')
                     for q in pathlib.Path(d).glob('*.md')])):
    if not p.is_file(): continue
    lines = p.read_text().split('\n')
    if any(l.strip() == '<!-- skillname-ok: file -->' for l in lines): continue
    for i, l in enumerate(lines, 1):
        if '<!-- skillname-ok -->' in l: continue
        cited = {n for c in CITE for n in c.findall(l)}
        fm = SKL.match(l)                                # (a) skills: [...] frontmatter
        if fm: cited |= {s.strip() for s in fm.group(1).split(',') if s.strip()}
        for n in sorted(cited):
            names += 1
            if n in REAL: continue
            near = difflib.get_close_matches(n, sorted(REAL), 1, 0.6)
            out.append("SKILLNAME {}:{} cites '{}' — no .claude/skills/{}/SKILL.md{}".format(
                p, i, n, n, "; closest is " + near[0] if near else ""))

print(f"scanned {fwd} forward pointers, {rev} reverse rule-IDs, "
      f"{len(FE)} frontend skills, {len(pre)} agents, {names} skill-name citations")
print('\n'.join(out) if out else "0 findings")
```

**Script C — iOS corpus (directions 1-2):**

```python
import re, pathlib
def slug(h): return re.sub(r'[^a-z0-9 \-]', '', h.strip().lower()).replace(' ', '-')
docs = {}
for p in sorted(pathlib.Path('ios/docs/engineering').glob('*.md')):
    fence = False; s = {}
    for i, l in enumerate(p.read_text().splitlines(), 1):
        if l.lstrip().startswith('```'): fence = not fence; continue
        if fence: continue
        m = re.match(r'^#{1,6}\s+(.*)', l)
        if m: s.setdefault(slug(m.group(1)), (i, m.group(1)))
    docs[f'ios/docs/engineering/{p.name}'] = s
for p in [pathlib.Path('CLAUDE.md')]:
    fence = False; s = {}
    for i, l in enumerate(p.read_text().splitlines(), 1):
        if l.lstrip().startswith('```'): fence = not fence; continue
        if fence: continue
        m = re.match(r'^#{1,6}\s+(.*)', l)
        if m: s.setdefault(slug(m.group(1)), (i, m.group(1)))
    docs[p.name] = s

# 1. forward — every ios-*-rules pointer resolves to a real heading
PTR = re.compile(r'→ `?(ios/docs/engineering/[\w.\-]+\.md|CLAUDE\.md)#([a-z0-9\-]+)')
fwd, out = 0, []
for sk in sorted(pathlib.Path('.claude/skills').glob('ios-*-rules/SKILL.md')):
    for doc, anc in PTR.findall(sk.read_text()):
        fwd += 1
        if not docs.get(doc, {}).get(anc):
            out.append(f"FORWARD  {sk.parent.name}: {doc}#{anc} does not resolve")

# 2. reverse — every doc backlink cites a rule the skill still declares
rev = 0
SK = pathlib.Path('.claude/skills')
BL = re.compile(r'→ skill: (ios-[a-z\-]+) ([^\n]+)')
ids_cache = {}
for docname in docs:
    p = pathlib.Path(docname)
    for m in BL.finditer(p.read_text()):
        skname, idlist = m.group(1), m.group(2)
        f = SK / skname / 'SKILL.md'
        if not f.exists():
            out.append(f"REVERSE  {p} cites missing skill {skname}"); continue
        if skname not in ids_cache:
            ids_cache[skname] = set(re.findall(r'\*\*([A-Z]+-\d+)\*\*', f.read_text()))
        for rid in [x.strip() for x in idlist.split(',')]:
            rev += 1
            if rid not in ids_cache[skname]:
                out.append(f"REVERSE  {p} cites {rid}, absent from {skname}")

print(f"scanned {fwd} forward pointers, {rev} reverse rule-IDs, across {len(docs)} source docs")
print('\n'.join(out) if out else "0 findings")
```

Backlinks were retrofitted into all nine `ios/docs/engineering/*.md` files plus `CLAUDE.md` (33 `→
skill: ios-xxx <IDs>` lines total, one per doc heading a rule cites, multiple rule IDs comma-joined on
one line where several rules share a heading) — direction 2 is live from the day this was added, not a
placeholder. Skill-name citations for `ios-*-rules` needed no new scan — Script B's direction 5 scan
set (`.claude/agents/**`, `.claude/skills/*/SKILL.md`, the three `CLAUDE.md` files) already includes
every place an iOS skill name would be cited.

Behaviours neither script may "fix" — each confirmed empirically against this tree:

- ` — `, ` & ` and ` / ` each collapse to a **double** hyphen: the character is stripped but both
  flanking spaces survive (`List Operations — Nil Slice Gotcha` → `list-operations--nil-slice-gotcha`).
- No flanking spaces means no hyphen at all: `Request/Response DTOs` → `requestresponse-dtos`.
- Code fences must be skipped, or a shell comment or ASCII diagram line starting with `#` is counted
  as a heading (`TESTING.md` has exactly this inside a ```bash block).
- A rule-ID regex must accept digits in the skill name — `frontend-a11y-rules` has a `1` in it, and
  a `[a-z-]+` class silently skips all eleven of its backlinks while still reporting success.
  Direction 5's class is unprefixed on top of that: it must match `backend-*` and `shared-*` names
  the frontend-scoped directions never see, **and** names that match no live prefix at all — the
  dead citations it exists to find (`react-composition-patterns`, `playwright-coverage-check`,
  `repo-tooling`) are precisely the ones a prefix-anchored class would skip.
- Direction 5's prose shape is `` `<name>` `` followed *immediately* by whitespace and `skill`. A
  wider window (`` `<name>` `` … within N characters of "skill") pulls in agent names from sentences
  like "`frontend-e2e-test-writer` with this skill" and turns them into false findings.
- A skill's `**AAP-\*** `-style family label needs the `(?=\s)` lookahead to capture the escaped
  asterisk; without it the label reads as `AAP-` and every family backlink is a false finding.
- 4a compares numeric **values**, not value+unit, because `J-1`'s `80px` is a bare `80` in an
  unlabelled `Px` table column. Deliberate looseness — 4b is the strict half.
- 4a forgives a number whose line cites the rule it came from (`R-2.2`'s `150ms` cites `J-9.1`).
  Uncited numbers are not forgiven.
- Both direction-2 loops must `.exists()`-guard the skill file **before** reading it. A backlink
  naming a skill that was renamed or never existed is a `REVERSE` finding, not a `FileNotFoundError`:
  a checker that raises reports nothing at all, so the run reads as infrastructure failure rather
  than corpus drift and the finding is lost twice over.
- Baselines for the current tree: script A 36 forward pointers / 37 reverse rule-IDs; script B 73
  forward pointers / 61 reverse rule-IDs / 8 frontend skills / 125 skill-name citations; script C 45
  forward pointers / 45 reverse rule-IDs across 5 iOS rule skills, 11 source docs (10
  `ios/docs/engineering/*.md` + `CLAUDE.md`), and 34 backlinks; **0 findings** from directions 1-4 of
  scripts A and B, and directions 1-2 of script C. Every count is a **floor**, not an equality — each
  rule added to a skill raises the corresponding script's forward-pointer count — so a run that checks
  far fewer has a broken regex, not a clean
  corpus. Report that as a finding too.
- Direction 5 reports six `SKILLNAME` findings on this tree until `BUG-008`'s dead skill names are
  corrected. That is the drift it was built to surface, not a checker fault; once those six are
  fixed the direction is silent and stays that way. Pragma only what genuinely trips the check —
  a needless exemption is the same silent loosening as a slack regex.

**Verified against five seeded mismatches** (each reverted after; a check never seen to fail is not
a verified check):

| Seed | Mutation | Expected |
|---|---|---|
| ID | `- **J-2**` → `- **J-2b**` in `frontend-design-rules` only | one `REVERSE` naming `J-2` |
| Budget | pad `frontend-a11y-rules` past 4,096 B | one `BUDGET` |
| Numeric | `4/12/24/56/80px` → `…/72px`, **every rule ID intact** | one `NUMERIC` + one `PINNED`, and the ID and budget assertions **stay silent** |
| Skill name | in a non-exempt scanned file, misspell one cited skill name (e.g. `frontend-page-rules` → `frontend-pages-rules`) | one `SKILLNAME` naming the file:line and the closest real skill, and directions 1-4 **stay silent** |
| iOS forward | append `-typo` to `ios-architecture-rules`' `#1-seven-layers` anchor (4 rules cite it) | four `FORWARD` findings, one per rule citing that anchor; script C alone flags it, A and B stay silent |
| iOS reverse | append a nonexistent `A-99` to `01-architecture.md`'s `→ skill: ios-architecture-rules A-3` backlink | one `REVERSE` naming `A-99`; forward direction and every other backlink stay silent |
| Missing skill | append `→ skill: <name> S-1` to a `base-server/docs/*.md`, `<name>` being a backend skill that does not exist | one `REVERSE  … cites missing skill <name>` from script A — **not** a traceback |

Collect all findings, dedupe, and rank (a `critical` is a rule broken in a way that ships a bug or breaks a gate). Report-only — surface a ranked list; the owning agent fixes.

## Dispatch discipline
- **Always pass an explicit `subagent_type`** from this agent's `Agent(...)` allow-list — an omitted type silently spawns `general-purpose` and produces weaker results; verify the spawned type.
- **Dispatch synchronously: pass `run_in_background: false` on every `Agent` call**, then await the batch inline. NEVER busy-wait on children with no-op Bash (`true`, `sleep`, `echo tick`) — every no-op turn replays your entire context for nothing. If a child was backgrounded by mistake, stop and wait for its completion notification; you are re-invoked automatically.
- **This is doubly required for `audit-checker`** — it holds the `LSP` tool, and a backgrounded subagent loses LSP access entirely in this Claude Code version, even though it's in its granted tool list.
