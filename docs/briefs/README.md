# Change Briefs

The **non-PRD door** into the harness.

`shared-writing-prds` covers net-new features. It deliberately declines refactors, infra work,
migrations, re-architecture, and non-trivial bugfixes — a PRD's personas and user stories add
nothing there. But that decline used to dead-end, and work would fall through to a generic,
roster-unaware pipeline. A change brief is the door it falls into instead.

**A brief is short.** No interview, no personas, no user stories. A dozen lines is normal. It
exists to give `plan-writer` a scope boundary and acceptance checks — nothing more.

## Flow

```
change brief (docs/briefs/<slug>.md)
        → scripts/tickets create epic "<title>" --doc-path docs/briefs/<slug>.md  (prints the key)
        → plan-writer  →  docs/plans/<slug>.md
        → route by blast radius (CLAUDE.md Step 2)
        → backend-supervisor / frontend-supervisor / feature-manager
```

Blast radius, not line count, picks the route. Work spanning two deployables is **M at minimum**,
however small each individual edit looks — cross-service contracts are where the expensive,
silent failures live.

## Template

```markdown
# <Title>

**Epic:** <KEY>
Date: YYYY-MM-DD
Type: refactor | infra | migration | bugfix | re-architecture
Services: base-server | webapp | render-service | …

## Problem
What is wrong or missing today, and what it costs. One paragraph.

## Scope
**In:** …
**Out:** … (be explicit — this is the boundary plan-writer will hold to)

## Constraints
Existing contracts that must not break; patterns to follow; migrations already taken.

## Acceptance checks
- [ ] Verifiable statements. What proves this is done?
```

The epic key goes in the header once `tickets create epic` prints it. A non-zero exit stops the
door there; there is no file to fall back to.

## Naming

`docs/briefs/YYYY-MM-DD-<slug>.md`, matching the PRD and plan conventions.
