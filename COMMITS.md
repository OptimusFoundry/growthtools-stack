# Commit Conventions

This repo follows [Conventional Commits](https://www.conventionalcommits.org/).
It isn't cosmetic — the prefix is a real signal consumed by
`base-server`'s commit classifier when it decides which pushes from
watched repos are worth running the capture + social-post pipeline on.

## Format

```
<type>(<scope>)?!?: <subject>
```

- `<type>` — required. One of the list below.
- `<scope>` — optional. Lowercase area name, e.g. `webapp`, `base-server`,
  `capture-worker`, `infra`.
- `!` — optional. Marks a breaking change.
- `<subject>` — required. Imperative, present-tense, no trailing period.

Example matrix:

```
feat(webapp): render attached media as a thumbnail grid
fix(base-server): handle empty capture output
perf(capture-worker): record video at 2× playback
chore(infra): bump terraform modules
ci: cache go builds on main
docs: add COMMITS.md
test(posts): cover publish retry path
refactor(auth): extract JWT parsing helper
style: run biome --write
build: upgrade to node 22
revert: feat(webapp) — pricing page regression
feat(billing)!: drop legacy /v1 endpoints
```

## Types and how the classifier reads them

| Type       | Signal to classifier        | Typical verdict |
| ---------- | --------------------------- | --------------- |
| `feat`     | User-visible new feature    | Likely kept     |
| `fix`      | User-visible bug fix        | Likely kept     |
| `perf`     | User-visible performance    | Sometimes kept  |
| `refactor` | Internal-only restructuring | Likely skipped  |
| `chore`    | Maintenance / tooling       | Likely skipped  |
| `ci`       | CI / workflow               | Skipped         |
| `docs`     | Docs only                   | Skipped         |
| `test`     | Tests only                  | Skipped         |
| `style`    | Lint / formatting           | Skipped         |
| `build`    | Build system                | Skipped         |
| `revert`   | Reverts a prior commit      | Depends on diff |

The classifier always reads the **diff** as well as the message — a
`feat:` that only touches tests will still be skipped, and a `chore:`
that actually ships a user-facing string change can still be picked up.
The convention is a helper, not a hard gate.

## Installing the commit-msg hook

The repo ships a `commit-msg` hook in `.githooks/` that validates the
format. Wire it into your clone once:

```bash
./.githooks/install.sh
```

That's equivalent to `git config core.hooksPath .githooks`. Undo with
`git config --unset core.hooksPath`.

Merge commits (`Merge ...`), revert commits (`Revert "..."`), and the
`fixup!`/`squash!` prefixes used by interactive rebase are all allowed
through untouched.

## Subject line style

- Imperative: "add pricing page", not "added" / "adds".
- No period at the end.
- Keep it under ~72 chars so `git log --oneline` stays readable.
- Scope in lowercase, single word preferred.
- Put the "why" in the body (line 3+), not the subject.

## Breaking changes

Append `!` after type/scope:

```
feat(billing)!: drop /v1 endpoints

BREAKING CHANGE: Subscribers on the v1 plan must upgrade before Apr 30.
```

The `BREAKING CHANGE:` footer is optional for this repo but helps
reviewers spot the change even when skimming.
