# Content

The voice comes from the brand: **say the literal thing.** It should be confident, quiet, technical and honest.
Use the active voice and short sentences.

## Product UI vs marketing

| | Marketing site | Product UI |
|---|---|---|
| Voice | "we" (the studio) / "you" | plain imperative and labels; "you" when a sentence is needed |
| Foundry verbs (cast, forge, temper, stamp) | one per paragraph | **never.** Say "create", "build", "publish", "delete" |
| Headlines | end with a period, one italic accent phrase | page titles end with the molten period (PageHero adds it); no italic flourish needed |
| Roman numerals, serials ("01 / 14") | process steps, years (MMXXVI) | serials in mono labels only; no Roman numerals for data |

## Banned words

Never write: **AI-powered, AI-native, next-generation, seamless, delightful, empower, leverage, utilize,
scalable, solutions, game-changer, stay tuned.** Also avoid exclamation marks and emoji.

Name real things instead: "Claude drafts the reply", not "AI-powered replies". "Syncs every 5
minutes", not "seamless sync".

## Casing

- Sentence case for titles, buttons, menu items, tabs and labels: "Invite teammate", not "Invite Teammate".
- Mono labels (eyebrows, table headers, metadata) are ALL CAPS, which the components handle. Write them in
  sentence case in code.
- Product and agent names keep their own case: Sjocamp, Meerkat, Claude.

## Buttons and actions

- Start with a verb and name the object: "Pause 3 campaigns", "Delete workspace", "Send invite".
  Avoid "OK", "Submit", "Yes".
- A primary button says what it does. A confirmation repeats the action: the Dialog title is "Delete Anvil?" and the button
  is "Delete project", not "Confirm".
- Cancel is "Cancel". A reversible follow-up is "Undo".
- Show counts in the label when they matter: "Publish to 4,812 people".

## Empty states, help and errors

- **Empty:** what goes here, plus the one action that fills it. "No builds yet. Builds appear when you push to
  main." → "Connect repository".
- **Help text:** say the format or the consequence, not the field name again. "Used on invoices." /
  "Between 1 and 60 minutes."
- **Errors:** what happened, then what to do, with no blame and no codes unless they're useful to support.
  "Couldn't reach Stripe. Your card wasn't charged. Try again in a minute." For fields, write
  "Enter an email like ada@example.com", not "Invalid input".
- **Status honesty:** "Sjocamp is live. Meerkat is a prototype." Never claim something is done before it
  is. `HonestButton` and `AgentRun` exist for this.

## Numbers, dates, money

- Use `Intl.NumberFormat` / `Intl.DateTimeFormat` with the user's locale, and never concatenate by hand.
- Use tabular figures for anything that's compared (tables, StatCards, charts), which the components set.
- Use compact numbers in charts and KPIs ("13.2k"); show full numbers in tables and confirmations ("13,214").
- Money always has a currency: "$1,200.00" in invoices, "$13.2k" in KPIs. Ranges are written "$24–$35" with
  an en dash.
- Relative time for recent events ("2h ago", "3 days ago"), absolute time for anything older than a week
  and in audit views ("14 Oct 2026, 14:02"). Use 24-hour time in logs and the user's preference
  elsewhere.
- Durations: "~4s", "about 4 min left". Percentages: "71%", with no space.

## Agents and AI

- Name the actor: "Claude", "Meerkat", or the person's name. Say what it did and what it will do next.
- Write status as a fact, not an apology: "Stopped at the $40 cap." "Waiting for your approval."
- Don't anthropomorphise beyond the name. Avoid "Claude is thinking really hard…".
