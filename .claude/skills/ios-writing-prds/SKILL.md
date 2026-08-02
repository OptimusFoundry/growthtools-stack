---
name: ios-writing-prds
description: Interactive PRD (product-requirements) authoring for the AITravel native iOS app. Use this whenever the user wants to spec a new iOS feature, write a PRD for a screen/flow, capture product requirements for the app, or is about to plan/build any net-new iOS feature — even if they just describe an idea without saying the word "PRD". It runs a short discovery interview (one question at a time), then writes docs/prds/<feature>.md and registers the feature as an epic in docs/TRACKER.md, ready for ios-plan-writer to turn into a contract-level plan. Do NOT use for a bug fix, a small visual tweak, or a single-screen/single-layer change that's describable in one sentence — those are XS/S and go straight to ios-plan-writer in fast mode, no PRD. This is the iOS-track counterpart to shared-writing-prds (backend); use that skill instead for base-server/ features.
---

# Writing PRDs — iOS

You are the **product front door** for the AITravel native app. A feature starts as a fuzzy idea in the
user's head; your job is to interview it into a precise, testable PRD that `ios-plan-writer` can turn
into a contract-level plan without guessing at intent.

This is the **one human-in-the-loop gate** in the iOS pipeline:

```
ios-writing-prds (you, interactive)  →  docs/prds/<feature>.md  +  epic row in docs/TRACKER.md
      ↓
ios-plan-writer (autonomous)   →  docs/plans/<feature>.md  (a ticket table under the epic)
      ↓
ios-plan-critic (M/L only)     →  GO / NEEDS-WORK, ≤2 revision rounds
      ↓
ios-supervisor (autonomous)    →  dispatches ios-*, runs the gates, commits
```

Because everything downstream runs without asking the user anything, the PRD is where all the product
and visual decisions get made. A vague PRD produces a confidently-wrong plan. Spend the questions.

## The two-tier model (why the tracker matters)

Think Jira. The PRD **is an epic**; the plan `ios-plan-writer` produces later holds the **tickets**
under it, indexed by `scripts/tickets sync` exactly like a backend plan. `docs/TRACKER.md` is the epic
board shared by both tracks — the single place to see every feature, backend or iOS, and where it is in
the pipeline. Your output creates the epic row at status **Spec'd**; later stages advance it
(`Planned` → `In progress` → `Shipped`). You own tier 1 only — never invent tickets or tasks, that's
`ios-plan-writer`'s job.

**A feature spanning both tracks gets two epics, not one.** If the ask needs both a `base-server/`
change and an iOS change (e.g. wiring a new endpoint into a new screen), register the iOS half as its
own epic and note the companion backend epic in its Feature-name prose (`"<Feature> (iOS half of
EP-0NN)"`). One epic, one plan file, one `Plan` cell — the ticket system can't resolve an epic split
across two files.

## Step 1 — Load context before asking anything

Two reasons: don't re-spec a screen/flow that already exists, and ask sharper questions because you
know the terrain.

1. Read `docs/TRACKER.md` if it exists — the existing epics. If the request overlaps one that's already
   `Shipped`, say so and confirm the user wants a change/extension rather than a new epic.
2. Read root `CLAUDE.md`'s "five non-negotiable rules" and skim `v2/mockups/screens/` so you know what
   screens and patterns already exist — new features almost always *compose* existing components and
   archetypes rather than inventing new ones.
3. Keep in mind the app's shape: four screens today (Home, Day, Place, Map) plus the fuzzy-stop
   mini-adventure register, a tab bar (Trip · Map · Saved · You), and the AppStore single-source
   architecture (`ios/docs/engineering/01-architecture.md`). A new feature's home in this structure is
   usually one of: a new screen, a new state on an existing screen, a new AppStore command, or a new
   design-system component.

If the user's request is actually a bug fix, a small visual tweak, or a change describable in one
sentence touching 1–2 files — **do not stop, hand off.** A PRD adds nothing there:

1. Say so, and send them straight to `ios-plan-writer` (it runs XS/S fast mode itself — no PRD, no
   critic, resolves placement with LSP).
2. If the change is genuinely epic-worthy but not product-shaped (a cross-cutting refactor, e.g. a
   navigation-architecture change), it still deserves a TRACKER row — file it as a `Change` row
   pointing straight at `ios-plan-writer`'s output, same status flow as an epic, no PRD required.

**Never** let a decline end with the user (or you) falling through to an unsupervised ad hoc build.
"Not a PRD" means "different door", not "no harness."

## Step 2 — Interview, one question at a time

Ask **one question per message** and wait for the answer. Batching questions makes the user skim and
answer shallowly; one at a time keeps them thinking. Prefer multiple-choice or "A or B?" framing. Adapt
to what they've already told you; skip anything already answered. Stop once you can write every section
below without a placeholder — usually 4–8 questions, not twenty.

Cover these dimensions (in roughly this order; merge or skip as the conversation allows):

- **The job-to-be-done** — what is the traveler trying to accomplish, and what's painful about today's
  flow? Get the *why*, not just the *what*.
- **Fuzzy or definitive?** — does this feature touch the fuzzy-stop register (a vibe + a window) or
  definitive stops (a place + a time)? This is the system's central design tension (root `CLAUDE.md`)
  and shapes almost every downstream decision.
- **Where it lives** — a new screen, a new state/sheet on an existing screen, a tab-bar change, or a
  backing AppStore/model change with no new UI? Naming the seam early prevents a plan that duplicates
  existing screens.
- **Core user stories** — the 2–5 concrete "As a traveler, I want to Y, so that Z" flows.
- **Non-goals** — what's explicitly out of scope for v1. Highest-leverage question; push for it.
- **Data** — new domain types, or new fields on existing ones (`Trip`/`Day`/`Stop`/`Place`/`Booking`)?
  Rough shape only; `ios-plan-writer` resolves exact signatures.
- **States** — what does empty / loading / error look like for this feature? The mockups mostly don't
  show error states, so this is usually a real decision, not a lookup.
- **Acceptance criteria** — how will we *know* it works? Drive toward testable, observable statements —
  these become the join key `ios-plan-writer` maps ticket rows against.

**When the user is unsure**, offer a sensible default and your reasoning rather than leaving it open
("I'd default to a bottom sheet rather than a new screen here, since it's a quick in-context action —
sound right?"). Record anything genuinely unresolved under **Open questions & assumptions** rather than
silently guessing.

## Step 3 — Write the PRD

Get today's date with `date +%Y-%m-%d`. Derive the next epic ID by scanning `docs/TRACKER.md` for the
highest `EP-0NN` across **both** tracks and adding one — epic numbering is shared, not per-track.
Slugify the feature name for the filename.

Write to `docs/prds/YYYY-MM-DD-<feature-slug>.md` using **exactly** this structure:

```markdown
# <Feature Name> — PRD

**Epic:** EP-0NN   **Status:** Spec'd   **Date:** YYYY-MM-DD   **Size:** XS|S|M|L

## Problem / why
<The traveler pain today and why it's worth solving. 2–4 sentences.>

## Fuzzy or definitive
<Which register this touches, or "neither" if it's pure infrastructure (AppStore/networking only).>

## Goals
<Bulleted outcomes this feature delivers.>

## Non-goals
<Explicitly out of scope for this version. Be specific — this bounds the plan.>

## User stories
- As a traveler, I want <capability>, so that <outcome>.

## Acceptance criteria
<Numbered, testable, observable. These are the contract ios-plan-writer maps tickets to.>
1. AC1 — <observable behaviour>
2. AC2 — …

## Screens & states touched
<Existing screens modified, or the new screen's top-level chrome (which TopBar style, whether it needs
a tab bar / CTA bar) + which mockup it ports. Empty/loading/error states per screen. Reference
design-docs archetypes and named mockups; no pixel specs.>

## Data surface (rough)
<New domain types or fields on Trip/Day/Stop/Place/Booking/etc; rough AppStore commands or endpoints.
Shape, not final signatures — ios-plan-writer resolves specifics.>

## Dependencies
<Existing screens/components/AppStore commands reused; any backend endpoint this needs (name the
companion epic if one exists).>

## Open questions & assumptions
<Anything unresolved, and the assumption you're proceeding on. Empty is fine if nothing's open.>
```

**Size — infer it, don't ask.** Confirm it in your Step 5 summary rather than adding an interview
question. It routes the whole pipeline exactly as in `ios-plan-writer`'s own sizing:

- **XS** — one-sentence diff, 1–2 files, single layer (shouldn't have reached here — see Step 1).
- **S** — single layer, or trivially thin cross-layer, ≤3 tickets expected.
- **M** — standard feature (model + endpoint + screen).
- **L** — cross-cutting refactor, novel architecture, 3+ layers (`ios-plan-writer` runs on opus, and
  the plan-critic gate is non-negotiable).

## Step 4 — Register the epic in the tracker

Update `docs/TRACKER.md` so the epic board reflects the new feature — it's the same table backend
epics use. Append (or update) the row for this feature at status **Spec'd**, linking the PRD path and
leaving Plan as `—`:

```markdown
| EP-0NN | <Feature Name> | docs/prds/YYYY-MM-DD-<slug>.md | — | Spec'd |
```

If you're revising a feature that already has an epic row, update that row instead of adding a
duplicate.

## Step 5 — Report

Tell the user, briefly:
- PRD path and epic ID, and the inferred **Size** (one line of reasoning so they can override it)
- Which register it touches (fuzzy / definitive / neither) and which existing screens it composes
- Any **Open questions** that still need their input before the build is safe
- The next step: **"Create/reuse a worktree, then run `ios-plan-writer` on this PRD."**

Don't offer to write the plan yourself — that's a separate, autonomous stage with its own agent. Your
deliverable is the epic and its PRD.
