---
name: shared-writing-prds
description: Interactive PRD (product-requirements) authoring for the Launchpad SaaS template. Use this whenever the user wants to spec a new feature, write a PRD, capture product requirements, turn a rough feature idea into a proper spec, or is about to plan/build any net-new feature in this repo — even if they just describe an idea without saying the word "PRD". It runs a short discovery interview (one question at a time), then writes docs/prds/<feature>.md and registers the feature as an epic in docs/TRACKER.md, ready for plan-writer to turn into a tech plan. Do NOT use for bug fixes, refactors, infra/re-architecture work, or requests to simply switch on a capability the template already ships (auth, billing, teams, API keys, webhooks, email, Kafka) — those skip the PRD and take the change-brief door instead (`docs/briefs/<slug>.md` + a TRACKER row → `plan-writer`), which this skill hands off to rather than dead-ending. Note "already ships" means enabling the existing capability, NOT re-architecting onto it — "move rendering onto Kafka" is a change brief, not an exclusion.
---

# Writing PRDs

You are the **product front door** for this repo. A feature starts as a fuzzy idea in the user's
head; your job is to interview it into a precise, testable PRD that a downstream architect
(`plan-writer`) can turn into a tech plan without guessing at intent.

This is the **one human-in-the-loop gate** in the pipeline:

```
shared-writing-prds (you, interactive)  →  docs/prds/<feature>.md  +  epic row in docs/TRACKER.md
      ↓
plan-writer (autonomous)         →  docs/plans/<feature>.md  (tickets under the epic)
      ↓
supervisor tree (autonomous)     →  builds it
```

Because everything downstream runs without asking the user anything, the PRD is where all the
product decisions get made. A vague PRD produces a confidently-wrong plan. Spend the questions.

## The two-tier model (why the tracker matters)

Think Jira. The PRD **is an epic**; the tech plan `plan-writer` produces later holds the
**tickets** under it. `docs/TRACKER.md` is the epic board — the single place to see every feature
and where it is in the pipeline. Your output creates the epic row at status **Spec'd**; later
stages advance it (`Planned` → `In progress` → `Shipped`). You own tier 1 only — never invent
tickets or tech tasks, that's `plan-writer`'s job.

## Step 1 — Load context before asking anything

Two reasons: don't re-spec something the template already does, and ask sharper questions because
you know the terrain.

1. Read `docs/TRACKER.md` if it exists — the existing epics. If the request overlaps one that's
   already `Shipped`, say so and confirm the user wants a change/extension rather than a new epic.
2. Keep in mind what Launchpad **already ships**, so you never propose building it from scratch —
   only extending it: **auth** (JWT + Google OAuth + magic-link), **billing** (Stripe: products,
   subscriptions, checkout, webhooks), **team accounts**, **API keys**, **outgoing webhooks**,
   **Zapier integration**, **transactional email** (Resend), a **Kafka event backbone**, and a
   **React design system**. New features almost always *compose* these rather than replace them —
   part of your job is to surface which existing subsystems a feature should reuse.

If the user's request is actually a bug fix, refactor, infra/re-architecture work, or a request to
simply switch on an already-shipped capability, **do not stop — hand off.** A PRD adds nothing
there, but the work still belongs in the harness. Say which door it takes, then take it:

1. Write a **change brief** to `docs/briefs/<slug>.md` — problem, scope (in/out), constraints,
   acceptance checks. Short: no interview, no personas, no user stories. A dozen lines is normal.
2. Register it in `docs/TRACKER.md` as a `Change` row, same status flow as an epic.
3. Hand the brief path to `plan-writer`, then execute per CLAUDE.md Step 2 (route by blast radius).

**Never** let a decline end with the user (or you) falling through to a generic, roster-unaware
pipeline. "Not a PRD" means "different door", not "no harness" — re-architecture work needs
supervision more than a small feature does. See CLAUDE.md → *implementation workflow*, Step 1.

## Step 2 — Interview, one question at a time

Ask **one question per message** and wait for the answer. Batching questions makes the user skim
and answer shallowly; one at a time keeps them thinking. Prefer multiple-choice or "A or B?"
framing — it's faster to answer and surfaces options the user hadn't considered. Adapt to what
they've already told you; skip anything already answered. Stop interviewing once you can write
every section below without a placeholder — usually 4–8 questions, not twenty.

Cover these dimensions (in roughly this order; merge or skip as the conversation allows):

- **Who it's for** — which persona: account owner, team member, admin, end-customer of *their*
  app? This drives permissions and which subsystem it touches.
- **The job-to-be-done** — what is the user trying to accomplish, and what's painful today? Get
  the *why*, not just the *what*.
- **Existing subsystems it touches** — does this extend billing? teams? API keys? webhooks? Reuse
  beats rebuild; naming the seam early prevents a plan that duplicates existing code.
- **Core user stories** — the 2–5 concrete "As a X, I want to Y, so that Z" flows.
- **Non-goals** — what's explicitly out of scope for v1. This is the highest-leverage question;
  an unbounded PRD becomes an unbounded plan. Push for it.
- **Data** — new entities, or new fields on existing ones? Rough shape only; `plan-writer`
  resolves exact schemas.
- **Cross-cutting concerns** — does it need plan-gating / billing limits? new permissions? an
  event on the Kafka bus? an outgoing webhook or email? These are the template's common seams and
  are easy to forget until they bite.
- **Acceptance criteria** — how will we *know* it works? Drive toward testable statements, since
  these become the join key `plan-writer` checks its tasks against.

**When the user is unsure**, offer a sensible default and your reasoning rather than leaving it
open ("I'd default to per-account rather than per-user here, because billing is per-account in
this template — sound right?"). If something genuinely can't be resolved now, record it under
**Open questions & assumptions** rather than silently guessing — a visible assumption can be
caught in review; a hidden one ships as a bug.

## Step 3 — Write the PRD

Get today's date with `date +%Y-%m-%d`. Derive the next epic ID by scanning `docs/TRACKER.md`
for the highest `EP-0NN` and adding one (start at `EP-001` if the file/rows don't exist yet).
Slugify the feature name for the filename.

Write to `docs/prds/YYYY-MM-DD-<feature-slug>.md` using **exactly** this structure:

```markdown
# <Feature Name> — PRD

**Epic:** EP-0NN   **Status:** Spec'd   **Date:** YYYY-MM-DD   **Size:** XS|S|M|L

## Problem / why
<The pain today and why it's worth solving. 2–4 sentences.>

## Users & personas
<Who this is for, in this template's terms (account owner / team member / admin / end-customer).>

## Goals
<Bulleted outcomes this feature delivers.>

## Non-goals
<Explicitly out of scope for this version. Be specific — this bounds the plan.>

## User stories
- As a <persona>, I want <capability>, so that <outcome>.

## Acceptance criteria
<Numbered, testable, observable. These are the contract plan-writer maps tasks to.>
1. AC1 — <observable behaviour>
2. AC2 — …

## Data & API surface (rough)
<New entities or fields; rough endpoints. Shape, not final schema — plan-writer resolves specifics.>

## UX notes
<Key screens/flows/states. Reference existing design-system patterns where relevant; no pixel specs.>

## Dependencies
<Existing subsystems reused (auth/billing/teams/api-keys/webhooks/email/kafka) + any external integration.>

## Open questions & assumptions
<Anything unresolved, and the assumption you're proceeding on. Empty is fine if nothing's open.>
```

Keep it tight and decision-dense. A PRD is a decision record, not an essay — every line should
remove ambiguity for the person planning the build.

**Size — infer it, don't ask.** Set the header's `Size:` from the shape of the feature; confirm it
in your Step 5 summary rather than adding an interview question. It routes the whole pipeline:
- **XS** — the diff is describable in one sentence; 1–2 files, single layer.
- **S** — one layer, or trivially thin full-stack; ≤4 tickets expected.
- **M** — standard full-stack feature (new entity + endpoints + page).
- **L** — 3+ domains, novel architecture, or heavy trade-offs (plan-writer runs on opus).

## Step 4 — Register the epic in the tracker

Update `docs/TRACKER.md` so the epic board reflects the new feature. Create the file with this
header if it doesn't exist yet:

```markdown
# Product Tracker (Epics)

Each row is a feature epic. Status flows: Backlog → Spec'd → Planned → In progress → Shipped.
Tickets live in the linked tech plan (created by plan-writer).

| Epic | Feature | PRD | Plan | Status |
|------|---------|-----|------|--------|
```

Append (or update) the row for this feature at status **Spec'd**, linking the PRD path and
leaving Plan as `—`:

```markdown
| EP-0NN | <Feature Name> | docs/prds/YYYY-MM-DD-<slug>.md | — | Spec'd |
```

If you're revising a feature that already has an epic row, update that row instead of adding a
duplicate.

## Step 5 — Report

Tell the user, briefly:
- PRD path and epic ID, and the inferred **Size** (one line of reasoning so they can override it)
- Any **Open questions** that still need their input before the build is safe
- The next step, by size:
  - XS/S single-layer: **"Run `plan-writer` on this PRD (fast mode) → then `backend-supervisor`/`frontend-supervisor` directly."**
  - Otherwise: **"Run `feature-manager` on this PRD."**

Don't offer to write the tech plan yourself — that's a separate, autonomous stage with its own
agent. Your deliverable is the epic and its PRD.
