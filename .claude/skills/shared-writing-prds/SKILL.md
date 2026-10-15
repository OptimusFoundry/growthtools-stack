---
name: shared-writing-prds
description: Interactive PRD (product-requirements) authoring for the Aijira SaaS template. Use this whenever the user wants to spec a new feature, write a PRD, capture product requirements, turn a rough feature idea into a proper spec, or is about to plan/build any net-new feature in this repo — even if they just describe an idea without saying the word "PRD". It runs a short discovery interview (one question at a time), then writes docs/prds/<feature>.md and creates the feature's epic in Aijira (key in the PRD header), ready for plan-writer to turn into a tech plan. Do NOT use for bug fixes, refactors, infra/re-architecture work, or requests to simply switch on a capability the template already ships (auth, billing, teams, API keys, webhooks, email, Kafka) — those skip the PRD and take the change-brief door instead (`docs/briefs/<slug>.md` + an epic in Aijira → `plan-writer`), which this skill hands off to rather than dead-ending. Note "already ships" means enabling the existing capability, NOT re-architecting onto it — "move rendering onto Kafka" is a change brief, not an exclusion.
---

# Writing PRDs

You are the **product front door** for this repo. A feature starts as a fuzzy idea in the user's
head; your job is to interview it into a precise, testable PRD that a downstream architect
(`plan-writer`) can turn into a tech plan without guessing at intent.

This is the **one human-in-the-loop gate** in the pipeline:

```
shared-writing-prds (you, interactive)  →  docs/prds/<feature>.md  +  epic in Aijira (`tickets create epic`)
      ↓
plan-writer (autonomous)         →  docs/plans/<feature>.md  +  Ready tickets under the epic
      ↓
supervisor tree (autonomous)     →  builds it
```

Because everything downstream runs without asking the user anything, the PRD is where all the
product decisions get made. A vague PRD produces a confidently-wrong plan. Spend the questions.

## The two-tier model (why the epic matters)

Think Jira. The PRD **is an epic**; `plan-writer` later creates the **tickets** under it in
Aijira, the board where every feature and its place in the pipeline shows. You create the epic
and nothing else; its status is computed from its tickets (open → planned → in progress →
shipped), so nobody edits it by hand. You own tier 1 only — never invent tickets or tech tasks,
that's `plan-writer`'s job.

## Step 1 — Load context before asking anything

Two reasons: don't re-spec something the template already does, and ask sharper questions because
you know the terrain.

1. Look at the existing epics: `scripts/tickets next` (ready tickets in the product, by epic) and
   the product's epic list (`GET /api/public/products/<slug>/items?kind=epic` on Aijira, or its
   board). If the request overlaps an epic that is already `shipped`, say so and confirm the user
   wants a change/extension rather than a new epic.
2. Keep in mind what Aijira **already ships**, so you never propose building it from scratch —
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
2. Create its epic: `scripts/tickets create epic "<title>" --doc-path docs/briefs/<slug>.md`
   prints the bare key (`AIJ-12`); write `**Epic:** <KEY>` into the brief's header. A non-zero
   exit stops here — report the exit code, never fall back to a file.
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

Get today's date with `date +%Y-%m-%d`. Slugify the feature name for the filename. The epic key
comes from Aijira in Step 4; write the PRD with `**Epic:** <KEY>` filled in once you have it.

Write to `docs/prds/YYYY-MM-DD-<feature-slug>.md` using **exactly** this structure:

```markdown
# <Feature Name> — PRD

**Epic:** <KEY>   **Date:** YYYY-MM-DD   **Size:** XS|S|M|L

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
<Existing capabilities reused (auth/billing/teams/api-keys/webhooks/email/kafka) + prior epics + any external integration — as capabilities, never code paths.>

## Open questions & assumptions
<Anything unresolved, and the assumption you're proceeding on. Empty is fine if nothing's open.>
```

Keep it tight and decision-dense. A PRD is a decision record, not an essay — every line should
remove ambiguity for the person planning the build.

**A PRD never cites code.** No file paths, packages, function or type names, sibling-repo files,
libraries, test locations or test harnesses — not in Dependencies, not in ACs, not anywhere.
Name template capabilities as capabilities ("the template's outbound webhooks", "team roles"),
entities and endpoints as rough shape, and user-facing config keys where they are product
surface. How the build reuses template code and where tests go is `plan-writer`'s job, through
the plan's `**Mirrors:**`/`**Tests:**` lines and `plan-critic`. A PRD that pre-decides code placement bypasses that gate and goes stale.

**Size — infer it, don't ask.** Set the header's `Size:` from the shape of the feature; confirm it
in your Step 5 summary rather than adding an interview question. It routes the whole pipeline:
- **XS** — the diff is describable in one sentence; 1–2 files, single layer.
- **S** — one layer, or trivially thin full-stack; ≤4 tickets expected.
- **M** — standard full-stack feature (new entity + endpoints + page).
- **L** — 3+ domains, novel architecture, or heavy trade-offs (plan-writer runs on opus).

## Step 4 — Create the epic in Aijira

```bash
scripts/tickets create epic "<Feature Name>" --doc-path docs/prds/YYYY-MM-DD-<slug>.md
```

It prints the bare key (`AIJ-12`) on stdout. Put it in the PRD header as `**Epic:** <KEY>`. When
the command exits non-zero, stop and report the exit code to the user; never fall back to a file.

If you're revising a feature that already has an epic, keep its key and skip this step.

## Step 5 — Report

Tell the user, briefly:
- PRD path and epic key, and the inferred **Size** (one line of reasoning so they can override it)
- Any **Open questions** that still need their input before the build is safe
- The next step, by size:
  - XS/S single-layer: **"Run `plan-writer` on this PRD (fast mode) → then `backend-supervisor`/`frontend-supervisor` directly."**
  - Otherwise: **"Run `feature-manager` on this PRD."**

Don't offer to write the tech plan yourself — that's a separate, autonomous stage with its own
agent. Your deliverable is the epic and its PRD.
