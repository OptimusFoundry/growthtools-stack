# Video Advertising & Motion Design Research

Research on how advertisers, cinematographers, and premium brands create attention-seeking video ads. Covers hook techniques, Apple/Nike motion patterns, kinetic typography trends, UGC ad formulas, and cinematography principles — all mapped to implementable motion presets.

---

## 1. The Attention Window

- Users decide to scroll or stop within **0.5–1.7 seconds**
- Scroll speed has increased **41% since 2020**
- A good 3-second view rate is **70–80%+** — losing 35%+ means the hook is broken
- Videos with strong 3-second holds get **4–7x more algorithmic impressions**
- **85% of social media videos** are watched without sound
- Avoid logos/brand names in first 2 seconds — they signal "ad" and trigger skip

---

## 2. Hook Techniques (First 0–3 Seconds)

### Motion-Based Hooks

| Technique | Description | Psychology | Preset Idea |
|---|---|---|---|
| **Crash Zoom** | Extremely fast zoom into subject, resolving in 0.3–0.5s | Involuntary motion tracking bypasses conscious decision | `crash-zoom-in`: scale 200%→100% with motion blur in 10 frames |
| **Whip Pan Open** | Rapid horizontal pan with motion blur streak, landing on subject | Same motion-tracking reflex | `whip-pan-reveal`: horizontal blur streak resolving to sharp |
| **Already-In-Motion** | Video starts mid-movement (spinning, running, flying in) | Movement = important (evolutionary threat detection) | `mid-motion-start`: scene begins at frame 15 of an animation |
| **Slow Motion Contrast** | Hyper slow-mo in first 1–2s, then snap to real-time | Contrast with fast-scrolling feed creates "eye of the storm" | `slo-mo-snap`: 0.25x speed for 45 frames, then 1x |
| **Zoom-In Reveal** | Opens on macro close-up, slowly zooms out to reveal full context | Curiosity gap — brain resolves ambiguity | `macro-reveal`: scale 400%→100% over 60 frames with DOF blur |

### Text-Based Hooks

| Technique | Description | Psychology | Preset Idea |
|---|---|---|---|
| **Kinetic Slam** | Bold text slams onto screen at high velocity | Large text entering with force reads as important/urgent | `text-slam`: translateY(-200)→0 in 6 frames with screen shake |
| **Blurred Text Focus** | Text starts heavily blurred, resolves to sharp over 1–2s | Brain compelled to resolve visual clarity | `focus-pull-text`: blur(40px)→0 over 45 frames |
| **Typing Effect** | Characters appear one-by-one with cursor blink | Creates rhythm + curiosity gap (incremental message reveal) | Already in presets as `typewriter` |
| **Bold Claim Overlay** | Large high-contrast text on solid color, no imagery | Cuts through complex feed environments; works sound-off | `bold-claim`: full-frame text, scale-in from 120% |

### Pattern Interrupt Hooks

| Technique | Description | Psychology | Preset Idea |
|---|---|---|---|
| **Color Reveal** | Opens black & white, transitions to full color at key moment | Desaturation = incompleteness; color = reality/presence | `desat-to-color`: saturation 0→100% over 15 frames, radial wipe from product |
| **Reverse Physics** | Product drops filmed in reverse — objects fly UP into hand | Visual system expects gravity; violation forces full attention | `reverse-reveal`: time-reverse with speed ramp |
| **POV / Unusual Angle** | Opens from inside a bag, fridge, box — lid opening reveals | Missing spatial context forces brain to resolve orientation | `pov-reveal`: iris-expand from center with light bloom |
| **Before/After Split** | Screen divided showing two states simultaneously | Split creates visual tension; brain compelled to compare | Already in presets as `before-after-slider` |

### UI/Format-Native Hooks

| Technique | Description | Psychology | Preset Idea |
|---|---|---|---|
| **Fake ChatGPT UI** | Opens with familiar chat interface, hook typed as AI response | Known interface signals "safe to engage," bypasses ad reflex | `chat-ui-hook`: chat bubble typing animation with UI chrome |
| **Incoming Call** | Full-screen phone call UI with "slide to answer" | Conditioned behavioral response — everyone checks a ringing phone | `incoming-call`: caller card + swipe animation |
| **TikTok Comment** | Skeptical comment overlaid, creator responds | Negativity bias causes attention spike | `comment-response`: comment bubble slides down with spring pop |

---

## 3. Apple's Motion Design System

### Core Principles
- **San Francisco font** in heavy/bold weights on minimal backgrounds
- "Less is more" — simple letterforms that never compete with the product
- **White background + dark product** for maximum contrast, zero distraction
- **Black backgrounds** for Pro product lines (premium/power)
- Product color fidelity is paramount — clinical neutrality in grading
- **Three focal points maximum**: product, tagline, logo — nothing else

### Apple's Motion Patterns

| Pattern | Description | Implementation |
|---|---|---|
| **Scale-Slam** | Text starts at 150–200% scale, hard ease-out to 100% with slight overshoot | `spring({ stiffness: 300, damping: 15 })` on scale, with bass hit audio sync |
| **Pop-in** | 0% opacity → 100% in 1–2 frames, no ease, with micro scale (100→102→100%) | `Easing.step0` for opacity, `spring()` for micro-scale |
| **Wipe Reveal** | Mask travels across text revealing letterforms progressively | `clipPath` via `interpolate()`, synced to horizontal product reveal |
| **Character Cascade** | Per-character stagger with scale + opacity, 1–4 frame delay between chars | `spring()` per char with `delay` increments |
| **Parallax Float** | Text and product on separate depth layers, different movement rates | Multiple `<AbsoluteFill>` with different `interpolate()` multipliers |
| **Zoom-Through** | Camera pushes through oversized letterforms | Scale text beyond 100%, viewer "passes through" the word |
| **Spring Settle** | Overshoot + settle physics on text placement | `spring({ overshootClamping: false })` — Hooke's Law |
| **Beat-Locked Cut** | Edit cut, text entrance, product reveal all on same downbeat | Frame-precise timing aligned to audio transients |

### Apple's Timing Rules
- **Ease-out** for things slamming into position (fast start, gradual stop)
- **Ease-in-out** for transitions between scenes
- **Spring physics** for product reveals and UI animations
- Maintain direction of animations — viewer's eye follows the animation path
- **24fps for cinematic**, 30fps for digital/social
- Short, snappy text — no sentence longer than necessary

---

## 4. Nike's High-Energy Motion System

| Pattern | Description |
|---|---|
| **Impact Frame** | Single frame of athlete at peak exertion + large text, cut to black, next shot |
| **Whip Text** | Text enters from offscreen at extreme speed with motion blur, stops hard |
| **Color Flash** | White or black single-frame flash between cuts — resets eyes |
| **Diagonal Text** | Typography on diagonal axes echoing athletic body positions |
| **Stacked Words** | Single words stacked vertically, animating in one at a time |
| **Beat-Synced Pulse** | Text scale oscillates 100%→108%→100% on each music beat |
| **Gritty Texture** | Film grain + high contrast + kinetic text — raw, rebellious feel |

### Nike vs Apple — The Contrast

| Aspect | Apple | Nike |
|---|---|---|
| Energy | Controlled, precise, calm | Explosive, urgent, raw |
| Typography | Clean sans-serif, generous spacing | Compressed bold, uppercase, tight |
| Background | White or black, clinical | Gritty textures, high saturation |
| Motion | Smooth ease-out, spring settle | Hard stops, whip entries, impact cuts |
| Color | Neutral, product carries color | High contrast, dopamine colors |
| Timing | Deliberate, measured beats | Aggressive, staccato rhythm |

---

## 5. Kinetic Typography Trends (2025–2026)

### Trending Text Animation Styles

| Style | Description | Implementation Notes |
|---|---|---|
| **3D Typography** | Letters rotate, extrude, respond to virtual lighting | `@remotion/three` with `ThreeCanvas`, or CSS `perspective` + `rotateX/Y` |
| **Liquid Morphing** | Text flows and morphs between words/shapes | `interpolatePath()` between letterform SVG paths |
| **Bubble Typography** | Soft, inflated letterforms with gradients | Custom SVG paths with `warpPath()`, gradient fills |
| **Glitch/Fragmented** | Distorted type simulating digital interference | `noise2D()` for displacement, RGB channel separation |
| **Kinetic Loops** | Short rhythmic text bursts that repeat seamlessly | `<Loop>` with beat-synced `interpolate()` |
| **Retro Futurist** | Neon palettes, chrome, VHS textures, scan lines | Combine `neon-pulse` + `scan-lines` + `film-grain` presets |
| **Glassmorphism Text** | Frosted glass panels behind text for depth + legibility | CSS `backdrop-filter: blur()` + transparency overlay |

### Key Performance Data
- Ads with strong **color contrast** improve recall by ~30%
- **7:1 contrast ratio** between text and background is the benchmark
- **Gradient backgrounds behind text reduce legibility** — solid blocks outperform
- Key stats appearing as text AND spoken increase recall by **~40%**
- Morphing/liquid effects hold attention longest — organic fluid motion > discrete cuts
- 200–500ms is the sweet spot for micro-moment emphasis animations

---

## 6. High-Converting Ad Structures

### The Universal Conversion Framework
```
Hook (0-3s) → Problem (3-8s) → Agitation (8-15s) → Solution (15-25s) → Proof (25-35s) → CTA (35s+)
```

### Visual Execution Per Beat

| Beat | Visual Pattern | Motion Style |
|---|---|---|
| **Hook** | Bold text + face or product in motion | Fastest pacing, highest contrast, most movement |
| **Problem** | Tight shot of frustrated face or broken status quo | Moderate pace, empathetic framing |
| **Agitation** | Fast-cut montage of pain points repeating | Accelerating rhythm, 1–2s clips |
| **Solution** | Product revealed — float animation, zoom, slow cut | Deliberate deceleration, negative space |
| **Proof** | Testimonial clips or review overlays, 2–3s each | Stacked proof, rapid micro-testimonials |
| **CTA** | Urgency element + clear action text | High contrast, pulsing, countdown |

### Caption Styles That Convert

| Style | Description | Best For |
|---|---|---|
| **Karaoke/Hormozi** | Word-by-word color highlight synced to speech | UGC, talking-head ads |
| **Pop-in** | Each word/phrase pops in from scale 0 | Energetic product ads |
| **Bounce** | Words bounce down from above | Fun, lifestyle brands |
| **Kinetic Zoom** | Key words grow to 150% momentarily | Emphasis on claims |
| **All-caps Bold Pill** | Full phrase in rounded box, maximum readability | Accessibility, noisy feeds |

### Product Shot Animation

| Motion | Description | Use Case |
|---|---|---|
| **Float/Levitate** | Gentle sine-wave vertical hover with shadow scaling | Hero product frames |
| **360° Rotation** | Seamless turntable spin showing all faces | Physical products |
| **Ken Burns Push** | Slow 10–20% zoom-in over 3–5s on still photo | Still photography → video |
| **Unbox Reveal** | Package enters from below, lid opens, product emerges with light change | Launch moments |
| **Ingredient Callout** | Labels fly in with line-leaders pointing to product parts | Supplements, skincare, food |

---

## 7. Cinematography Principles for Motion Graphics

### Camera Movement Simulation

| Camera Move | Emotion | Motion Graphics Equivalent |
|---|---|---|
| **Dolly In** (push-in) | Increasing importance, intimacy | Scale up slowly + parallax layers |
| **Dolly Out** (pull-out) | Context, scale, distance | Scale down + reveal surrounding elements |
| **Dolly Zoom** (vertigo) | Shock, realization, paradigm shift | Scale background inversely to subject |
| **Tracking Shot** | Journey, immersion | Horizontal parallax layers at different speeds |
| **Crane Up** | Grandeur, aspiration | Vertical pan with parallax |
| **Handheld Shake** | Authenticity, urgency | `noise2D()` applied to position with subtle amplitude |
| **Whip Pan** | Energy, speed, transition | Fast horizontal blur + `<CameraMotionBlur>` |

### Color Psychology Quick Reference

| Color | Emotion | Ad Use |
|---|---|---|
| **Red** | Urgency, excitement, hunger | CTAs, flash sales, food |
| **Orange** | Friendliness, confidence, value | CTA buttons (outperforms green by 2.4%, blue by 3.1%) |
| **Yellow** | Optimism, attention-grabbing | Highlight accents, sale callouts |
| **Green** | Health, growth, permission | Wellness, "go" states, positive confirmation |
| **Blue** | Trust, security, professionalism | Finance, tech, testimonials |
| **Purple** | Luxury, creativity, mystery | Beauty, premium products |
| **Black** | Sophistication, power, exclusivity | Luxury brands, pro products |
| **White** | Cleanliness, simplicity | Minimalist, premium (Apple) |

### Visual Hierarchy — The Four Tools

1. **Size** — Largest element perceived first. Key message fills 60–70% of frame height.
2. **Contrast** — Eye goes to highest contrast point. Maximize at offer reveal + CTA.
3. **Motion** — In a composition, the eye ALWAYS goes to what is moving. Animate only what matters at each moment.
4. **Position** — Western audiences scan F-pattern or Z-pattern. CTAs at bottom-right intersection outperform centered.

### Depth and Parallax Layers

| Layer | Speed | Example |
|---|---|---|
| **Extreme background** | 10–20% of camera speed | Sky, distant gradient |
| **Mid-ground** | 40–60% | Buildings, shapes, patterns |
| **Subject** | 80–100% (or fixed) | Product, main text |
| **Foreground** | 120–150% + blur | Bokeh, particles, decorative elements |

### Pacing Rules

| Ad Beat | Pacing | Clip Length |
|---|---|---|
| **Hook (0–3s)** | Fastest, highest contrast, most movement | 0.3–1.0s |
| **Story (3–20s)** | Moderate, let product breathe | 2–5s |
| **Product reveal** | Slow push-in, shallow DOF, negative space | 2–4s hold |
| **CTA (final 5s)** | Re-accelerate with urgency | Clean, static hold |

---

## 8. New Preset Ideas from Research

Based on this research, here are preset concepts not covered in the existing 92:

### Hook Presets (NEW category)

| Name | Description | APIs |
|---|---|---|
| `crash-zoom-in` | Scene opens at 200% scale with motion blur, springs to 100% in 10 frames | `spring()`, `<CameraMotionBlur>`, `scale()` |
| `whip-pan-reveal` | Horizontal motion blur streak resolving to sharp scene | `<CameraMotionBlur>`, `translateX()`, `interpolate()` |
| `focus-pull` | Entire scene starts at blur(30px), resolves to sharp over 1.5s | `interpolate()` for CSS `filter: blur()` |
| `desat-to-color` | Opens desaturated, color bleeds in radially from center | `interpolateColors()`, radial `clipPath` |
| `screen-shake` | 3–5 frame violent position jitter on text impact | `noise2D()` for X/Y position, high amplitude for 5 frames |
| `slo-mo-snap` | Scene plays at 0.25x speed, then snaps to 1x at beat | `playbackRate` on `<Video>`, frame-based speed control |

### Apple-Style Presets (NEW)

| Name | Description | APIs |
|---|---|---|
| `scale-slam` | Text at 180% scale, ease-out to 100% with slight spring overshoot + bass thud timing | `spring({ stiffness: 300, damping: 15 })`, `scale()` |
| `pop-in` | 0→100% opacity in 2 frames, micro scale 100→102→100% | `Easing.step0`, `spring()` for scale settle |
| `wipe-reveal` | Horizontal mask travels across text revealing letterforms | `clipPath: inset()` via `interpolate()` |
| `parallax-depth` | Multiple layers at different speeds create 2.5D depth | Stacked `<AbsoluteFill>` with different `interpolate()` multipliers |
| `zoom-through-text` | Text scales beyond 100%, viewer "passes through" | `interpolate()` scale 100→500% with `Easing.in(Easing.cubic)` |

### Nike-Style Presets (NEW)

| Name | Description | APIs |
|---|---|---|
| `impact-frame` | Single bright frame flash on text landing | White `<AbsoluteFill>` at 100% opacity for 2 frames via `Easing.step0` |
| `whip-text` | Text enters at extreme speed with motion blur, hard stop | `<CameraMotionBlur>`, `spring({ stiffness: 500 })`, `translateX()` |
| `stacked-slam` | Words stack vertically, each slamming in one-by-one from above | Per-word `spring()` with stagger, `translateY()` |
| `diagonal-text` | Typography placed on 15–30° diagonal | CSS `transform: rotate()`, positioned on diagonal grid |
| `beat-pulse` | Text scale oscillates 100→108→100% on beat intervals | `interpolate(Math.sin(frame * beatFreq))` for scale |

### Performance Ad Presets (NEW)

| Name | Description | APIs |
|---|---|---|
| `countdown-urgency` | Live-updating countdown timer with pulsing color (green→red) | `interpolate()` for time, `interpolateColors()` for urgency |
| `price-strike` | Old price with animated strikethrough line, new price bounces in | `evolvePath()` for strikethrough, `spring()` for new price |
| `proof-stack` | Star rating counts up, review count increments, badges slide in | `interpolate()` for count-up, `spring()` with stagger for badges |
| `product-float` | Product hovers on sine wave with shadow scaling beneath | `interpolate(Math.sin())` for translateY, `scale()` for shadow |
| `karaoke-caption` | Word-by-word highlight synced to speech timing | Per-word `<Sequence>`, `interpolateColors()` for active word highlight |
| `ingredient-callout` | Labels fly in with animated connector lines to product | `spring()` per label with stagger, `evolvePath()` for connectors |

### Cinematographic Presets (NEW)

| Name | Description | APIs |
|---|---|---|
| `dolly-push` | Slow push-in simulated via parallax + slight scale increase | Multi-layer parallax, `interpolate()` scale 100→110% |
| `dolly-zoom` | Background scales inversely to foreground — vertigo effect | `interpolate()` background scale down while camera pushes in |
| `handheld-shake` | Subtle organic camera shake for authenticity | `noise2D()` for X/Y position wiggle, 2–4px amplitude |
| `speed-ramp` | Fast motion → sudden slow → resume normal speed | Frame-based `playbackRate` changes via `interpolate()` |
| `z-drift` | Continuous slow Z-axis push-in throughout scene | `interpolate()` scale 100→103% over full scene duration |

---

## 9. Key Takeaways for Our System

1. **Motion is mandatory** — every text element needs at least one motion event
2. **Silent-first design** — text must carry the full message without sound
3. **First 3 seconds = the entire bet** — hook must be kinetic, bold, text-forward
4. **Contrast is not optional** — 7:1 text-to-background minimum
5. **Layering creates value** — 4–6 motion layers (footage, grade, text, particles, overlay) looks produced
6. **Spring physics > linear easing** — natural motion feels premium
7. **Beat-sync everything** — visual motion events on rhythmic intervals even in silence
8. **Three focal points max** — product, tagline, CTA — nothing else
9. **Negative space = premium** — clear the frame for the key moment
10. **Speed variation = attention** — fast→slow→fast rhythm holds viewers

---

## Sources

Over 60 sources consulted across Motion App, OpusClip, Linearity, The Brand Identity, Apple Developer (WWDC23), CSS-Tricks, Envato, MasterClass, School of Motion, HubSpot, Hatch Studios, and others. Full source lists available in individual research sections.
