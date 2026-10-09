---
paths:
  - "webapp/src/**"
  - "webapp/e2e/**"
---

# webapp: which rules skill applies

Load the matching skill before writing or reviewing code here — `webapp/CLAUDE.md` is the summary, the skill is the contract.

| Touching | Skill |
|---|---|
| laying out or reshaping any screen (layout, sections, grid, spacing, type roles) | `quiet-app`, then the rule skill below |
| a route, page, tab, or page shell | `frontend-page-rules` + `frontend-composition-rules` |
| markup inside a page (cards, rows, forms, empty states) | `frontend-recipe-rules` |
| any `*.module.scss` or styling decision | `frontend-style-rules` |
| colour roles, type roles, density, shape and motion | `frontend-design-rules` |
| any UI surface or new API call — its Playwright spec + MSW handlers | `frontend-e2e-rules` |
| focus, labels, landmarks, contrast | `frontend-a11y-rules` |
| reviewing or auditing UI | `frontend-review-rules` |

Implementation goes through `frontend-supervisor` (or `frontend-code-editor` for a single surgical edit to non-test source), never inline.
