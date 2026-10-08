# Choosing components

Props are in each component's `.d.ts` (shipped in `dist/components/`). This page covers only choices that go wrong in practice. Each row names
the wrong option it prevents.

## Easily confused

| Need | Use | Not |
|---|---|---|
| main action | `Button` (ink primary), one per view | a molten button, a link styled as a button |
| go to a URL | `Link`, `ArrowLink`, `Button href` (routed by `linkComponent`) | `onClick` + `location.href`, a router `<Link>` wrapped round a quiet component |
| on/off that applies now | `Switch` | `Checkbox` + Save |
| delegation between off and always | `ProbabilityToggle` | three radios |
| a limit with a safe range | `ElasticSlider` | a validation message after the fact |
| an exact number | `Stepper` or number `TextField` | `Slider` |
| one of ≤ 5 | `Radio`, or `Tabs variant="enclosed"` as a segmented control | a dropdown hiding 3 options |
| one of a long or plain list | `Select size="sm"` | `Dropdown` |
| options with descriptions or icons | `Dropdown` | `Select` |
| switch views in place | `Tabs panels`, or `Tabs` + `TabPanel` | buttons toggling `display` |
| a status word | `Badge` (`dot`) or `StatusDot` | coloured text, a row tint |
| read-mostly rows | `Table` | `DataGrid` with every feature off |
| search, select and page | `DataGrid` | `Table` + a hand-built toolbar |
| an openable object in a grid | `Card` | `Card` as a generic box (see [sections.md](sections.md)) |
| a KPI in an app | `StatCard` | `Stat` (marketing) |
| a chart | `Sparkline`, `LineChart`, `BarChart`, `DonutChart` (share-of-total only), `NarratedChart` | a chart library, an image, a donut for anything else |
| a menu of actions | `DropdownMenu` | a `Popover` full of buttons |
| a hint | `Tooltip` | the `title` attribute |

## Feedback channel

| What happened | Use | Behaviour |
|---|---|---|
| the user's own action succeeded or failed | `toast({ title, status, action })` | auto-dismisses, max 3, never logged |
| a system event (build finished, invite received) | the notification drawer | stays until read |
| one page-wide condition (trial ending, degraded) | `Banner`, once per page | stays while the condition holds |
| a problem with the content beside it | `Alert` in that block | stays until resolved |
| a field is wrong | the field's `error` | on blur or submit |

Anything that must be acknowledged is never a toast.

## Destructive actions

Choose by reversibility, and say what will happen ("Deletes 14 projects and their builds"), never
"Are you sure?".

| Situation | Use |
|---|---|
| reversible (archive, pause, remove) | do it now, then `toast` with an Undo `action` (agent work: `Receipt` / `UndoRiver`) |
| irreversible, one small object | `Button variant="destructive"` → `Dialog size="sm"` |
| irreversible, large or many objects | `Approval` (before → after, how far it reaches, undo window) confirmed with `HoldButton` |
| one dangerous control in place | `HoldButton` |

Typing the name to confirm is only for deleting a workspace or account.

## Waiting, empty, error

| State | Use | Not |
|---|---|---|
| first load of a known layout | `Skeleton` shaped like the content | a page spinner |
| wait under ~1s | nothing | a flash of spinner |
| control busy | `Button loading` | a spinner elsewhere |
| long job with an estimate | `HonestButton`, `Progress`, `BorderProgress` on the thing being made | an indeterminate spinner |
| agent working | `AgentRun` | a spinner + toast |
| empty, nothing yet | `EmptyState` + one Create action, or `GhostFuture` | an empty table |
| empty, filtered | `EmptyState` + Clear filters | the "nothing yet" copy |
| a block failed | `Alert` in that block + retry `action`; the rest keeps working | a page-level error |
| offline / stale | last-known values with their age (`DecayingBadge`) + `Banner` | blanking the page |

Only one thing moves per surface.

## Agents

| Need | Use |
|---|---|
| the user states a goal in words | `IntentBar`: your code parses it; the bar shows the reading as editable `chips` before anything runs |
| show work in progress | `AgentRun`, where the outcome will land; the last step is a person |
| approve a plan | `Approval` + `HoldButton` |
| grant permissions | `ScopeGrant` (scopes, `durations`, `onRevoke`) |
| cap spend | `BudgetLeash` (it says what happens at the cap before it's reached); report spend with `CostMeter` |
| suggested edits | `DraftDiff`: Ship stays blocked while a hunk is pending |
| history and rollback | `Checkpoints`; a finished run → `RunScrubber` |
| record of what was done | `Receipt` (`undoable` only on lines that really reverse), `UndoRiver` |
| chat | `ChatThread` + `ChatMessage` + `ChatComposer`, with `ToolCall`, `CodeBlock`, `Attachment`, `PromptSuggestions` |

Every agent action leaves a `Receipt` or `Checkpoint`.

## Data trust

Show uncertainty where a decision depends on it, and nowhere else. A page full of doubt markers
reads as broken.

| Need | Use |
|---|---|
| a claim the system isn't sure of | `DoubtMarker` |
| where a number came from | `LineageChip` |
| a value with a range | `UncertaintyCell` (shared `domain` per column) |
| a fact that ages ("Verified") | `DecayingBadge` |
| unusual stretches in a series | `AnomalyRibbon` |
| alert thresholds | `ThresholdHandles` |

## Never reinvent

Overlays (`Dialog`, `Drawer`, `Popover`, `DropdownMenu`, `Tooltip`, `CommandPalette`), every form
control, `Tabs`, `Accordion`, `Table`, `DataGrid`, `Sidebar` (including its mobile drawer), every
chart, the chat set and `Toaster`. They carry keyboard, focus, ARIA and motion. Never rebuild them,
restyle them into another look, or swap in a third-party equivalent.

If a component lacks a feature, add it to quiet (`AGENTS.md`). A component only one product needs
lives in that product's repo, built on quiet tokens and BEM.

## Don't mix

- one control `size` per screen (`sm` in apps) and one density per surface
- `Table` and `DataGrid` in one block
- `Stat` in apps, or `StatCard` on the marketing site
- `Headline size="display"` in apps
- icon sets: quiet uses unicode glyphs through `Icon`. A product that needs more picks one thin
  stroke set in its theme.
