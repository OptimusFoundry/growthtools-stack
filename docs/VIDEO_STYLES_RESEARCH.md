# Video Ad Creative Styles & Visual Language Reference

Comprehensive style guide for AI-driven video ad config generation. Each style profile is a complete "recipe" mapping a creative genre to specific presets, fonts, colors, and animation parameters from the system's preset libraries. When a user requests "make me a Nike-style video" or "I want a minimalist SaaS demo," the AI looks up the corresponding profile here and translates it into a concrete video config.

References:
- **Animation presets**: VIDEO_PRESETS.md
- **Font stacks**: TYPOGRAPHY_RESEARCH.md
- **Color palettes & gradients**: COLOR_RESEARCH.md
- **Ad structure & hooks**: VIDEO_AD_RESEARCH.md

---

## 1. Video Style Taxonomy

### Master Style List

| # | Style Name | Visual Signature | Emotional Tone | Typical Industries | Typical Duration | Marketing Goal |
|---|---|---|---|---|---|---|
| 1 | **Minimalist Premium** | White space, controlled motion, single focal point | Calm confidence, aspiration | Tech, consumer electronics, premium DTC | 15–30s | Awareness, brand |
| 2 | **High-Energy Athletic** | Fast cuts, impact frames, diagonal text, high contrast | Adrenaline, determination, power | Sports, fitness, athletic wear, energy drinks | 6–15s | Awareness, engagement |
| 3 | **Warm Lifestyle** | Soft colors, rounded fonts, approachable imagery | Comfort, trust, belonging | DTC, food, home goods, lifestyle | 15–30s | Consideration, brand |
| 4 | **Tech/SaaS Demo** | Dark mode, UI screenshots, feature callouts, clean grid | Intelligence, capability, precision | SaaS, dev tools, AI products | 15–45s | Consideration, conversion |
| 5 | **Bold Sale/Promo** | Large prices, urgent reds/yellows, countdown timers | Urgency, excitement, FOMO | E-commerce, retail, flash sales | 6–15s | Conversion |
| 6 | **Cinematic Brand** | Letterbox bars, slow motion, dramatic grading | Awe, prestige, emotion | Automotive, luxury, beverage, film | 30–60s | Awareness, brand |
| 7 | **UGC/Creator Style** | Raw, authentic, comment overlays, caption-forward | Trust, relatability, social proof | Any DTC, apps, supplements | 15–60s | Consideration, conversion |
| 8 | **Retro/Vintage** | Film grain, warm tones, retro fonts, light leaks | Nostalgia, warmth, authenticity | Food, music, fashion, events | 15–30s | Awareness, engagement |
| 9 | **Neon/Cyberpunk** | Dark backgrounds, neon glows, glitch effects | Edgy, futuristic, rebellious | Gaming, music, crypto, nightlife | 6–15s | Awareness, engagement |
| 10 | **Pastel/Soft** | Muted colors, gentle animations, lifted blacks | Calm, nurturing, gentle | Wellness, beauty, skincare, self-care | 15–30s | Awareness, consideration |
| 11 | **Corporate/B2B** | Professional blues, data charts, trust badges | Credibility, reliability, competence | Enterprise SaaS, finance, consulting | 30–60s | Consideration, conversion |
| 12 | **Playful/Fun** | Bouncy animations, bright colors, rounded forms | Joy, energy, friendliness | Children's brands, apps, gaming, social | 6–15s | Awareness, engagement |
| 13 | **Luxury/Fashion** | Elegant serifs, gold/black, slow reveals, negative space | Exclusivity, sophistication, desire | Fashion, jewelry, fine dining, real estate | 15–30s | Awareness, brand |
| 14 | **Editorial/Magazine** | Serif headlines, column layouts, wipe reveals | Authority, curation, intellect | Media, newsletters, publishers | 15–30s | Awareness, consideration |
| 15 | **Social Proof/Testimonial** | Review cards, star ratings, quote layouts | Trust, validation, confidence | Any product/service with reviews | 15–30s | Consideration, conversion |
| 16 | **Data/Stats Driven** | Large numbers, count-up animations, chart-like layouts | Authority, impact, evidence | Analytics, research, B2B, finance | 15–30s | Consideration |
| 17 | **Announcement/Launch** | Dramatic reveals, countdown, celebration effects | Excitement, anticipation, celebration | Product launches, events, milestones | 6–15s | Awareness |
| 18 | **Tutorial/How-To** | Step numbers, clear hierarchy, instructional layout | Clarity, helpfulness, competence | SaaS, education, cooking, DIY | 30–60s | Consideration, conversion |
| 19 | **Meme/Native Social** | Platform-native look, informal text, trend-aware | Humor, relatability, in-group belonging | Youth brands, apps, social commerce | 6–15s | Awareness, engagement |
| 20 | **Glassmorphism/Modern UI** | Frosted glass, blur effects, floating cards, gradient mesh | Innovation, polish, futurism | Tech, SaaS, fintech, design tools | 15–30s | Awareness, consideration |

### Goal-to-Style Mapping

| Marketing Goal | Primary Styles | Secondary Styles |
|---|---|---|
| **Brand Awareness** | Minimalist Premium, Cinematic Brand, High-Energy Athletic | Luxury/Fashion, Retro/Vintage, Neon/Cyberpunk |
| **Consideration** | Tech/SaaS Demo, Warm Lifestyle, Corporate/B2B, Editorial/Magazine | Data/Stats Driven, Tutorial/How-To, Glassmorphism |
| **Conversion** | Bold Sale/Promo, UGC/Creator Style, Social Proof/Testimonial | Announcement/Launch, Data/Stats Driven |
| **Engagement** | Playful/Fun, Meme/Native Social, High-Energy Athletic | Neon/Cyberpunk, Retro/Vintage |

---

## 2. Style Profiles

---

### Style 1: Minimalist Premium

**Visual Identity**: Defined by restraint. Vast white (or black) space with a single focal point per scene. Maximum three elements visible at any moment: product, tagline, logo. Inspired by Apple's motion design system — every pixel is intentional, every animation is spring-physics-driven. Text carries the narrative because imagery is minimal.

- **Color Palette**: `luxury-noir` for dark variant (black `#0A0A0A`, gold `#C9A96E`, ivory `#FFFFF0`). For light variant: white `#FFFFFF` background, text `#1A1A1A`, single accent color from brand.
- **Gradient Preset**: `Black Gold` (#30) for dark mode. For light: solid white `#FFFFFF` or `Arctic Frost` (#29) for subtle texture.
- **Typography**: Font stack **"Minimal Clean"** (Stack 11) — DM Sans 700 headlines, Inter 400 body. All text mixed-case. Letter-spacing +2% on headlines. Maximum 6 words per frame.
- **Animation Energy**: Low. Deliberate, measured. Scene holds of 3–5 seconds. No animation exists without purpose.
- **Preferred Animation Presets**: `scale-slam`, `pop-in`, `wipe-reveal`, `character-cascade`, `spring-settle`, `fade-up`
- **Preferred Transitions**: `soft-dissolve`, `wipe-reveal` (as transition concept — scene A fades, scene B wipes in)
- **Background Style**: Solid white `#FFFFFF` or solid black `#0A0A0A`. Never gradient for the primary background. Gradient only as a subtle accent element.
- **Pacing**: 2–3 cuts per 10 seconds. Scene duration 3–5 seconds. No scene shorter than 2 seconds.
- **Text Style**: Mixed-case, centered, generous line-height (1.0–1.1 for headlines). Position: dead center or upper-third. No text stroke, no shadow on solid backgrounds. Font weight 700 for headlines, 400 for body.
- **Element Count**: 1–2 elements per scene. One text block and optionally one product image. Never more than three.
- **Sound Design**: Ambient electronic pad, single piano note per beat, or pure silence with a bass thud on text entrances.
- **Best For**: Apple-style product reveals, premium brand awareness, high-end DTC, architecture, design studios.
- **Avoid**: Busy backgrounds, more than 2 fonts, gradients on text, decorative particles, emoji, ALL-CAPS headlines (except single words), countdown timers, price displays.
- **Example Scene Sequence (15s)**:
  1. **Scene 1 (0–4s)**: Black screen. Product name `character-cascade` reveals letter by letter. Hold.
  2. **Scene 2 (4–9s)**: `soft-dissolve` to white background. Product image centered with `product-float`. Tagline `spring-settle` below.
  3. **Scene 3 (9–13s)**: `soft-dissolve` to single feature word `scale-slam` on black. Hold 3s.
  4. **Scene 4 (13–15s)**: Logo `pop-in` centered. URL `fade-up` beneath. Hold.

---

### Style 2: High-Energy Athletic

**Visual Identity**: Explosive, aggressive, relentless. Every frame is pushed to maximum contrast. Text enters at extreme velocity and stops hard — no gentle easing, no floating. Inspired by Nike's motion system: impact frames flash between cuts, text sits on diagonals echoing athletic body positions, film grain adds raw texture. Visual rhythm is staccato — short bursts punctuated by single-frame flashes.

- **Color Palette**: `fitness-power` (Power Red `#DC2626`, Steel Black `#171717`, Energy Yellow `#FACC15`). Or high-contrast monochrome: pure black `#000000` + pure white `#FFFFFF` with a single neon accent.
- **Gradient Preset**: `Power Gradient` (#10) for backgrounds. Or solid black `#0A0A0A` — no gradient. Gradient only as an accent glow behind text.
- **Typography**: Font stack **"Bold Athletic"** (Stack 3) — Bebas Neue 400 headlines, Roboto 500 body. ALL-CAPS mandatory for headlines. Letter-spacing +3% on condensed caps. Maximum 3 words per frame.
- **Animation Energy**: Maximum. Animations complete in 5–10 frames. No animation exceeds 350ms.
- **Preferred Animation Presets**: `whip-text`, `stacked-slam`, `impact-frame`, `color-flash`, `text-slam`, `beat-pulse`, `gritty-texture`, `diagonal-text`
- **Preferred Transitions**: `whip-pan`, `clock-sweep-fast`, `glitch-cut`
- **Background Style**: Solid black or very dark with high-contrast text. Optional `film-grain` overlay at 25% opacity and `gritty-texture` for raw feel. `handheld-shake` on the entire composition for authenticity.
- **Pacing**: 6–10 cuts per 10 seconds. Scene duration 0.5–2 seconds. Sub-second scenes common in the hook.
- **Text Style**: ALL-CAPS, compressed bold (Bebas Neue), positioned on diagonal axes (15–30 degree rotation). Text frequently fills 70%+ of frame width. White text on black or yellow text on black. Stroke optional (3px black).
- **Element Count**: 1–2 per scene. One word or one image. Dense information is delivered through rapid sequencing, not simultaneous display.
- **Sound Design**: Heavy bass drops, staccato percussion hits synced to `impact-frame` flashes, aggressive electronic or hip-hop beat.
- **Best For**: Sports brands, fitness apps, athletic wear, energy drinks, motivational content, sneaker launches.
- **Avoid**: Serifs, gentle easing, pastel colors, long scene holds (>2s in hook), script fonts, rounded corners, decorative particles, slow crossfades.
- **Example Scene Sequence (10s)**:
  1. **Scene 1 (0–1.5s)**: `crash-zoom-in` on bold word "UNSTOPPABLE" with `impact-frame` flash. `gritty-texture` overlay.
  2. **Scene 2 (1.5–3s)**: `whip-pan` transition. Three words `stacked-slam` one per beat: "PUSH" / "HARDER" / "NOW"
  3. **Scene 3 (3–5.5s)**: `color-flash` cut. Product image full-bleed on black. `diagonal-text` with brand tagline.
  4. **Scene 4 (5.5–8s)**: Rapid 3-frame cuts between action shots with `color-flash` between each. `beat-pulse` on text overlay.
  5. **Scene 5 (8–10s)**: Logo `whip-text` from left. CTA `text-slam` beneath with `screen-shake` on landing.

---

### Style 3: Warm Lifestyle

**Visual Identity**: Approachable, soft, human. Colors are warm and desaturated — think golden hour photography translated to motion graphics. Typography is friendly and rounded, never compressed or aggressive. Animations are gentle: things pop in with soft springs, float upward, ease smoothly. The overall feeling is an invitation into a comfortable, aspirational life. DTC brands like Glossier, Oura, and Allbirds exemplify this aesthetic.

- **Color Palette**: `appetite-warm` for food brands (Tomato Red `#DC2626`, Golden Yellow `#F59E0B`, Fresh Green `#16A34A`) or warm neutrals: cream `#FFF8E1`, warm tan `#D4A373`, soft brown `#8D6E63`. Background: warm white `#FFF8E1` or light peach.
- **Gradient Preset**: `Warm Amber` (#26) or `Peach Sunset` (#27) or `Desert Dune` (#22) for earth-tone variants.
- **Typography**: Font stack **"Warm Lifestyle"** (Stack 2) — Montserrat 700 headlines, Lora 400 body, Caveat 700 for handwritten accents. Mixed-case. Generous spacing.
- **Animation Energy**: Low to medium. Animations take 400–700ms. Springs are soft (damping 14+, stiffness 120–180).
- **Preferred Animation Presets**: `fade-up`, `elastic-pop`, `split-word-cascade`, `bounce-caption`, `product-float`, `ken-burns`
- **Preferred Transitions**: `soft-dissolve`, `spring-slide-left`, `iris-bounce`
- **Background Style**: Light warm gradient (`Warm Amber`, `Peach Sunset`) or warm solid (`#FFF8E1`, `#FAF5EF`). Optional `ken-burns` on lifestyle photography. `film-look-warm` overlay for golden-hour feel.
- **Pacing**: 3–4 cuts per 10 seconds. Scene duration 2.5–4 seconds. Unhurried, breathing room between elements.
- **Text Style**: Mixed-case, Montserrat 700 for headlines at moderate size (not dominating the frame). Position: center or lower-third. Dark text `#3E2723` on light backgrounds. Optional Caveat handwritten accent for annotations or personal touches.
- **Element Count**: 2–3 per scene. Product image + headline + optional subtitle. Scenes feel composed but not sparse.
- **Sound Design**: Acoustic guitar, ukulele, soft piano, ambient nature sounds, warm female or male voiceover.
- **Best For**: DTC brands, food/beverage, home goods, lifestyle products, subscription boxes, pet products, personal care.
- **Avoid**: ALL-CAPS aggressive text, neon colors, glitch effects, fast cuts (<1s), black backgrounds, condensed/compressed fonts, angular shapes, countdown timers.
- **Example Scene Sequence (20s)**:
  1. **Scene 1 (0–5s)**: `ken-burns` on lifestyle photo. `fade-up` headline: "Made for your morning ritual." `film-look-warm` overlay.
  2. **Scene 2 (5–10s)**: `spring-slide-left` transition. Product `product-float` on warm gradient. Feature text `elastic-pop` staggered.
  3. **Scene 3 (10–16s)**: `soft-dissolve`. Testimonial quote in Lora italic with `split-word-cascade`. Star rating `proof-stack`.
  4. **Scene 4 (16–20s)**: Brand logo `fade-up`. CTA "Try it free" in `bounce-caption`. URL below.

---

### Style 4: Tech/SaaS Demo

**Visual Identity**: Dark, precise, information-dense but organized. Dark mode backgrounds (deep navy or near-black) with electric blue or mint accent colors. UI screenshots are the hero content — shown in device mockups or floating panels with feature callout labels connected by animated lines. Typography is clean, geometric, and technical. The aesthetic says "we built something powerful and we will show you exactly how it works."

- **Color Palette**: `tech-trust` (Electric Blue `#2563EB`, Slate `#475569`, Emerald `#10B981`, Deep Navy bg `#0F172A`). Or `indie-bold` for trendier SaaS (Vivid Violet `#8B5CF6`, Hot Coral `#FF6B6B`, Mint `#34D399`).
- **Gradient Preset**: `Midnight Ocean` (#1) or `Noir Premium` (#3) or `Cyber Space` (from mood gradients). For lighter variant: `Arctic Frost` (#29).
- **Typography**: Font stack **"Premium Tech"** (Stack 1) — Sora 700 headlines, Inter 400/500 body, Space Mono 400 for code/data accents. Or **"Indie Maker"** (Stack 7) for developer-focused products.
- **Animation Energy**: Medium. Smooth, purposeful. Animations take 300–600ms. Springs are crisp (stiffness 180–260, damping 14–18).
- **Preferred Animation Presets**: `fade-up`, `slide-from-left`, `typewriter`, `feature-callout`, `numbered-steps`, `wipe-reveal`, `pop-in`
- **Preferred Transitions**: `spring-slide-left`, `soft-dissolve`, `zoom-through`
- **Background Style**: Dark gradient (`Midnight Ocean`, `Noir Premium`). UI screenshot panels float on the dark background with subtle `bokeh-drift` or `floating-orbs` at very low opacity for ambient depth. Optional `hex-grid` or `mesh-morph` as subtle animated background texture.
- **Pacing**: 3–4 cuts per 10 seconds. Scene duration 3–5 seconds. Feature callout scenes can hold 4–5 seconds for readability.
- **Text Style**: Mixed-case, Sora 700 for headlines, Inter 500 for body. White `#F1F5F9` on dark backgrounds. Accent color for key metrics or highlighted features. Code snippets in Space Mono on dark pill backgrounds. Position: left-aligned or center.
- **Element Count**: 3–4 per scene. Screenshot + 2–3 feature callout labels + headline. Information-dense but organized with clear visual hierarchy.
- **Sound Design**: Subtle electronic ambient, soft interface clicks, minimal synthesizer tones.
- **Best For**: SaaS products, developer tools, AI platforms, API products, analytics dashboards, productivity apps.
- **Avoid**: Warm tones, script fonts, lifestyle photography, film grain, ALL-CAPS aggressive text, countdown timers, heavy particles, bright gradient backgrounds.
- **Example Scene Sequence (30s)**:
  1. **Scene 1 (0–5s)**: `focus-pull` reveal on dark background. Bold hook: "Ship 10x faster" `text-slam`. `Midnight Ocean` gradient.
  2. **Scene 2 (5–13s)**: `spring-slide-left`. Screenshot panel `slide-from-left` with `feature-callout` labels connecting to UI elements via animated lines. 3 features, staggered 8 frames apart.
  3. **Scene 3 (13–20s)**: `soft-dissolve`. Code snippet in `typewriter` animation. Result metric `stats-counter` counting up.
  4. **Scene 4 (20–26s)**: `zoom-through`. `metric-trio` showing 3 key stats with count-up.
  5. **Scene 5 (26–30s)**: Logo `pop-in`. CTA `swipe-cta` with pulsing glow. URL in Inter 400.

---

### Style 5: Bold Sale/Promo

**Visual Identity**: Maximum urgency. Everything screams "act now." Red and yellow dominate. Prices are enormous — the discount amount is the hero element, often filling 60%+ of the frame. Countdown timers tick with visible tension. Strikethrough animations on old prices create instant perceived value. Text is ALL-CAPS, ultra-bold, compressed. No subtlety: the frame is dense with information because the goal is to overwhelm the viewer into action before they scroll past.

- **Color Palette**: Custom urgency palette: primary Red `#DC2626`, accent Yellow `#FACC15`, background Black `#0A0A0A` or deep red `#7F1D1D`. Or `shop-energy` (Vibrant Orange `#F97316`, Hot Pink `#EC4899`). CTA in Orange `#FF6600` (highest conversion rate).
- **Gradient Preset**: `Power Gradient` (#10) or `Sunset Burst` (#6) or `Electric Coral` (#7). For darker: `Dark Velvet` (#2).
- **Typography**: Font stack **"Urgency / Sale"** (Stack 12) — Anton 400 headlines, Open Sans 600 body, Roboto Mono 700 for countdown/price accent. ALL-CAPS mandatory. Discount percentage at 120px+ on 1080p.
- **Animation Energy**: High. Explosive entrances. Animations complete in 4–8 frames. Pulsing elements maintain urgency throughout.
- **Preferred Animation Presets**: `text-slam`, `elastic-pop`, `price-strike`, `countdown-urgency`, `bold-claim`, `screen-shake`, `impact-frame`, `swipe-cta`
- **Preferred Transitions**: `clock-sweep-fast`, `whip-pan`, `shatter-split`
- **Background Style**: Solid red `#DC2626`, solid black, or `Power Gradient`. High saturation, maximum contrast. Optional radiating lines or starburst pattern behind the price.
- **Pacing**: 5–8 cuts per 10 seconds. Scene duration 1–3 seconds. Hook scene under 2 seconds.
- **Text Style**: ALL-CAPS Anton/Bebas Neue. Discount amount is MASSIVE (100px+). White or yellow text on red/black backgrounds. Prices in Roboto Mono for countdown feel. Text stroke 3px+ on busy backgrounds. Position: center, filling the frame.
- **Element Count**: 3–5 per scene. Price, discount badge, product image, timer, CTA — all competing for attention. Dense by design.
- **Sound Design**: Cash register sounds, alarm tones, ticking clock, energetic EDM, urgent voiceover.
- **Best For**: Flash sales, Black Friday, clearance events, limited-time offers, e-commerce promos, seasonal sales.
- **Avoid**: Subtle animations, serif fonts, muted colors, long scene holds, white space, elegant pacing, lowercase text, gentle spring physics.
- **Example Scene Sequence (10s)**:
  1. **Scene 1 (0–2s)**: "FLASH SALE" `text-slam` with `screen-shake` on red background. `impact-frame` flash.
  2. **Scene 2 (2–5s)**: `clock-sweep-fast` transition. `price-strike` animation: old price strikethrough, new price `elastic-pop` at 150% size. Product image alongside.
  3. **Scene 3 (5–8s)**: `whip-pan`. `countdown-urgency` timer ticking. "ENDS TONIGHT" `bold-claim` pulsing.
  4. **Scene 4 (8–10s)**: CTA `swipe-cta` with pulsing glow. "SHOP NOW" in Anton. `beat-pulse` on entire frame.

---

### Style 6: Cinematic Brand

**Visual Identity**: Film-grade production quality translated to motion graphics. Letterbox bars (2.35:1 or 2.39:1 aspect ratio simulation) frame every scene. Motion is slow and deliberate — push-ins, pull-outs, and rack focus pulls. Color grading is the defining feature: teal-and-orange blockbuster grade, warm vintage, or cool thriller depending on the brand tone. Negative space is abundant. Text appears sparingly and always in elegant, thin fonts. The goal is to make the viewer feel something, not inform them.

- **Color Palette**: `luxury-noir` for dark cinematic. For warm variant: warm vintage grade — shadows `#4A3728`, highlights `#FFF4DA`. For cool variant: teal-orange — shadows `#008080`, highlights `#FF8C42`.
- **Gradient Preset**: `Royal Night` (from luxury gradients: `#141E30` to `#243B55`) or `Shadow Wine` (#5) or `Deep Blue Sea` (#28). The gradient is the atmosphere, not a decorative element.
- **Typography**: Font stack **"Elegant Luxury"** (Stack 4) — Playfair Display 700 headlines, Raleway 400 body. Or **"Sophisticated Serif"** (Stack 13) for editorial cinematic. Thin weights permitted (300–400) at large sizes. Lowercase or sentence case only.
- **Animation Energy**: Low. Very slow. Animations take 1–3 seconds. Movement should feel like a camera move, not a UI animation.
- **Preferred Animation Presets**: `blur-in`, `wipe-reveal`, `character-cascade`, `dolly-push`, `dolly-pull`, `rack-focus`, `z-drift`, `parallax-depth`, `lens-flare`
- **Preferred Transitions**: `soft-dissolve` (long, 30+ frame overlap), `noise-dissolve`, `venetian-blinds`
- **Background Style**: Dark gradient with `film-look-warm` or `film-look-cool` color grade overlay. Optional `film-grain` at 8–15% opacity. Letterbox bars as persistent overlay (12–15% of frame height top and bottom, solid black). `vignette-pulse` for atmospheric focus.
- **Pacing**: 1–2 cuts per 10 seconds. Scene duration 4–8 seconds. Let moments breathe. The viewer should never feel rushed.
- **Text Style**: Sentence case or lowercase. Playfair Display at moderate size — text does not dominate the frame. Position: center or lower-third (above bottom letterbox bar). Thin weight (400) permitted at 80px+ on 1080p. No text stroke needed on dark, controlled backgrounds.
- **Element Count**: 1 per scene. Either text OR imagery, rarely both simultaneously. When combined, text is small and unobtrusive.
- **Sound Design**: Orchestral strings, ambient drone, cinematic percussion, piano, wind/nature ambience. Audio is the co-narrator.
- **Best For**: Automotive, premium beverages (whiskey, wine), luxury hotels, fashion brand films, brand manifestos, corporate anthems.
- **Avoid**: ALL-CAPS, bold compressed fonts, bright gradients, quick cuts, countdown timers, prices, stars/ratings, emoji, bouncy animations, high-saturation colors.
- **Example Scene Sequence (30s)**:
  1. **Scene 1 (0–8s)**: `blur-in` from darkness. Letterbox bars. `dolly-push` on dark gradient. Single word `character-cascade` in Playfair Display. `film-look-cool` grade. `film-grain` 10%.
  2. **Scene 2 (8–16s)**: `noise-dissolve` (60 frames). Product or hero image with `z-drift`. `rack-focus` from foreground blur to sharp product.
  3. **Scene 3 (16–24s)**: `soft-dissolve`. Tagline `wipe-reveal` on dark. `vignette-pulse` tightening focus. Hold.
  4. **Scene 4 (24–30s)**: `soft-dissolve`. Logo centered, small. URL `fade-up` minimal. Pure negative space. Hold 4 seconds.

---

### Style 7: UGC/Creator Style

**Visual Identity**: Deliberately imperfect. Mimics content created by a real person on their phone — shaky framing, casual text overlays, platform-native UI elements. Comment bubbles and caption-style text dominate. The "production value" is intentionally low because authenticity outperforms polish (UGC ads see 4x higher CTR). Captions are large, bold, and appear word-by-word in the style popularized by Hormozi-format videos.

- **Color Palette**: Minimal palette — white text `#FFFFFF` with black stroke on any background. Highlight words in yellow `#FFD700` or brand color. Comment bubbles use dark gray `#1E1E1E` background with white text.
- **Gradient Preset**: None. Background is either a solid dark `#121212` (simulating phone camera), or the "background" is a photo/video layer with overlaid text. No styled gradient.
- **Typography**: Bold sans for captions — use Montserrat 600–700 or Poppins 700 (simulating TikTok/Reels native caption style). Caveat 700 for handwritten annotations. Body in Inter 500 or Roboto 500. ALL-CAPS for emphasis words within otherwise mixed-case captions.
- **Animation Energy**: Medium-high. Word-by-word reveals are fast (4–6 frames per word). Comment bubbles spring in quickly. Overall energy matches a real creator's editing pace.
- **Preferred Animation Presets**: `karaoke-caption`, `bounce-caption`, `pill-caption`, `comment-response`, `rounded-caption-box`, `handheld-shake`, `kinetic-zoom-word`
- **Preferred Transitions**: `whip-pan`, `spring-slide-left`, hard cut (no transition)
- **Background Style**: Photo/video B-roll via `video-wash` or `ken-burns` on lifestyle imagery. `handheld-shake` applied to entire composition for authenticity. No gradient backgrounds — those signal "ad" and break the format.
- **Pacing**: 4–6 cuts per 10 seconds. Scenes range 1.5–4 seconds. Comment-response sections hold longer (3–4s). Hook is fast (under 2s).
- **Text Style**: Large bold captions filling center frame. White with 2–3px black stroke or on semi-transparent dark pill (`rgba(0,0,0,0.6)`). Word-by-word highlighting via `karaoke-caption`. Position: center of frame (the entire middle third). Oversized for mobile-first readability.
- **Element Count**: 2–3 per scene. Caption text + background image/video + optional comment bubble or emoji.
- **Sound Design**: Voice-over narration is primary. Platform-native sounds (TikTok ding, notification beep). Trending audio clip optional.
- **Best For**: DTC product ads, supplement brands, app installs, SaaS trial signups, any product targeting social-native audiences.
- **Avoid**: Elegant serifs, formal layouts, letterbox bars, slow dissolves, gradient backgrounds, thin font weights, corporate blue palettes, structured grid layouts.
- **Example Scene Sequence (15s)**:
  1. **Scene 1 (0–3s)**: `comment-response` — skeptical comment "Does this actually work?" springs in, then creator response text appears below. `handheld-shake` on all.
  2. **Scene 2 (3–7s)**: `whip-pan`. `karaoke-caption` word-by-word: "I tested [PRODUCT] for 30 days — here's what happened" with key words highlighted yellow.
  3. **Scene 3 (7–11s)**: Hard cut. Product shown via `ken-burns` on photo. `pill-caption` with "4.8 stars, 10K+ reviews". `proof-stack` star rating.
  4. **Scene 4 (11–15s)**: `bounce-caption`: "Link in bio" or CTA. `swipe-cta` pulsing. `emoji-rain` celebration.

---

### Style 8: Retro/Vintage

**Visual Identity**: Nostalgic warmth achieved through simulated analog imperfections. Film grain is heavy (15–25% opacity). Colors are desaturated and warm-shifted — muted oranges, browns, creamy yellows, faded teals. Light leaks bleed across the frame. Typography uses retro display fonts with 70s-inspired curves or 80s-inspired geometric forms. The overall effect recalls Super 8 film, Polaroid photography, or VHS home video.

- **Color Palette**: Warm retro custom palette — mustard `#D4A017`, burnt orange `#BF360C`, cream `#FFF4DA`, faded teal `#5F9EA0`, warm brown `#704214`. Backgrounds in sepia tones. Or `appetite-warm` palette with reduced saturation.
- **Gradient Preset**: `Autumn Harvest` (#23) or `Golden Hour` (#25) or `Desert Dune` (#22). All warm-leaning.
- **Typography**: Font stack **"Retro Pop"** (Stack 10) — Righteous 400 headlines, Poppins 400/500 body, Dancing Script 700 for accent. Or Pacifico for maximum retro surf vibe.
- **Animation Energy**: Low to medium. Animations have a slightly "loose" quality — soft springs with visible overshoot. Nothing feels digitally precise.
- **Preferred Animation Presets**: `fade-up`, `blur-in`, `wipe-reveal`, `ken-burns`, `film-grain` (heavy), `film-look-warm`, `bokeh-drift`
- **Preferred Transitions**: `soft-dissolve`, `rgb-split`, `noise-dissolve`
- **Background Style**: Warm gradient (`Autumn Harvest`, `Golden Hour`) with heavy `film-grain` overlay (15–20% opacity). `film-look-warm` color grade. Optional warm `bokeh-drift` for dreamy quality. `chromatic-aberration` at subtle levels for analog feel.
- **Pacing**: 2–3 cuts per 10 seconds. Scene duration 3–5 seconds. Leisurely, nostalgic pacing.
- **Text Style**: Righteous or Pacifico for headlines — retro display personality. Mixed-case or title case. Warm cream `#FFF4DA` text on dark warm backgrounds, or dark brown `#3E2723` text on light cream. No hard shadows — instead, a soft warm glow or no treatment at all.
- **Element Count**: 1–2 per scene. Uncluttered, letting the warm texture do the work.
- **Sound Design**: Vinyl crackle, acoustic instruments, classic rock or soul samples, warm analog synthesizer, record scratch transitions.
- **Best For**: Music promotion, food/restaurant brands, vintage fashion, retro events, craft beverages, nostalgic brand campaigns, Polaroid-style product photography.
- **Avoid**: Neon colors, glitch effects, dark mode, ALL-CAPS compressed fonts, modern geometric sans-serifs, countdown timers, data visualizations, sharp digital effects.
- **Example Scene Sequence (20s)**:
  1. **Scene 1 (0–5s)**: `blur-in` to warm gradient. `film-grain` 18%. Headline in Righteous `fade-up`. `film-look-warm` grade. `bokeh-drift` ambient.
  2. **Scene 2 (5–10s)**: `rgb-split` transition. Product on warm `Desert Dune` background with `ken-burns`. Dancing Script accent text `wipe-reveal`.
  3. **Scene 3 (10–16s)**: `noise-dissolve`. Quote or tagline in Righteous `split-word-cascade`. Heavy grain. Warm vignette.
  4. **Scene 4 (16–20s)**: `soft-dissolve`. Logo on cream background. Minimal. Warm and inviting.

---

### Style 9: Neon/Cyberpunk

**Visual Identity**: Dark and electric. Nearly black backgrounds serve as the canvas for vivid neon color — cyan, magenta, acid yellow, hot pink. Glitch effects (horizontal slice displacement, RGB channel splitting) provide digital texture. Text glows with multi-layer neon shadows. Scan lines overlay the composition. The overall effect is a club at 2 AM rendered as a motion graphics style. Contrast between dark void and bright neon is the core principle — neon only works because the surrounding space is nearly black.

- **Color Palette**: `game-neon` (Electric Purple `#7C3AED`, Neon Green `#22C55E`, Hot Cyan `#06B6D4`, Deep Void bg `#09090B`). Or `music-vibe` (Electric Magenta `#D946EF`, Neon Cyan `#22D3EE`). Neon palette from color grading section: primary `#18E0FF`, secondary `#FF3CF2`, hazard `#F7FF4A`, hot `#FF0055` on `#0B0C10`.
- **Gradient Preset**: `Neon Nights` (#16) or `Hot Neon` (#19) or `Plasma` (#18) or `Cyber Glow` (#17). Background always dark.
- **Typography**: Font stack **"Premium Tech"** (Stack 1) with Sora 700 for futuristic feel, or Space Grotesk 700 from **"Indie Maker"** (Stack 7). Monospace accent via Space Mono 400 for data/code overlays. ALL-CAPS for impact headlines.
- **Animation Energy**: High. Fast, glitchy, rhythmic. Animations 150–400ms with abrupt stops and occasional glitch stutters.
- **Preferred Animation Presets**: `glitch-corrupt`, `neon-pulse`, `glitch-cut` (transition used as effect), `scan-lines`, `data-stream`, `chromatic-aberration`, `text-slam`, `gradient-flow`
- **Preferred Transitions**: `glitch-cut`, `zoom-through`, `rgb-split`
- **Background Style**: Near-black (`#09090B` to `#0B0C10`) with `Neon Nights` or `Plasma` gradient at low intensity. `scan-lines` overlay always present. Optional `data-stream` for matrix effect in backgrounds. Neon glow bleed via `<AbsoluteFill>` with neon color at `mix-blend-mode: screen` and 8% opacity.
- **Pacing**: 4–7 cuts per 10 seconds. Scene duration 1–3 seconds. Staccato rhythm with glitch stutters between cuts.
- **Text Style**: ALL-CAPS for headlines in Sora or Space Grotesk. Multi-layer neon text-shadow glow (e.g., `0 0 10px #18E0FF, 0 0 40px #18E0FF, 0 0 80px #18E0FF`). Monospace for secondary data text. Position: center or offset with diagonal energy. Color alternates between neon accents per scene.
- **Element Count**: 2–3 per scene. Neon text + background effect + optional geometric decoration (`orbit-rings`, `rotating-rings`).
- **Sound Design**: Synthwave, dark electronic, glitch percussion, 808 bass, cyberpunk ambient.
- **Best For**: Gaming, music/nightlife, crypto/Web3, streaming platforms, tech events, VR/AR products, DJ promotions.
- **Avoid**: Warm tones, pastel colors, serif fonts, gentle easing, white backgrounds, lifestyle photography, organic textures, rounded "friendly" fonts, slow dissolves.
- **Example Scene Sequence (10s)**:
  1. **Scene 1 (0–2s)**: Dark void. `glitch-corrupt` text: "THE FUTURE IS" with `neon-pulse` glow. `scan-lines` overlay. `chromatic-aberration`.
  2. **Scene 2 (2–4.5s)**: `glitch-cut`. "NOW" `text-slam` in magenta neon. `impact-frame` flash in cyan. `screen-shake`.
  3. **Scene 3 (4.5–7s)**: `rgb-split` transition. Product on void with `gradient-flow` text. `data-stream` background. `orbit-rings` decoration.
  4. **Scene 4 (7–10s)**: `zoom-through`. Logo in `neon-pulse`. CTA in Space Mono `typewriter`. Neon glow pulsing.

---

### Style 10: Pastel/Soft

**Visual Identity**: Muted, airy, dreamy. Every color is desaturated and lifted — no true blacks, no harsh contrast. Pinks, lavenders, soft mints, and peach tones create a gentle atmosphere. Animations are slow, floaty, and smooth with no sudden stops or impacts. Typography is rounded and friendly. The lifted black point (shadows never go below `#2A2030`) gives the composition a permanent "morning mist" quality. This is the visual language of self-care, meditation apps, and clean beauty brands.

- **Color Palette**: `wellness-calm` (Sage Green `#4ADE80`, Soft Teal `#5EEAD4`, Lavender `#C084FC`, Mint Cream bg `#ECFDF5`) or `beauty-glow` (Rose Pink `#F43F5E`, Champagne `#D4A574`, Deep Plum `#7E22CE`). Text colors: dark muted tones like `#2A2030` or `#4C0519` — never pure black.
- **Gradient Preset**: `Cotton Candy` (#11) or `Lavender Cloud` (#13) or `Peach Dream` (#12) or `Rose Water` (#15).
- **Typography**: Font stack **"Health & Wellness"** (Stack 8) — Nunito Sans 700 headlines, Lexend 400 body, Lora 400 italic accent. Rounded terminals, open counters, friendly forms. Never condensed, never heavy black weights.
- **Animation Energy**: Low. Very gentle. Animations 600–1000ms. Springs are soft and underdamped (stiffness 80–140, damping 8–12) for floaty overshoot.
- **Preferred Animation Presets**: `fade-up`, `blur-in`, `floating-orbs`, `floating-fireflies`, `bokeh-drift`, `rising-bubbles`, `sparkle-scatter`
- **Preferred Transitions**: `soft-dissolve` (extra long — 45+ frames), `iris-bounce` (gentle)
- **Background Style**: Light pastel gradient (`Cotton Candy`, `Lavender Cloud`). `floating-orbs` at 15% opacity for dreamy bokeh. Pastel color grade overlay. Lifted blacks — CSS `filter: brightness(1.05) contrast(0.92)` on the entire composition for permanently soft look.
- **Pacing**: 2–3 cuts per 10 seconds. Scene duration 4–6 seconds. Ultra-slow transitions. Meditative rhythm.
- **Text Style**: Mixed-case, Nunito Sans 700 in soft muted dark tones. Position: center. Size moderate — text does not dominate. Lora italic for quotes or accent phrases. No text stroke. No sharp shadows — at most a very soft drop shadow (`0 2px 8px rgba(0,0,0,0.1)`).
- **Element Count**: 1–2 per scene. Minimal and serene. One text element and one ambient effect.
- **Sound Design**: Singing bowls, ambient pads, gentle piano, ASMR-quality voiceover, nature sounds (rain, waves).
- **Best For**: Wellness apps, meditation, skincare, clean beauty, yoga studios, therapy platforms, self-care subscriptions, supplements.
- **Avoid**: ALL-CAPS, red/yellow urgency colors, fast cuts, glitch effects, dark backgrounds, bold compressed fonts, countdown timers, loud sound design, impact frames, screen shake.
- **Example Scene Sequence (20s)**:
  1. **Scene 1 (0–6s)**: `blur-in` (extra slow, 60 frames). `Lavender Cloud` gradient. "Breathe. Reset. Glow." in Nunito Sans `fade-up`. `floating-orbs` ambient.
  2. **Scene 2 (6–12s)**: `soft-dissolve` (45 frames). Product on `Cotton Candy` gradient with `product-float`. Feature text `fade-up`.
  3. **Scene 3 (12–17s)**: `soft-dissolve`. Testimonial in Lora italic `split-word-cascade`. `sparkle-scatter` ambient.
  4. **Scene 4 (17–20s)**: Logo `fade-up`. CTA in Nunito Sans. `rising-bubbles` ambient. Serene hold.

---

### Style 11: Corporate/B2B

**Visual Identity**: Professional, structured, information-first. Blues and grays dominate — the visual language of trust, competence, and stability. Data visualizations (charts, progress bars, metrics) are core content, not decoration. Layouts follow a grid system with clear sections. Text is clean, readable, and never "creative" — the content is the star. Everything communicates: "we are reliable professionals who will deliver results."

- **Color Palette**: `b2b-corporate` (Corporate Blue `#1D4ED8`, Neutral Gray `#6B7280`, Action Green `#059669`, Dark Slate bg `#111827`). Or `finance-trust` (Navy `#1E3A5F`, Forest Green `#166534`, Gold `#CA8A04`).
- **Gradient Preset**: `Deep Blue Sea` (#28) or `Noir Premium` (#3) for dark. `Arctic Frost` (#29) for light variant. Subtle, never distracting.
- **Typography**: Font stack **"Corporate Trust"** (Stack 6) — Oswald 600 headlines, Lato 400 body. Or **"Data-Driven"** (Stack 14) — Barlow Condensed 700 headlines, Inter 400/500 body, Space Mono 400 for data. Clean, professional, zero personality.
- **Animation Energy**: Low to medium. Smooth, professional. Animations 400–700ms. No bouncing, no overshooting. Easing is clean and controlled (`Easing.out(Easing.cubic)`).
- **Preferred Animation Presets**: `fade-up`, `slide-from-left`, `stats-counter`, `metric-trio`, `progress-reveal`, `checklist-reveal`, `numbered-steps`, `pop-in`
- **Preferred Transitions**: `soft-dissolve`, `spring-slide-left`, `elastic-wipe-up`
- **Background Style**: Dark blue gradient (`Deep Blue Sea`) or light gray solid (`#F3F4F6`). Clean, no particles, no ambient effects. Optional subtle `hex-grid` at very low opacity for tech credibility. No film grain, no bokeh, no organic effects.
- **Pacing**: 3–4 cuts per 10 seconds. Scene duration 3–5 seconds. Steady, predictable rhythm.
- **Text Style**: Mixed-case, Oswald or Barlow Condensed for headlines. Lato or Inter for body. Corporate Blue `#1D4ED8` for accent text. White on dark, dark charcoal on light. Position: left-aligned or center. Clear hierarchy with consistent sizing ratios.
- **Element Count**: 3–4 per scene. Charts, progress bars, and stat counters alongside explanatory text. Information-dense but well-organized.
- **Sound Design**: Corporate ambient (think Cisco or Salesforce ads), subtle electronic undertones, confident voiceover.
- **Best For**: Enterprise SaaS, consulting firms, financial services, insurance, B2B lead generation, investor decks, partnership announcements.
- **Avoid**: Neon colors, script fonts, film grain, bouncy animations, emoji, meme formats, UGC style, informal language, lifestyle photography, loud sound design.
- **Example Scene Sequence (30s)**:
  1. **Scene 1 (0–5s)**: Problem statement `fade-up` on `Deep Blue Sea` gradient. Clean, bold, left-aligned.
  2. **Scene 2 (5–13s)**: `spring-slide-left`. `metric-trio`: three stats counting up (e.g., "47% faster", "3.2x ROI", "99.9% uptime"). Corporate Blue accent on numbers.
  3. **Scene 3 (13–20s)**: `soft-dissolve`. `progress-reveal` showing comparison bars. Feature text `slide-from-left`.
  4. **Scene 4 (20–26s)**: `elastic-wipe-up`. `checklist-reveal` of benefits with checkmarks drawing.
  5. **Scene 5 (26–30s)**: Logo `pop-in`. CTA "Request a Demo" `fade-up`. Authoritative hold.

---

### Style 12: Playful/Fun

**Visual Identity**: Pure joy. Bright, saturated colors everywhere. Animations bounce, pop, wiggle, and overshoot with exaggerated physics. Rounded fonts with bouncy baselines. Confetti and emoji are welcome. Shapes are soft — rounded rectangles, circles, organic blobs. Nothing is sharp, angular, or aggressive. The visual language of a birthday party designed by a talented motion designer.

- **Color Palette**: Custom playful palette — primary Coral `#FF6B6B`, secondary Sunny Yellow `#FFD93D`, accent Sky Blue `#6BCB77`, background Soft White `#FFF9F0`. Or `edu-bright` (Bright Blue `#3B82F6`, Warm Orange `#FB923C`, Lime Green `#84CC16`).
- **Gradient Preset**: `Mint Sorbet` (#14) or `Electric Coral` (#7) or `Tropical Punch` (#8). Multi-color, vibrant.
- **Typography**: Font stack **"Playful Creative"** (Stack 5) — Poppins 700/800 headlines, Nunito Sans 400 body, Pacifico 400 for fun accent. Rounded terminal fonts only. Optional bouncy baseline effect via per-character Y offset.
- **Animation Energy**: High. Everything bounces. Springs are low-damping (6–10) for visible wobble. Animations 200–500ms with playful overshoot.
- **Preferred Animation Presets**: `elastic-pop`, `bounce-caption`, `confetti-burst`, `emoji-rain`, `shape-rain`, `wave-motion`, `sparkle-scatter`, `rotating-word-swap`
- **Preferred Transitions**: `iris-bounce`, `star-wipe`, `barrel-roll`, `flip-bounce`
- **Background Style**: Bright pastel or saturated gradient (`Mint Sorbet`, `Tropical Punch`). `confetti-burst` on celebrations. `shape-rain` as ambient decoration. `floating-orbs` in bright colors.
- **Pacing**: 4–6 cuts per 10 seconds. Scene duration 1.5–3 seconds. Fast, energetic, but never aggressive.
- **Text Style**: Mixed-case with occasional ALL-CAPS for single emphasis words. Poppins 700–800 in bright, contrasting colors. Position: center. Rounded pill backgrounds (`pill-caption`) in contrasting colors. Large emoji integrated with text.
- **Element Count**: 3–5 per scene. Text, decorative shapes, particles, emoji — visually rich but never cluttered because everything shares the same playful language.
- **Sound Design**: Xylophone, bouncy synthesizer, popping sounds, celebration jingles, upbeat electronic.
- **Best For**: Children's brands, gaming apps, party/event promotions, social apps, toy companies, casual mobile games, giveaway announcements.
- **Avoid**: Dark backgrounds, serif fonts, slow pacing, corporate blues, data charts, countdown timers, muted palettes, thin font weights, film grain, letterbox bars.
- **Example Scene Sequence (15s)**:
  1. **Scene 1 (0–3s)**: `shape-rain` background on bright gradient. "GUESS WHAT?" `elastic-pop` with `screen-shake`. `confetti-burst`.
  2. **Scene 2 (3–7s)**: `iris-bounce` transition. Product with `product-float` bouncing. Features `bounce-caption` one by one.
  3. **Scene 3 (7–11s)**: `star-wipe`. `rotating-word-swap` cycling through benefits. `emoji-rain` celebration.
  4. **Scene 4 (11–15s)**: `flip-bounce`. CTA in `pill-caption` on bright background. `sparkle-scatter`. Logo `elastic-pop`.

---

### Style 13: Luxury/Fashion

**Visual Identity**: Elegance through absence. Negative space dominates every frame — at least 50% of the composition is empty. Text is sparse, small (relative to frame), and set in high-contrast serifs with generous letter-spacing. Gold, black, and ivory are the core palette. Motion is extremely slow — reveals happen over 2–4 seconds. The camera (simulated) lingers. Every element is placed with intention, and the absence of decoration is itself a statement of confidence. The visual language of Chanel, Cartier, and Bottega Veneta.

- **Color Palette**: `luxury-noir` (Pure Black `#0A0A0A`, Champagne Gold `#C9A96E`, Ivory `#FFFFF0`). Or deep burgundy `#4A0000` + gold. Or navy `#0D1B2A` + champagne.
- **Gradient Preset**: `Black Gold` (#30) or `Champagne Noir` (#32) or `Dark Velvet` (#2). Ultra-subtle, nearly solid.
- **Typography**: Font stack **"Elegant Luxury"** (Stack 4) — Playfair Display 700 headlines, Raleway 400 body. Or **"Sophisticated Serif"** (Stack 13) — Cormorant Garamond 700 headlines, Montserrat 400 body. Generous letter-spacing (+3–5% on headlines). Thin weights (300–400) permitted at 80px+.
- **Animation Energy**: Minimal. Extremely slow. Animations 1–3 seconds. Movement is barely perceptible on any single frame.
- **Preferred Animation Presets**: `character-cascade` (slow, 4-frame stagger), `wipe-reveal`, `blur-in`, `fade-up` (very slow), `z-drift`, `sparkle-scatter`, `lens-flare`
- **Preferred Transitions**: `soft-dissolve` (60+ frame overlap), `noise-dissolve`
- **Background Style**: Solid black `#0A0A0A` or `Black Gold` gradient. Minimal ambient effects — at most `sparkle-scatter` at very low density for jewelry/fashion, or `bokeh-drift` for soft depth. `vignette-pulse` at subtle levels.
- **Pacing**: 1–2 cuts per 10 seconds. Scene duration 5–8 seconds. Absolute minimum number of scenes. The slower the better.
- **Text Style**: Sentence case or lowercase. Playfair Display or Cormorant Garamond at moderate size — text is not the largest element; negative space is. Gold `#C9A96E` text on black, or dark text on ivory. Letter-spacing +3–5%. Position: center, vertically. No stroke, no shadow, no pill background. The background is dark enough for inherent contrast.
- **Element Count**: 1 per scene. One text element, or one image, or one product. Never multiple competing elements. Negative space is the second element.
- **Sound Design**: Silence with isolated piano notes, string section swells, minimal ambient, luxury fashion show soundtrack.
- **Best For**: High fashion, fine jewelry, premium spirits, luxury real estate, high-end hospitality, art galleries, premium watches.
- **Avoid**: Bright colors, multiple fonts, busy compositions, fast cuts, ALL-CAPS compressed fonts, countdown timers, data visualizations, bouncy animations, gradients with high saturation, emoji.
- **Example Scene Sequence (20s)**:
  1. **Scene 1 (0–6s)**: Black. Brand name in Cormorant Garamond `character-cascade` (4-frame stagger per char). Gold text. Hold 3 seconds.
  2. **Scene 2 (6–13s)**: `soft-dissolve` (60 frames). Product on black with `z-drift`. `sparkle-scatter` at minimal density. Pure stillness.
  3. **Scene 3 (13–17s)**: `noise-dissolve`. Tagline in Raleway 400 `wipe-reveal` on black. Small. Centered. Generous negative space.
  4. **Scene 4 (17–20s)**: Logo small, centered. Nothing else. Black. Hold.

---

### Style 14: Editorial/Magazine

**Visual Identity**: Journalistic authority meets design sophistication. Serif headlines paired with clean sans body text create the visual rhythm of a premium magazine spread translated to motion. Content is organized in column-like layouts with clear typographic hierarchy. Wipe reveals mimic page turns. A single accent color punctuates an otherwise monochrome or restrained palette. The aesthetic of Monocle, The New York Times Magazine, or Kinfolk.

- **Color Palette**: Primarily monochrome — black `#1A1A1A`, white `#FFFFFF`, one accent color (e.g., `#DC2626` red or `#1D4ED8` blue). Or `realty-premium` for warm editorial (Navy `#0D1B2A`, Warm Tan `#C2A878`, Burgundy `#7F1D1D`).
- **Gradient Preset**: Minimal gradient use. Solid white or solid near-black backgrounds preferred. If gradient: `Deep Blue Sea` (#28) or `Champagne Noir` (#32) for dark editorial.
- **Typography**: Font stack **"Editorial Magazine"** (Stack 9) — Playfair Display 800/900 headlines, Source Sans 3 400 body, Roboto Mono 400 for data/date accent. Strong serif-sans contrast. Headlines are large and bold.
- **Animation Energy**: Medium. Purposeful, structured. Animations 300–600ms. Wipe reveals and slide-ins, no bouncing.
- **Preferred Animation Presets**: `wipe-reveal`, `curtain-wipe-reveal`, `slide-from-left`, `fade-up`, `typewriter` (for dates/data), `animated-underline`, `article-excerpt`
- **Preferred Transitions**: `venetian-blinds`, `soft-dissolve`, `spring-slide-left`, `split-screen-pinch`
- **Background Style**: Solid white or solid dark. Clean — no particles, no gradients, no ambient effects. The background is a canvas, not a feature. Optional single decorative rule line drawing via `animated-underline`.
- **Pacing**: 3–4 cuts per 10 seconds. Scene duration 3–5 seconds. Steady, authoritative rhythm.
- **Text Style**: Playfair Display 800–900 for headlines — large, commanding, positioned upper-third. Source Sans 3 400 for body — left-aligned, column-width. Single accent color for pull-quotes or highlighted phrases. Roboto Mono for dates, issue numbers, or data points. Clear hierarchy through weight contrast.
- **Element Count**: 2–3 per scene. Headline + body text + decorative rule. Or pull-quote + attribution. Information-rich but visually disciplined.
- **Sound Design**: No music, or very minimal ambient. Typewriter clicks, page-turn sounds, soft atmospheric.
- **Best For**: Media brands, newsletter promotions, content platforms, journalism, opinion pieces, literary events, book launches, thought leadership.
- **Avoid**: Neon colors, bouncy animations, emoji, rounded playful fonts, countdown timers, product floats, confetti, casual/informal tone.
- **Example Scene Sequence (20s)**:
  1. **Scene 1 (0–5s)**: Issue number in Roboto Mono `typewriter` top-left. Headline in Playfair Display 900 `curtain-wipe-reveal`. Red accent underline `animated-underline`.
  2. **Scene 2 (5–11s)**: `venetian-blinds` transition. Pull-quote `wipe-reveal` in Playfair italic. Attribution `fade-up` in Source Sans. Clean white background.
  3. **Scene 3 (11–16s)**: `spring-slide-left`. Key data point `stats-counter` in Roboto Mono. Body explanation in Source Sans `slide-from-left`.
  4. **Scene 4 (16–20s)**: `soft-dissolve`. Publication logo. "Read more" CTA `fade-up`. Clean, authoritative hold.

---

### Style 15: Social Proof/Testimonial

**Visual Identity**: Trust architecture made visual. Review cards float on screen with star ratings, customer names, and verified badges. The composition is structured around proof elements — numbers, ratings, quotes, and logos of recognizable outlets. Typography for quotes uses serif italic to signal spoken words. The visual language of Amazon reviews and Trustpilot, elevated to motion graphics quality.

- **Color Palette**: Warm neutral base — background `#F5F5F5` or `#FFF8E1`. Text `#1A1A1A`. Star gold `#F59E0B`. Accent green `#16A34A` for verification. Blue `#1D4ED8` for trust. Or dark variant: `#111827` background, white text, gold stars.
- **Gradient Preset**: `Arctic Frost` (#29) for light, or `Deep Blue Sea` (#28) for dark. Subtle backgrounds that do not compete with proof elements.
- **Typography**: Font stack **"Warm Lifestyle"** (Stack 2) for quote text — Lora 400 italic for customer quotes, Montserrat 600–700 for names/ratings, Caveat 700 for handwritten accent (e.g., "verified buyer" annotation). Or **"Corporate Trust"** (Stack 6) for B2B testimonials.
- **Animation Energy**: Medium. Staggered entrances create a building effect. Each proof element springs in after the previous. 300–500ms per element.
- **Preferred Animation Presets**: `proof-stack`, `quote-card`, `testimonial-stack`, `fade-up`, `elastic-pop`, `checklist-reveal`, `stats-counter`
- **Preferred Transitions**: `soft-dissolve`, `spring-slide-left`, `grid-reveal`
- **Background Style**: Light warm solid or very subtle gradient (`Arctic Frost`). Review cards have white backgrounds with subtle shadows, floating on the main background. No heavy effects — trust requires visual clarity.
- **Pacing**: 3–4 cuts per 10 seconds. Scene duration 3–5 seconds. Each testimonial gets full readability time.
- **Text Style**: Lora 400 italic for quote text — centered, moderate size. Montserrat 700 for customer names and star counts. Quote marks as large decorative elements (60px+) in light gray or accent color. Position: center.
- **Element Count**: 2–4 per scene. Quote card + stars + name + optional badge. Multiple proof points stacked or staggered.
- **Sound Design**: Warm ambient, soft notification sounds on star reveals, gentle piano, confident voiceover.
- **Best For**: Any product with strong reviews, SaaS with customer logos, apps with ratings, DTC with press mentions, consulting with client testimonials.
- **Avoid**: Dark/moody aesthetics, film grain, neon colors, aggressive animations, ALL-CAPS urgency text, countdown timers, glitch effects.
- **Example Scene Sequence (20s)**:
  1. **Scene 1 (0–5s)**: "Don't take our word for it" `fade-up`. `stats-counter` counting to "4.9 stars" with star fill animation.
  2. **Scene 2 (5–11s)**: `spring-slide-left`. `quote-card` with customer review. Stars `proof-stack`. Verified badge spring-in.
  3. **Scene 3 (11–16s)**: `grid-reveal`. Three mini review cards appear staggered. Star ratings visible on each.
  4. **Scene 4 (16–20s)**: `soft-dissolve`. "Join 10,000+ happy customers" `elastic-pop`. CTA `fade-up`.

---

### Style 16: Data/Stats Driven

**Visual Identity**: Numbers are the hero. Every scene centers on a large statistic, metric, or data point rendered at massive scale. Count-up animations make numbers feel alive. Progress bars fill. Charts animate. The surrounding composition is clean and organized — information hierarchy ensures the viewer reads the key number first, then the context. The visual language of annual reports made cinematic.

- **Color Palette**: `b2b-corporate` (Corporate Blue `#1D4ED8` primary, Neutral Gray `#6B7280`, Action Green `#059669`). Or `tech-trust` with blue accents on dark backgrounds. One accent color for the hero metric, neutral tones for everything else.
- **Gradient Preset**: `Midnight Ocean` (#1) for dark data dashboards. `Arctic Frost` (#29) for light presentations. `Noir Premium` (#3) for fintech.
- **Typography**: Font stack **"Data-Driven"** (Stack 14) — Barlow Condensed 700 headlines, Inter 400/500 body, Space Mono 400 for numeric data and labels. Numbers in condensed or monospace fonts for tabular alignment. Hero numbers at 2–3x headline size.
- **Animation Energy**: Medium. Count-up animations are smooth (45–90 frames). Progress bars fill with eased timing. No bouncing on data elements — precision matters.
- **Preferred Animation Presets**: `stats-counter`, `metric-trio`, `progress-reveal`, `timeline-milestone`, `fade-up`, `slide-from-left`, `typewriter` (for data labels)
- **Preferred Transitions**: `soft-dissolve`, `spring-slide-left`, `elastic-wipe-up`
- **Background Style**: Dark gradient (`Midnight Ocean`, `Noir Premium`) or light solid (`#F3F4F6`). Optional `hex-grid` or `grid-pulse` at very low opacity for analytical texture. Clean — no particles, no bokeh.
- **Pacing**: 3–4 cuts per 10 seconds. Scene duration 3–5 seconds. Data needs time to be read and absorbed.
- **Text Style**: Barlow Condensed 700 for context headlines. Space Mono for numbers and data labels. Hero numbers in the accent color at massive size (100px+ on 1080p). Supporting text in Inter 500. Position: center for hero numbers, left-aligned for explanatory text.
- **Element Count**: 2–3 per scene. Hero number/chart + context text + optional source citation. Clean, focused.
- **Sound Design**: Subtle data-processing sounds, soft electronic ambient, interface tones on count-up completions.
- **Best For**: Analytics platforms, research findings, investor updates, annual reports, market data, performance dashboards, ROI presentations.
- **Avoid**: Script fonts, warm lifestyle tones, film grain, decorative particles (except subtle grid), emoji, bouncy animations, countdown urgency styling, lifestyle photography.
- **Example Scene Sequence (20s)**:
  1. **Scene 1 (0–5s)**: Context question `fade-up`: "How much faster is it?" Hold for reading.
  2. **Scene 2 (5–11s)**: `spring-slide-left`. Hero number `stats-counter` counting up to "47%" in blue accent at massive size. Circular `<Pie>` arc filling simultaneously. Context label below.
  3. **Scene 3 (11–16s)**: `elastic-wipe-up`. `progress-reveal` showing 3 comparison bars filling. Labels in Space Mono.
  4. **Scene 4 (16–20s)**: `soft-dissolve`. `metric-trio` with three final stats. Source citation small at bottom. CTA `fade-up`.

---

### Style 17: Announcement/Launch

**Visual Identity**: Theatrical anticipation. Dark backgrounds build tension before the reveal moment. Countdown elements (numeric or visual) create a "something is coming" atmosphere. The reveal itself is dramatic — confetti bursts, light blooms, scale slams. Before the reveal, elements are minimal and mysterious. After the reveal, the frame fills with celebration. The visual language of keynote presentations and product drop culture.

- **Color Palette**: Pre-reveal: dark, restrained — `#0A0A0A` to `#1A1A2E` with minimal accent. Post-reveal: brand colors at full saturation. Gold `#FFD700` for celebration. Or `music-vibe` for entertainment launches. Or `indie-bold` for tech product launches.
- **Gradient Preset**: Pre-reveal: `Abyss` (#4) or `Noir Premium` (#3). Post-reveal: brand-colored gradient or `Electric Coral` (#7), `Neon Nights` (#16).
- **Typography**: Font stack **"Premium Tech"** (Stack 1) for tech launches. **"Playful Creative"** (Stack 5) for entertainment. Sora or Poppins 700–800 for headlines. Inter or Nunito Sans 400 for body.
- **Animation Energy**: Contrasting — low before reveal, explosive after. Pre-reveal animations are slow, teasing. Post-reveal animations are fast, celebratory (150–300ms).
- **Preferred Animation Presets**: Pre: `blur-in`, `typewriter`, `countdown-timer`, `z-drift`. Post: `confetti-burst`, `scale-slam`, `elastic-pop`, `sparkle-scatter`, `shape-rain`, `text-slam`, `impact-frame`
- **Preferred Transitions**: `zoom-through` (for the reveal moment), `shatter-split`, `circle-burst`
- **Background Style**: Dark solid or very dark gradient pre-reveal. Bright gradient or solid post-reveal. `starfield` for pre-reveal anticipation. `confetti-burst` + `sparkle-scatter` post-reveal.
- **Pacing**: Slow before reveal (5+ second scenes), rapid after (1–2 second scenes). The reveal moment itself is a single dramatic beat.
- **Text Style**: Pre-reveal: small, mysterious, centered. Typewriter or `blur-in` for teaser text. Post-reveal: large, bold, celebratory. Mixed-case to ALL-CAPS shift at reveal.
- **Element Count**: Pre-reveal: 1 per scene (minimal). Post-reveal: 3–5 per scene (celebratory density).
- **Sound Design**: Pre: building tension (rising tone, heartbeat, ticking). Post: explosion of sound (bass drop, crowd cheering, confetti pop).
- **Best For**: Product launches, app releases, event announcements, milestone celebrations, feature reveals, company announcements.
- **Avoid**: Consistent pacing throughout (the contrast between pre and post reveal is essential), muted celebration, anticlimactic reveals, UGC-style casualness for the reveal moment.
- **Example Scene Sequence (15s)**:
  1. **Scene 1 (0–4s)**: Dark. `starfield` background. "Something big is coming" `typewriter` in small text. `z-drift` pushing in. Tension building.
  2. **Scene 2 (4–7s)**: `countdown-timer` — "3... 2... 1..." with `elastic-pop` on each number. Background brightening.
  3. **Scene 3 (7–9s)**: `zoom-through` into product name `scale-slam` with `impact-frame` flash. `confetti-burst` explosion. `screen-shake`. Brand gradient background appears.
  4. **Scene 4 (9–12s)**: Product hero shot with `product-float`. Feature highlights `elastic-pop` staggered. `sparkle-scatter`.
  5. **Scene 5 (12–15s)**: CTA `text-slam`. Logo. "Available now" `fade-up`. Confetti settling.

---

### Style 18: Tutorial/How-To

**Visual Identity**: Clarity above all. Every scene has a clear step number, a title, and supporting content. The layout is hierarchical — step number is largest, title is bold, instructions are readable. A consistent visual structure repeats across all steps so the viewer always knows where they are. Color-coding differentiates steps. The aesthetic of a well-designed instruction manual brought to life with motion.

- **Color Palette**: `tech-trust` for software tutorials (Blue `#2563EB` accent, `#0F172A` dark bg). Or `edu-bright` (Bright Blue `#3B82F6`, Warm Orange `#FB923C`, Lime Green `#84CC16`) for educational content. Each step gets a unique accent color from the palette.
- **Gradient Preset**: `Midnight Ocean` (#1) for dark tech tutorials. Light variant: solid `#F8FAFC` or `Arctic Frost` (#29).
- **Typography**: Font stack **"Premium Tech"** (Stack 1) for tech — Sora 700 headlines, Inter 400 body, Space Mono 400 for step numbers. Or **"Corporate Trust"** (Stack 6) for general tutorials — Oswald 600 headlines, Lato 400 body. Step numbers in bold display font at oversized scale.
- **Animation Energy**: Medium. Methodical, not rushed. Animations 300–500ms. Each step enters cleanly and holds for reading time.
- **Preferred Animation Presets**: `numbered-steps`, `checklist-reveal`, `slide-from-left`, `fade-up`, `feature-callout`, `wipe-reveal`, `typewriter`
- **Preferred Transitions**: `spring-slide-left`, `elastic-wipe-up`, `soft-dissolve`
- **Background Style**: Consistent background throughout all steps (dark gradient or light solid) for structural continuity. No ambient particles. Optional `corner-brackets` framing for precision feel.
- **Pacing**: 3–4 cuts per 10 seconds. Each step gets 4–6 seconds. Predictable rhythm — the viewer can anticipate the pattern.
- **Text Style**: Step number in bold display font (Sora 700 or Anton), oversized, in accent color. Step title in bold sans, below the number. Instructions in clean body font, left-aligned. Position: left-aligned vertical stack or center.
- **Element Count**: 3 per scene. Step number + title + instruction/visual. Consistent layout across all steps.
- **Sound Design**: Clean interface sounds, soft "ding" on step completion, subtle ambient music, clear voiceover.
- **Best For**: Product tutorials, onboarding flows, recipe videos, DIY instructions, educational content, software walkthroughs.
- **Avoid**: Decorative particles, film grain, neon effects, inconsistent layouts between steps, serif fonts for instructions, aggressive pacing that does not allow reading time.
- **Example Scene Sequence (30s at 3 steps)**:
  1. **Scene 1 (0–4s)**: "How to get started in 3 steps" `fade-up`. Clean, centered.
  2. **Scene 2 (4–13s)**: `elastic-wipe-up`. Step 1 via `numbered-steps`: number circle pops, title slides in, screenshot/visual with `feature-callout`. Hold for reading.
  3. **Scene 3 (13–22s)**: `spring-slide-left`. Step 2: same visual pattern, different accent color. Feature visual.
  4. **Scene 4 (22–28s)**: `spring-slide-left`. Step 3: same pattern. Result/outcome visual.
  5. **Scene 5 (28–30s)**: `soft-dissolve`. CTA "Get started free" `elastic-pop`. Logo `pop-in`.

---

### Style 19: Meme/Native Social

**Visual Identity**: Looks like it was made on a phone, because that is the point. Platform-native text overlays (white text with black stroke, Impact-style font or platform default), informal composition, intentional imperfection. The "ad" pretends to be organic content. Meme formats (top text / bottom text, screenshot reactions, duet-style split), trending references, and deliberate casualness. In 2026, meme-style ads pull 60% organic engagement compared to 5% for traditional graphics.

- **Color Palette**: No designed palette. White text `#FFFFFF` with black stroke `#000000`. Platform colors as needed (TikTok pink `#FE2C55` + cyan `#25F4EE`). Bright, uncoordinated accent colors are fine — coherent branding is intentionally avoided.
- **Gradient Preset**: None. Backgrounds are screenshots, photos, solid black `#000000`, or solid white `#FFFFFF`. Styled gradients signal "designed" and break the native illusion.
- **Typography**: Bebas Neue or Anton for Impact-style meme text (ALL-CAPS, heavy stroke). Or Montserrat 600–700 for TikTok caption simulation. Caveat for handwritten annotations. No elegant serifs. No font pairing rules — deliberate mismatch is fine.
- **Animation Energy**: Medium-high. Fast, casual. Text appears quickly (4–8 frames) with minimal easing. Hard cuts, no transitions.
- **Preferred Animation Presets**: `pill-caption`, `bounce-caption`, `comment-response`, `emoji-rain`, `handheld-shake`, `bold-claim`
- **Preferred Transitions**: Hard cut (no transition), `whip-pan`
- **Background Style**: Photo screenshot, screen recording, or solid dark/white. `handheld-shake` on everything. No gradient. No particles. No film effects. Raw.
- **Pacing**: 5–8 cuts per 10 seconds. Scene duration 1–3 seconds. Meme beat timing — setup holds 2–3s, punchline hits in under 1s.
- **Text Style**: ALL-CAPS for meme-style top/bottom text. White with 3px+ black stroke. Positioned per meme format (top third / bottom third, or center caption). Informal, casual, often with intentional non-standard capitalization or spacing.
- **Element Count**: 2 per scene. Background image + text overlay. Simple. No design system layering.
- **Sound Design**: Trending audio clips, meme sound effects (vine boom, bruh, air horn), notification sounds, platform-native audio.
- **Best For**: Gen Z marketing, app installs, social commerce, brand engagement campaigns, community building, trend-riding promotions.
- **Avoid**: Professional typography pairing, elegant transitions, gradient backgrounds, serif fonts, corporate colors, data visualizations, letterbox bars, film grain, structured layouts.
- **Example Scene Sequence (10s)**:
  1. **Scene 1 (0–3s)**: Screenshot background. "POV: You just discovered [product]" in `pill-caption` with `handheld-shake`. No transition in.
  2. **Scene 2 (3–5.5s)**: Hard cut. Reaction image with `bold-claim` meme text top and bottom. `emoji-rain` brief.
  3. **Scene 3 (5.5–8s)**: Hard cut. Product screenshot. `comment-response`: "wait is this real??" then "1000%".
  4. **Scene 4 (8–10s)**: Hard cut. "Link in bio" `bounce-caption`. `handheld-shake`.

---

### Style 20: Glassmorphism/Modern UI

**Visual Identity**: Frosted glass panels floating over colorful gradient mesh backgrounds. Translucent white cards (10–20% opacity) with backdrop blur create depth layers. Subtle borders (1px white at 20% opacity) define panel edges. Gradient mesh backgrounds use 3–4 color blobs that shift slowly. The overall effect is the polished aesthetic of iOS, Windows 11, and modern fintech apps. Clean, futuristic, and inherently "premium tech."

- **Color Palette**: `indie-bold` (Vivid Violet `#8B5CF6`, Hot Coral `#FF6B6B`, Mint `#34D399`) as background mesh colors. Cards: `rgba(255,255,255,0.12)` with `backdrop-filter: blur(20px)`. Border: `1px solid rgba(255,255,255,0.18)`. Text: white `#FFFFFF` on dark mesh. Or `tech-trust` accents.
- **Gradient Preset**: Background mesh: layered `Plasma` (#18) + `Cyber Glow` (#17) as separate radial blobs. Or `Neon Nights` (#16) with multiple shifted radial gradients creating a mesh effect. Dark base `#0A0A2E`.
- **Typography**: Font stack **"Premium Tech"** (Stack 1) — Sora 700 headlines, Inter 400/500 body. Or **"Minimal Clean"** (Stack 11) — DM Sans 700, Inter 400. Clean geometric sans-serif only. No serif, no display.
- **Animation Energy**: Medium. Smooth and refined. Animations 300–600ms. Cards slide and fade in with clean spring physics (stiffness 180–220, damping 16–20). Background mesh drifts very slowly.
- **Preferred Animation Presets**: `fade-up`, `slide-from-left`, `blur-in`, `floating-orbs` (as mesh blobs), `liquid-gradient`, `pop-in`, `feature-callout`
- **Preferred Transitions**: `soft-dissolve`, `spring-slide-left`, `zoom-through`
- **Background Style**: Dark base (`#0A0A2E` to `#1A1A3E`) with `liquid-gradient` or multiple `floating-orbs` in brand colors at 30–50% opacity creating a gradient mesh effect. Cards are frosted glass panels layered on top. The background constantly, slowly shifts.
- **Pacing**: 3–4 cuts per 10 seconds. Scene duration 3–5 seconds. Smooth, unhurried.
- **Text Style**: White `#FFFFFF` on glass panels. Sora or DM Sans 700 for headlines. Inter 400–500 for body. Text lives inside glass panels with padding. Position: centered within cards, or left-aligned within wider panels.
- **Element Count**: 2–3 per scene. Glass card(s) + text inside card(s) + mesh background. The layering of card on mesh is the defining visual structure.
- **Sound Design**: Clean electronic ambient, soft interface tones, minimal synthesizer.
- **Best For**: Fintech products, SaaS dashboards, design tools, modern banking apps, AI products, premium app launches.
- **Avoid**: Solid flat backgrounds, film grain, serif fonts, warm earth tones, lifestyle photography behind cards, ALL-CAPS aggressive text, heavy particle effects, glitch effects.
- **Example Scene Sequence (20s)**:
  1. **Scene 1 (0–5s)**: Dark mesh background with `liquid-gradient` slowly shifting. Headline `blur-in` on glass panel `fade-up`. Clean, modern.
  2. **Scene 2 (5–11s)**: `spring-slide-left`. Feature cards (glass panels) `slide-from-left` staggered. Each card has icon + text. `floating-orbs` background mesh.
  3. **Scene 3 (11–16s)**: `soft-dissolve`. Stats on glass panel `stats-counter`. Background mesh shifts colors.
  4. **Scene 4 (16–20s)**: Glass panel with CTA `pop-in`. Logo on glass. `fade-up` URL. Mesh continues drifting.

---

## 3. Style Selection Matrix

### Industry-to-Style Mapping

| Industry | Primary Style | Secondary Style | Avoid Styles |
|---|---|---|---|
| **Tech / SaaS** | Tech/SaaS Demo | Glassmorphism, Minimalist Premium | Bold Sale, Retro, Warm Lifestyle |
| **E-commerce / Retail** | Bold Sale/Promo | UGC/Creator, Warm Lifestyle | Cinematic Brand, Corporate/B2B |
| **Food & Beverage** | Warm Lifestyle | Retro/Vintage, UGC/Creator | Neon/Cyberpunk, Corporate/B2B |
| **Health & Wellness** | Pastel/Soft | Warm Lifestyle, Tutorial/How-To | High-Energy Athletic, Bold Sale, Neon |
| **Finance & Banking** | Corporate/B2B | Data/Stats Driven, Minimalist Premium | Playful/Fun, Meme, Neon/Cyberpunk |
| **Fashion / Luxury** | Luxury/Fashion | Cinematic Brand, Editorial/Magazine | Bold Sale, Meme, Playful/Fun |
| **Fitness / Sports** | High-Energy Athletic | UGC/Creator, Bold Sale/Promo | Pastel/Soft, Luxury/Fashion, Corporate |
| **Gaming** | Neon/Cyberpunk | Playful/Fun, High-Energy Athletic | Corporate/B2B, Pastel/Soft, Editorial |
| **Education** | Tutorial/How-To | Corporate/B2B, Playful/Fun | Neon/Cyberpunk, Luxury/Fashion |
| **Real Estate** | Luxury/Fashion | Cinematic Brand, Minimalist Premium | Meme, Playful/Fun, Bold Sale |
| **Beauty / Cosmetics** | Pastel/Soft | UGC/Creator, Luxury/Fashion | Corporate/B2B, Data/Stats |
| **Music / Entertainment** | Neon/Cyberpunk | Retro/Vintage, Playful/Fun | Corporate/B2B, Tutorial |
| **Travel** | Cinematic Brand | Warm Lifestyle, UGC/Creator | Corporate/B2B, Data/Stats |
| **B2B / Enterprise** | Corporate/B2B | Data/Stats Driven, Tech/SaaS Demo | Meme, Playful, UGC |
| **Indie / Maker** | Tech/SaaS Demo | Glassmorphism, Meme/Native Social | Corporate/B2B, Luxury/Fashion |
| **Children's Products** | Playful/Fun | Warm Lifestyle, Tutorial/How-To | Luxury/Fashion, Neon/Cyberpunk, Corporate |
| **Automotive** | Cinematic Brand | High-Energy Athletic, Minimalist Premium | Playful/Fun, Meme, Pastel/Soft |
| **Apps / Social** | Meme/Native Social | UGC/Creator, Playful/Fun | Cinematic Brand, Corporate/B2B |

### Goal-to-Style Mapping (Detailed)

| Marketing Goal | Context | Recommended Styles |
|---|---|---|
| **Awareness — premium brand** | Building long-term brand perception | Minimalist Premium, Cinematic Brand, Luxury/Fashion |
| **Awareness — mass market** | Reaching a broad audience quickly | High-Energy Athletic, Playful/Fun, Meme/Native Social |
| **Consideration — B2B** | Educating professional buyers | Corporate/B2B, Data/Stats Driven, Tech/SaaS Demo |
| **Consideration — B2C** | Warming up potential customers | Warm Lifestyle, Social Proof/Testimonial, Tutorial/How-To |
| **Conversion — sale** | Driving immediate purchase | Bold Sale/Promo, UGC/Creator, Social Proof/Testimonial |
| **Conversion — trial/signup** | Getting users into the product | Tech/SaaS Demo, Glassmorphism, Tutorial/How-To |
| **Engagement — social** | Maximizing likes/shares/saves | Meme/Native Social, Playful/Fun, UGC/Creator |
| **Launch — product** | Announcing something new | Announcement/Launch, Minimalist Premium, High-Energy Athletic |
| **Retargeting** | Re-engaging previous visitors | Social Proof/Testimonial, Bold Sale/Promo, UGC/Creator |

### Tone/Mood Keyword Mapping

| Keyword(s) | Recommended Style(s) |
|---|---|
| clean, minimal, simple, sleek | Minimalist Premium, Glassmorphism |
| bold, powerful, intense, energetic | High-Energy Athletic, Neon/Cyberpunk |
| warm, friendly, approachable, cozy | Warm Lifestyle, Pastel/Soft |
| professional, reliable, trustworthy | Corporate/B2B, Data/Stats Driven |
| urgent, sale, discount, limited, hurry | Bold Sale/Promo |
| cinematic, dramatic, epic, filmic | Cinematic Brand |
| authentic, real, raw, creator | UGC/Creator Style |
| vintage, nostalgic, retro, classic | Retro/Vintage |
| futuristic, neon, cyber, glitch | Neon/Cyberpunk |
| calm, gentle, soft, wellness, zen | Pastel/Soft |
| fun, playful, bouncy, cheerful | Playful/Fun |
| elegant, luxury, premium, refined | Luxury/Fashion |
| editorial, magazine, journalistic | Editorial/Magazine |
| proof, reviews, testimonials, trust | Social Proof/Testimonial |
| data, stats, numbers, metrics | Data/Stats Driven |
| announcement, launch, reveal, new | Announcement/Launch |
| tutorial, how-to, guide, steps | Tutorial/How-To |
| meme, native, trending, informal | Meme/Native Social |
| modern, glass, frosted, UI | Glassmorphism/Modern UI |

---

## 4. Style Mixing Rules

### Compatible Combinations (Primary + Secondary)

| Primary Style (80%) | Compatible Secondary (20%) | How They Mix |
|---|---|---|
| **Minimalist Premium** | Tech/SaaS Demo | Dark mode minimal with clean feature callouts |
| **Minimalist Premium** | Luxury/Fashion | Serif accent on minimal background for refined feel |
| **High-Energy Athletic** | Bold Sale/Promo | Athletic energy with urgency pricing overlay |
| **High-Energy Athletic** | UGC/Creator | Raw action footage feel with aggressive captions |
| **Warm Lifestyle** | Social Proof/Testimonial | Warm aesthetic with testimonial cards integrated |
| **Warm Lifestyle** | Pastel/Soft | Even softer warm approach for wellness-adjacent lifestyle |
| **Tech/SaaS Demo** | Glassmorphism | Dark demo with frosted glass feature cards |
| **Tech/SaaS Demo** | Data/Stats Driven | Feature showcase enhanced with count-up metrics |
| **Tech/SaaS Demo** | Corporate/B2B | Professional demo with enterprise trust elements |
| **Bold Sale/Promo** | UGC/Creator | Authentic urgency — feels like a creator sharing a deal |
| **Cinematic Brand** | Luxury/Fashion | Film-quality reveal of luxury products |
| **Cinematic Brand** | Editorial/Magazine | Journalistic authority with cinematic production |
| **UGC/Creator** | Social Proof/Testimonial | Creator-style video with integrated proof elements |
| **Retro/Vintage** | Warm Lifestyle | Nostalgic warmth with lifestyle product integration |
| **Neon/Cyberpunk** | Playful/Fun | Bright neon energy with bouncy, fun animations |
| **Neon/Cyberpunk** | High-Energy Athletic | Dark aggressive energy with neon accent |
| **Pastel/Soft** | Glassmorphism | Frosted glass cards on pastel mesh — premium wellness |
| **Corporate/B2B** | Data/Stats Driven | Trust-building with evidence (most natural B2B combination) |
| **Editorial/Magazine** | Data/Stats Driven | Journalistic authority backed by data visualization |
| **Announcement/Launch** | any style | Launch structure (build-reveal-celebrate) works with any visual style for the post-reveal |

### Incompatible Combinations (Never Mix)

| Style A | Style B | Why They Clash |
|---|---|---|
| **Minimalist Premium** | **Bold Sale/Promo** | Premium restraint vs. urgency chaos — contradictory signals |
| **Luxury/Fashion** | **Meme/Native Social** | Exclusivity destroyed by casual informality |
| **Luxury/Fashion** | **Bold Sale/Promo** | Luxury does not discount — price urgency breaks prestige |
| **Cinematic Brand** | **Playful/Fun** | Dramatic gravitas ruined by bouncy confetti |
| **Corporate/B2B** | **Neon/Cyberpunk** | Professional trust undermined by dark club aesthetic |
| **Corporate/B2B** | **Meme/Native Social** | Enterprise credibility destroyed by meme format |
| **Pastel/Soft** | **High-Energy Athletic** | Calm zen shattered by explosive urgency |
| **Pastel/Soft** | **Bold Sale/Promo** | Gentle nurturing contradicts urgent FOMO |
| **Retro/Vintage** | **Glassmorphism** | Analog nostalgia clashes with futuristic digital polish |
| **Tutorial/How-To** | **Cinematic Brand** | Instructional clarity contradicts atmospheric ambiguity |
| **Luxury/Fashion** | **Playful/Fun** | Refined exclusivity vs. childlike bouncy energy |

### The 80/20 Hybrid Rule

When combining two styles:

1. **Primary style (80%)** controls: background type, gradient preset, font stack, overall color palette, transition style, and pacing.
2. **Secondary style (20%)** contributes: one accent animation preset, one element type (e.g., a data counter in an otherwise lifestyle video), or a single scene that breaks from the primary pattern.
3. **Never mix more than two styles.** Three-way combinations always feel unfocused.
4. **The primary style determines the hook.** The first 3 seconds must be pure primary-style visual language. Secondary elements appear in the middle.
5. **The CTA scene reverts to primary.** The final scene should feel like the primary style, reinforced.

---

## 5. Style-to-Config Quick Reference

### Config Snapshot per Style

| # | Style | Background | Font Stack | Key Animation Presets | Transition | Scenes (15s) | Text Position | Density (1–5) |
|---|---|---|---|---|---|---|---|---|
| 1 | Minimalist Premium | Solid `#FFFFFF` or `#0A0A0A` | Minimal Clean (DM Sans + Inter) | `scale-slam`, `pop-in`, `character-cascade` | `soft-dissolve` | 3–4 | Center | 1 |
| 2 | High-Energy Athletic | Solid `#0A0A0A` + `gritty-texture` | Bold Athletic (Bebas Neue + Roboto) | `whip-text`, `stacked-slam`, `impact-frame`, `color-flash` | `whip-pan`, `glitch-cut` | 5–7 | Diagonal, center | 2 |
| 3 | Warm Lifestyle | `Warm Amber` gradient | Warm Lifestyle (Montserrat + Lora + Caveat) | `fade-up`, `elastic-pop`, `bounce-caption`, `ken-burns` | `soft-dissolve`, `iris-bounce` | 3–4 | Center, lower-third | 3 |
| 4 | Tech/SaaS Demo | `Midnight Ocean` gradient | Premium Tech (Sora + Inter + Space Mono) | `slide-from-left`, `feature-callout`, `typewriter`, `stats-counter` | `spring-slide-left` | 4–5 | Left-aligned, center | 4 |
| 5 | Bold Sale/Promo | `Power Gradient` or solid red | Urgency / Sale (Anton + Open Sans + Roboto Mono) | `text-slam`, `price-strike`, `countdown-urgency`, `swipe-cta` | `clock-sweep-fast`, `whip-pan` | 4–5 | Center, filling frame | 5 |
| 6 | Cinematic Brand | `Royal Night` + `film-look-cool` | Elegant Luxury (Playfair Display + Raleway) | `blur-in`, `wipe-reveal`, `dolly-push`, `z-drift`, `film-grain` | `soft-dissolve` (long), `noise-dissolve` | 2–3 | Center, lower-third | 1 |
| 7 | UGC/Creator | Photo/video bg + `handheld-shake` | Montserrat 700 + Caveat 700 | `karaoke-caption`, `comment-response`, `pill-caption`, `bounce-caption` | Hard cut, `whip-pan` | 4–5 | Center (full middle third) | 3 |
| 8 | Retro/Vintage | `Autumn Harvest` + `film-grain` heavy | Retro Pop (Righteous + Poppins + Dancing Script) | `fade-up`, `blur-in`, `ken-burns`, `film-look-warm`, `bokeh-drift` | `rgb-split`, `noise-dissolve` | 3–4 | Center | 2 |
| 9 | Neon/Cyberpunk | Near-black + `scan-lines` + neon glow | Premium Tech (Sora + Inter + Space Mono) | `glitch-corrupt`, `neon-pulse`, `chromatic-aberration`, `data-stream` | `glitch-cut`, `rgb-split` | 4–6 | Center, offset diagonal | 3 |
| 10 | Pastel/Soft | `Cotton Candy` or `Lavender Cloud` | Health & Wellness (Nunito Sans + Lexend + Lora) | `fade-up`, `blur-in`, `floating-orbs`, `sparkle-scatter` | `soft-dissolve` (extra long) | 2–3 | Center | 1 |
| 11 | Corporate/B2B | `Deep Blue Sea` or solid `#F3F4F6` | Corporate Trust (Oswald + Lato) | `fade-up`, `stats-counter`, `metric-trio`, `progress-reveal`, `checklist-reveal` | `soft-dissolve`, `spring-slide-left` | 4–5 | Left-aligned, center | 4 |
| 12 | Playful/Fun | `Mint Sorbet` or `Tropical Punch` | Playful Creative (Poppins + Nunito Sans + Pacifico) | `elastic-pop`, `bounce-caption`, `confetti-burst`, `emoji-rain`, `shape-rain` | `iris-bounce`, `star-wipe`, `flip-bounce` | 4–5 | Center | 4 |
| 13 | Luxury/Fashion | `Black Gold` or solid `#0A0A0A` | Elegant Luxury (Playfair Display + Raleway) | `character-cascade`, `wipe-reveal`, `blur-in`, `z-drift`, `sparkle-scatter` | `soft-dissolve` (60+ frames) | 2–3 | Center | 1 |
| 14 | Editorial/Magazine | Solid white or solid dark | Editorial Magazine (Playfair Display + Source Sans 3 + Roboto Mono) | `wipe-reveal`, `curtain-wipe-reveal`, `animated-underline`, `typewriter` | `venetian-blinds`, `split-screen-pinch` | 3–4 | Upper-third, left-aligned | 3 |
| 15 | Social Proof | Solid `#F5F5F5` or `Arctic Frost` | Warm Lifestyle (Montserrat + Lora + Caveat) | `proof-stack`, `quote-card`, `testimonial-stack`, `stats-counter` | `soft-dissolve`, `grid-reveal` | 3–4 | Center | 3 |
| 16 | Data/Stats | `Midnight Ocean` or solid light | Data-Driven (Barlow Condensed + Inter + Space Mono) | `stats-counter`, `metric-trio`, `progress-reveal`, `timeline-milestone` | `soft-dissolve`, `elastic-wipe-up` | 3–4 | Center for numbers | 3 |
| 17 | Announcement/Launch | Dark pre-reveal → brand gradient post | Premium Tech (Sora + Inter) | Pre: `typewriter`, `countdown-timer`. Post: `confetti-burst`, `scale-slam`, `sparkle-scatter` | `zoom-through` (at reveal), `circle-burst` | 4–5 | Center | 1→4 (pre→post) |
| 18 | Tutorial/How-To | `Midnight Ocean` or solid light | Premium Tech (Sora + Inter + Space Mono) | `numbered-steps`, `checklist-reveal`, `feature-callout`, `slide-from-left` | `spring-slide-left`, `elastic-wipe-up` | 4–5 | Left-aligned stack | 3 |
| 19 | Meme/Native Social | Photo/screenshot, solid black/white | Bebas Neue or Montserrat 700 + Caveat | `pill-caption`, `comment-response`, `emoji-rain`, `bold-claim`, `handheld-shake` | Hard cut only | 4–6 | Top/bottom meme position | 2 |
| 20 | Glassmorphism | Dark mesh + `liquid-gradient` | Premium Tech (Sora + Inter) or Minimal Clean (DM Sans + Inter) | `fade-up`, `blur-in`, `slide-from-left`, `floating-orbs`, `liquid-gradient` | `soft-dissolve`, `spring-slide-left` | 3–4 | Inside glass panels | 3 |

---

## Sources

Research compiled from analysis of brand motion design systems (Apple WWDC, Nike advertising archives), industry creative trend reports, and platform-specific advertising research:

- [Envato - Video and Motion Design Trends 2026](https://elements.envato.com/learn/video-motion-design-trends)
- [Motion App - 2025 Ad Creative Trends](https://motionapp.com/creative-trends)
- [FilterGrade - Motion Graphics Trends for 2026](https://filtergrade.com/motion-graphics-trends-that-will-shape-2026-and-how-creators-can-prepare-their-templates-early/)
- [Pixflow - Motion Design Trends 2025](https://pixflow.net/blog/2025-motion-design-trends/)
- [Lummi - Popular Motion Graphics Trends 2025](https://www.lummi.ai/blog/motion-graphics-trends)
- [Motiongility - Kinetic Typography Brand Examples](https://motiongility.com/kinetic-typography/)
- [MotionCue - Best Nike Commercials Analysis](https://motioncue.com/best-nike-commercials-and-why-theyre-so-effective/)
- [Influee - UGC Ads Guide](https://influee.co/blog/ugc-ads)
- [NNGroup - Glassmorphism Definition and Best Practices](https://www.nngroup.com/articles/glassmorphism/)
- [Envato - Vintage Film Styles](https://elements.envato.com/learn/vintage-film-styles)
- [Accio - Cyberpunk Design Trends 2025](https://www.accio.com/business/cyberpunk_design_trend)
- [Pulse Advertising - Meme Culture in Social Media Marketing 2026](https://www.pulse-advertising.com/resources/social-media-news/meme-culture-social-media-marketing-2026/)
- [Mediaboom - Luxury Ads Examples](https://mediaboom.com/news/luxury-ads/)
- [Advids - B2B Video Ads Examples](https://advids.co/blog/30-b2b-video-ads-examples-to-supercharge-your-next-campaigns)
