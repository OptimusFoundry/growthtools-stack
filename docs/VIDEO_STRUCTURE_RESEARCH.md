# Video Structure & Pacing Research

How professional cinematographers, motion designers, and ad creatives structure videos of different durations. This document provides frame-precise timing templates at 30fps for an AI system generating Remotion video ad configs.

**Frame rate reference:** All frame counts in this document are at **30fps**. 1 second = 30 frames.

---

## 1. The Science of Video Pacing

### Attention Span Data by Platform

| Platform | Initial Attention Window | Optimal Ad Length | Peak Engagement Duration | Auto-Play Sound |
|---|---|---|---|---|
| **TikTok** | 1–2 seconds | 15–45 seconds | 21–34 seconds | Sound ON |
| **Instagram Reels** | 1.5–3 seconds | 15–30 seconds | 20–25 seconds | Sound ON |
| **Instagram Feed** | 1.5–3 seconds | 6–15 seconds | Under 15 seconds | Sound OFF |
| **YouTube Pre-Roll** | 5 seconds (skip button) | 6s (bumper) or 15–30s | 15–30 seconds | Sound ON |
| **LinkedIn** | 2–3 seconds | 15–30 seconds | Under 30 seconds | Sound OFF |
| **Facebook Feed** | 1.3–2.5 seconds | 6–15 seconds | Under 15 seconds | Sound OFF |
| **Facebook Stories** | 1–2 seconds | 6–15 seconds | 6–10 seconds | Sound ON |
| **Pinterest** | 2–3 seconds | 6–15 seconds | 6–15 seconds | Sound OFF |

### How the Brain Processes Short-Form vs. Long-Form

- **Under 10 seconds:** The brain processes as a single "chunk" — one idea, one emotion, one action. No narrative arc needed. Works via pattern recognition and immediate emotional response.
- **10–15 seconds:** The brain can hold 2–3 distinct chunks. Enough for a setup-payoff structure but not a full story. Processing is still largely automatic/System 1.
- **15–30 seconds:** The brain switches to active processing. Viewers begin constructing a narrative. 3–5 chunks can be sequenced. This is where problem-solution structures become effective.
- **30–60 seconds:** Full narrative processing engages. The brain expects a beginning, middle, and end. Without structure, attention decays rapidly after the 15-second mark.

### Cuts/Transitions and Engagement

| Video Type | Cuts Per Minute (CPM) | Average Shot Length (ASL) | Notes |
|---|---|---|---|
| **Fast social ad** | 24–40 CPM | 1.5–2.5 seconds | TikTok, Reels, high-energy product ads |
| **Standard commercial** | 15–24 CPM | 2.5–4 seconds | TV spots, YouTube pre-roll |
| **Moderate brand content** | 10–15 CPM | 4–6 seconds | LinkedIn, professional demos |
| **Slow/cinematic** | 5–10 CPM | 6–12 seconds | Luxury brand, emotional storytelling |
| **Talking head** | 3–5 CPM | 12–20 seconds | Webinars, tutorials, interviews |

**Key insight:** Modern commercial ASL has dropped from 10 seconds in the 1960s to under 2 seconds in many current social ads. Scenes held on-screen for 1.5 seconds or longer are better recognized and recalled.

### Why Certain Durations Exist

| Duration | Origin | Psychology | Platform Use |
|---|---|---|---|
| **6 seconds** | YouTube bumper ad format; minimum for brand recall | Enough for 1 idea + brand impression. The brain can process a single visual message in 1.5–2s, so 6s fits 2–3 messages. | YouTube bumper, Facebook in-stream, Snapchat |
| **10 seconds** | TikTok short-form sweet spot; evolved from Vine (6s) | Allows hook + message + CTA as distinct beats. Short enough for near-100% completion. | TikTok, Reels, YouTube Shorts |
| **15 seconds** | TV standard (half of :30 spot); Instagram/TikTok ad unit | The minimum duration for a problem-solution narrative. Enough for 4–5 beats with breathing room. | Instagram, TikTok, TV, YouTube |
| **30 seconds** | Classic TV commercial unit since the 1970s | Full narrative arc (hook → problem → agitation → solution → proof → CTA). The "gold standard" for brand storytelling in ad format. | TV, YouTube, CTV/OTT, all platforms |
| **60 seconds** | Extended TV spot; YouTube/CTV pre-roll | Room for detailed storytelling, multiple proof points, emotional arcs. Mirrors a short film structure. | YouTube, CTV, LinkedIn long-form |

### The Hook Data

- **65%** of viewers who watch the first 3 seconds will continue to 10 seconds
- **45%** of those 3-second viewers will continue to 30 seconds
- TikTok videos maintaining 70–85% retention at 3 seconds get **2.2x more views**
- **63%** of top-performing TikTok ads convey the main message within the first 3 seconds
- Videos under 15 seconds achieve **92% completion rates**; 16–30s drops to **84%**; 31–60s drops to **68%**
- Strong Meta ad creative hits a 30–40% hook rate (3-second views / impressions)

---

## 2. 6-Second Video Structure (Bumper Ads)

**Total duration:** 6.0 seconds = **180 frames** at 30fps

### Format Rules

- YouTube bumper ads are exactly 6 seconds, non-skippable
- Must work without sound (auto-play muted on many placements)
- Over 70% of YouTube ad consumption is on mobile — use tight framing, large typography

### Beat Structure (2–3 Beats Maximum)

| Beat | Time | Frames | Purpose |
|---|---|---|---|
| **Beat 1: Visual Hook + Brand** | 0.0–2.0s | Frames 0–60 | Grab attention with bold visual. Show brand/logo within first 1 second (frames 0–30). |
| **Beat 2: Core Message** | 2.0–4.0s | Frames 60–120 | Deliver the single key message or value proposition. One sentence or bold visual statement. |
| **Beat 3: CTA + Brand Lock** | 4.0–6.0s | Frames 120–180 | Clear call-to-action with brand lockup. Hold for minimum 2 seconds (60 frames) so it registers. |

### What Must Be Communicated in 6 Seconds

- **One** idea only. Do not attempt features + pricing + URL + discount.
- Brand identity (logo visible for at least 2 seconds total)
- A single emotional or informational impression
- Optional: a CTA if the message allows it

### What to Cut vs. What to Keep

| Keep | Cut |
|---|---|
| Bold opening visual | Slow buildups or reveals |
| Brand in first second | Long logo animations |
| Single message/claim | Multiple selling points |
| Strong visual composition | Complex transitions |
| End card with CTA (2s hold) | Elaborate scene changes |

### Scene Breakdown

A 6-second video supports **1–3 scenes** maximum.

| Scenes | Duration Per Scene | Frames Per Scene | Use Case |
|---|---|---|---|
| 1 scene | 6.0s | 180 frames | Single powerful visual with text overlay progression |
| 2 scenes | 3.0s each | 90 frames each | Hook scene → message/CTA scene |
| 3 scenes | 2.0s each | 60 frames each | Rapid: visual → message → CTA (very fast paced) |

### Frame-by-Frame Timing Template (2-Beat Bumper)

```
Frames 0–6:      Opening visual enters (fast scale-in or wipe)
Frames 6–30:     Hero visual fully visible, brand mark appears
Frames 30–60:    Beat 1 holds — visual + brand registers
Frames 60–66:    Hard cut or fast transition (6 frames max)
Frames 66–120:   Core message text on screen
Frames 120–126:  Transition to end card (6 frames)
Frames 126–180:  CTA + brand lockup holds for 54 frames (1.8s)
```

### Frame-by-Frame Timing Template (3-Beat Bumper)

```
Frames 0–6:      Opening animation (scale, fade, or slam)
Frames 6–54:     Beat 1: Hook visual with brand (48 frames = 1.6s)
Frames 54–60:    Hard cut (instantaneous or 6-frame transition)
Frames 60–114:   Beat 2: Message/product visual (54 frames = 1.8s)
Frames 114–120:  Hard cut
Frames 120–180:  Beat 3: CTA + end card (60 frames = 2.0s)
```

---

## 3. 10-Second Video Structure

**Total duration:** 10.0 seconds = **300 frames** at 30fps

### Platform Context

- TikTok/Reels short-form sweet spot for high completion rates
- Near-universal completion when content is engaging (92%+ for under 15s)
- Social ads showing brand in the first second and product within first 3 seconds outperform others

### Beat Structure (3–4 Beats)

| Beat | Time | Frames | Purpose |
|---|---|---|---|
| **Beat 1: Hook** | 0.0–2.5s | Frames 0–75 | Attention-grabbing opening. Must stop the scroll. Bold visual, motion, or text slam. |
| **Beat 2: Message/Value** | 2.5–6.5s | Frames 75–195 | Core message delivery. Product reveal, key benefit, or main claim. |
| **Beat 3: Support/Proof** | 6.5–8.0s | Frames 195–240 | Optional: secondary proof point, feature callout, or social proof element. |
| **Beat 4: CTA** | 8.0–10.0s | Frames 240–300 | Clear call-to-action with brand lockup. Hold 2 seconds minimum. |

### Scene Breakdown

A 10-second video supports **2–4 scenes**.

| Scenes | Avg Duration | Avg Frames | Pacing Feel |
|---|---|---|---|
| 2 scenes | 5.0s each | 150 frames | Moderate: hook scene → message/CTA scene |
| 3 scenes | 3.3s each | ~100 frames | Standard: hook → message → CTA |
| 4 scenes | 2.5s each | 75 frames | Fast-paced: hook → feature → proof → CTA |

### Text Element Guidelines

- **Maximum 2–3 text elements** across 10 seconds
- Each text element on screen for minimum 1.5 seconds (45 frames)
- Maximum 6–8 words per text element at this pace
- Allow 15 frames (0.5s) between text changes for the eye to reset

### Transition Timing

- Use hard cuts between scenes (0 frames, instantaneous)
- If using transitions, maximum 8–10 frames (0.27–0.33s)
- Transition duration must not exceed 15% of shortest adjacent scene

### Frame-by-Frame Timing Template

```
Frames 0–8:      Hook animation enters (scale-in, slam, or wipe)
Frames 8–75:     Beat 1: Hook visual holds (67 frames = 2.23s)
Frames 75–80:    Hard cut or 5-frame transition
Frames 80–195:   Beat 2: Core message/product (115 frames = 3.83s)
Frames 195–200:  Hard cut or 5-frame transition
Frames 200–240:  Beat 3: Proof/support point (40 frames = 1.33s)
Frames 240–245:  Transition to CTA
Frames 245–300:  Beat 4: CTA + brand lockup (55 frames = 1.83s)
```

### 10-Second Structures by Type

**Product Teaser:**
```
0–2.5s (0–75):   Bold product shot with motion
2.5–7s (75–210): Product name + one key benefit text
7–10s (210–300): "Learn more" CTA + brand
```

**Announcement:**
```
0–2s (0–60):     Attention text ("NEW" / "Just launched")
2–7s (60–210):   What's new — visual + supporting text
7–10s (210–300): Where to find it + CTA
```

**Before/After:**
```
0–1s (0–30):     "Before" state with label
1–5s (30–150):   Quick transition, "After" state reveal
5–8s (150–240):  Result/benefit text overlay
8–10s (240–300): CTA + brand
```

---

## 4. 15-Second Video Structure

**Total duration:** 15.0 seconds = **450 frames** at 30fps

### Platform Context

- Instagram and TikTok standard ad length
- The classic TV :15 spot, adapted for social
- First duration that supports a true problem-solution narrative
- Completion rate still high at ~90% for engaging content

### Beat Structure (4–5 Beats)

| Beat | Time | Frames | Purpose |
|---|---|---|---|
| **Beat 1: Hook** | 0.0–2.5s | Frames 0–75 | Immediate attention grab. Visual hook or provocative text. |
| **Beat 2: Problem/Context** | 2.5–5.5s | Frames 75–165 | Establish the problem, need, or context. Why the viewer should care. |
| **Beat 3: Solution/Product** | 5.5–10.0s | Frames 165–300 | Introduce the solution. Product reveal, feature highlight, or key benefit. This is the longest beat — the "meat" of the ad. |
| **Beat 4: Proof/Support** | 10.0–12.5s | Frames 300–375 | Social proof, data point, testimonial snippet, or feature #2. |
| **Beat 5: CTA** | 12.5–15.0s | Frames 375–450 | Clear call-to-action with brand lockup. Hold 2–2.5 seconds. |

### Scene Breakdown (3–5 Scenes)

| Scenes | Avg Duration | Avg Frames | Pacing Feel |
|---|---|---|---|
| 3 scenes | 5.0s each | 150 frames | Measured: hook → body → CTA |
| 4 scenes | 3.75s each | ~112 frames | Standard: hook → problem → solution → CTA |
| 5 scenes | 3.0s each | 90 frames | Dynamic: hook → problem → solution → proof → CTA |

### How Pacing Differs from 10s

- 15 seconds provides room for a "problem" beat before the solution — the key structural addition
- Scenes can breathe more: 3–5 seconds per scene vs. 2.5–3.3 seconds in a 10-second ad
- You can include one more text element (3–4 total vs. 2–3 in 10s)
- Transitions can be slightly longer: 8–12 frames vs. 6–10 frames in a 10-second ad

### Frame-by-Frame Timing Template

```
Frames 0–8:      Hook animation enters
Frames 8–75:     Beat 1: Hook visual + text (67 frames = 2.23s)
Frames 75–82:    Transition (7 frames)
Frames 82–165:   Beat 2: Problem/context scene (83 frames = 2.77s)
Frames 165–172:  Transition (7 frames)
Frames 172–300:  Beat 3: Solution/product (128 frames = 4.27s)
Frames 300–307:  Transition (7 frames)
Frames 307–375:  Beat 4: Proof/support (68 frames = 2.27s)
Frames 375–382:  Transition to CTA (7 frames)
Frames 382–450:  Beat 5: CTA + brand lockup (68 frames = 2.27s)
```

### 15-Second Structures by Type

**Product Launch:**
```
0–2.5s (0–75):     "Introducing..." text slam or reveal
2.5–5s (75–150):    Product hero shot with key feature
5–10s (150–300):    2–3 feature callouts (rapid sequence)
10–12.5s (300–375): Price/availability or social proof
12.5–15s (375–450): CTA + brand lockup
```

**Feature Highlight:**
```
0–3s (0–90):        Relatable problem statement (text or visual)
3–5.5s (90–165):    "There's a better way" pivot
5.5–10.5s (165–315): Feature demo/walkthrough
10.5–12.5s (315–375): Benefit statement
12.5–15s (375–450):  CTA + brand lockup
```

**Testimonial:**
```
0–2s (0–60):        Attention-grabbing quote snippet
2–5s (60–150):      Who is this person + context
5–11s (150–330):    Key testimonial content
11–13s (330–390):   Result/outcome visual
13–15s (390–450):   CTA + brand lockup
```

**Sale/Promo:**
```
0–2s (0–60):        Bold discount/offer text slam
2–5s (60–150):      What's on sale (product visual)
5–9s (150–270):     Key product benefits (2 quick points)
9–12s (270–360):    Urgency element ("Limited time" / countdown)
12–15s (360–450):   CTA with offer code + brand
```

---

## 5. 30-Second Video Structure

**Total duration:** 30.0 seconds = **900 frames** at 30fps

### The Classic Commercial Format

The 30-second spot has been the gold standard of advertising since the 1970s. It is the minimum duration for a full narrative arc and remains the most common ad unit across TV, CTV/OTT, and YouTube.

**Word count:** At 2.5 words per second, a 30-second ad fits 65–85 words of voiceover. For text-only (on-screen), aim for 35–50 words total across all text elements.

### Beat Structure (6–8 Beats)

| Beat | Time | Frames | Purpose |
|---|---|---|---|
| **Beat 1: Hook** | 0.0–3.0s | Frames 0–90 | Stop the scroll. Bold visual or text. Must work in first 1.5s for social. |
| **Beat 2: Problem** | 3.0–8.0s | Frames 90–240 | Establish the problem or pain point. Make the viewer nod along. |
| **Beat 3: Agitation** | 8.0–13.0s | Frames 240–390 | Deepen the problem. Show consequences or frustration. Raise the stakes. |
| **Beat 4: Solution** | 13.0–20.0s | Frames 390–600 | Product/service reveal. Show how it solves the problem. The longest beat. |
| **Beat 5: Proof** | 20.0–25.0s | Frames 600–750 | Evidence: testimonial, data point, demo result, social proof. |
| **Beat 6: CTA** | 25.0–30.0s | Frames 750–900 | Call-to-action with brand lockup. Hold 3–5 seconds. |

### Extended 8-Beat Variant

| Beat | Time | Frames | Purpose |
|---|---|---|---|
| **Hook** | 0–2.5s | 0–75 | Visual hook |
| **Problem** | 2.5–6s | 75–180 | Pain point |
| **Agitation** | 6–10s | 180–300 | Deepen problem |
| **Pivot** | 10–12s | 300–360 | "But what if..." transition |
| **Solution** | 12–18s | 360–540 | Product introduction |
| **Feature/Demo** | 18–22s | 540–660 | Key feature in action |
| **Proof** | 22–26s | 660–780 | Social proof / result |
| **CTA** | 26–30s | 780–900 | Call-to-action + brand |

### Scene Breakdown (5–8 Scenes)

| Scenes | Avg Duration | Avg Frames | Pacing Feel |
|---|---|---|---|
| 5 scenes | 6.0s | 180 frames | Measured, deliberate — brand storytelling |
| 6 scenes | 5.0s | 150 frames | Standard commercial pacing |
| 7 scenes | 4.3s | ~129 frames | Dynamic, fast-paced |
| 8 scenes | 3.75s | ~112 frames | Rapid, montage-style |

### The "Golden Ratio" of 30-Second Ads

- Show the product/brand between seconds 10–15 (frames 300–450) — the midpoint
- Do NOT wait until the end to reveal what you are selling
- The product should be visible for at least 40% of total runtime (12+ seconds)
- The CTA should hold for a minimum of 3 seconds (90 frames), ideally 4–5s

### Maintaining Attention Across 30 Seconds

1. **Pacing acceleration:** Scenes should get progressively shorter toward the end. Start with 5–6s scenes, end with 3–4s scenes.
2. **Visual variety:** Change background, angle, or composition every scene. Never hold the same visual for more than 6 seconds.
3. **Energy curve:** Low energy hook (curiosity) → build energy through problem/agitation → peak energy at solution → sustained energy through proof → decisive energy at CTA.
4. **Text variation:** Alternate between text-heavy and visual-heavy scenes. Never use the same text style for two consecutive scenes.

### Frame-by-Frame Timing Template (6-Beat)

```
Frames 0–10:     Hook animation enters (scale, slide, or slam)
Frames 10–90:    Beat 1: Hook scene (80 frames = 2.67s)
Frames 90–97:    Transition (7 frames)
Frames 97–240:   Beat 2: Problem scene (143 frames = 4.77s)
Frames 240–248:  Transition (8 frames)
Frames 248–390:  Beat 3: Agitation scene (142 frames = 4.73s)
Frames 390–400:  Transition (10 frames — slightly longer for "pivot" effect)
Frames 400–600:  Beat 4: Solution scene (200 frames = 6.67s)
Frames 600–608:  Transition (8 frames)
Frames 608–750:  Beat 5: Proof scene (142 frames = 4.73s)
Frames 750–758:  Transition (8 frames)
Frames 758–900:  Beat 6: CTA + brand lockup (142 frames = 4.73s)
```

### 30-Second Structures by Type

**Brand Story:**
```
0–3s (0–90):       Relatable human moment (emotional hook)
3–8s (90–240):     The struggle/challenge
8–13s (240–390):   The turning point
13–20s (390–600):  The brand/product as enabler
20–25s (600–750):  Transformed outcome / new reality
25–30s (750–900):  Brand message + CTA
```

**Product Demo:**
```
0–3s (0–90):       Problem visualization
3–7s (90–210):     "What if there was a better way?"
7–13s (210–390):   Product intro + primary feature demo
13–19s (390–570):  Secondary feature + benefit
19–24s (570–720):  Result / before-after comparison
24–30s (720–900):  Pricing/offer + CTA + brand
```

**Testimonial Compilation:**
```
0–2.5s (0–75):     Bold claim text (the result)
2.5–7s (75–210):   Testimonial 1 — key quote + attribution
7–12s (210–360):   Testimonial 2 — different angle/benefit
12–17s (360–510):  Testimonial 3 — result/data point
17–22s (510–660):  Product hero shot with benefit summary
22–26s (660–780):  Social proof (rating, user count, awards)
26–30s (780–900):  CTA + brand lockup
```

**Explainer/SaaS:**
```
0–3s (0–90):       Pain point question or statement
3–7s (90–210):     Why current solutions fail
7–10s (210–300):   "Introducing [Product]"
10–17s (300–510):  How it works (3 quick steps)
17–22s (510–660):  Key differentiator / unique benefit
22–26s (660–780):  Social proof or result
26–30s (780–900):  CTA + brand lockup
```

---

## 6. 60-Second Video Structure

**Total duration:** 60.0 seconds = **1800 frames** at 30fps

### When 60 Seconds Makes Sense

- Product walkthroughs requiring multiple feature demos
- Brand films with emotional narrative arcs
- Multi-feature SaaS demos
- Testimonial long-form or case study summaries
- YouTube pre-roll / CTV placements where longer format is expected

### When to Cut to 30 Seconds Instead

- If the core message can be delivered in under 25 seconds
- If completion rate data shows drop-off before 40 seconds
- If the platform penalizes longer content (Facebook feed, Instagram feed)
- If there are fewer than 4 distinct points to make

### Beat Structure (10–15 Beats)

| Beat | Time | Frames | Purpose |
|---|---|---|---|
| **Hook** | 0–3s | 0–90 | Attention grab — strongest visual or claim |
| **Problem Setup** | 3–8s | 90–240 | Establish the world and the pain point |
| **Problem Deepening** | 8–14s | 240–420 | Show consequences, multiple pain dimensions |
| **Pivot/Transition** | 14–17s | 420–510 | "But what if..." or "There's a better way" |
| **Solution Intro** | 17–23s | 510–690 | Product/brand reveal — first look |
| **Feature 1** | 23–28s | 690–840 | Primary feature or benefit |
| **Feature 2** | 28–33s | 840–990 | Second key feature or benefit |
| **Feature 3** | 33–38s | 990–1140 | Third feature or supporting benefit |
| **Social Proof** | 38–43s | 1140–1290 | Testimonial, rating, case study snippet |
| **Emotional Beat** | 43–48s | 1290–1440 | Aspirational outcome — what life looks like with the product |
| **Re-hook** | 48–51s | 1440–1530 | Re-engage with energy spike (for viewers whose attention drifted) |
| **Offer/Value** | 51–55s | 1530–1650 | Pricing, offer, or value summary |
| **CTA** | 55–60s | 1650–1800 | Strong CTA with brand lockup — hold 5 seconds |

### Pacing Changes Over 60 Seconds

The pacing of a 60-second video follows a **wave pattern**, not a straight line:

```
Energy/Pace
▲
│    ╱╲        ╱──╲           ╱──╲
│   ╱  ╲      ╱    ╲         ╱    ╲
│  ╱    ╲    ╱      ╲       ╱      ╲╱──╲
│ ╱      ╲──╱        ╲─────╱            ╲──▶
│
└──────────────────────────────────────────── Time
 0s   10s    20s    30s    40s    50s    60s
 HOOK  PROBLEM  SOLUTION  FEATURES  PROOF  CTA
```

1. **0–10s: Fast start** — Quick cuts (2–3s scenes), high energy, hook the viewer
2. **10–20s: Moderate** — Slightly longer scenes (3–5s), establish the narrative
3. **20–35s: Slower middle** — Longer scenes (4–6s), demonstrate and explain
4. **35–45s: Re-accelerate** — Shorter scenes again (3–4s), build toward conclusion
5. **45–55s: Energy spike** — Quick proof points and offer (2–3s scenes)
6. **55–60s: Hold** — CTA holds steady for 5 seconds

### Scene Breakdown (8–15 Scenes)

| Scenes | Avg Duration | Avg Frames | Pacing Feel |
|---|---|---|---|
| 8 scenes | 7.5s | 225 frames | Deliberate, cinematic |
| 10 scenes | 6.0s | 180 frames | Standard commercial |
| 12 scenes | 5.0s | 150 frames | Dynamic, well-paced |
| 15 scenes | 4.0s | 120 frames | Fast-paced, montage-heavy |

### Frame-by-Frame Timing Template

```
Frames 0–10:       Hook animation enters
Frames 10–90:      Beat 1: Hook (80 frames = 2.67s)
Frames 90–97:      Transition
Frames 97–240:     Beat 2: Problem setup (143 frames = 4.77s)
Frames 240–248:    Transition
Frames 248–420:    Beat 3: Problem deepening (172 frames = 5.73s)
Frames 420–430:    Transition (10 frames — "pivot" moment)
Frames 430–510:    Beat 4: Pivot (80 frames = 2.67s)
Frames 510–520:    Transition
Frames 520–690:    Beat 5: Solution intro (170 frames = 5.67s)
Frames 690–698:    Transition
Frames 698–840:    Beat 6: Feature 1 (142 frames = 4.73s)
Frames 840–848:    Transition
Frames 848–990:    Beat 7: Feature 2 (142 frames = 4.73s)
Frames 990–998:    Transition
Frames 998–1140:   Beat 8: Feature 3 (142 frames = 4.73s)
Frames 1140–1150:  Transition
Frames 1150–1290:  Beat 9: Social proof (140 frames = 4.67s)
Frames 1290–1298:  Transition
Frames 1298–1440:  Beat 10: Emotional beat (142 frames = 4.73s)
Frames 1440–1447:  Transition
Frames 1447–1530:  Beat 11: Re-hook (83 frames = 2.77s)
Frames 1530–1537:  Transition
Frames 1537–1650:  Beat 12: Offer/value (113 frames = 3.77s)
Frames 1650–1658:  Transition
Frames 1658–1800:  Beat 13: CTA + brand lockup (142 frames = 4.73s)
```

---

## 7. Scene Duration Rules

### Minimum Scene Duration for Comprehension

| Content Type | Minimum Duration | Minimum Frames (30fps) | Rationale |
|---|---|---|---|
| **Visual only (no text)** | 1.0 second | 30 frames | Brain needs ~1s to register a new visual |
| **Visual + short text (1–3 words)** | 1.5 seconds | 45 frames | Eye must fixate on text after registering visual |
| **Visual + medium text (4–6 words)** | 2.0 seconds | 60 frames | Reading + comprehension time |
| **Visual + long text (7–12 words)** | 3.0 seconds | 90 frames | Reading at 3 words/second + comprehension buffer |
| **Data/chart/complex visual** | 3.5–5.0 seconds | 105–150 frames | Pattern recognition + interpretation time |

**Absolute minimum:** Never create a scene shorter than 0.5 seconds (15 frames). Below this, the brain cannot register content — it becomes subliminal.

### Maximum Scene Duration Before Attention Drops

| Video Duration | Max Scene Duration | Max Frames | Reasoning |
|---|---|---|---|
| **6 seconds** | 3.0 seconds | 90 frames | No single scene should exceed 50% of total |
| **10 seconds** | 4.0 seconds | 120 frames | Same visual for 40% of video feels static |
| **15 seconds** | 5.0 seconds | 150 frames | One-third rule — no scene over 33% |
| **30 seconds** | 7.0 seconds | 210 frames | Attention resets needed every 5–7 seconds |
| **60 seconds** | 8.0 seconds | 240 frames | Even the most compelling visual fades after 8s |

### Scene Duration Progression

Scenes should generally get **shorter** as the video progresses. This creates natural acceleration toward the CTA.

| Video Section | Scene Duration Guideline | Frame Range (30fps) |
|---|---|---|
| **Opening (first 25%)** | 3–5 seconds | 90–150 frames |
| **Middle (25–65%)** | 4–6 seconds | 120–180 frames |
| **Pre-CTA (65–85%)** | 2–4 seconds | 60–120 frames |
| **CTA (final 15%)** | Hold for full duration | Varies |

Exception: The middle section may use slightly longer scenes when demonstrating features or telling a story, because the viewer is already invested.

### Text Display Time Rules

| Word Count | Minimum Display | Frames (30fps) | Notes |
|---|---|---|---|
| 1–2 words | 1.0 second | 30 frames | Brand name, "NEW", single word |
| 3–4 words | 1.5 seconds | 45 frames | Short phrase or headline |
| 5–7 words | 2.0 seconds | 60 frames | One line of text |
| 8–10 words | 2.5 seconds | 75 frames | Short sentence |
| 11–15 words | 3.5 seconds | 105 frames | Full sentence — maximum for social video |
| 16–20 words | 4.5 seconds | 135 frames | Two lines — avoid in videos under 30s |
| 20+ words | 5.0+ seconds | 150+ frames | Only in 60s videos; consider breaking into multiple text elements |

**Formula:** Minimum display time = (word count / 3) + 0.5 seconds buffer. At 30fps: (word count / 3 + 0.5) * 30 frames.

### Reading Speed Reference

- **Average reading speed for video captions:** 150–200 words per minute (2.5–3.3 words per second)
- **Conservative design target:** 3 words per second (safe for all viewers)
- **Fast-paced social target:** 4 words per second (assumes younger, mobile-native audience)
- **Maximum comfortable speed:** 180 words per minute (3 words per second) per captioning standards

### Hold Time After Animation Completes

| Animation Type | Hold Time After Completion | Hold Frames (30fps) |
|---|---|---|
| Text entrance (slide, fade, scale) | 0.5–1.0 seconds | 15–30 frames |
| Product reveal | 1.0–2.0 seconds | 30–60 frames |
| Chart/data animation | 1.5–2.5 seconds | 45–75 frames |
| Logo reveal | 1.5–3.0 seconds | 45–90 frames |
| CTA appearance | 2.0–5.0 seconds | 60–150 frames |

**Rule:** The hold time after an animation completes should be at least equal to the animation duration itself. If a text slides in over 10 frames, hold the static result for at least 10 additional frames.

---

## 8. The Beat System

### What Is a "Beat"?

A **beat** is a distinct unit of information or emotion in a video. Each beat delivers one idea, creates one feeling, or makes one point. Beats are the fundamental building blocks of video structure.

A beat is NOT the same as a scene — a single scene can contain 1–2 beats, and a beat can span a scene transition (though this is rare in short-form).

### Beats Per Duration

| Duration | Seconds | Frames | Recommended Beats | Max Beats | Min Beat Duration |
|---|---|---|---|---|---|
| **6 seconds** | 6 | 180 | 2–3 | 3 | 1.5s (45 frames) |
| **10 seconds** | 10 | 300 | 3–4 | 5 | 1.5s (45 frames) |
| **15 seconds** | 15 | 450 | 4–5 | 6 | 2.0s (60 frames) |
| **30 seconds** | 30 | 900 | 6–8 | 10 | 2.5s (75 frames) |
| **60 seconds** | 60 | 1800 | 10–15 | 18 | 2.5s (75 frames) |

### Beat Types

| Beat Type | Purpose | Typical Duration | Typical Frames | Common Position |
|---|---|---|---|---|
| **Hook Beat** | Grab attention, stop the scroll | 1.5–3.0s | 45–90 | Always first |
| **Problem Beat** | Establish pain point / need | 2.5–5.0s | 75–150 | Second or third |
| **Agitation Beat** | Deepen the problem, raise stakes | 3.0–5.0s | 90–150 | After problem |
| **Pivot Beat** | Transition from problem to solution | 1.5–3.0s | 45–90 | Middle |
| **Solution Beat** | Reveal product/answer | 3.0–7.0s | 90–210 | Middle-to-late |
| **Feature Beat** | Highlight specific capability | 2.5–5.0s | 75–150 | After solution |
| **Proof Beat** | Evidence (testimonial, data, demo) | 2.5–5.0s | 75–150 | Late section |
| **Emotional Beat** | Aspirational outcome / feeling | 3.0–5.0s | 90–150 | Before or after proof |
| **Data Beat** | Statistics, numbers, metrics | 2.0–4.0s | 60–120 | After solution |
| **Urgency Beat** | Time pressure, scarcity | 2.0–3.0s | 60–90 | Just before CTA |
| **CTA Beat** | Call-to-action + brand lockup | 2.0–5.0s | 60–150 | Always last |

### Beat Sequencing for Maximum Impact

**The fundamental patterns:**

1. **Problem → Solution** (the core advertising pattern)
   - Problem Beat → Solution Beat
   - Duration: 5–10 seconds (150–300 frames)

2. **Claim → Proof** (the "1-2 punch")
   - Solution/Feature Beat → Proof/Data Beat
   - Duration: 4–8 seconds (120–240 frames)

3. **Setup → Payoff** (the curiosity pattern)
   - Hook Beat → Reveal/Solution Beat
   - Duration: 3–6 seconds (90–180 frames)

4. **PAS (Pain → Agitation → Solution)**
   - Problem Beat → Agitation Beat → Solution Beat
   - Duration: 8–15 seconds (240–450 frames)

**Recommended beat sequences by duration:**

| Duration | Recommended Sequence |
|---|---|
| 6s | Hook → CTA |
| 10s | Hook → Message → CTA |
| 15s | Hook → Problem → Solution → CTA |
| 30s | Hook → Problem → Agitation → Solution → Proof → CTA |
| 60s | Hook → Problem → Agitation → Pivot → Solution → Feature 1 → Feature 2 → Proof → Emotional → CTA |

### Beat Acceleration

Beats should get **shorter** as the video approaches its end. This creates a natural sense of momentum and urgency leading to the CTA.

**Beat length progression rule:**
- First beat (hook): 100% of average beat duration
- Middle beats: 100–120% of average (can be slightly longer for complex content)
- Pre-CTA beats: 70–80% of average
- CTA beat: Fixed at 2–5 seconds regardless of pattern

**Example for a 30-second video (avg beat = 4.3s):**
```
Beat 1 (Hook):      3.0s  =  90 frames  (70% of avg — hooks are always short)
Beat 2 (Problem):   5.0s  = 150 frames  (116% of avg)
Beat 3 (Agitation): 5.0s  = 150 frames  (116% of avg)
Beat 4 (Solution):  6.5s  = 195 frames  (151% of avg — longest beat)
Beat 5 (Proof):     4.0s  = 120 frames  (93% of avg — starting to accelerate)
Beat 6 (CTA):       5.0s  = 150 frames  (fixed CTA hold)
```

---

## 9. Transition Timing

### When to Use Hard Cuts vs. Transitions

| Scenario | Recommended Transition | Reasoning |
|---|---|---|
| **Scene to scene within same topic** | Hard cut (0 frames) | Maintains energy, feels seamless |
| **Topic/beat change** | Hard cut or fast wipe (6–8 frames) | Clean separation without slowing pace |
| **Emotional shift** | Crossfade/dissolve (12–20 frames) | Smooths emotional transition |
| **Time passage** | Dissolve (15–24 frames) | Universally understood as time skip |
| **Before/After reveal** | Wipe or slider (10–15 frames) | Creates dramatic comparison |
| **Final → CTA card** | Fade or dissolve (10–15 frames) | Signals "conclusion" to the brain |
| **Fast-paced montage** | Hard cuts only (0 frames) | Any transition slows the rhythm |
| **Problem → Solution pivot** | Longer transition (12–18 frames) | Marks a significant narrative shift |

### Transition Duration by Video Pace

| Pacing Category | Transition Duration | Frame Count (30fps) | Use For |
|---|---|---|---|
| **Ultra-fast** | 0 frames (hard cut) | 0 | TikTok, bumper ads, montages |
| **Fast-paced** | 4–8 frames | 0.13–0.27s | Social ads, product teasers |
| **Standard** | 8–12 frames | 0.27–0.40s | Standard commercials, explainers |
| **Moderate** | 12–18 frames | 0.40–0.60s | Brand stories, emotional content |
| **Slow/Cinematic** | 18–30 frames | 0.60–1.00s | Luxury brands, prestige films |

### The 15% Rule

**Transition duration should never exceed 15% of the shortest adjacent scene's duration.**

Examples:
- Scene A (90 frames) → Transition → Scene B (60 frames): Max transition = 60 * 0.15 = 9 frames
- Scene A (150 frames) → Transition → Scene B (120 frames): Max transition = 120 * 0.15 = 18 frames
- Scene A (45 frames) → Transition → Scene B (45 frames): Max transition = 45 * 0.15 = 6–7 frames

### Why Hard Cuts Are Often Better

1. **Speed:** Zero frames lost to transitions means more time for content
2. **Energy:** Hard cuts maintain momentum; transitions slow pacing
3. **Clarity:** Hard cuts create clear scene boundaries
4. **Modern feel:** Contemporary editing favors cuts over dissolves
5. **Mobile viewing:** On small screens, transitions can read as visual noise
6. **Performance:** Hard cuts are trivially implemented in Remotion (no interpolation needed)

**Recommendation for AI-generated videos:** Default to hard cuts. Only use transitions for specific narrative purposes (topic changes, emotional shifts, CTA entrances).

### Transition Budget Per Video

Total transition time should not exceed the following percentages of video duration:

| Duration | Max Total Transition Time | Max Transition Frames |
|---|---|---|
| 6s (180 frames) | 5% = 0.3s | 9 frames total |
| 10s (300 frames) | 5% = 0.5s | 15 frames total |
| 15s (450 frames) | 6% = 0.9s | 27 frames total |
| 30s (900 frames) | 7% = 2.1s | 63 frames total |
| 60s (1800 frames) | 7% = 4.2s | 126 frames total |

---

## 10. Pacing Templates (Frame-Precise at 30fps)

Each template provides exact frame numbers that an AI system can use directly to generate Remotion video configs.

---

### Template 1: "Bumper Ad" (6s / 180 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 75 | 75 | 2.50 | Hook | Bold product visual + brand mark. Strong motion entrance (scale-in or slam). | — |
| 2 | 75 | 120 | 45 | 1.50 | Message | Single value proposition text (max 5 words). | Hard cut |
| 3 | 120 | 180 | 60 | 2.00 | CTA | CTA text + brand lockup. Hold static. | Hard cut |

**Total scenes:** 3 | **Total transitions:** 0 frames (hard cuts) | **Effective content time:** 180 frames

---

### Template 2: "Before/After Transformation" (10s / 300 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 45 | 45 | 1.50 | Hook | "Before" label appears with problem visual. | — |
| 2 | 45 | 120 | 75 | 2.50 | Problem | "Before" state fully shown — pain/frustration/old way. | Hard cut |
| 3 | 120 | 135 | 15 | 0.50 | Pivot | Wipe or slider transition (the transformation moment). | Wipe (15 frames) |
| 4 | 135 | 225 | 90 | 3.00 | Solution | "After" state — transformed result with product. | — |
| 5 | 225 | 300 | 75 | 2.50 | CTA | CTA text + brand lockup. | Hard cut |

**Total scenes:** 5 | **Total transitions:** 15 frames (wipe) | **Effective content time:** 285 frames

---

### Template 3: "Quick Product Teaser" (10s / 300 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 75 | 75 | 2.50 | Hook | Product hero shot with bold motion entrance. Brand visible. | — |
| 2 | 75 | 195 | 120 | 4.00 | Feature | Key product benefit + supporting visual. 1–2 text lines. | Hard cut |
| 3 | 195 | 240 | 45 | 1.50 | Proof | Social proof element (rating, user count, or quote). | Hard cut |
| 4 | 240 | 300 | 60 | 2.00 | CTA | CTA + brand lockup with offer if applicable. | Hard cut |

**Total scenes:** 4 | **Total transitions:** 0 frames | **Effective content time:** 300 frames

---

### Template 4: "Sale/Promo" (15s / 450 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 60 | 60 | 2.00 | Hook | Bold discount text slam ("50% OFF" / "SALE"). High-energy motion. | — |
| 2 | 60 | 150 | 90 | 3.00 | Feature | Product visual with original → sale price comparison. | Hard cut |
| 3 | 150 | 255 | 105 | 3.50 | Feature | 2 key product benefits (rapid text + visual). | Hard cut |
| 4 | 255 | 345 | 90 | 3.00 | Urgency | "Limited time" / countdown / scarcity element. | 8-frame wipe |
| 5 | 345 | 450 | 105 | 3.50 | CTA | CTA with offer code, brand lockup. | Hard cut |

**Total scenes:** 5 | **Total transitions:** 8 frames | **Effective content time:** 442 frames

---

### Template 5: "Feature Highlight" (15s / 450 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 80 | 80 | 2.67 | Hook | Relatable problem statement — visual or text. | — |
| 2 | 80 | 165 | 85 | 2.83 | Problem | "Sound familiar?" / expand on pain point. | Hard cut |
| 3 | 165 | 310 | 145 | 4.83 | Solution | Feature demo — the product solving the problem. Longest scene. | 8-frame dissolve |
| 4 | 310 | 380 | 70 | 2.33 | Proof | Result or benefit statement with supporting visual. | Hard cut |
| 5 | 380 | 450 | 70 | 2.33 | CTA | CTA + brand lockup. | Hard cut |

**Total scenes:** 5 | **Total transitions:** 8 frames | **Effective content time:** 442 frames

---

### Template 6: "Problem-Solution" (15s / 450 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 75 | 75 | 2.50 | Hook | Provocative question or bold claim text. | — |
| 2 | 75 | 170 | 95 | 3.17 | Problem | Problem visualization — what's broken/frustrating. | Hard cut |
| 3 | 170 | 185 | 15 | 0.50 | Pivot | Quick transition beat — "But now..." or visual pivot. | 8-frame wipe |
| 4 | 185 | 330 | 145 | 4.83 | Solution | Product/solution reveal with key benefit. Longest scene. | — |
| 5 | 330 | 385 | 55 | 1.83 | Proof | Data point or testimonial snippet. | Hard cut |
| 6 | 385 | 450 | 65 | 2.17 | CTA | CTA + brand lockup. | Hard cut |

**Total scenes:** 6 | **Total transitions:** 8 frames | **Effective content time:** 442 frames

---

### Template 7: "Social Proof Montage" (15s / 450 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 60 | 60 | 2.00 | Hook | Big claim text: "Trusted by 10,000+" or bold result stat. | — |
| 2 | 60 | 135 | 75 | 2.50 | Proof | Testimonial 1 — quote + attribution. | Hard cut |
| 3 | 135 | 210 | 75 | 2.50 | Proof | Testimonial 2 — different benefit angle. | Hard cut |
| 4 | 210 | 285 | 75 | 2.50 | Proof | Testimonial 3 or aggregate rating/review score. | Hard cut |
| 5 | 285 | 370 | 85 | 2.83 | Solution | Product hero shot with benefit summary text. | Hard cut |
| 6 | 370 | 450 | 80 | 2.67 | CTA | CTA + brand lockup. | 8-frame dissolve |

**Total scenes:** 6 | **Total transitions:** 8 frames | **Effective content time:** 442 frames

---

### Template 8: "Product Launch" (30s / 900 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 80 | 80 | 2.67 | Hook | "Introducing..." text with dramatic entrance animation. | — |
| 2 | 80 | 210 | 130 | 4.33 | Emotional | The world before this product — the gap in the market. | Hard cut |
| 3 | 210 | 340 | 130 | 4.33 | Solution | Product reveal — hero shot with name and tagline. | 10-frame dissolve |
| 4 | 340 | 460 | 120 | 4.00 | Feature | Feature 1 — primary capability with visual. | Hard cut |
| 5 | 460 | 570 | 110 | 3.67 | Feature | Feature 2 — secondary capability. | Hard cut |
| 6 | 570 | 670 | 100 | 3.33 | Feature | Feature 3 — differentiator or unique aspect. | Hard cut |
| 7 | 670 | 770 | 100 | 3.33 | Proof | Social proof, early adopter quote, or pre-order count. | Hard cut |
| 8 | 770 | 900 | 130 | 4.33 | CTA | Availability, pricing, CTA + brand lockup. | 10-frame dissolve |

**Total scenes:** 8 | **Total transitions:** 20 frames | **Effective content time:** 880 frames

---

### Template 9: "Brand Story" (30s / 900 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 90 | 90 | 3.00 | Hook | Relatable human moment — emotional visual or question. | — |
| 2 | 90 | 240 | 150 | 5.00 | Problem | The struggle — what life looks like without the solution. | 12-frame dissolve |
| 3 | 240 | 370 | 130 | 4.33 | Agitation | The cost of inaction — emotional or financial stakes. | Hard cut |
| 4 | 370 | 400 | 30 | 1.00 | Pivot | Quick pivot moment — visual shift or "Then I found..." text. | Hard cut |
| 5 | 400 | 570 | 170 | 5.67 | Solution | Brand/product as the enabler — how things changed. | 12-frame dissolve |
| 6 | 570 | 700 | 130 | 4.33 | Emotional | The new reality — aspirational outcome visual. | Hard cut |
| 7 | 700 | 780 | 80 | 2.67 | Proof | Supporting proof (data, testimonial, result). | Hard cut |
| 8 | 780 | 900 | 120 | 4.00 | CTA | Brand message + CTA lockup. | 12-frame dissolve |

**Total scenes:** 8 | **Total transitions:** 36 frames | **Effective content time:** 864 frames

---

### Template 10: "Testimonial Compilation" (30s / 900 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 75 | 75 | 2.50 | Hook | Bold result claim text: "Users save 10 hours/week" or similar. | — |
| 2 | 75 | 225 | 150 | 5.00 | Proof | Testimonial 1 — quote text + name + photo/avatar. | Hard cut |
| 3 | 225 | 370 | 145 | 4.83 | Proof | Testimonial 2 — different benefit angle, different person. | Hard cut |
| 4 | 370 | 510 | 140 | 4.67 | Proof | Testimonial 3 — result/metric focused. | Hard cut |
| 5 | 510 | 640 | 130 | 4.33 | Solution | Product hero shot with summary of key benefits. | Hard cut |
| 6 | 640 | 750 | 110 | 3.67 | Data | Aggregate stats: "4.9 stars from 2,000+ reviews" type. | Hard cut |
| 7 | 750 | 900 | 150 | 5.00 | CTA | CTA + brand lockup. | 10-frame dissolve |

**Total scenes:** 7 | **Total transitions:** 10 frames | **Effective content time:** 890 frames

---

### Template 11: "SaaS Demo" (30s / 900 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 80 | 80 | 2.67 | Hook | Pain point question: "Tired of manual [X]?" or problem statement. | — |
| 2 | 80 | 210 | 130 | 4.33 | Problem | Why existing solutions fail — visual of old way/clunky tool. | Hard cut |
| 3 | 210 | 290 | 80 | 2.67 | Pivot | "Meet [Product Name]" — clean reveal transition. | 10-frame dissolve |
| 4 | 290 | 420 | 130 | 4.33 | Feature | Step 1 of how it works — UI screenshot or mockup with callout. | Hard cut |
| 5 | 420 | 530 | 110 | 3.67 | Feature | Step 2 — second key capability. | Hard cut |
| 6 | 530 | 630 | 100 | 3.33 | Feature | Step 3 — result/output of using the product. | Hard cut |
| 7 | 630 | 750 | 120 | 4.00 | Proof | Social proof: user quote, rating, or company logos. | Hard cut |
| 8 | 750 | 900 | 150 | 5.00 | CTA | CTA: "Start free trial" / "See demo" + brand lockup. | 10-frame dissolve |

**Total scenes:** 8 | **Total transitions:** 20 frames | **Effective content time:** 880 frames

---

### Template 12: "Full Product Walkthrough" (60s / 1800 frames)

| # | Start Frame | End Frame | Duration (frames) | Duration (s) | Beat Type | Content | Transition |
|---|---|---|---|---|---|---|---|
| 1 | 0 | 75 | 75 | 2.50 | Hook | Bold pain point or provocative stat. High-energy entrance. | — |
| 2 | 75 | 225 | 150 | 5.00 | Problem | The problem in detail — what users struggle with daily. | Hard cut |
| 3 | 225 | 375 | 150 | 5.00 | Agitation | Cost of the problem — time wasted, money lost, frustration. | Hard cut |
| 4 | 375 | 450 | 75 | 2.50 | Pivot | "There's a better way" — visual pivot or transition beat. | 12-frame dissolve |
| 5 | 450 | 600 | 150 | 5.00 | Solution | Product intro — what it is and what it does (overview). | — |
| 6 | 600 | 750 | 150 | 5.00 | Feature | Feature 1 — primary capability with UI/visual demo. | Hard cut |
| 7 | 750 | 900 | 150 | 5.00 | Feature | Feature 2 — second key capability. | Hard cut |
| 8 | 900 | 1050 | 150 | 5.00 | Feature | Feature 3 — third capability or workflow demo. | Hard cut |
| 9 | 1050 | 1170 | 120 | 4.00 | Feature | Feature 4 — unique differentiator or integration. | Hard cut |
| 10 | 1170 | 1320 | 150 | 5.00 | Proof | Testimonial or case study snippet with result. | 10-frame dissolve |
| 11 | 1320 | 1440 | 120 | 4.00 | Data | Key metrics: users, rating, uptime, time saved. | Hard cut |
| 12 | 1440 | 1530 | 90 | 3.00 | Emotional | Aspirational outcome — what life looks like with product. | Hard cut |
| 13 | 1530 | 1620 | 90 | 3.00 | Urgency | Limited offer, free trial period, or launch pricing. | Hard cut |
| 14 | 1620 | 1800 | 180 | 6.00 | CTA | Full CTA: action verb + URL/button + brand lockup. Hold 6s. | 10-frame dissolve |

**Total scenes:** 14 | **Total transitions:** 32 frames | **Effective content time:** 1768 frames

---

## 11. Platform-Specific Pacing

### Pacing Adjustment Matrix

The same content should be paced differently per platform. Below is a multiplier system applied to scene durations from the base templates above.

| Platform | Scene Duration Multiplier | Transition Style | Hook Window | CTA Hold | Special Notes |
|---|---|---|---|---|---|
| **TikTok** | 0.8x (faster) | Hard cuts only | 1.0–1.5s (30–45 frames) | 1.5–2.0s (45–60 frames) | Fastest pacing. Front-load all value. Sound-on optimization. |
| **Instagram Reels** | 0.9x (slightly faster) | Hard cuts + minimal wipes | 1.5–2.0s (45–60 frames) | 2.0–2.5s (60–75 frames) | Aesthetic focus. Slightly more breathing room than TikTok. |
| **Instagram Feed** | 1.0x (baseline) | Hard cuts + dissolves | 1.5–2.5s (45–75 frames) | 2.0–3.0s (60–90 frames) | Sound-off optimization. Bold text essential. |
| **YouTube** | 1.2x (slower) | All types allowed | 3.0–5.0s (90–150 frames) | 3.0–5.0s (90–150 frames) | Can afford slower pacing. More detail. Sound-on. |
| **LinkedIn** | 1.3x (measured) | Dissolves + fades | 2.0–3.0s (60–90 frames) | 3.0–5.0s (90–150 frames) | Professional, data-forward. Minimal flash. |
| **Facebook Feed** | 1.0x (baseline) | Hard cuts + dissolves | 1.3–2.0s (39–60 frames) | 2.0–3.0s (60–90 frames) | Auto-play muted. Thumb-stopping first frame critical. |
| **Facebook Stories** | 0.85x (faster) | Hard cuts + swipes | 1.0–1.5s (30–45 frames) | 1.5–2.0s (45–60 frames) | Full-screen, sound-on. Quick pacing. |

### Platform Scene Duration Examples (Using a 15s Base Template)

Base template has 5 scenes at: 2.5s, 2.5s, 5.0s, 2.5s, 2.5s

| Scene | Base (frames) | TikTok (0.8x) | Instagram Reels (0.9x) | YouTube (1.2x) | LinkedIn (1.3x) |
|---|---|---|---|---|---|
| Hook | 75 | 60 | 68 | 90 | 98 |
| Problem | 75 | 60 | 68 | 90 | 98 |
| Solution | 150 | 120 | 135 | 180 | 195 |
| Proof | 75 | 60 | 68 | 90 | 98 |
| CTA | 75 | 60 | 68 | 90 | 98 |
| **Total** | **450** | **360 (12s)** | **407 (13.6s)** | **540 (18s)** | **587 (19.6s)** |

Note: When applying multipliers, the total duration changes. For fixed-duration formats (like a 15s ad slot), compress or expand individual scenes proportionally while keeping the CTA at minimum hold time.

### How to Re-Pace the Same Content

1. **TikTok:** Remove the problem beat entirely. Go straight from hook to solution. Cut all transitions to hard cuts. Reduce CTA to 1.5 seconds. Front-load the product within 2 seconds.
2. **Instagram Reels:** Keep the problem beat but shorten it. Use 1–2 quick transitions. Ensure bold text works without sound.
3. **YouTube:** Add breathing room after each beat (15–20 extra frames). Allow a slower hook (viewers are committed after 5s skip window). Use transitions between major sections.
4. **LinkedIn:** Lengthen the problem and proof beats. Add data/statistic elements. Use a professional color palette. Include company logos in social proof. Use measured dissolve transitions.
5. **Facebook:** Design the first frame as if it is a static image (it will appear as a thumbnail). Make text large enough for mobile. Ensure the entire message is clear with sound off.

---

## 12. Common Pacing Mistakes

### 1. Starting Too Slow (Burying the Hook)

**The problem:** Spending 3+ seconds on a logo animation, brand intro, or atmospheric setup before delivering value.

**The data:** 65% of viewers who leave do so in the first 3 seconds. A slow start means most viewers never see the actual message.

**The fix:** Start with the most compelling visual or text in frame 1. Brand can appear alongside the hook, not before it. Move any logo animations to the end card.

| Duration | Maximum Time Before Hook Payoff |
|---|---|
| 6 seconds | 0.5s (15 frames) — hook must land almost immediately |
| 10 seconds | 1.0s (30 frames) |
| 15 seconds | 1.5s (45 frames) |
| 30 seconds | 2.5s (75 frames) |
| 60 seconds | 3.0s (90 frames) |

### 2. Uniform Scene Lengths (Monotonous Rhythm)

**The problem:** Every scene is exactly the same length (e.g., all 3-second scenes in a 15-second video). This creates a metronomic, predictable rhythm that the brain tunes out.

**The fix:** Vary scene lengths by at least 30%. If your average scene is 3 seconds, scenes should range from 2–5 seconds. The pattern should feel like natural speech rhythm, not a metronome.

**Bad pattern:** 3s – 3s – 3s – 3s – 3s (flat, predictable)
**Good pattern:** 2.5s – 3.5s – 4.5s – 2s – 2.5s (varied, builds and releases)

### 3. Too Much Text Per Scene

**The problem:** Cramming 15+ words into a single scene, requiring either too-fast reading or too-long display.

**The fix:** Maximum word count per scene:

| Scene Duration | Max Words | Max Characters |
|---|---|---|
| 1.5s (45 frames) | 3–4 words | ~20 characters |
| 2.0s (60 frames) | 5–6 words | ~30 characters |
| 3.0s (90 frames) | 7–9 words | ~45 characters |
| 4.0s (120 frames) | 10–12 words | ~60 characters |
| 5.0s (150 frames) | 12–15 words | ~75 characters |

### 4. Not Leaving Hold Time After Animations

**The problem:** Text slides in over 15 frames, then immediately cuts to the next scene. The viewer never gets to read the static result.

**The fix:** After any entrance animation completes, hold the static result for at least the same duration as the animation. If text takes 12 frames to appear, hold for at least 12 frames before transitioning.

**Minimum hold time formula:** Hold frames = max(animation duration, 15 frames)

### 5. Cramming Too Many Messages Into Short Formats

| Duration | Maximum Distinct Messages |
|---|---|
| 6 seconds | 1 message |
| 10 seconds | 1–2 messages |
| 15 seconds | 2–3 messages |
| 30 seconds | 3–4 messages |
| 60 seconds | 5–7 messages |

A "message" is a distinct idea the viewer must process and remember. Feature lists, pricing details, and multiple CTAs all count as separate messages.

### 6. Forgetting the CTA or Making It Too Brief

**The problem:** CTA appears in the final 0.5 seconds, or is absent entirely.

**The fix:** CTA minimum hold times:

| Duration | Minimum CTA Hold | Frames |
|---|---|---|
| 6 seconds | 1.5 seconds | 45 frames |
| 10 seconds | 2.0 seconds | 60 frames |
| 15 seconds | 2.0 seconds | 60 frames |
| 30 seconds | 3.0 seconds | 90 frames |
| 60 seconds | 5.0 seconds | 150 frames |

### 7. Making Every Scene the Same Energy Level

**The problem:** All scenes are high-energy, or all scenes are calm. This creates fatigue or boredom.

**The fix:** Vary energy across scenes. Use a pattern like:

```
HIGH (hook) → MEDIUM (problem) → LOW (empathy/pause) → HIGH (solution) → MEDIUM (proof) → HIGH (CTA)
```

The contrast between energy levels is what keeps attention, not sustained high energy.

### 8. Additional Mistakes

- **Ignoring sound-off viewers:** On Facebook and LinkedIn, 85% watch on mute. Every text element and visual must carry the full message without audio.
- **Using slow transitions in fast-paced videos:** A 1-second dissolve in a 10-second video wastes 10% of runtime on a transition that adds no information.
- **Placing the brand too late:** Brand should be visible within the first 2 seconds. Viewers who scroll past at second 3 should have already registered the brand.
- **Ignoring the aspect ratio:** Vertical (9:16) content should use the full vertical canvas. Leaving dead space at top/bottom wastes screen real estate on mobile.

---

## Quick Reference Card

### Frame Count Cheat Sheet (30fps)

| Duration | Total Frames |
|---|---|
| 0.5 seconds | 15 frames |
| 1.0 seconds | 30 frames |
| 1.5 seconds | 45 frames |
| 2.0 seconds | 60 frames |
| 2.5 seconds | 75 frames |
| 3.0 seconds | 90 frames |
| 4.0 seconds | 120 frames |
| 5.0 seconds | 150 frames |
| 6.0 seconds | 180 frames |
| 7.0 seconds | 210 frames |
| 8.0 seconds | 240 frames |
| 10.0 seconds | 300 frames |
| 15.0 seconds | 450 frames |
| 20.0 seconds | 600 frames |
| 30.0 seconds | 900 frames |
| 45.0 seconds | 1350 frames |
| 60.0 seconds | 1800 frames |

### Universal Rules Summary

| Rule | Value |
|---|---|
| Minimum scene duration | 1.0s / 30 frames (visual only); 1.5s / 45 frames (with text) |
| Maximum scene duration | 6–8s / 180–240 frames (depends on total video length) |
| Text reading speed target | 3 words per second |
| Minimum text display | (word count / 3 + 0.5) seconds |
| Post-animation hold | Equal to or greater than animation duration; minimum 15 frames |
| Transition budget | 5–7% of total video duration |
| Default transition | Hard cut (0 frames) |
| Hook must land by | Frame 45–90 (1.5–3.0 seconds) |
| Brand visible by | Frame 30–60 (1.0–2.0 seconds) |
| CTA minimum hold | 2–5 seconds depending on video length |
| Maximum messages per video | Roughly 1 message per 6–10 seconds of runtime |
| Scene length variation | Vary by at least 30% from average |
| Beat acceleration | Pre-CTA beats should be 70–80% of average beat duration |
