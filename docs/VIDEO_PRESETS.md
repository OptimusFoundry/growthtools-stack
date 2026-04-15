# Video Preset Library

A comprehensive catalog of reusable animation presets for the universal video composition system. Each preset combines Remotion primitives into a named effect that the AI can reference when generating video configs.

---

## 1. Text Animation Presets

### Entrance Animations

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 1 | `fade-up` | Text fades in while translating upward from below | `interpolate()`, `Easing.out(Easing.cubic)`, `makeTransform` | Simple | Any text, subtitles |
| 2 | `elastic-pop` | Text scales up from near-zero with springy overshoot | `spring({ mass: 0.6, damping: 8, stiffness: 180 })`, `makeTransform([scale()])` | Simple | CTAs, hooks, brand names |
| 3 | `blur-in` | Text materializes from heavy gaussian blur to sharp focus | `interpolate()` for blur radius + opacity, CSS `filter: blur()` | Simple | Quotes, cinematic titles |
| 4 | `typewriter` | Characters appear one at a time with blinking cursor | `interpolate()` for visible char count, `Easing.step1` for cursor blink | Simple | Code, AI narration, suspense |
| 5 | `slide-from-left` | Text slides in from off-screen left with smooth deceleration | `spring({ damping: 14, stiffness: 120, overshootClamping: true })`, `translateX()` | Simple | Headlines, step lists |
| 6 | `split-word-cascade` | Each word flies in independently with staggered delay | Per-word `spring()` with stagger, `translateY()`, `opacity` | Medium | Quotes, taglines, lyrics |
| 7 | `char-scatter-assemble` | Characters start at random positions and snap into place | `random()` for offsets, per-char `spring()`, `translateX/Y()` | Complex | Title cards, brand reveals |
| 8 | `curtain-wipe-reveal` | Solid rectangle slides across text, revealing it beneath | `spring()` for reveal block, `clipPath`, `<Rect>` from shapes | Medium | Section titles, bold statements |

### Kinetic Typography

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 9 | `wave-motion` | Characters oscillate up/down in a traveling sine wave | Per-char `Math.sin()` + `interpolate()` for translateY, `<Loop>` | Medium | Music, playful captions |
| 10 | `noise-jitter` | Characters vibrate with organic noise-driven displacement | `noise2D()` per char for X/Y, `interpolate()` for amplitude | Medium | Horror, urgent, distressed |
| 11 | `rotating-word-swap` | Single word cycles through alternatives, flipping in/out | `<Series>` per word, `spring()` for translateY entrance/exit, `overflow: hidden` | Medium | Feature lists, taglines |
| 12 | `kinetic-highlight` | Colored underline draws itself beneath key words | `measureText()`, `evolvePath()`, `interpolateColors()` | Complex | Educational, key terms |

### Stylized Text

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 13 | `glitch-corrupt` | Horizontal slice displacement + RGB channel splits | `noise2D()` for glitch intensity, triple `<AbsoluteFill>` with `mix-blend-mode: screen`, `<Freeze>` | Complex | Tech, cyberpunk, gaming |
| 14 | `neon-pulse` | Bright neon color with pulsing glow shadow, occasional flicker | `interpolate(Math.sin())` for glow, `noise2D()` for flicker, multi-layer `textShadow` | Medium | Night-life, synthwave, music |
| 15 | `gradient-flow` | Animated linear gradient sweeps across clipped text | `interpolate()` with `extrapolateRight: 'wrap'`, CSS `background-clip: text` | Simple | Brand headlines, SaaS promos |
| 16 | `rounded-caption-box` | Text inside auto-sized rounded pill background | `measureText()`, `createRoundedTextBox()`, `spring()` for scale-in | Medium | Subtitles, TikTok captions |
| 17 | `outlined-stroke-reveal` | Stroke outline visible first, then fill bleeds in left-to-right | Two layered spans, CSS `-webkit-text-stroke`, `clipPath` via `interpolate()` | Medium | Logo reveals, premium brands |

### Exit Animations

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 18 | `fade-down-exit` | Text fades out while drifting downward | `interpolate()` for opacity + translateY, `Easing.in(Easing.cubic)` | Simple | Paired with fade-up |
| 19 | `shatter-exit` | Characters fly off in different directions with rotation | Per-char `random()` for direction, `spring({ reverse: true })`, `rotate()` | Complex | Dramatic endings, high-energy |
| 20 | `blur-out-scale` | Text scales up slightly and blurs out to transparency | `interpolate()` for blur + scale + opacity, `<CameraMotionBlur>` | Medium | Cinematic transitions |

---

## 2. Scene & Background Presets

### Animated Gradients

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 1 | `aurora` | Color bands rotate and shift hue across dark canvas, mimicking northern lights | `interpolate()` with `Easing.inOut(Easing.sin)` for angle, `interpolateColors()` | Simple | Ambient intros, wellness |
| 2 | `liquid-gradient` | Colors bleed and flow organically using noise-warped color stops | `noise3D()` per channel, `interpolateColors()`, CSS `linear-gradient` rebuilt per frame | Medium | Music, fashion, lifestyle |
| 3 | `pulse-radial` | Radial gradient pulses outward rhythmically as if breathing | `interpolate()` with `extrapolateRight: 'wrap'`, `Easing.inOut(Easing.sin)`, `interpolateColors()` | Simple | Product announcements |
| 4 | `spectrum-sweep` | Rainbow gradient sweeps horizontally on a slow loop | `interpolate()` with `extrapolateRight: 'wrap'`, CSS `background-position` | Simple | Celebration, music |

### Geometric Patterns

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 5 | `hex-grid` | Hexagonal grid with staggered pulse waves from center | `random()` per hex, `interpolate()` for opacity, `<Polygon sides={6}>` | Medium | Tech, SaaS, fintech |
| 6 | `rotating-rings` | Concentric rings spin at varying speeds and directions | `interpolate()` per ring for rotation, `makeTransform([rotate()])`, `interpolateColors()` | Simple | Countdowns, sci-fi |
| 7 | `shape-rain` | Geometric shapes fall from top with randomized speeds and rotation | `random()` per shape, `interpolate()` for Y position, `<Triangle>`, `<Star>`, `<Polygon>` | Medium | Launches, giveaways |
| 8 | `grid-pulse` | Dot grid with scale/brightness ripple wave from center | `random()` per dot, `interpolate()` with `extrapolateRight: 'wrap'`, `makeTransform([scale()])` | Medium | Data, analytics |

### Particle Effects

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 9 | `starfield` | Tiny white dots drift across deep black with independent twinkle | `random()` per star, `interpolate()` for position + sine-based twinkle | Simple | Space, tech, aspirational |
| 10 | `confetti-burst` | Colored pieces burst outward from center, arc under gravity, spin | `random()` per piece, `interpolate()` for gravity arc, `<Rect>`, `<Ellipse>` | Medium | Milestones, wins |
| 11 | `floating-orbs` | Large soft-blurred circles drift with noise-driven paths, dreamy bokeh | `noise3D()` per orb for position, `<Circle>` with `filter: blur()`, `interpolateColors()` | Medium | Wellness, beauty, lifestyle |
| 12 | `sparkle-scatter` | Four-pointed star glints appear/disappear at random positions | `random()` per sparkle, `spring()` for scale, `<Star points={4}>` | Medium | Luxury, premium, beauty |

### Noise-Based

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 13 | `smoke-drift` | Dark churning smoke/fog rendered as multi-layered noise field | `noise3D()` per pixel, `@remotion/skia`, `interpolateColors()` | Complex | Dark aesthetic, music drops |
| 14 | `terrain-flow` | Noise-driven contour lines shift and flow like a living topographic map | `noise2D()`, `evolvePath()`, `warpPath()`, SVG paths per contour level | Complex | Outdoor, environmental |

### Media Backgrounds

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 15 | `ken-burns` | Static image slowly zooms and pans — classic documentary effect | `interpolate()` with `Easing.inOut(Easing.quad)`, `<Img>`, `makeTransform([scale(), translate()])` | Simple | Documentary, testimonials |
| 16 | `video-wash` | Looping B-roll at reduced opacity with color-grade overlay | `<OffthreadVideo>`, stacked `<AbsoluteFill>` for video + tint overlay | Simple | Travel, lifestyle, events |

### Abstract / Artistic

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 17 | `blob-morph` | Organic blob shapes continuously morph between each other with gradient fill | `interpolatePath()` between blob paths, `interpolate()` with `extrapolateRight: 'wrap'` | Complex | Creative agencies, design |
| 18 | `mesh-morph` | Dense mesh of connected nodes drifts via noise, edges redrawn each frame | `noise3D()` per node, `getPointAtLength()`, SVG `<line>` + `<circle>` | Complex | AI/ML, tech startups |

---

## 3. Scene Transition Presets

### Built-in Enhanced

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 1 | `soft-dissolve` | Gentle crossfade with asymmetric ease-in/ease-out overlap | `fade()`, `linearTiming` with `Easing.inOut(Easing.cubic)` | Simple | Calm, reflective pacing |
| 2 | `spring-slide-left` | Incoming scene springs in from right with physics overshoot | `slide()`, `springTiming({ stiffness: 180, damping: 12 })` | Simple | Energetic, forward-moving |
| 3 | `elastic-wipe-up` | Bottom-to-top wipe with spring overshoot causing wobble at edge | `wipe()`, `springTiming({ stiffness: 120, damping: 8, overshootClamping: false })` | Simple | Punchy, surprising reveals |
| 4 | `clock-sweep-fast` | Radial clock wipe completing in 8 frames with cubic ease-in | `clockWipe()`, `linearTiming({ durationInFrames: 8, easing: Easing.in(Easing.cubic) })` | Simple | Snappy, high-energy cuts |
| 5 | `iris-bounce` | Iris circle expands with high-stiffness spring, overshooting past full-screen | `iris()`, `springTiming({ stiffness: 300, damping: 18, mass: 0.6 })` | Simple | Playful, fun pacing |
| 6 | `flip-bounce` | Horizontal flip with spring-driven rubbery wobble at midpoint | `flip()`, `springTiming({ stiffness: 200, damping: 14 })` | Simple | Before/after comparisons |

### Custom Transitions

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 7 | `venetian-blinds` | Screen splits into horizontal strips that fold down sequentially like blinds | Custom presentation, `interpolate()`, `rotateX()`, `perspective()` | Medium | Polished editorial |
| 8 | `shatter-split` | Outgoing scene fractures into 4x4 grid tiles that scatter outward | Custom presentation, `random()` for stagger, `translate()`, `scale()` | Complex | High-impact dramatic moments |
| 9 | `zoom-through` | Outgoing scales up to 8x fading out, incoming scales down from 8x | Custom presentation, `interpolate()`, `Easing.in/out(Easing.cubic)`, `scale()` | Medium | High-energy topic changes |
| 10 | `barrel-roll` | Both scenes rotate around Z axis as if sharing a barrel roll through 3D space | Custom presentation, `springTiming`, `rotateZ()`, `perspective()` | Medium | Playful pivots |

### Shape-Masked

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 11 | `circle-burst` | Expanding circle SVG clip mask with spring overshoot burst | Custom presentation, `makeCircle()`, SVG `clipPath`, `spring()` | Medium | Energetic scene opens |
| 12 | `star-wipe` | Five-pointed star expands from center as clip mask | Custom presentation, `makeStar()`, `scalePath()`, SVG `clipPath` | Medium | Retro, playful, branded |
| 13 | `path-wipe` | Organic blob SVG path sweeps across screen as painterly reveal | Custom presentation, `evolvePath()`, `interpolatePath()`, SVG `clipPath` | Complex | Artistic, editorial |
| 14 | `polygon-split` | Two polygon masks slide from opposite edges, meet in middle | Custom presentation, `makePolygon()`, `translatePath()`, SVG `clipPath` | Complex | Bold geometric brands |

### Stylized

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 15 | `glitch-cut` | Horizontal bands offset with RGB channel shift over 6-10 frames, then hard cut | Custom presentation, `noise2D()`, `random()`, `interpolateColors()`, `Easing.step0` | Complex | Cyberpunk, hype, gaming |
| 16 | `noise-dissolve` | Organic cloud-like dissolve using 2D noise as threshold mask | Custom presentation, `noise2D()` as threshold, canvas pixel shader | Complex | Cinematic, moody |
| 17 | `rgb-split` | Scene separates into R/G/B channel layers translating apart, then hard cut | Custom presentation, CSS `mix-blend-mode`, `translateX/Y()` | Medium | VHS, analog, retro |

### Split / Multi-Panel

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 18 | `grid-reveal` | 3x3 grid cells fade/scale in with staggered random delays | Custom presentation, `random()`, `spring()` per cell with stagger, `scale()` | Medium | Gallery, product lineup |
| 19 | `whip-pan` | Fast horizontal slide with motion blur streak | Custom presentation, `spring({ stiffness: 400 })`, `<CameraMotionBlur>`, `translateX()` | Complex | Fast-paced, vlog, TikTok |
| 20 | `split-screen-pinch` | Scene splits down center, halves slide apart revealing incoming scene | Custom presentation, `springTiming`, `translateX()`, `scaleX()`, SVG `clipPath` | Medium | Dramatic reveals, versus |

---

## 4. Composite Scene Template Presets

### Data / Stats

| # | Name | Description | Layout | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|---|
| 1 | `stats-counter` | Large number counts up with circular progress arc filling simultaneously | Centered: `<Pie>` arc, large number overlaid, descriptor below | `interpolate` with easing for count-up, `spring` for container, `<Pie>` | Simple | Milestones, MRR, metrics |
| 2 | `metric-trio` | Three stat cards spring up staggered, with count-up numbers and decorative rule draw | Three horizontal cards, icon above number, label below, rule beneath all | `spring` with `delay` stagger, `interpolate` for counts, `evolvePath` for rule | Medium | Dashboards, investor updates |
| 3 | `progress-reveal` | Horizontal progress bars fill left-to-right with percentage counters | Left labels, right fill bars, percentage above fill head | `spring` for slide-in, `interpolate` for fill, `makeRect`, `interpolateColors` | Simple | Goals, skills, A/B results |

### Quote / Testimonial

| # | Name | Description | Layout | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|---|
| 4 | `quote-card` | Pull-quote scales in, then avatar springs in, then author byline slides up | Centered quote upper 60%, avatar + name row lower 30%, decorative quote mark background | `interpolate` for scale + opacity, `spring` for avatar, `<Circle>`, `<Sequence>` | Simple | Testimonials, press mentions |
| 5 | `testimonial-stack` | Review cards slide up in sequence via Series, with animated star ratings | Centered card: avatar left, stars top-right, review below, `<Series>` for multiple | `<Series>`, `spring`, `<Star>`, staggered star fill opacity | Medium | App reviews, social proof |

### Product Showcase

| # | Name | Description | Layout | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|---|
| 6 | `feature-callout` | Product image centered with feature labels springing in from different directions with connector lines | Central image 55% width, labels at edges with `evolvePath` connector lines | `<Img>`, `spring` with stagger, `evolvePath`, `createRoundedTextBox` | Complex | Product launches, app features |
| 7 | `before-after-slider` | Split screen with sliding divider revealing before/after states | Left panel: before, right panel: after, vertical divider with handle | `spring` for divider, `interpolate` for clip-path, `<Circle>` handle, `makeRect` | Medium | Redesigns, product upgrades |
| 8 | `split-compare` | Two panels slide in from opposite sides, VS badge locks in center | Two half-panels, distinct colors, VS `<Circle>` badge center | `spring` for both panels, `interpolate` for badge scale, `makeTransform` | Simple | Plan comparisons, A vs B |
| 9 | `price-reveal` | Product slides up, price tag bounces in with overshoot, strikethrough on old price | Product centered, price tag lower-right, CTA button bottom | `spring` for bounce, `evolvePath` for strikethrough, `<Img>`, `createRoundedTextBox` | Medium | Sales, product launches |

### List / Steps

| # | Name | Description | Layout | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|---|
| 10 | `numbered-steps` | Steps reveal top-to-bottom with popping number circles and drawing timeline | Left-aligned vertical list, circles + titles, vertical connector line | `<Series>`, `spring` for circles, `evolvePath` for line, `interpolateColors`, `<Circle>` | Medium | Tutorials, how-it-works |
| 11 | `checklist-reveal` | Items slide in one-by-one with checkmark path drawing inside circles | Centered vertical stack, check circle left, text right | `<Sequence>`, `evolvePath` for checkmark, `interpolateColors` for circle fill | Medium | Feature lists, benefits |
| 12 | `timeline-milestone` | Horizontal timeline draws with milestone dots popping at each point | Horizontal line 80% width, 3-5 equidistant dots, alternating labels | `evolvePath`, `getPointAtLength`, `spring` with delay, `<Circle>` | Complex | Company history, roadmap |

### Call-to-Action

| # | Name | Description | Layout | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|---|
| 13 | `cta-pulse` | Bold headline slams in, CTA button pulses continuously, animated background | Headline upper 40%, pulsing button below, noise-driven background | `spring` for slam, `interpolate(Math.sin())` for pulse, `noise3D` for background | Medium | End-of-video CTA, offers |
| 14 | `countdown-timer` | Large digits pop with depleting circular ring per second | Full-bleed dark, `<Pie>` ring centered, large digit inside | `<Series>`, `interpolate` for pop-shrink, `<Pie>` progress, `interpolateColors` | Medium | Event openers, urgency |

### Title / Intro

| # | Name | Description | Layout | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|---|
| 15 | `logo-reveal` | Logo SVG draws itself via evolvePath, fills in, then tagline slides up | Logo centered 30-40% width, tagline below, clean background | `evolvePath`, `interpolateColors`, `spring` for settle, `getLength` | Complex | Brand intros, ad bumpers |
| 16 | `chapter-title` | Decorative rule draws, chapter number fades in, title slides in, accent shape orbits | Upper: chapter number, center: title, rule below, accent shape | `evolvePath`, `spring`, `getPointAtLength`, `noise3D`, `<Triangle>`/`<Star>` | Complex | Video series, tutorial segments |

### Text-Heavy

| # | Name | Description | Layout | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|---|
| 17 | `article-excerpt` | Words appear sequentially typewriter-style, source badge springs in after | Large body text center, source attribution bottom, paper texture | `<Sequence>` per word, `spring` for badge, `noise2D` for texture, `fitText` | Medium | Blog teasers, research findings |
| 18 | `audio-waveform` | Frequency bars react to audio, speaker name and label spring in over bars | Centered waveform bars, speaker name above, episode title below | `useAudioData`, `visualizeAudio`, `interpolateColors`, `spring`, `<Audio>` | Complex | Podcast clips, music releases |

---

## 5. Motion & Decorative Effect Presets

### Ambient Particles

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 1 | `floating-fireflies` | Small glowing dots drift in organic arcs, fading in/out with soft pulse | `noise3D()` for drift, `random()` for positions, `interpolate()` for flicker, `<Loop>` | Medium | Dreamy, magical, lo-fi |
| 2 | `rising-bubbles` | Translucent circles float upward with horizontal wobble, pop at top | `random()` per bubble, `noise2D()` for sway, `spring()` for pop, `<Circle>` | Medium | Refreshing, optimistic |
| 3 | `drifting-snow` | Fine white particles fall diagonally at different speeds and opacities | `random()` per flake, `noise2D()` for drift, `interpolate()` with `wrap`, `<Circle>` | Simple | Winter calm, cozy, holiday |
| 4 | `autumn-leaves` | Leaf silhouettes tumble in lazy rotations down curved paths | `random()` + `noise3D()` for paths, `makePolygon()`, `rotate()` | Medium | Seasonal, nostalgic |

### Celebration Effects

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 5 | `confetti-burst` | Colored rectangular pieces explode outward, arc under gravity, tumble | `spring()` for burst, `random()` per piece, `interpolate()` for gravity, `<Rect>` | Complex | Product launches, wins |
| 6 | `sparkle-scatter` | Four-pointed star glints appear/disappear at random positions | `random()`, `spring()` for scale, `<Star points={4}>`, `<Sequence>` with stagger | Medium | Premium, luxury, magical |
| 7 | `emoji-rain` | Configurable emoji rains down in columns with gentle swing | `random()` per column, `interpolate()` with `wrap`, `noise2D()` for swing | Simple | Fun, meme, social-native |

### UI / Tech Effects

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 8 | `scan-lines` | Horizontal scan lines with bright sweeping head line on a loop | CSS `repeating-linear-gradient`, `interpolate()` with `wrap`, `<Loop>` | Simple | Retro-tech, cyberpunk |
| 9 | `data-stream` | Matrix-style columns of characters scrolling down with fading tails | `random()` per column, `interpolate()` with `wrap`, `interpolateColors()` for fade | Complex | Hacker, AI, data products |
| 10 | `typing-cursor` | Blinking text cursor pulsing on/off at ~1Hz | `interpolate()` with step keyframes, `Easing.step0` | Simple | Dev content, terminal vibe |

### Light Effects

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 11 | `lens-flare` | Starburst of light sweeps across upper third of frame | `interpolate()` for position, CSS `radial-gradient`, SVG spike rays, `mix-blend-mode: screen` | Medium | Cinematic, premium |
| 12 | `spotlight-sweep` | Circular spotlight slides across scene, partially illuminating content | `interpolate()` for gradient center, CSS `radial-gradient`, `mix-blend-mode: multiply` | Simple | Dramatic reveals, focus |
| 13 | `bokeh-drift` | Large soft out-of-focus light circles drift gently at low opacity | `noise3D()` for drift, `random()`, `<Circle>` with `filter: blur(40px)` | Simple | Soft, romantic, elegant |

### Geometric Decorations

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 14 | `orbit-rings` | Concentric dashed rings rotate at different speeds around center | `interpolate()` per ring, `makeTransform([rotate()])`, `<Circle>` with `strokeDasharray` | Medium | Tech, science, analytical |
| 15 | `corner-brackets` | L-shaped brackets animate inward from edges to frame content | `spring()` for travel, `evolvePath()` for draw, `makeTransform([translate()])` | Medium | Military, tactical, precision |
| 16 | `animated-underline` | Decorative line draws left-to-right beneath heading (wavy or straight) | `evolvePath()`, `spring()`, `interpolateColors()`, custom SVG path | Simple | Emphasis, editorial |

### Texture Overlays

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 17 | `film-grain` | Monochromatic noise texture changing every frame at low opacity | `noise3D()` sampled on grid per frame, canvas overlay, `mix-blend-mode: overlay` | Complex | Cinematic, analog, vintage |
| 18 | `chromatic-aberration` | Subtle RGB channel split with red shifted left, blue shifted right | Triple `<AbsoluteFill>` with `mix-blend-mode: screen`, `translateX()`, `spring()` for pulse | Medium | Glitch, cyberpunk, bold tech |

---

## 6. Hook Presets

Motion and visual techniques engineered for the first 0–3 seconds of video ads. These presets exploit low-level perceptual reflexes — involuntary motion tracking, the compulsion to resolve blurred or incomplete images, negativity bias, and pattern recognition — to stop the scroll before the conscious mind decides to engage.

### Motion Hooks

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 1 | `crash-zoom-in` | Scene opens at 200% scale with heavy motion blur, springs down to 100% over 10 frames with slight overshoot — simulates a crash-push camera move | `spring({ stiffness: 400, damping: 18, mass: 0.6 })` for scale, `<CameraMotionBlur samples={10} shutterAngle={180}>`, `makeTransform([scale()])` | Medium | Product reveals, shocking stats, UGC openers |
| 2 | `whip-pan-reveal` | Full-scene horizontal motion blur streak (translateX at extreme velocity) resolves to sharp scene over 8 frames — replicates whip-pan camera technique | `spring({ stiffness: 500, damping: 20, overshootClamping: true })` for translateX, `<CameraMotionBlur samples={14} shutterAngle={270}>`, `interpolate()` for blur falloff | Medium | Topic changes, before/after transitions, high-energy openers |
| 3 | `screen-shake` | 3–5 frame violent position jitter applied to the entire composition on a text impact or beat hit; amplitude decays exponentially after peak | `noise2D(frame, 0)` and `noise2D(0, frame)` for X/Y offsets, `interpolate()` for amplitude envelope peaking at frame 0 and decaying over 12 frames, `makeTransform([translate()])` | Simple | Text slam landings, stat reveals, impact moments |
| 4 | `slo-mo-snap` | First 45 frames play at 0.25x effective speed (achieved via frame-mapping), then snap to 1x on a single hard cut frame — creates "eye of the storm" contrast against fast-scrolling feed | `interpolate()` for frame-mapped playback rate, `Easing.step0` for the snap frame, `<Freeze>` during slow-motion window, `useVideoConfig()` for frame count math | Complex | Sports/action openers, product drop reveals, dramatic build-ups |

### Focus & Reveal Hooks

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 5 | `focus-pull` | Entire scene wrapper starts at `filter: blur(30px)` and `opacity: 0.7`, resolves to sharp at 100% opacity over 45 frames with ease-out — compels brain to wait for resolution | `interpolate()` with `Easing.out(Easing.cubic)` for blur radius (30→0) and opacity (0.7→1), applied via inline CSS `filter` on a wrapping `<AbsoluteFill>` | Simple | Cinematic intros, product reveals, quote cards |
| 6 | `desat-to-color` | Scene opens fully desaturated (`filter: saturate(0)`), then color bleeds in radially from center using an SVG radial clip mask, reaching full saturation over 20 frames | `interpolate()` for CSS `filter: saturate(0→1)`, SVG `<radialGradient>` as a `clipPath` mask radius animated via `spring({ stiffness: 200, damping: 22 })`, `interpolateColors()` for warm color bias on reveal | Medium | Product color reveals, lifestyle brand openers, "before color = after" beats |
| 7 | `macro-reveal` | Scene opens at 400% scale centered on a key detail (extreme macro close-up), slowly zooms out via spring to 100% over 60 frames — creates a curiosity gap as context resolves | `spring({ stiffness: 60, damping: 18 })` for scale (4→1), `makeTransform([scale()])`, `interpolate()` for simultaneous `filter: blur(8px→0)` depth-of-field simulation, `transformOrigin: 'center center'` | Medium | Product texture details, food, fashion close-ups, ingredient callouts |
| 8 | `pov-reveal` | Iris expands from a small center point (simulating opening eyes or a lid lifting), with a light bloom overlay that fades as the iris completes — missing spatial context forces the brain to orient | `spring({ stiffness: 180, damping: 14 })` for SVG circle `r` attribute (0→150vw), `clipPath` wrapping the scene, CSS `radial-gradient` white bloom at `mix-blend-mode: screen` fading via `interpolate()` | Complex | Unboxing openers, POV perspectives, dramatic scene entries |

### Text Hooks

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 9 | `text-slam` | Bold text enters from Y offset of -200px at high velocity, landing at position 0 in 6 frames, with a `screen-shake` impulse (3px amplitude, 5 frame decay) firing on the landing frame | `spring({ stiffness: 600, damping: 22, overshootClamping: true })` for `translateY`, paired `noise2D()` position jitter for screen-shake impulse on landing frame, `Easing.out(Easing.cubic)` fallback for non-spring frames | Simple | Hook headlines, stat slams, CTA reveals |
| 10 | `bold-claim` | Full-frame bold text on a solid high-contrast background, scales in from 120% to 100% with spring overshoot — no imagery, maximum readability, fully sound-off legible | `spring({ stiffness: 260, damping: 16, mass: 0.8 })` for scale (1.2→1.0), `interpolate()` for opacity (0→1 over first 6 frames), solid `<AbsoluteFill>` background, `fitText()` to ensure copy fills 70%+ of frame width | Simple | Direct-response hooks, claim statements, pricing reveals |
| 11 | `focus-pull-text` | Text-only variant of focus-pull: text starts at `filter: blur(40px)` and `opacity: 0.5`, resolves to sharp over 45 frames with cubic ease-out — leverages the brain's compulsion to resolve blurred language | `interpolate()` with `Easing.out(Easing.cubic)` for `filter: blur(40→0px)` and opacity (0.5→1), applied to a text `<div>` wrapper, optional secondary spring pop `scale(0.95→1.0)` at resolution point for snap feel | Simple | Curiosity-gap headlines, key stat reveals, teaser copy |

### Format-Native Hooks

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 12 | `chat-ui-hook` | Opens with a rendered chat interface (dark bubble UI with timestamp and app chrome), hook text types in character-by-character as an AI response with a blinking typing indicator — familiar interface bypasses ad-detection reflex | `interpolate()` for visible character count (typewriter), `Easing.step0` for cursor blink at ~1Hz, `spring()` for typing indicator dot bounce, `<Sequence>` for indicator→text transition, custom chat bubble component with `createRoundedTextBox()` | Complex | AI product demos, SaaS hooks, software ads, productivity tools |
| 13 | `comment-response` | A skeptical or provocative social comment bubble (pill-shaped, dark bg) slides down from above with spring pop onto the scene, followed by a creator response text springing in below after 20 frames — negativity bias drives attention spike | `spring({ stiffness: 220, damping: 16 })` for comment bubble `translateY` (−120→0), `spring()` with 20-frame delay for response text scale-in, `createRoundedTextBox()` for pill bubble, `<Sequence>` to chain comment then response | Medium | UGC-style ads, myth-busting content, objection handling, creator ads |

---


## 7. Brand Motion Presets

Presets derived from studying Apple and Nike motion design systems. Apple patterns prioritize controlled precision — spring physics, deliberate ease-out curves, and clinical negative space. Nike patterns prioritize raw energy — hard stops, impact frames, staccato rhythm, and aggressive stagger. Both systems are beat-aware and treat every frame as intentional.

### Apple-Inspired

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 1 | `scale-slam` | Text enters at 180% scale and eases out to 100% via spring with slight overshoot, synchronized to a bass hit at frame 0. The spring settles in 12–16 frames, never oscillating more than once. Clean, controlled, premium. | `spring({ stiffness: 300, damping: 15, mass: 0.8 })` for scale, `makeTransform([scale()])`, `Easing.out(Easing.cubic)` for fallback, optional `<Audio>` sync at frame 0 | Simple | Brand name reveals, product taglines, premium announcement cards |
| 2 | `pop-in` | Opacity snaps from 0 to 100% in exactly 2 frames using step easing — no fade, pure cut-on. Simultaneously a micro-scale breath runs: 100% → 102% → 100% over 8 frames using a low-mass spring. Apple's signature snappy appearance for UI elements and secondary text. | `Easing.step0` for opacity snap, `spring({ mass: 0.3, stiffness: 400, damping: 20 })` for micro-scale, `makeTransform([scale()])` | Simple | Feature callout labels, secondary text, bullet points, caption timing |
| 3 | `wipe-reveal` | A horizontal `clipPath: inset()` mask travels left-to-right across the text over 20–30 frames, revealing letterforms progressively as if a curtain is pulled. The mask movement uses `Easing.out(Easing.cubic)` — fast at the start, lingering at the end. Precise and clean. | `interpolate()` for `clipPath: inset(0 X% 0 0)` shrinking from 100% to 0%, `Easing.out(Easing.cubic)`, CSS `clip-path` on text container | Simple | Section headings, product names, URL reveals, cinematic title cards |
| 4 | `parallax-depth` | Multiple text and visual layers are placed in separate `<AbsoluteFill>` containers, each with a different `interpolate()` multiplier applied to translateX or translateY. Foreground elements move 100% of the input, mid-ground at 60%, background at 20%. Creates a 2.5D depth illusion without 3D rendering. | Multiple `<AbsoluteFill>` layers, per-layer `interpolate()` with different multipliers (0.2×, 0.6×, 1.0×), `makeTransform([translateX()])`, optional `<CameraMotionBlur>` on fast passes | Medium | Documentary segments, premium product showcases, Apple-style "walking through the product" scenes |
| 5 | `zoom-through-text` | Text begins at 100% scale and a cubic ease-in drives it to 500–800% over 24–36 frames. The viewer appears to "pass through" the oversized letterforms. Works best on single short words in bold weight. Pair with a hard cut at full scale for maximum drama. | `interpolate()` for scale 100% → 600% with `Easing.in(Easing.cubic)`, `makeTransform([scale()])`, optional `opacity` fade at the very end, `<AbsoluteFill>` with `overflow: hidden` on the scene | Medium | Opening title hooks, dramatic transitions between segments, product launch hero words |
| 6 | `character-cascade` | Each character in the text is split into its own span and given an independent `spring()` animation for scale (0% → 100%) and opacity (0 → 1), with a 1–4 frame stagger delay between consecutive characters. The result is an elegant wave of letterforms materializing. | Per-character DOM splitting, `spring({ mass: 0.5, stiffness: 200, damping: 16 })` per char with `delay: charIndex * 3`, `makeTransform([scale()])`, `opacity` interpolated alongside | Medium | Elegant brand name reveals, quotes, premium product taglines, award show-style typography |
| 7 | `spring-settle` | Text enters from a Y offset (typically −40px) and settles into position via a spring with `overshootClamping: false`. The spring is tuned for a single visible overshoot: it passes the target by 8–12px before settling back, modeling Hooke's Law natural deceleration. Feels physical and intentional. | `spring({ stiffness: 180, damping: 10, mass: 1.0, overshootClamping: false })` for translateY, `makeTransform([translateY()])`, optional paired `opacity` fade-in over first 6 frames | Simple | Headline entrances, card reveals, any text that must feel "placed" rather than "animated" |

### Nike-Inspired

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 8 | `impact-frame` | On the frame when text reaches its final position, a solid white (or black) `<AbsoluteFill>` is rendered at 100% opacity for exactly 2 frames via `Easing.step0`, then cut to 0%. Acts as a high-energy punctuation mark — a visual "thud" that resets the eye and signals importance. | White `<AbsoluteFill>` with `opacity` driven by `Easing.step0` keyframes at the impact frame, `interpolate([impactFrame, impactFrame+1, impactFrame+2], [0, 1, 0])` | Simple | Athlete name reveals, key stat appearances, motivational quote hooks, hard cut punctuation |
| 9 | `whip-text` | Text enters from 120px offscreen (left or right) at extreme velocity driven by a high-stiffness spring, landing at its target in 5–8 frames and stopping hard with `overshootClamping: true`. `<CameraMotionBlur>` is applied during the travel phase to simulate motion blur streaks. Raw power. | `spring({ stiffness: 500, damping: 28, overshootClamping: true })` for translateX, `makeTransform([translateX()])`, `<CameraMotionBlur samples={8} shutterAngle={180}>` wrapping the text during movement frames | Medium | Athletic product ads, motivational hooks, aggressive brand statements, high-energy reel openers |
| 10 | `stacked-slam` | A multi-word phrase is split into individual words. Each word slams in vertically from above (translateY: −80px → 0) one at a time, with a 6–10 frame gap between each. Each word uses a high-stiffness spring with `overshootClamping: true` for a hard landing with no bounce. Words stack to form the complete phrase. | Per-word `spring({ stiffness: 400, damping: 24, overshootClamping: true })` with `delay: wordIndex * 8`, `translateY()`, `makeTransform()`, optional `screen-shake` on each landing via `noise2D()` position jitter | Medium | Athletic slogans, challenge statements, product benefit lists, call-to-action phrases |
| 11 | `diagonal-text` | Text is rotated 15–30 degrees counter-clockwise via CSS `transform: rotate()`, echoing the diagonal body lines of athletes in motion. The text animates in via a fast spring translate along the diagonal axis (not the vertical). Layout uses absolute positioning to place text intentionally across the frame diagonal. | CSS `transform: rotate(-15deg)` to `rotate(-30deg)` on text container, `spring({ stiffness: 300, damping: 18 })` for diagonal `translateX`/`translateY` combo entrance, `makeTransform([rotate(), translate()])` | Simple | Sports product ads, apparel brands, fitness apps, any content evoking physical dynamism |
| 12 | `beat-pulse` | Text scale oscillates continuously between 100% and 108% using a sine wave driven by the current frame. The frequency is parameterized to match BPM — at 120 BPM (30fps), one full pulse cycle is 15 frames. The scale never drops below 100%, creating a constant energetic presence rather than a breathing effect. | `interpolate(Math.sin(frame * (Math.PI * 2 / beatPeriodFrames)), [-1, 1], [1.0, 1.08])` for scale, `makeTransform([scale()])`, `useCurrentFrame()`, BPM config param to derive `beatPeriodFrames` | Simple | Background kinetic text, persistent motivational words, music-synced ad overlays, chorus moments |
| 13 | `gritty-texture` | A film grain overlay (`noise3D()` sampled on a pixel grid, changing every frame) is composited over the scene at 25–35% opacity using `mix-blend-mode: overlay`. Simultaneously, the scene's contrast is boosted via CSS `filter: contrast(1.3) brightness(0.9)`. Kinetic text is overlaid on top of this degraded, high-contrast base. | `noise3D()` per pixel sampled each frame for grain texture, canvas-based overlay at `mix-blend-mode: overlay`, CSS `filter: contrast(1.3) brightness(0.9)` on scene container, `<AbsoluteFill>` stacking for compositing | Complex | Raw brand identity content, underground/rebellious products, streetwear, hip-hop adjacent ads |
| 14 | `color-flash` | A single-frame white or black `<AbsoluteFill>` is injected between cuts — visible for exactly 1–2 frames. This resets the viewer's eyes, creates a staccato rhythm between shots, and gives the edit an aggressive, high-energy cadence. Best used at every cut point in a fast-paced sequence. | `<AbsoluteFill>` with `backgroundColor: 'white'` or `'black'`, `opacity` driven by `interpolate([cutFrame-1, cutFrame, cutFrame+1, cutFrame+2], [0, 1, 1, 0])` with `Easing.step0`, one instance per cut point in the `<Sequence>` | Simple | Fast-cut action sequences, high-energy brand reels, music video-style product ads, pre-drop moments |

---

## 8. Performance Ad Presets

Presets designed for high-converting direct-response video ads. Rooted in conversion copywriting frameworks (hook → problem → solution → proof → CTA), Hormozi-style caption formats, and product motion patterns observed across top-performing DTC creative. Every preset in this section is optimized for sound-off viewing, mobile-first aspect ratios, and sub-3-second comprehension.

### Conversion Elements

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 1 | `countdown-urgency` | Live countdown timer displaying days:hours:minutes:seconds depleting in real time. Color transitions green→yellow→red via `interpolateColors()` as the proportion of time remaining crosses the 66% and 33% thresholds. Timer digits pulse with a brief `spring()` scale pop on each second tick, amplifying FOMO. Background of the timer pill dims toward the urgency color alongside the text. | `interpolate()` for elapsed-time computation, `interpolateColors()` for green→yellow→red across two threshold keyframes, `spring({ stiffness: 280, damping: 18 })` for per-second digit scale pulse, `createRoundedTextBox()` for timer pill background, `<Loop>` for continuous updates | Medium | Flash sales, limited-time offers, event countdowns, drop launches |
| 2 | `price-strike` | Original (higher) price text displays first. An animated strikethrough line draws left-to-right across it via `evolvePath()`, completing over 18 frames. The new discounted price then bounces in to the right or below via `spring()` with overshoot — rendered 40–60% larger than the struck price to maximize perceived value gap. Original price simultaneously dims toward gray via `interpolateColors()`. | `evolvePath()` for animated strikethrough SVG path, `spring({ mass: 0.5, stiffness: 240, damping: 10, overshootClamping: false })` for new price bounce entrance, `<Sequence>` to chain strike then reveal, `interpolateColors()` for old price color transition to muted gray | Medium | Sale ads, limited-time discounts, promotional product reveals, clearance campaigns |
| 3 | `proof-stack` | Three-phase social proof sequence rendered as a stacked unit: (1) star icons fill from 0 to a target rating with individual fill opacity interpolated per star; (2) review count increments from 0 to a target number via count-up `interpolate()`; (3) trust badge pills (e.g., "Verified Buyer", "As Seen On Forbes") slide in from the right in staggered succession via `spring()`. All three elements remain visible simultaneously after phase 3 completes. | `interpolate()` for count-up numbers and per-star fill opacity, `spring()` with incrementing stagger index for each badge slide-in, `<Sequence>` for phased entrance timing, `<Star>` from `@remotion/shapes` for star rating icons, `createRoundedTextBox()` for trust badge pill backgrounds | Medium | DTC product ads, app install campaigns, supplement brands, review-heavy categories |
| 4 | `karaoke-caption` | Full spoken phrase displayed as a row (or wrapped lines) of words. Each word becomes "active" for the duration of its speech-timing window — switching to a high-contrast highlight color (e.g., yellow, brand primary) while inactive words remain visible at reduced opacity. The active word optionally scales to 105% via `spring()` for additional punch. Inspired by Hormozi-style captioning: context is always visible, never hidden. Speech timecodes are provided as a config array of `{ word, startFrame, endFrame }` entries. | Per-word `<Sequence>` aligned to speech timecodes from config, `interpolateColors()` for inactive→active color transition on each word, `spring({ stiffness: 300, damping: 20 })` for active word scale bump, `opacity` interpolation for inactive word dimming to 50% | Complex | UGC talking-head ads, VSL overlays, podcast clips, Hormozi-style direct-response content |
| 5 | `swipe-cta` | Fixed CTA pill button (e.g., "Shop Now", "Swipe Up", "Claim Offer") with a pulsing radial gradient glow halo cycling at ~1.2Hz via `interpolate(Math.sin())`. An upward-pointing arrow inside the button bounces 6px upward and returns on each pulse cycle. The button springs in from below the frame on its entrance frame. High-contrast by default (white text on orange, or brand primary). Stays visible as a persistent overlay throughout the CTA beat. | `interpolate(Math.sin(frame / (fps / 1.2) * Math.PI * 2))` for continuous glow halo opacity and arrow Y bounce, `spring({ stiffness: 260, damping: 14 })` for entrance from below, CSS `radial-gradient` for glow halo, `createRoundedTextBox()` for pill shape, `<Loop>` for continuous animation | Simple | Instagram Story ads, TikTok CTAs, direct-response product ads, end-of-video offer reveals |

### Product Motion

| # | Name | Description | Layout | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|---|
| 6 | `product-float` | Product image hovers on a continuous sine-wave vertical oscillation of ±12px at ~0.6Hz. A soft elliptical shadow beneath the product scales inversely — shrinking when the product is at peak height, expanding when it descends — creating a convincing 3D lift illusion. Product enters via `spring()` scale from 0.8 with opacity fade. Motion is seamless and looping throughout scene duration. | Product `<Img>` centered at 50–60% frame width; soft `<Ellipse>` shadow at fixed baseline below product, opacity 0.2–0.4; optional brand name lockup below shadow | `interpolate(Math.sin(frame / fps * 0.6 * Math.PI * 2))` for Y position oscillation, `scale()` and `opacity` on shadow proportional to inverse of Y offset, `spring({ stiffness: 140, damping: 18 })` for entrance, `<Img>`, `<Ellipse>` from `@remotion/shapes` | Simple | Hero product frames, DTC ads, supplement and beauty products, premium hero shots |
| 7 | `turntable-spin` | Product image (or ordered sequence of product face images) rotates in a seamless 360° turntable loop. When a single image is provided, a subtle `scaleX` compression from 1→0.85→1 simulates perspective foreshortening at the mid-rotation point. When multiple face images are provided, `<Series>` switches between them at evenly distributed rotation angles with a brief cross-fade. A soft elliptical shadow beneath pulses subtly in sync with the perspective compression. | Product centered at 50–65% frame width; optional `product-float` Y oscillation layered for floating turntable effect; shadow `<Ellipse>` at fixed baseline | `<Loop>` for seamless repeat, `interpolate()` for rotation angle progression and `scaleX` perspective compression curve, `<Series>` for multi-face image switching at computed frame boundaries, `makeTransform([scale()])` for scaleX approximation, `<Ellipse>` shadow | Medium | Physical product showcase, apparel, footwear, consumer electronics, jewelry |
| 8 | `unbox-reveal` | Three-act reveal choreographed via `<Sequence>`: (1) package or box enters from below the frame over 20 frames via `spring()` with soft overshoot settle; (2) the lid or top flap lifts open via `rotateX()` with perspective applied to a masked top-half element (0°→−90° over 15 frames); (3) the hero product rises out of the open box with a `spring()` `translateY`, coinciding with a radial light bloom — white radial gradient overlay expanding and fading — to simulate a product-reveal flash. | Box element centered lower 55% of frame; product `<Img>` emerging center-frame above box opening; light bloom `<AbsoluteFill>` `radial-gradient` overlay; optional tagline below box | `spring({ damping: 14, stiffness: 120 })` for box entrance Y, `rotateX()` + `perspective()` on lid element for open animation, `spring({ stiffness: 180, damping: 14 })` for product rise, `interpolate()` for bloom radial expansion and opacity fade, `<Sequence>` for all three choreography phases | Complex | Product launch campaigns, DTC unboxing ads, gift campaigns, subscription box reveals |
| 9 | `ingredient-callout` | Product image centered in frame. Up to 6 labeled callout nodes appear staggered with `spring()`, each anchored at a different compass edge of the frame with an animated connector line drawn from the label inward toward the corresponding product region via `evolvePath()`. Label backgrounds use `createRoundedTextBox()` with ingredient name and optional sub-label. Each callout entrance is delayed by 8 frames from the previous. Connector lines draw from label anchor outward to product contact point as the label springs in. | Product `<Img>` center at 40–50% frame width; up to 6 callout label groups (`<Sequence>` staggered) at frame edges; SVG connector path per callout drawn with `evolvePath()` | `spring({ stiffness: 200, damping: 16 })` per callout label with stagger via delay index, `evolvePath()` for each connector line draw synchronized to label entrance frame, `createRoundedTextBox()` for ingredient label pills, SVG `<path>` for connector lines, `<Img>` | Complex | Supplement ingredient ads, skincare product breakdowns, food product callouts, app feature labels |

### Caption Styles

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 10 | `bounce-caption` | Each word (or short phrase segment) enters from 40px above its resting baseline and springs downward into position with a pronounced overshoot — using low damping for a visible bounce settle. Words enter one-by-one at a configurable stagger interval (4–8 frames). Uppercase bold recommended. Text is always readable immediately after bounce settle; no exit animation during scene. | Per-word `spring({ mass: 0.7, stiffness: 160, damping: 6, overshootClamping: false })` for `translateY` (−40px→0 with overshoot), `interpolate()` for fast opacity fade-in over first 4 frames per word, `<Sequence>` with configurable stagger interval per word | Simple | Lifestyle brands, food and beverage, playful DTC ads, UGC captions, fun social content |
| 11 | `kinetic-zoom-word` | Captions are displayed inline, but designated high-emphasis words (configurable via a `keyWords` array in the preset config) momentarily scale to 150% of their resting size over 8 frames via `spring()`, then return to 100% over the following 6 frames. Scale is applied around the word's horizontal center. Non-key words remain static throughout. Emphasis duration is kept brief — never held longer than 12 frames — to maintain rhythm. | `spring({ stiffness: 400, damping: 22, overshootClamping: true })` for scale-up on key word entrance frame, reverse `interpolate()` decay for return to 100%, `makeTransform([scale()])` centered on word midpoint via `transformOrigin`, `<Sequence>` for each key word's emphasis window timing | Simple | Claim highlighting in product ads, VSL captions, bold assertion sequences, key-stat reveals |
| 12 | `pill-caption` | Full phrase (or short sentence) displayed inside an auto-sized rounded rectangle background. `measureText()` computes the bounding box; `createRoundedTextBox()` renders the pill with 16–24px horizontal padding and 8–12px vertical padding. Pill and text spring in together as a single unit via scale from 0.88 plus opacity fade. Supports configurable pill color and text color for maximum contrast on any background. Designed for maximum readability in noisy feed environments. | `measureText()` for dynamic pill bounding box sizing, `createRoundedTextBox()` for pill background shape, `spring({ stiffness: 200, damping: 18 })` for entrance scale (0.88→1.0) and `interpolate()` for opacity (0→1), `interpolateColors()` for configurable pill fill and text color theming | Simple | Accessibility-first ads, noisy feed environments, multilingual captions, product ads on variable or busy backgrounds |

---

## 9. Cinematographic Presets

Camera movement simulation, speed/timing techniques, depth and focus effects, and film look overlays that give motion graphics a cinematic, produced feel. All effects are simulated using 2D compositing — no actual camera movement required.

---

### Camera Simulation

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 1 | `dolly-push` | Slow push-in simulated via multi-layer parallax at independent rates plus a gradual scale increase from 100% to 110% over the full scene duration. Foreground layers accelerate relative to background to sell depth. | `interpolate()` with `Easing.inOut(Easing.quad)` for scale, stacked `<AbsoluteFill>` layers each with distinct `interpolate()` translateX/Y multipliers (extreme bg: 20%, mid: 50%, subject: 90%, fg: 130%) | Medium | Increasing importance, intimacy, product reveals |
| 2 | `dolly-pull` | Slow pull-out mirroring dolly-push — scale decreases from 100% to 92% while surrounding context elements fade in from the edges. Parallax layers decelerate as they reveal the larger environment. | `interpolate()` with `Easing.inOut(Easing.quad)` for scale-down, stacked `<AbsoluteFill>` layers with decreasing translateX/Y multipliers, `interpolate()` for context element opacity reveal | Medium | Context reveal, establishing scale, reframing narrative |
| 3 | `dolly-zoom` | Background layer scales inversely to the foreground subject — as the subject scale stays fixed, the background zooms in or out to create the vertigo/Hitchcock zoom effect. Creates disorientation without physically moving the camera. | Dual `<AbsoluteFill>` layers: subject fixed scale, background `interpolate()` scale 100%→130% (or 130%→100%), opposing `interpolate()` translateZ simulation via combined scale + translate | Complex | Paradigm shift moments, shock reveals, realization beats |
| 4 | `tracking-pan` | Horizontal parallax layers moving at different speeds simulate a camera tracking alongside a moving subject. Extreme background moves slowest, foreground fastest, creating convincing lateral motion in a flat composite. | Three to four `<AbsoluteFill>` layers each with `interpolate()` translateX at distinct multipliers (bg: 15%, mid: 45%, subject: 80%, fg: 120%), `Easing.inOut(Easing.cubic)` for smooth acceleration/deceleration | Medium | Journey narrative, product-in-motion sequences, immersion |
| 5 | `crane-up` | Vertical camera rise simulated via upward-panning parallax layers — bottom-of-frame content scrolls out while sky or aspirational elements scroll in from the top. Each layer translates Y at a different rate to sell elevation. | Four `<AbsoluteFill>` layers with `interpolate()` translateY at different multipliers (ground: 120%, subject: 90%, mid: 50%, sky: 15%), `Easing.inOut(Easing.quad)`, optional `interpolate()` for atmospheric haze opacity | Medium | Grandeur, aspiration, ground-to-sky reveals, brand moments |
| 6 | `handheld-shake` | Subtle organic camera wobble applied to the entire scene via noise-driven X and Y position offsets. Uses `noise2D()` seeded per frame to produce non-repeating jitter at 2–4px amplitude — significantly less violent than the `screen-shake` hook preset's impact jitter. | `noise2D(frame * 0.08, 0)` for X offset, `noise2D(0, frame * 0.08)` for Y offset, `interpolate()` to clamp amplitude to 2–4px range, applied to wrapping `<AbsoluteFill>` via `makeTransform([translate()])` | Simple | Authenticity, urgency, UGC-style feel, documentary tone |

---

### Speed & Timing

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 7 | `speed-ramp` | Three-phase playback speed variation within a single scene: opens fast (2x equivalent via compressed frame mapping), hits a sudden deceleration to 0.25x at the key moment of emphasis, then resumes at normal speed. Implemented via a custom frame-mapping function since Remotion does not expose `playbackRate` on compositions. | Custom `frameToSourceFrame()` mapping function with `interpolate()` defining three segments (fast: compressed frame range, slow: expanded frame range, normal: 1:1), applied to `<OffthreadVideo>` `startFrom` offset per frame, `Easing.step0` for the snap transition between phases | Complex | Speed variation to hold viewer attention, action sequences, product reveals |
| 8 | `z-drift` | A gentle, continuous Z-axis push-in (simulated via scale 100%→103%) lasting the entire scene duration. Imperceptible on any single frame but creates a subconscious sense that the camera is always approaching — prevents the static feeling of a long held frame. | `interpolate()` scale from 1.0 to 1.03 over total scene `durationInFrames`, `Easing.linear` for constant velocity, applied to wrapping `<AbsoluteFill>` via `makeTransform([scale()])` | Simple | Subtle engagement maintenance, hero frames, product showcase holds, any scene longer than 3s |
| 9 | `beat-locked-cut` | A timing framework rather than a visual effect: all animation events in the scene (text entrances, product reveals, background changes, overlay triggers) are snapped to the same beat interval. Beat interval derived from BPM configuration (e.g., 120 BPM at 30fps = every 15 frames). Each element's `from` frame in `<Sequence>` is a multiple of the beat interval. | `<Sequence from={beatInterval * n}>` for all child elements, `spring()` with relative `frame - beatInterval * n` for per-element animation, `useCurrentFrame()` modulo beat interval for oscillating effects, configurable `bpm` and `fps` parameters | Medium | Frame-precise sync to music, high-energy ads, rhythmic brand content |

---

### Depth & Focus

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 10 | `rack-focus` | Shifts perceived focus from a foreground element to a background element (or vice versa) via a cross-fade of CSS `filter: blur()` values. Foreground starts sharp and blurs out as background sharpens into focus — mimicking a lens focus pull between two subjects. | `interpolate()` for foreground `filter: blur(0px → 12px)` and background `filter: blur(12px → 0px)` on inverse curves with `Easing.inOut(Easing.cubic)`, timed `<Sequence>` for hold periods before and after the focus shift | Medium | Cinematic depth, directing viewer attention between two subjects, narrative transitions |
| 11 | `depth-layers` | A four-layer parallax compositing system simulating a full cinematic depth-of-field environment: extreme background (slow, slightly blurred), mid-ground (moderate speed, sharp), subject layer (near-fixed, fully sharp), foreground (fast, significantly blurred bokeh). Each layer independently translates at defined speed multipliers. | Four `<AbsoluteFill>` layers with `interpolate()` translateX/Y at respective multipliers (0.15×, 0.45×, 0.85×, 1.25×), CSS `filter: blur()` per layer (extreme bg: 4px, mid: 0px, subject: 0px, fg: 20px), `noise3D()` for subtle organic foreground drift | Complex | Film-like depth, premium product ads, cinematic scene construction |
| 12 | `vignette-pulse` | A dark radial vignette overlay (transparent center, darkening toward edges) that slowly and rhythmically pulses — inner radius breathing between 40% and 50% of frame size. Draws the eye to the center-frame subject while adding a moody, cinematic quality that tightens around the key content. | CSS `radial-gradient(circle, transparent CENTER%, rgba(0,0,0,0.7) 90%)` rebuilt each frame, center radius driven by `interpolate(Math.sin(frame * pulseFreq))` between inner bounds, `<AbsoluteFill>` overlay with `pointerEvents: none` and `mix-blend-mode: multiply` | Simple | Focus and mood, dark/dramatic tone, subject emphasis on held frames |

---

### Film Looks

| # | Name | Description | Remotion APIs | Complexity | Best For |
|---|---|---|---|---|---|
| 13 | `film-look-warm` | A cinematic warm color grade applied as a composited overlay: lifted blacks (shadows not crushing to pure black), warm orange-amber highlights, slight desaturation of cool midtones. Implemented as stacked blend-mode layers that tint the scene without replacing it. | `<AbsoluteFill>` with `background: rgba(255, 180, 80, 0.12)` and `mix-blend-mode: multiply` for warm highlight tint, second `<AbsoluteFill>` with `background: rgba(30, 20, 10, 0.18)` and `mix-blend-mode: screen` for lifted blacks, optional `interpolate()` for grade fade-in over first 15 frames | Simple | Cinematic warmth, lifestyle brands, golden-hour feel, nostalgia |
| 14 | `film-look-cool` | A cool/teal-and-orange blockbuster color grade: blue-shifted shadows, teal midtones, crushed blacks. The complementary teal-orange split creates the high-contrast cinematic look associated with thriller and tech advertising. | `<AbsoluteFill>` with `background: rgba(0, 60, 100, 0.15)` and `mix-blend-mode: multiply` for shadow teal shift, second `<AbsoluteFill>` with `background: rgba(0, 0, 30, 0.25)` and `mix-blend-mode: multiply` for black crush, optional third layer `rgba(20, 80, 120, 0.08)` with `mix-blend-mode: screen` for midtone lift | Simple | Thriller mood, tech and SaaS, sci-fi aesthetic, premium dark-mode brands |
| 15 | `anamorphic-bars` | Top and bottom letterbox bars animate inward from the extreme edges of the frame, settling to create a 2.39:1 widescreen crop. Bars are solid black rectangles that spring into their final position with slight overshoot, instantly reframing any 9:16 or 16:9 content into a cinematic aspect ratio. | Two `<AbsoluteFill>` black `<Rect>` elements anchored to top and bottom edges, each animated via `spring({ stiffness: 160, damping: 18, overshootClamping: false })` on height from 0 to `barHeight` (approximately 11% of frame height for 2.39:1), `<Sequence from={0}>` for simultaneous entry | Simple | Cinematic framing, widescreen prestige, elevated ad aesthetics, any content needing a film-grade look |

---

## Preset Complexity Summary

| Category | Simple | Medium | Complex | Total |
|---|---|---|---|---|
| **1. Text Animation** | 8 | 7 | 5 | 20 |
| **2. Scene & Background** | 6 | 8 | 4 | 18 |
| **3. Scene Transitions** | 6 | 8 | 6 | 20 |
| **4. Composite Scene Templates** | 4 | 8 | 6 | 18 |
| **5. Motion & Decorative Effects** | 5 | 9 | 4 | 18 |
| **6. Hook Presets** | 5 | 5 | 3 | 13 |
| **7. Brand Motion Presets** | 7 | 4 | 3 | 14 |
| **8. Performance Ad Presets** | 4 | 5 | 3 | 12 |
| **9. Cinematographic Presets** | 6 | 6 | 3 | 15 |
| **Total** | **51** | **60** | **37** | **148** |

**Original presets: 92** | **New from research: 54** (13 hook + 14 brand motion + 12 performance ad + 15 cinematographic)

---

## How Presets Map to the Config System

The AI references presets by name in the video config:

```json
{
  "type": "text",
  "content": "Launch Day",
  "animation_preset": "elastic-pop",
  "position": { "x": 50, "y": 40 }
}
```

```json
{
  "background_preset": "aurora",
  "background_config": { "colors": ["#1a0533", "#0d3b66", "#ff6b6b"] }
}
```

```json
{
  "transition_preset": "whip-pan"
}
```

```json
{
  "overlay_presets": ["floating-fireflies", "film-grain"]
}
```

The renderer resolves preset names to their implementation components, using any provided config overrides (colors, speeds, etc.) as parameters.

---

## 8. Director-Inspired Presets

Named combinations of spring parameters + animation properties inspired by renowned directors.

| # | Name | Inspiration | Spring Config | Key Properties | Best For |
|---|---|---|---|---|---|
| 1 | `gondry-handmade` | Michel Gondry | damping: 8, stiffness: 150 | Bouncy spring + skewX wobble (from -3 to 0) | Playful, handcrafted feel |
| 2 | `aveillan-luxury-sweep` | Bruno Aveillan | damping: 25, stiffness: 60 | Slow blur from 12→0 over 180fr + translateX from -100→0 | Luxury product reveals |
| 3 | `fincher-snap-cut` | David Fincher | damping: 30, stiffness: 300 | Instant opacity (0 delay), precise translateY from 40→0 | Corporate, thriller |
| 4 | `kubrick-symmetry` | Stanley Kubrick | damping: 22, stiffness: 100 | All elements at x:50. Slow scale from 0.95→1 | Centered, formal |
| 5 | `mika-saturated-pop` | Mika | damping: 6, stiffness: 200 | elastic-pop scale + vivid gradient bgs | Colorful, energetic |
| 6 | `wes-anderson-grid` | Wes Anderson | damping: 18, stiffness: 120 | Centered layout, pastel gradients, consistent spacing | Quirky, editorial |
| 7 | `villeneuve-epic` | Denis Villeneuve | damping: 28, stiffness: 50 | Very slow blur-in (10→0), letterbox overlay | Sci-fi, epic |
| 8 | `tarantino-slam` | Quentin Tarantino | damping: 5, stiffness: 280 | Hard scale from 2→1, immediate opacity | Bold impact, urgent |
| 9 | `kar-wai-mood` | Wong Kar-wai | damping: 20, stiffness: 80 | blur from 6→0, warm color-grade overlay 0.15 | Romantic, moody |
| 10 | `nolan-gravity` | Christopher Nolan | damping: 16, stiffness: 140 | translateY from 80→0, vignette 0.6, film-grain 0.08 | Dramatic, grounded |
| 11 | `spike-energy` | Spike Jonze | damping: 9, stiffness: 170 | skewX from -5→0 + translateY from 50→0 | Energetic, raw |
| 12 | `miyazaki-float` | Hayao Miyazaki | damping: 10, stiffness: 70 | Scale keyframes [0→1.03→1], gentle drift | Whimsical, dreamy |
| 13 | `refn-neon` | Nicolas Winding Refn | damping: 22, stiffness: 90 | Neon text_shadow glow, dark bg, slow fade | Stylish, neon-noir |
| 14 | `scorsese-tracking` | Martin Scorsese | damping: 14, stiffness: 120 | Long translateX from -200→0, wipe transitions | Kinetic, story-driven |
| 15 | `lynch-surreal` | David Lynch | damping: 12, stiffness: 60 | blur from 15→3 (never fully sharp), film-grain 0.15 | Surreal, unsettling |

---

## 9. City-Aesthetic Presets

Regional styles inspired by the creative DNA of major global cities.

| # | Name | City | Font Stack | Spring Config | Colors | Signature Element |
|---|---|---|---|---|---|---|
| 1 | `tokyo-precision` | Tokyo | Space Grotesk 600 + Inter 400 | damping: 25, stiffness: 300 | Monochrome #FFFFFF/#0A0A0A, accent #DC2626 | Ultra-clean grid, white space |
| 2 | `paris-cinematic` | Paris | Cormorant Garamond 700 + Raleway 400 | damping: 22, stiffness: 80 | Warm neutrals #FAF5EF, gold #C9A96E | blur-in entrance, warm color-grade 0.1 |
| 3 | `nyc-editorial` | New York | Oswald 600 + Source Sans 3 400 | damping: 14, stiffness: 180 | High contrast B&W + one accent | Wipe transitions, fast 60fr scenes |
| 4 | `jakarta-warmth` | Jakarta | Montserrat 700 + Lora 400 | damping: 12, stiffness: 140 | Warm gradients #FF8C42→#FFD93D | Organic shapes, warm tones |
| 5 | `sydney-bold` | Sydney | Anton 400 + Roboto 500 | damping: 10, stiffness: 220 | High contrast, ocean blue #0EA5E9 | Bold ALL-CAPS, hard cuts |
| 6 | `singapore-clean` | Singapore | Inter 500 + DM Sans 400 | damping: 20, stiffness: 200 | Cool neutrals #F3F4F6, accent #2563EB | Structured grid, minimal |
| 7 | `beijing-festival` | Beijing | Bebas Neue 400 + Open Sans 400 | damping: 8, stiffness: 250 | Red #DC2626 + gold #CA8A04 | Scale slam, celebration energy |

---

## 10. Industry Combo Presets

Full recipes combining font, color, animation, and pacing for specific verticals.

| # | Name | Font Pair | Palette | Animation Energy | Pacing | Key Effects |
|---|---|---|---|---|---|---|
| 1 | `saas-dark-mode` | Sora 700 / Inter 400 | tech-trust (#0F172A bg, #2563EB primary) | Standard (damping 14-18) | 3-4 scenes, 90-120fr each | Radial bg glow, vignette 0.3 |
| 2 | `fitness-blast` | Bebas Neue 400 / Roboto 500 | fitness-power (#0A0A0A bg, #DC2626 red) | Aggressive (damping 6-8) | 5-7 scenes, 45-90fr each | ALL-CAPS, film-grain 0.15, skewX |
| 3 | `luxury-reveal` | Playfair Display 700 / Raleway 400 | luxury-noir (#050505 bg, #C9A96E gold) | Gentle (damping 25+) | 2-3 scenes, 150-200fr each | Letterbox, blur-in, vignette 0.6 |
| 4 | `wellness-float` | Nunito 700 / Quicksand 400 | wellness-calm (#ECFDF5 bg, #4ADE80 green) | Very gentle (damping 8-12) | 3-4 scenes, 120-150fr each | Float keyframes, soft gradient |
| 5 | `creator-caption` | Montserrat 700 / Poppins 400 | White + black stroke | Medium-high (damping 10-14) | 4-6 scenes, 60-90fr each | text_stroke 3px, bounce entrance |
| 6 | `ecommerce-sale` | Anton 400 / Open Sans 600 | shop-energy (#0C0A09 bg, #F97316 orange) | Aggressive (damping 6-10) | 5-7 scenes, 45-75fr each | ALL-CAPS prices, elastic-pop CTA |
| 7 | `b2b-corporate` | Oswald 600 / Lato 400 | b2b-corporate (#111827 bg, #1D4ED8 blue) | Standard (damping 16-20) | 4-5 scenes, 90-120fr each | Clean slide-up, no bounce |
| 8 | `food-appetite` | Montserrat 700 / Lora 400 | appetite-warm (#3E2723 bg, #DC2626 red) | Standard-warm (damping 12-16) | 3-4 scenes, 90-120fr each | Warm color-grade 0.12, radial bg |

---

## 11. Duration-Aware Presets

Templates optimized for specific video lengths with exact scene/frame structures.

### `6s-bumper`
```json
{
  "description": "Ultra-short bumper ad — 3 scenes, hard cuts, maximum impact",
  "fps": 30,
  "total_frames": 180,
  "scenes": [
    { "name": "hook", "duration_frames": 60, "elements": 1, "transition": "none" },
    { "name": "message", "duration_frames": 60, "elements": 1, "transition": "hard-cut" },
    { "name": "cta", "duration_frames": 60, "elements": 1, "transition": "hard-cut" }
  ],
  "rules": "Max 1 text element per scene. Size 72px+. No blur-in (too slow). Instant opacity entrance."
}
```

### `10s-social`
```json
{
  "description": "Social media optimized — 3-4 scenes with fade-up text and clear CTA",
  "fps": 30,
  "total_frames": 300,
  "scenes": [
    { "name": "hook", "duration_frames": 75, "elements": 1, "transition": "fade" },
    { "name": "value", "duration_frames": 120, "elements": 2, "transition": "slide" },
    { "name": "metric", "duration_frames": 45, "elements": 1, "transition": "wipe" },
    { "name": "cta", "duration_frames": 60, "elements": 1, "transition": "fade" }
  ],
  "rules": "Key metric in scene 3 at 84px+. CTA holds 60 frames minimum. Stagger elements 8fr apart."
}
```

### `15s-problem-solution`
```json
{
  "description": "Problem-solution narrative in 15 seconds — 5 scenes",
  "fps": 30,
  "total_frames": 450,
  "scenes": [
    { "name": "hook", "duration_frames": 75, "elements": 1, "transition": "fade" },
    { "name": "problem", "duration_frames": 90, "elements": 2, "transition": "slide" },
    { "name": "solution", "duration_frames": 135, "elements": 2, "transition": "wipe" },
    { "name": "proof", "duration_frames": 75, "elements": 1, "transition": "slide" },
    { "name": "cta", "duration_frames": 75, "elements": 1, "transition": "fade" }
  ],
  "rules": "Solution is the longest scene. Each scene has unique bg gradient. Vary animation per scene."
}
```

### `30s-brand-story`
```json
{
  "description": "Full brand narrative arc in 30 seconds — 6 scenes",
  "fps": 30,
  "total_frames": 900,
  "scenes": [
    { "name": "hook", "duration_frames": 90, "elements": 1, "transition": "fade" },
    { "name": "problem", "duration_frames": 150, "elements": 2, "transition": "slide" },
    { "name": "agitation", "duration_frames": 150, "elements": 2, "transition": "wipe" },
    { "name": "solution", "duration_frames": 210, "elements": 2, "transition": "wipe" },
    { "name": "proof", "duration_frames": 150, "elements": 2, "transition": "slide" },
    { "name": "cta", "duration_frames": 150, "elements": 1, "transition": "fade" }
  ],
  "rules": "Solution is the visual climax — use strongest animation here. Product visible 40%+ of runtime. CTA holds 90+ frames."
}
```
