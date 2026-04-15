# Product Showcase & Visual Presentation Research

Comprehensive reference for how to showcase products, SaaS apps, demos, screenshots, and images in video ads and motion graphics. Covers framing, device mockups, screenshot treatment, demo flows, animation patterns, and platform-specific rules. All values are prescriptive and implementation-ready for a Remotion-based video generation system operating at 30fps.

---

## 1. Product Shot Framing & Composition

### Hero Shot Placement Rules

| Placement Strategy | When to Use | Product Position (x%, y%) | Product Size (% of frame) |
|---|---|---|---|
| **Center Dominant** | Single hero product, maximum impact | `(50%, 50%)` | 60-85% of frame |
| **Rule of Thirds — Left** | Product + text on right | `(33%, 50%)` | 45-60% of frame |
| **Rule of Thirds — Right** | Text on left + product reveal | `(67%, 50%)` | 45-60% of frame |
| **Lower Third Hero** | Product below, headline above | `(50%, 65%)` | 50-70% of frame width |
| **Upper Showcase** | Product above, CTA below | `(50%, 35%)` | 50-65% of frame width |
| **Off-Center Float** | Dynamic/editorial feel | `(60%, 45%)` | 40-55% of frame |

### Product-to-Frame Ratio by Context

| Context | Min Fill | Ideal Fill | Max Fill |
|---|---|---|---|
| Hero product shot (single item) | 60% | 70-80% | 90% |
| Product with text overlay | 40% | 50-60% | 65% |
| Product lineup (2-3 items) | 70% total | 80% total | 90% total |
| Product in lifestyle context | 30% | 40-50% | 60% |
| Thumbnail / small preview | 80% | 85-90% | 95% |

### Negative Space Rules

- **Minimum breathing room**: 5% padding on all sides between product edge and frame edge
- **Text-heavy scenes**: 40-50% negative space on the text side
- **Clean hero shots**: 15-25% negative space evenly distributed
- **Luxury/premium feel**: 30-40% negative space (more space = more premium)
- **Urgency/sale feel**: 5-10% negative space (tight crop = energy)

### Background Choices

| Background Type | Best For | Implementation |
|---|---|---|
| **Solid white** | Clean e-commerce, Apple-style | `backgroundColor: '#FFFFFF'` |
| **Solid black** | Premium, tech, Pro products | `backgroundColor: '#000000'` |
| **Solid brand color** | Brand awareness, bold statements | Single color fill |
| **Linear gradient** | Modern SaaS, depth without distraction | Two-color gradient, 135-180deg |
| **Radial gradient** | Spotlight effect on product | Center-out gradient, lighter center |
| **Subtle texture** | Organic products, lifestyle brands | Low-opacity noise or paper texture |
| **Blurred lifestyle** | Context without distraction | Gaussian blur 20-40px on background image |
| **Abstract shapes** | Tech, creative tools | Geometric blobs with blur |

### Aspect Ratio Framing Adjustments

| Element | 16:9 Landscape | 1:1 Square | 9:16 Vertical |
|---|---|---|---|
| **Product position** | Center or right-third | Dead center | Upper 40% of frame |
| **Product max width** | 50-60% frame width | 70-80% frame width | 80-90% frame width |
| **Text position** | Left of product or below | Above or below product | Below product |
| **Negative space** | Sides have more room | Even all around | Top/bottom breathing room |
| **Multi-product** | Horizontal row | 2x2 grid | Vertical stack |

---

## 2. SaaS & App Screenshot Presentation

### How Top SaaS Companies Present UI

| Company | Style | Key Technique |
|---|---|---|
| **Notion** | Clean, light backgrounds | Floating UI panels with soft shadows, no device frame, focus on customizable workspace |
| **Linear** | Dark, minimal | Dark mode screenshots, smooth transitions, speed-focused messaging |
| **Figma** | Colorful, collaborative | Multi-cursor animations, real-time collaboration shown, vibrant gradients behind UI |
| **Vercel** | Terminal-aesthetic | Dark backgrounds, code snippets, deployment flow animations |
| **Stripe** | Developer-meets-design | API code alongside polished dashboard, purple gradient backgrounds |
| **Slack** | Conversational | Chat UI mockups, message animations, warm friendly colors |

### Screenshot Sizing Rules

| Presentation Style | Screenshot Width (% of frame) | Screenshot Height (% of frame) | Padding |
|---|---|---|---|
| **Full dashboard view** | 85-90% | 70-80% | 5-8% all sides |
| **Feature zoom** | 60-70% | 50-60% | 15-20% sides |
| **With text callout** | 55-65% | 50-65% | Text fills remaining space |
| **Phone app screenshot** | 35-45% | 70-85% | Center with gradient bg |
| **Split screen (screenshot + text)** | 48-52% one side | 80-90% height | 2-4% gap between halves |

### Screenshot Depth & Treatment

| Treatment | CSS/Style Implementation | Best For |
|---|---|---|
| **Soft shadow** | `boxShadow: '0 25px 50px rgba(0,0,0,0.15)'` | Light backgrounds, clean feel |
| **Hard shadow** | `boxShadow: '0 10px 30px rgba(0,0,0,0.3)'` | Dark backgrounds, dramatic |
| **Elevated float** | Shadow + slight `translateY(-10px)` | Hero screenshots |
| **Flat / no shadow** | No shadow, border only | Minimalist, inside device frame |
| **Glassmorphism** | Semi-transparent bg + backdrop blur | Modern SaaS, dark themes |
| **Rounded corners** | `borderRadius: 12-16px` | Standalone screenshots |
| **Browser-frame rounded** | `borderRadius: 8-12px` on frame only | Browser mockup presentations |

### Perspective & Angle Treatments

| Angle | Transform | When to Use |
|---|---|---|
| **Flat / straight-on** | No transform | Clean, readable, feature detail |
| **Slight tilt (5-8deg)** | `rotateY(5deg) rotateX(2deg)` | Dynamic feel, hero shots |
| **Isometric (30deg)** | `rotateY(30deg) rotateX(15deg) scale(0.85)` | Multi-panel showcase, landing pages |
| **3D perspective tilt** | `perspective(1200px) rotateY(15deg)` | Premium, depth effect |
| **Stacked cards** | Multiple screenshots with offset + rotation | Feature comparison |

### Screenshot Zoom & Pan Patterns

| Pattern | Description | Timing (30fps) |
|---|---|---|
| **Overview → Feature Zoom** | Show full UI, then zoom to specific feature | 30 frames overview hold, 20 frames zoom transition, 45 frames feature hold |
| **Pan Across Dashboard** | Slow horizontal pan across wide UI | 60-90 frames at constant speed |
| **Scroll Reveal** | Simulate scrolling down a long page | `translateY` from 0 to -[overflow] over 60-120 frames |
| **Feature Spotlight** | Zoom to feature, apply highlight glow | 15 frames zoom, 10 frames glow-in, 30 frames hold |
| **Multi-Feature Tour** | Zoom to feature 1 → pull back → zoom to feature 2 | 20f zoom + 30f hold + 15f pull back, repeat |

### Dark Mode vs. Light Mode

| Context | Recommendation |
|---|---|
| **Dark background ad** | Use dark mode screenshot — seamless integration |
| **Light background ad** | Use light mode screenshot — natural fit |
| **Mixed/gradient background** | Either works; add shadow/border for separation |
| **Night/evening viewing (Stories/Reels)** | Dark mode preferred — less eye strain, feels native |
| **LinkedIn / professional** | Light mode often performs better — business context |
| **Developer tools** | Dark mode almost always — matches audience expectation |

### UI Annotation Techniques

| Annotation | Implementation | Size |
|---|---|---|
| **Circle highlight** | 3px border circle, brand color, no fill | 60-120px diameter around feature |
| **Arrow pointer** | SVG arrow, animated draw-on | 80-150px length |
| **Glow/pulse highlight** | Box-shadow pulse animation on element | Subtle 4-8px glow radius |
| **Color overlay** | Semi-transparent color rectangle over area | Matches feature bounding box |
| **Numbered badge** | Small circle with number, pointing to feature | 24-36px diameter |
| **Underline emphasis** | Animated underline below text in screenshot | 2-3px thick, brand color |

---

## 3. Device Mockup Strategies

### Browser Window Mockup

| Property | Value |
|---|---|
| **When to use** | SaaS dashboards, web apps, landing pages |
| **Frame style** | Minimal (3 dots + URL bar) or realistic (full chrome) |
| **Corner radius** | 12px outer, 0px inner content |
| **Title bar height** | 36-44px (minimal) or 72-80px (with URL bar) |
| **Dot colors** | Red `#FF5F57`, Yellow `#FFBD2E`, Green `#28C840` |
| **Dot size** | 12px diameter, 8px gap between |
| **Frame color** | `#F6F6F6` (light) or `#2D2D2D` (dark) |
| **Shadow** | `0 20px 60px rgba(0,0,0,0.15)` |
| **Best frame size** | 80-90% of composition width |

### Phone Mockup

| Property | Value |
|---|---|
| **When to use** | Mobile apps, Instagram/TikTok previews, responsive demos |
| **Device model** | iPhone 15 Pro style (rounded corners, dynamic island) |
| **Corner radius** | 44-50px outer |
| **Bezel width** | 4-6px |
| **Screen aspect** | 19.5:9 (approximately 390x844 content) |
| **Frame color** | Space Black `#1C1C1E`, Silver `#E3E3E8`, Natural Titanium `#8A8478` |
| **Positioning in frame** | Center for vertical ads; right-third for landscape |
| **Size in landscape comp** | 25-35% frame width, 60-80% frame height |
| **Size in vertical comp** | 55-70% frame width, 55-70% frame height |

### Laptop/MacBook Mockup

| Property | Value |
|---|---|
| **When to use** | Full SaaS platform views, B2B demos, productivity tools |
| **Angle options** | Flat (0deg), slight tilt (10-15deg open), 3D perspective |
| **Screen aspect** | 16:10 (MacBook) or 16:9 (generic) |
| **Frame color** | Space Gray `#6E6E73`, Silver `#E3E3E8` |
| **Bezel width** | 6-10px top/sides, 16-24px bottom (with hinge) |
| **Size in landscape comp** | 75-90% frame width |
| **Size in vertical comp** | 80-95% frame width, 40-55% frame height |

### iPad/Tablet Mockup

| Property | Value |
|---|---|
| **When to use** | Reading apps, drawing tools, presentation demos |
| **Orientation** | Landscape for productivity, portrait for reading/social |
| **Corner radius** | 20-24px |
| **Bezel width** | 8-12px |
| **Size in frame** | 65-80% of frame in matching orientation |

### Multi-Device Compositions

| Layout | Description | Positioning |
|---|---|---|
| **Phone + Laptop** | Laptop center-left, phone overlapping bottom-right | Laptop at `(40%, 45%)` 65% width; Phone at `(75%, 60%)` 22% width |
| **Phone + Tablet** | Tablet behind, phone in front offset | Tablet at `(45%, 50%)` 60% width; Phone at `(65%, 55%)` 25% width |
| **Triple device** | Laptop center, phone left, tablet right | Laptop at `(50%, 45%)`; Phone at `(15%, 55%)`; Tablet at `(85%, 55%)` |
| **Phone lineup** | 3 phones side by side, slight rotation | Center at 0deg, sides at +/-8deg, 28% width each |

### Floating UI (No Device Frame)

| When It Works | Implementation |
|---|---|
| Feature-specific zoom-ins | Just the UI panel with rounded corners + shadow |
| Clean modern aesthetic | White/dark card with `borderRadius: 16px` |
| Multiple features at once | Floating cards arranged in grid or scatter |
| Abstract/creative ads | UI elements with gradient backgrounds, no frame anchor |

**Sizing for floating UI**: Use `borderRadius: 12-20px`, `boxShadow: 0 16px 48px rgba(0,0,0,0.12)`, and ensure 8-12% padding within the card.

---

## 4. Product Animation Patterns

### Entrance Animations

| Animation | Implementation (30fps) | Duration | Best For |
|---|---|---|---|
| **Slide Up** | `translateY`: 120% → 0% | 12-18 frames | Products, screenshots, cards |
| **Slide Down** | `translateY`: -120% → 0% | 12-18 frames | Headers, badges |
| **Slide Left** | `translateX`: 120% → 0% | 12-18 frames | Side panels, secondary elements |
| **Slide Right** | `translateX`: -120% → 0% | 12-18 frames | Side panels, secondary elements |
| **Scale Reveal** | `scale`: 0 → 1 with spring overshoot | 18-24 frames | Hero products, logos |
| **Spring Pop** | `scale`: 0 → 1.08 → 1 (spring physics) | 20-30 frames | Emphasis items, badges, icons |
| **Drop In** | `translateY`: -200% → 0 + bounce | 24-30 frames | Playful, casual brands |
| **Fade In** | `opacity`: 0 → 1 | 10-15 frames | Subtle, elegant entrances |
| **Fade + Scale** | `opacity`: 0 → 1 AND `scale`: 0.8 → 1 | 15-20 frames | Most versatile entrance |
| **Mask Reveal (Left)** | `clipPath` expanding from left edge | 15-24 frames | Screenshots, images |
| **Mask Reveal (Center)** | `clipPath` circle expanding from center | 18-24 frames | Products, dramatic reveal |
| **Blur Resolve** | `filter: blur(20px)` → `blur(0)` + `opacity` 0 → 1 | 18-24 frames | Premium, cinematic |

**Remotion spring config for entrances:**
```
spring({ fps: 30, config: { damping: 12, stiffness: 200, mass: 0.5 } })
```

### Exit Animations

| Animation | Implementation | Duration |
|---|---|---|
| **Fade Out** | `opacity`: 1 → 0 | 8-12 frames |
| **Scale Down** | `scale`: 1 → 0.8, `opacity`: 1 → 0 | 10-15 frames |
| **Slide Out (any direction)** | `translate`: 0 → 120% | 10-15 frames |
| **Blur Away** | `blur`: 0 → 20px, `opacity`: 1 → 0 | 12-18 frames |
| **Quick Shrink** | `scale`: 1 → 0, easeIn | 8-12 frames |

**Rule**: Exits should be 30-50% faster than entrances. Entrances build anticipation; exits clear the stage.

### Float / Levitate Animation

| Property | Value |
|---|---|
| **Motion type** | Sine wave on `translateY` |
| **Amplitude** | 8-15px (subtle) or 20-35px (dramatic) |
| **Period** | 60-90 frames (2-3 seconds at 30fps) |
| **Formula** | `Math.sin(frame / period * Math.PI * 2) * amplitude` |
| **Best for** | Hero product shots, phone mockups, floating UI panels |
| **Combine with** | Subtle rotation (1-3deg oscillation), soft shadow that scales with height |

### Product Rotation / Turntable

| Property | Value |
|---|---|
| **Full 360 spin** | `rotateY`: 0 → 360deg over 90-120 frames (3-4 seconds) |
| **Subtle oscillation** | `rotateY`: -15deg → 15deg, sine wave, 60-frame period |
| **Speed curve** | Start slow → constant → slow end (ease-in-out) |
| **Best for** | Physical products, 3D renders, packaging |
| **Shadow treatment** | Floor shadow that stretches/compresses with rotation |

### Ken Burns Effect

| Property | Value |
|---|---|
| **Zoom range** | Scale 1.0 → 1.15 (subtle) or 1.0 → 1.3 (dramatic) |
| **Pan range** | 5-15% of image dimension |
| **Duration** | 90-180 frames (3-6 seconds) |
| **Easing** | Linear or very gentle ease-in-out |
| **Best for** | Lifestyle product photos, food, fashion, background images |
| **Direction combos** | Zoom in + pan right, Zoom out + pan left, Zoom in + pan down |

### Parallax Layers

| Layer | Movement Rate | Content |
|---|---|---|
| **Far background** | 0.2x base speed | Gradient, abstract shapes |
| **Mid background** | 0.5x base speed | Supporting graphics, pattern |
| **Product layer** | 1.0x (base) | Main product/screenshot |
| **Foreground accent** | 1.5x base speed | Particles, light effects |
| **Text overlay** | 0.8x base speed | Headlines, callouts |

**Base movement**: 30-60px horizontal shift over the scene duration.

### Shadow Techniques

| Shadow Type | CSS Implementation | Best For |
|---|---|---|
| **Soft drop shadow** | `boxShadow: '0 20px 40px rgba(0,0,0,0.1)'` | Light backgrounds, subtle depth |
| **Hard contact shadow** | `boxShadow: '0 4px 8px rgba(0,0,0,0.3)'` | Grounded products |
| **Floor shadow (ellipse)** | Separate element: ellipse with gaussian blur below product | Floating products |
| **Ambient shadow** | `boxShadow: '0 0 60px rgba(0,0,0,0.08)'` | All-around subtle glow |
| **Colored shadow** | `boxShadow: '0 20px 40px rgba(brand_color, 0.2)'` | Matching brand, neon effects |
| **Dynamic shadow** | Shadow scales/moves with float animation | Floating product animations |

### Special Effects

| Effect | Description | Implementation |
|---|---|---|
| **Particle burst** | Small dots/sparkles emit from product on reveal | 20-40 particles, random velocity, fade over 30 frames |
| **Glow pulse** | Soft glow around product that pulses | `boxShadow` with animated spread, 45-60 frame cycle |
| **Light sweep** | Diagonal light streak across product | CSS gradient mask, `translateX` sweep over 20-30 frames |
| **Shimmer** | Subtle brightness wave across surface | Linear gradient overlay with animated position |
| **Exploded view** | Components separate outward, then reassemble | `translate` each piece 50-100px outward, hold 45f, spring back |

---

## 5. Screenshot & Demo Flow Sequences

### Video Structure by Length

#### 15-Second Video (450 frames at 30fps)

| Scene | Frames | Duration | Content |
|---|---|---|---|
| **Hook** | 0-45 | 1.5s | Bold text + problem statement OR eye-catching product shot |
| **Hero Feature** | 45-180 | 4.5s | Main screenshot/product with primary value prop |
| **Supporting Feature** | 180-315 | 4.5s | Second screenshot or feature callout |
| **CTA** | 315-450 | 4.5s | Call to action + logo + URL |

- **Max features to show**: 1-2
- **Transitions**: 10-15 frames each
- **Rule**: One feature per every 5-7 seconds

#### 30-Second Video (900 frames at 30fps)

| Scene | Frames | Duration | Content |
|---|---|---|---|
| **Hook** | 0-60 | 2s | Problem statement or attention grab |
| **Context** | 60-180 | 4s | Brief problem/solution framing |
| **Feature 1** | 180-360 | 6s | Primary screenshot + callout |
| **Feature 2** | 360-540 | 6s | Secondary screenshot + callout |
| **Feature 3** | 540-690 | 5s | Tertiary feature (optional) |
| **Social Proof** | 690-780 | 3s | Testimonial, rating, or logo bar |
| **CTA** | 780-900 | 4s | Call to action + logo + pricing |

- **Max features to show**: 2-3
- **Transitions**: 12-18 frames each

#### 60-Second Video (1800 frames at 30fps)

| Scene | Frames | Duration | Content |
|---|---|---|---|
| **Hook** | 0-90 | 3s | Strong problem statement or dramatic product reveal |
| **Problem** | 90-270 | 6s | Pain point elaboration |
| **Solution Intro** | 270-420 | 5s | Product intro with hero screenshot |
| **Feature 1** | 420-630 | 7s | Detailed feature with zoom + callout |
| **Feature 2** | 630-840 | 7s | Second feature deep dive |
| **Feature 3** | 840-1050 | 7s | Third feature |
| **Feature 4** | 1050-1230 | 6s | Fourth feature (optional) |
| **Social Proof** | 1230-1410 | 6s | Testimonials, reviews, logos |
| **Pricing/Offer** | 1410-1560 | 5s | Pricing reveal or offer |
| **CTA** | 1560-1800 | 8s | Strong CTA, logo, URL, final frame hold |

- **Max features to show**: 3-5
- **Transitions**: 15-24 frames each

### Screenshot Transition Patterns

| Transition | Description | Frames | Best Between |
|---|---|---|---|
| **Cross dissolve** | Fade one out while fading next in | 15-20 frames | Any screenshots |
| **Slide push** | New screenshot pushes old one off-screen | 12-18 frames | Sequential features |
| **Scale swap** | Current scales down + fades, new scales up | 18-24 frames | Different product areas |
| **Morph/match cut** | Match position of shared UI element | 15-20 frames | Same product, different views |
| **Wipe reveal** | Directional wipe reveals new screenshot | 12-18 frames | Before/after, upgrades |
| **Card flip** | 3D flip from one screenshot to another | 18-24 frames | Feature comparison |
| **Zoom through** | Zoom into current, cross-fade, zoom out of new | 24-30 frames | Overview → detail → overview |

### Zoom & Pan Sequences

| Sequence | Steps | Total Timing |
|---|---|---|
| **Overview → Detail** | 1. Show full UI (30f hold) → 2. Zoom to feature (20f) → 3. Hold on detail (45f) | ~95 frames |
| **Detail → Context** | 1. Start zoomed in (30f hold) → 2. Zoom out (20f) → 3. Show full UI (30f hold) | ~80 frames |
| **Feature Tour** | For each feature: Zoom in (15f) → Hold (30f) → Zoom out (10f) → Pan to next (15f) | ~70 frames per feature |
| **Scroll Reveal** | 1. Show top of page (30f hold) → 2. Smooth scroll down (90f) → 3. Hold at feature (30f) | ~150 frames |

### Cursor & Click Simulation

| Element | Size | Animation |
|---|---|---|
| **Cursor icon** | 24-32px, white with dark border | Smooth `interpolate()` movement between positions |
| **Click ripple** | 40-60px expanding circle, brand color | Scale 0 → 1, opacity 1 → 0 over 12 frames |
| **Tap animation (mobile)** | 60-80px circle | Scale 0.5 → 1, opacity 0.6 → 0 over 15 frames |
| **Cursor movement speed** | 200-400px over 15-20 frames | Ease-in-out curve |
| **Dwell before click** | 6-10 frames pause | Cursor stops, then click |

### Text Callout + Screenshot Pairing

| Layout | Screenshot Position | Text Position | Best Aspect Ratio |
|---|---|---|---|
| **Text Left, Screenshot Right** | `(65%, 50%)` 50% width | `(20%, 50%)` 35% width | 16:9 |
| **Text Right, Screenshot Left** | `(35%, 50%)` 50% width | `(80%, 50%)` 35% width | 16:9 |
| **Text Above, Screenshot Below** | `(50%, 62%)` 80% width | `(50%, 20%)` 80% width | 9:16, 1:1 |
| **Text Below, Screenshot Above** | `(50%, 35%)` 80% width | `(50%, 78%)` 80% width | 9:16, 1:1 |
| **Text Overlay on Screenshot** | `(50%, 50%)` 90% width | `(50%, 80%)` with dark gradient behind | All |

### Highlighting UI Elements

| Technique | Implementation | Duration |
|---|---|---|
| **Glow border** | Animated `boxShadow` with brand color, 6-10px spread | Fade in over 10f, pulse for 45f |
| **Dim surroundings** | Dark overlay (70% opacity) with cutout for highlighted area | Fade in 12f, hold 60f |
| **Magnifier circle** | Circular zoom window following highlighted feature | Move into position over 15f, hold 45f |
| **Animated underline** | Line drawing animation below the target element | Draw over 12-18f, hold 30f |
| **Color tint** | Rest of UI desaturated, highlighted feature full color | Transition 12f, hold 45-60f |

---

## 6. Image Treatment & Enhancement

### Image Quality Handling

| Input Quality | Treatment |
|---|---|
| **High-res (2x+)** | Downscale to composition size, sharp rendering |
| **Standard (1x)** | Use at native size or slight downscale, avoid upscaling |
| **Low-res / blurry** | Apply subtle blur filter (2-4px) to mask artifacts, use at small size, add border/frame to distract |
| **Non-standard aspect** | Crop to target aspect with `object-fit: cover`, center on subject |
| **Very wide / panoramic** | Ken Burns pan, or use as background with blur |
| **Very tall / long** | Scroll reveal animation, or crop to key section |

### Image Masking & Shapes

| Shape | Implementation | Best For |
|---|---|---|
| **Rounded rectangle** | `borderRadius: 12-24px` | Screenshots, product photos, cards |
| **Circle crop** | `borderRadius: 50%` | Avatars, profile photos, icons |
| **Pill shape** | `borderRadius: 9999px` on wide rectangle | Feature badges, tags |
| **Custom polygon** | CSS `clip-path: polygon(...)` | Creative/editorial layouts |
| **Hexagon** | `clip-path: polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)` | Tech, gaming aesthetics |
| **Diagonal cut** | `clip-path: polygon(0 0, 100% 0, 100% 85%, 0 100%)` | Dynamic, editorial |

### Image Border & Frame Treatments

| Treatment | Implementation | Use Case |
|---|---|---|
| **Thin border** | `border: 2px solid rgba(0,0,0,0.1)` | Separation on light backgrounds |
| **Thick accent border** | `border: 4-6px solid brand_color` | Feature highlight, emphasis |
| **Polaroid frame** | White padding 5% sides, 12% bottom + shadow | Casual, personal, testimonials |
| **Film frame** | Black bars top/bottom, sprocket holes | Cinematic, premium |
| **Double border** | Border + gap + border (box-shadow trick) | Luxury, editorial |
| **Gradient border** | CSS gradient on pseudo-element behind image | Modern, tech, creative |

### Image Reveal Animations

| Animation | Implementation | Frames |
|---|---|---|
| **Wipe left-to-right** | `clipPath: inset(0 X% 0 0)` animating X from 100 → 0 | 18-24 frames |
| **Wipe top-to-bottom** | `clipPath: inset(0 0 X% 0)` animating X from 100 → 0 | 18-24 frames |
| **Iris expand** | `clipPath: circle(X% at 50% 50%)` animating X from 0 → 75 | 18-24 frames |
| **Mask expand** | Rectangle clip expanding from center | 15-20 frames |
| **Diagonal wipe** | `clipPath: polygon()` with animated points | 18-24 frames |
| **Shutter (multi-strip)** | Multiple horizontal/vertical strips revealing in sequence | 20-30 frames |
| **Pixel dissolve** | Grid of small squares revealing randomly | 24-36 frames |

### Collage & Grid Layouts

| Layout | Grid | Sizing | Gap |
|---|---|---|---|
| **2-image side by side** | 2 columns, 1 row | Each 48% width, 60-80% height | 4% gap |
| **3-image row** | 3 columns, 1 row | Each 31% width | 3% gap |
| **2x2 grid** | 2 columns, 2 rows | Each 48% width, 48% height | 4% gap |
| **1 large + 2 small** | 1 left (60%), 2 right stacked (38% each) | See description | 4% gap |
| **Masonry (3 items)** | 2 columns, left tall, right 2 stacked | Left 48% w 96% h; Right each 48% w, 47% h | 4% gap |
| **Image carousel** | Horizontal overflow, 3 visible | Each 35-40% width, center scaled larger | 3% gap |

### Image Stack / Carousel Effects

| Effect | Description | Implementation |
|---|---|---|
| **Stacked cards** | 3 images stacked with offset | Each offset by (10px, 10px) and -3deg rotation, spring-animate separation |
| **Fan spread** | Images fan out from bottom center | Rotate from common origin point, -15deg to +15deg |
| **Carousel slide** | Images slide horizontally, center image is larger | `translateX` animation, center at `scale(1.1)`, sides at `scale(0.85)` + reduced opacity |
| **Depth stack** | Front image full, behind images visible on edges | Z-index stacking, 5-10px visible edge, subtle shadow between layers |

---

## 7. Physical Product Showcase Patterns

### E-Commerce Product Presentation

| Style | Background | Framing | Animation |
|---|---|---|---|
| **Clean white** | Pure white `#FFFFFF` | Product fills 70-85% of frame, centered | Float + subtle rotation |
| **Studio gradient** | Light gray gradient center-out | Product fills 60-75%, slight shadow | Scale reveal + shadow expand |
| **Lifestyle context** | Blurred scene (20-40px blur) | Product 40-60%, environment visible | Ken Burns on background, product entrance |
| **Flat lay** | Solid color or marble texture, overhead view | Product 50-70% with accessories | Items animate in one by one, 8-12f delay between |
| **In-use** | Natural environment | Product 30-50%, hands/person visible | Focus pull to product |

### Food Photography Presentation

| Technique | Implementation |
|---|---|
| **Overhead / flat lay** | Shot from directly above, arranged on surface; animate with slow zoom in |
| **45-degree angle** | Most appetizing angle for plated food; subtle float animation |
| **Steam/heat effect** | Animated semi-transparent wisp overlay, rising slowly (1-2px per frame) |
| **Ingredient scatter** | Ingredients arranged around dish; animate flying in to assemble |
| **Close-up texture** | Macro crop showing texture detail; Ken Burns slow zoom |
| **Color enhancement** | Slightly boost saturation (+10-15%) and warmth for food images |

### Fashion & Apparel

| Technique | Implementation |
|---|---|
| **Ghost mannequin** | Product appears to float in 3D shape without visible form |
| **Flat lay arrangement** | Overhead view of outfit laid out; items animate in sequentially |
| **Detail zoom** | Start wide, zoom to fabric/stitching detail |
| **Color variants** | Cross-dissolve between color options, 30-45 frames per variant |
| **Lifestyle pairing** | Product on model (blurred bg), text overlay with details |

### Beauty & Skincare

| Technique | Implementation |
|---|---|
| **Product lineup** | Products arranged by height, left-to-right entrance with 6-10f stagger |
| **Texture swatch** | Close-up of product texture next to bottle; split composition |
| **Ingredient callout** | Lines extending from product to ingredient labels, animated draw |
| **Before/after** | Split screen with center divider, or slider animation |
| **Luxe float** | Product floating on gradient bg with particle effects (gold, light) |

### Electronics & Gadgets

| Technique | Implementation |
|---|---|
| **360 spin** | Turntable rotation, 90-120 frames for full revolution |
| **Exploded view** | Components separate outward from center, label each, reassemble |
| **Screen-on showcase** | Device with illuminated screen showing UI; glow effect around screen |
| **Feature callout lines** | Thin lines extending from product to feature text labels |
| **Size comparison** | Product next to common object (hand, coin) for scale reference |

### Product Comparison Layouts

| Layout | Description | Positioning |
|---|---|---|
| **Side by side** | Two products with "VS" or divider between | Left at `(25%, 50%)`, Right at `(75%, 50%)`, divider at `(50%, 50%)` |
| **Versus card** | Products on either side with specs in center | Products at 30% width each, specs list centered |
| **Feature table** | Grid with checkmarks for each product's features | Full width, rows animate in with 4-6f stagger |
| **Before/after** | Same product, different states, slider between | Both at `(50%, 50%)` full size, animated `clipPath` divider |

---

## 8. Social Proof & Testimonial Visual Patterns

### Review/Rating Card

| Property | Value |
|---|---|
| **Card size** | 70-85% frame width, 25-40% frame height |
| **Card style** | White bg, `borderRadius: 16px`, `boxShadow: 0 8px 32px rgba(0,0,0,0.1)` |
| **Star size** | 20-28px each, 4px gap between |
| **Star color** | Gold `#FFB800` filled, gray `#E0E0E0` empty |
| **Star animation** | Sequential fill left-to-right, 4-6 frames per star |
| **Quote text** | 18-24px, regular weight, dark gray `#333333` |
| **Reviewer name** | 14-18px, semi-bold, darker gray or brand color |
| **Avatar** | 40-56px circle, positioned left of name |
| **Card entrance** | Slide up + fade, 18-24 frames |
| **Card position** | Center, or overlay on bottom-third of product shot |

### Star Rating Animation

| Style | Implementation |
|---|---|
| **Sequential fill** | Each star scales from 0 → 1 and fills with color, 4-6f per star, left-to-right |
| **Count up** | Number animates from 0.0 → 4.8, stars fill accordingly |
| **Burst fill** | All stars appear with particle burst, simultaneous |
| **Handwritten** | Stars "draw on" with stroke animation, one at a time |

### User Avatar + Quote Composition

| Layout | Description |
|---|---|
| **Card layout** | Avatar (48-64px circle) top-left, quote below, name + title bottom-right |
| **Inline layout** | Avatar left, vertical line separator, quote right, name below quote |
| **Centered** | Avatar centered top, quote centered below, name centered bottom |
| **With product** | Product left (50% width), testimonial card right (45% width) |

### Social Media Post Embed Mockups

| Platform | Mock Style |
|---|---|
| **Tweet/X post** | White card, avatar + name + handle top, text body, engagement metrics bottom |
| **LinkedIn post** | White card, avatar + name + headline + "1st" badge, text body |
| **App Store review** | Star rating + title + body + "Verified Purchase" badge |
| **G2/Capterra badge** | Platform logo + star rating + category leader badge |

### Press Mention / Logo Bar

| Layout | Implementation |
|---|---|
| **Horizontal logo bar** | "As featured in" text above, 4-6 logos in a row at 60-80px height |
| **Logo opacity** | All logos at 40-60% opacity (grayscale) for subtle, clean look |
| **Logo entrance** | Fade in with 6-8 frame stagger, left to right |
| **Bar position** | Bottom third of frame, or as a scene divider between features and CTA |
| **Logo spacing** | Equal spacing, 30-50px gap between logos |

---

## 9. Pricing & Offer Presentation

### Price Display Patterns

| Pattern | Layout | Animation |
|---|---|---|
| **Large center price** | Big number `(50%, 45%)`, currency small, period label below | Scale pop from 0 → 1 with spring overshoot |
| **Price card** | Card with plan name, price, features list | Card slides up, features list staggers in |
| **Strikethrough → new price** | Old price with line-through, new price bold beside it | Old price fades in (15f), line draws through (10f), new price pops in (12f) |
| **Price comparison** | Two columns: competitor vs. ours | Columns slide in from sides, price highlights with glow |
| **Starting at** | Small "Starting at" label, large price number below | Label fades in (10f), price number counts up or scale-pops (15f) |

### Price Tag / Badge Design

| Style | Size | Position |
|---|---|---|
| **Circle badge** | 80-120px diameter | Top-right of product, rotated 10-15deg |
| **Rectangle tag** | 120-180px wide, 48-64px tall | Bottom of product or bottom-right of frame |
| **Ribbon banner** | 160-220px wide, 40-56px tall | Corner wrap (top-right) or horizontal across |
| **Pill badge** | 100-160px wide, 36-48px tall | Inline with product name or top of card |

### Discount Presentation

| Element | Size | Animation | Notes |
|---|---|---|---|
| **Percentage number** | 48-96px font | Count up from 0% → target, or scale pop | Bold weight, brand color or red `#E53E3E` |
| **"OFF" label** | 24-36px font | Appears after number reaches target | Positioned to right of or below percentage |
| **Strikethrough line** | 3-4px thick, red or dark | Draws left-to-right over old price in 8-12 frames | Slight diagonal angle (-5deg) looks more natural |
| **"SALE" burst** | 80-140px starburst shape | Scale pop with rotation (0deg → -5deg) | Use sparingly, casual/retail brands only |
| **Savings badge** | Pill shape, accent color | Slides in from right, 12 frames | "Save $XX" or "XX% Off" text |

### Guarantee Badges

| Badge | Size | Position |
|---|---|---|
| **Money-back guarantee** | 80-120px | Bottom-right of pricing scene |
| **Free trial** | Pill badge 120-180px wide | Below price or above CTA |
| **No credit card required** | Text line, 14-18px | Below CTA button |
| **Cancel anytime** | Text line, 14-18px | Below CTA button |

---

## 10. Platform-Specific Product Showcase

### Safe Zones by Platform (9:16 at 1080x1920)

| Platform | Top Safe (px) | Bottom Safe (px) | Left Safe (px) | Right Safe (px) | Safe Content Area |
|---|---|---|---|---|---|
| **TikTok** | 150px | 350px | 60px | 120px | 900 x 1420 center |
| **Instagram Reels** | 108px | 320px | 60px | 120px | 900 x 1492 center |
| **Instagram Stories** | 108px | 280px | 48px | 48px | 984 x 1532 center |
| **YouTube Shorts** | 120px | 300px | 48px | 48px | 984 x 1500 center |
| **Facebook Reels** | 108px | 340px | 60px | 100px | 920 x 1472 center |

**Critical rule**: All text and key product elements must be within the safe zone. Background imagery and decorative elements can extend to the full frame.

### Product Placement by Safe Zone

For 9:16 vertical video, position key product content:
- **Horizontal center**: `(50%, -)` — centered in the safe area
- **Vertical sweet spot**: `(-, 42%)` — slightly above center to avoid bottom UI overlays
- **Text zone**: Upper 30% of safe area (above the product)
- **CTA zone**: 60-75% from top (below product, above bottom UI)

### Platform-Specific Ad Patterns

#### Instagram Stories / Reels (9:16)

| Pattern | Description | Product Position |
|---|---|---|
| **Full-bleed product** | Product fills entire frame with text overlay | Center, 80-95% frame |
| **Phone-in-hand** | Phone mockup showing app, tilted slightly | Center, 55-70% frame width |
| **Swipe-up tease** | Product at top, "swipe up" CTA at bottom | Upper 60%, CTA at 70-75% from top |
| **Story card** | White card on colorful bg with product + text | Card 85% width, 70% height, centered |

#### TikTok (9:16)

| Pattern | Description | Notes |
|---|---|---|
| **Native feel** | Lo-fi aesthetic, product on simple bg | Avoid overly polished — authenticity performs |
| **Text-heavy hook** | Large bold text first 1-2s, then product | 36-48px text, product reveal after hook |
| **Unboxing reveal** | Sequence mimicking unboxing content | 3-5 quick cuts, final hero reveal |
| **Trending format** | Mirror current TikTok visual trends | Fast cuts, bold text, sound-reactive |

#### LinkedIn (Various, 1:1 or 16:9 preferred)

| Pattern | Description | Notes |
|---|---|---|
| **Dashboard showcase** | Clean screenshot in browser mockup | Professional framing, minimal effects |
| **Problem → Solution** | Text problem slide → product screenshot slide | 2-4 scene sequence, clean transitions |
| **Data/metrics focus** | Screenshot highlighting metrics/ROI | Callout annotations on numbers |
| **Testimonial + product** | Quote card + product screenshot | Split layout or sequential |

#### YouTube Pre-Roll (16:9)

| Pattern | Description | Notes |
|---|---|---|
| **5s hook + demo** | Attention grab in first 5s (pre-skip), then demo | Show product in first 3 seconds |
| **Problem-solution story** | Narrative structure with product as the hero | 15-30s format |
| **Feature walkthrough** | Sequential feature demo with transitions | 30-60s format |
| **Comparison** | Your product vs. the old way | Split screen or sequential |

#### Facebook Feed (1:1 or 4:5)

| Pattern | Description | Notes |
|---|---|---|
| **Square product hero** | Product centered on clean bg, text above/below | 1:1, product fills 65-75% |
| **Carousel-style video** | Multiple products shown sequentially | 3-5s per product, slide transitions |
| **Lifestyle clip** | Product in context with text overlay | 4:5, product 40-50% of frame |

---

## 11. Scene Templates for Product Videos

### Template 1: Hero Product Float

| Property | Value |
|---|---|
| **Description** | Single product centered on gradient background with float animation |
| **Product position** | `(50%, 45%)`, 65-75% frame width |
| **Text position** | Headline at `(50%, 85%)`, subtext at `(50%, 92%)` |
| **Background** | Radial gradient, lighter center |
| **Animation** | Product: spring entrance (scale 0 → 1, 24f) then sine float (10px, 75f cycle). Text: fade-in 12f delay after product |
| **Best aspect ratio** | 1:1, 9:16 |
| **Best for** | Physical products, app icons, packaging |

### Template 2: SaaS Dashboard Reveal

| Property | Value |
|---|---|
| **Description** | Browser mockup slides up revealing a full dashboard screenshot |
| **Screenshot position** | `(50%, 48%)`, 85% frame width, inside browser frame |
| **Text position** | Headline at `(50%, 8%)` above the browser |
| **Background** | Solid dark or gradient |
| **Animation** | Browser frame: slide up from bottom (120% → 48%, 20f spring). Screenshot content: fade-in 8f after frame arrives. Headline: fade + slide from top (10f) |
| **Best aspect ratio** | 16:9, 1:1 |
| **Best for** | SaaS platforms, web apps, dashboards |

### Template 3: Feature Callout Grid

| Property | Value |
|---|---|
| **Description** | Screenshot center with 3-4 feature callout cards arranged around it |
| **Screenshot position** | `(50%, 50%)`, 55% frame width |
| **Callout positions** | Top-left `(15%, 20%)`, Top-right `(85%, 20%)`, Bottom-left `(15%, 80%)`, Bottom-right `(85%, 80%)` |
| **Callout card size** | 25% frame width, auto height |
| **Background** | Light gray or white |
| **Animation** | Screenshot: scale reveal (18f). Callouts: stagger fade-in from nearest corner, 10f each, 8f delay between |
| **Best aspect ratio** | 16:9, 1:1 |
| **Best for** | SaaS features, multi-benefit products |

### Template 4: Split Screen Demo

| Property | Value |
|---|---|
| **Description** | Screen divided: screenshot on one half, text explanation on the other |
| **Screenshot position** | `(72%, 50%)`, 48% frame width (right half) |
| **Text position** | `(25%, 50%)`, 40% frame width (left half) |
| **Divider** | Optional 2px line or gradient fade at center |
| **Background** | Left: solid color or gradient. Right: slightly different shade or white |
| **Animation** | Left text: slide in from left (15f). Right screenshot: slide in from right (15f). Simultaneous or 6f offset |
| **Best aspect ratio** | 16:9 |
| **Best for** | Feature explanation, SaaS, B2B |

### Template 5: Before/After Transform

| Property | Value |
|---|---|
| **Description** | "Before" state transitions to "After" state with dramatic reveal |
| **Before position** | `(50%, 50%)`, 80% frame width |
| **After position** | Same as before |
| **Label positions** | "BEFORE" badge at `(15%, 12%)`, "AFTER" badge same position |
| **Background** | Neutral, same for both states |
| **Animation** | Before holds 45f → wipe transition left-to-right (18f) reveals After → After holds 60f. Or: vertical split slider animating from left to right |
| **Best aspect ratio** | All |
| **Best for** | Transformations, cleanup tools, design tools, photo editors |

### Template 6: Testimonial + Product

| Property | Value |
|---|---|
| **Description** | Product/screenshot top, testimonial card bottom (or vice versa) |
| **Product position** | `(50%, 30%)`, 70% frame width |
| **Testimonial card position** | `(50%, 75%)`, 80% frame width, 25-30% frame height |
| **Card content** | Avatar (40px), stars, quote text, name |
| **Background** | Light gradient or brand color |
| **Animation** | Product: slide down from top (15f). Card: slide up from bottom (15f, 8f delay). Stars: sequential fill (4f each, after card arrives) |
| **Best aspect ratio** | 9:16, 1:1 |
| **Best for** | Any product with strong reviews |

### Template 7: Price Reveal Card

| Property | Value |
|---|---|
| **Description** | Product shown first, then price card animates in over or beside it |
| **Product position** | `(50%, 40%)`, 60% frame width |
| **Price card position** | `(50%, 78%)`, 70% frame width, 20% frame height |
| **Card content** | Plan name, large price, period, CTA button |
| **Background** | Clean gradient or solid |
| **Animation** | Product: already visible or fade-in (12f). Price card: spring pop from scale 0 (20f). Price number: count-up from $0 to target (30f). CTA button: pulse glow after card settles |
| **Best aspect ratio** | 9:16, 1:1 |
| **Best for** | SaaS pricing, subscription products, offers |

### Template 8: Phone App Showcase

| Property | Value |
|---|---|
| **Description** | Phone mockup centered with app screenshot, text overlays around it |
| **Phone position** | `(50%, 48%)`, 40% frame width (landscape) or 60% (vertical) |
| **Text positions** | Headline at `(50%, 8%)`, feature bullets left/right of phone |
| **Background** | Gradient or abstract shapes |
| **Animation** | Phone: slide up + spring (20f). App content: fade in after phone arrives (12f). Text: stagger fade-in (8f each, 6f delay) |
| **Best aspect ratio** | 9:16, 1:1 |
| **Best for** | Mobile apps, responsive web apps |

### Template 9: Feature Walkthrough Sequence

| Property | Value |
|---|---|
| **Description** | Multi-scene sequence cycling through 3-5 features with consistent framing |
| **Per-feature layout** | Feature number badge at `(50%, 8%)`, screenshot at `(50%, 45%)` 80% width, feature text at `(50%, 88%)` |
| **Background** | Consistent brand gradient, changes slightly per feature for variety |
| **Animation** | Per feature: badge count-up (8f) → screenshot slide-in (15f) → text fade-in (10f) → hold (45-60f) → all slide out (12f) → next feature |
| **Transition** | Cross-dissolve or slide-push between features |
| **Best aspect ratio** | All |
| **Best for** | SaaS, multi-feature products, app showcases |

### Template 10: Logo Bar + Product Hero

| Property | Value |
|---|---|
| **Description** | "Trusted by" logo bar at top, hero product in center, tagline below |
| **Logo bar position** | `(50%, 10%)`, 80% width, logos at 40-50% opacity |
| **Product position** | `(50%, 48%)`, 65-75% frame width |
| **Tagline position** | `(50%, 88%)` |
| **Background** | White or light gray |
| **Animation** | Logo bar: fade-in (15f). Product: scale reveal with spring (22f, 10f delay). Tagline: slide up + fade (12f, after product) |
| **Best aspect ratio** | 16:9, 1:1 |
| **Best for** | B2B SaaS, enterprise products, trust-building |

### Template 11: Multi-Device Showcase

| Property | Value |
|---|---|
| **Description** | Laptop + phone showing same product, demonstrating responsiveness |
| **Laptop position** | `(38%, 45%)`, 60% frame width |
| **Phone position** | `(78%, 55%)`, 20% frame width |
| **Text position** | `(50%, 90%)` or `(50%, 8%)` |
| **Background** | Gradient or solid |
| **Animation** | Laptop: slide in from left (18f). Phone: slide in from right (18f, 8f delay). Both screenshots: fade-in after device frames arrive |
| **Best aspect ratio** | 16:9 |
| **Best for** | Responsive web apps, cross-platform products |

### Template 12: Countdown / Urgency Sale

| Property | Value |
|---|---|
| **Description** | Product with large discount badge and countdown-style urgency elements |
| **Product position** | `(50%, 40%)`, 55-65% frame width |
| **Discount badge** | `(80%, 15%)`, 100px circle, rotated 12deg |
| **Original price** | `(35%, 72%)`, strikethrough |
| **Sale price** | `(65%, 72%)`, large, bold, accent color |
| **Background** | Bold color (red, orange, brand accent) or gradient |
| **Animation** | Product: already visible. Badge: spring pop (18f). Old price: fade in (10f) → strikethrough draws (10f). New price: scale pop (15f, after strikethrough). Flash/pulse on new price |
| **Best aspect ratio** | 1:1, 9:16 |
| **Best for** | E-commerce sales, limited offers, Black Friday |

### Template 13: Problem → Solution

| Property | Value |
|---|---|
| **Description** | Scene 1 presents the problem (pain text), Scene 2 reveals the product as the solution |
| **Scene 1 layout** | Large text at `(50%, 45%)`, 80% width. Optional sad emoji or X icon at `(50%, 20%)` |
| **Scene 2 layout** | Product/screenshot at `(50%, 45%)`, 80% width. Solution text at `(50%, 88%)` |
| **Background** | Scene 1: dark/muted. Scene 2: bright/vibrant (contrast shift) |
| **Animation** | Scene 1: text slams in (8f). Hold 45-60f. Background color transition (15f). Product: scale reveal + spring (20f). Solution text: fade-in (12f) |
| **Best aspect ratio** | All |
| **Best for** | All products, especially SaaS, problem-solving tools |

### Template 14: Ingredient / Feature Explainer

| Property | Value |
|---|---|
| **Description** | Product center with lines extending to feature/ingredient labels |
| **Product position** | `(50%, 50%)`, 40-50% frame width |
| **Callout line origins** | Points on product edge |
| **Callout label positions** | Scattered around product at `(15%, 25%)`, `(85%, 25%)`, `(15%, 75%)`, `(85%, 75%)` |
| **Line style** | 1-2px, light gray or brand color, with small dot at product end |
| **Background** | White or very light |
| **Animation** | Product: fade in (15f). Lines: draw outward from product, one by one (12f each, 6f stagger). Labels: fade in at end of each line |
| **Best aspect ratio** | 1:1, 9:16 |
| **Best for** | Skincare, food, supplements, tech specs |

### Template 15: Comparison / Versus

| Property | Value |
|---|---|
| **Description** | Two products or approaches side by side with "VS" divider |
| **Left product** | `(25%, 45%)`, 40% frame width |
| **Right product** | `(75%, 45%)`, 40% frame width |
| **VS badge** | `(50%, 45%)`, 60-80px circle |
| **Labels** | Left label at `(25%, 85%)`, right label at `(75%, 85%)` |
| **Background** | Left half one color, right half another (split background) |
| **Animation** | Left product: slide from left (15f). Right product: slide from right (15f). VS badge: scale pop (12f, after products). Labels: fade-in (10f) |
| **Best aspect ratio** | 16:9, 1:1 |
| **Best for** | Competitive comparison, before/after, feature tiers |

### Template 16: Scrolling Long Screenshot

| Property | Value |
|---|---|
| **Description** | Long webpage/app screenshot scrolls vertically to reveal full page |
| **Screenshot position** | `(50%, varies)`, 85% frame width, masked to visible area |
| **Visible window** | 75% of frame height |
| **Mask** | `overflow: hidden` container with inner `translateY` animation |
| **Background** | Solid or gradient matching screenshot chrome |
| **Animation** | Start at top, hold 30f, smooth scroll down over 90-120f, hold at feature 30f. Speed: 3-6px per frame |
| **Best aspect ratio** | 9:16 (shows more vertical content) |
| **Best for** | Landing pages, long-form content, portfolios |

### Template 17: Social Proof Montage

| Property | Value |
|---|---|
| **Description** | Rapid sequence of testimonial cards, tweets, or review screenshots |
| **Card size** | 75% frame width, 30-40% frame height |
| **Cards position** | Center, stacking on top of each other |
| **Background** | Light or brand gradient |
| **Animation** | Each card: slide up from bottom (12f), hold (30-45f), slide up and out top (12f). Next card follows immediately. 4-6 cards total |
| **Best aspect ratio** | 9:16, 1:1 |
| **Best for** | Social proof compilations, review showcases |

### Template 18: Isometric Multi-Panel

| Property | Value |
|---|---|
| **Description** | 2-3 screenshots arranged in isometric 3D perspective |
| **Panel transforms** | Each at `perspective(1200px) rotateY(25deg) rotateX(10deg)` |
| **Panel positions** | Staggered: `(30%, 50%)`, `(50%, 48%)`, `(70%, 46%)` |
| **Panel sizes** | 40% frame width each, overlapping |
| **Background** | Dark gradient for contrast |
| **Animation** | Panels slide in one by one from right, 15f each, 10f delay. Slight float animation after settling |
| **Best aspect ratio** | 16:9 |
| **Best for** | SaaS multi-view, dashboard showcase, feature overview |

### Template 19: CTA Finale Card

| Property | Value |
|---|---|
| **Description** | Final frame with logo, tagline, CTA button, and URL |
| **Logo position** | `(50%, 25%)`, 30-40% frame width |
| **Tagline position** | `(50%, 48%)`, 80% frame width |
| **CTA button position** | `(50%, 65%)`, pill shape 40% frame width, 8-10% frame height |
| **URL/handle** | `(50%, 82%)`, 16px, subdued color |
| **Background** | Brand color or gradient |
| **Animation** | Logo: scale pop (15f). Tagline: fade-in (12f, 8f delay). CTA: slide up + spring (18f, 12f delay). CTA pulse: subtle scale 1.0→1.03→1.0 (60f loop). URL: fade-in last |
| **Best aspect ratio** | All |
| **Best for** | Final scene of any video ad |

### Template 20: Unboxing Reveal

| Property | Value |
|---|---|
| **Description** | Simulated unboxing: box/packaging opens to reveal product |
| **Box position** | `(50%, 50%)`, 60-70% frame width |
| **Product position** | Same center, revealed by box animation |
| **Background** | Solid or subtle gradient |
| **Animation** | Box lid: rotateX from 0deg (closed) to -110deg (open), 24f. Product: scale 0.8 → 1.0 + translateY upward 30px + fade-in (18f, starts at frame 12 of lid). Shadow appears under product. Optional sparkle particles on reveal |
| **Best aspect ratio** | 1:1, 9:16 |
| **Best for** | Physical products, subscription boxes, launches |

---

## 12. Common Mistakes & Anti-Patterns

### Critical Mistakes to Avoid

| Mistake | Problem | Fix |
|---|---|---|
| **Product too small** | Product fills less than 30% of frame — viewers cannot identify it, especially on mobile | Minimum 50% frame coverage for hero shots; 40% for text-paired layouts |
| **Unreadable screenshots** | UI text is illegible at viewing size, especially on phone screens | If screenshot is less than 70% frame width, zoom to feature detail instead of showing full UI. Minimum readable text: 12px at final render size |
| **Too many features, too fast** | Showing 5+ features in a 15s video — nothing registers | Max 1-2 features per 15s. Hold each feature for minimum 45 frames (1.5s) |
| **No text context** | Product shown without any text explaining what it is or does | Always pair product with at least a headline (what it is) and optionally a subtitle (why it matters) |
| **Poor contrast** | Product blends into background (white product on white bg) | Ensure minimum contrast ratio. Add shadow, border, or contrasting background |
| **Ignoring safe zones** | Key text/product overlapped by platform UI (like, comment, share buttons) | Keep all critical content within safe zone. See Section 10 for exact pixel values |
| **No clear CTA** | Video ends without telling viewer what to do next | Always include a CTA scene (2-4 seconds) at the end |
| **Slow start** | Product does not appear until after 3 seconds | Show product or strong hook in first 1-2 seconds. Brand/logo can come later |
| **Inconsistent style** | Different visual treatments per scene (shadows, corners, fonts) | Define style once and apply consistently across all scenes |
| **Text overload** | Too much text on screen simultaneously | Maximum 2 text elements per scene. Keep headlines under 8 words |
| **No breathing room** | Elements crammed edge-to-edge with no padding | Minimum 5% padding on all sides. 8-12% for comfortable spacing |
| **Generic stock feel** | Over-polished, impersonal aesthetic that looks like every other ad | Use brand colors, real product screenshots, and platform-native styles |
| **Missing sound-off design** | Relying on voiceover with no text reinforcement | 85% of social video is watched on mute. All key messages must be visually reinforced with text |
| **Landscape on vertical platforms** | Using 16:9 video on TikTok/Reels where 9:16 dominates | Always match platform format. 9:16 for Stories/Reels/TikTok, 1:1 or 4:5 for feeds |
| **Animation overload** | Every element bouncing, spinning, and flashing simultaneously | Maximum 1-2 animated elements per scene. Rest should be static or subtle |

### Screenshot-Specific Anti-Patterns

| Anti-Pattern | Why It Fails | Better Approach |
|---|---|---|
| **Full UI at 40% frame** | Text unreadable, features invisible | Zoom to 1-2 features at 70%+ frame, or use browser frame at 85%+ |
| **Screenshot without frame** | Looks unfinished, hard to distinguish from background | Add browser frame, rounded corners + shadow, or device mockup |
| **Outdated UI in screenshot** | Erodes trust if interface looks dated | Use current UI, or style the mockup to look modern |
| **Too many annotations** | Arrows, circles, highlights everywhere — nothing stands out | Maximum 1-2 annotations per screenshot. Less is more |
| **Screenshot at wrong angle** | Extreme 3D perspective makes text unreadable | Use flat or slight tilt (5-8deg max) for readable screenshots. Reserve strong perspective for hero/decorative shots only |

### Timing Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Hold too short (<1s)** | Brain cannot process what it sees | Minimum 30 frames (1s) hold on any information |
| **Hold too long (>4s)** | Viewer gets bored, scrolls past | Maximum 120 frames (4s) on any single scene. Aim for 45-90 frames |
| **Transitions too slow** | Kills pacing, feels sluggish | Max 20 frames for transitions. 12-15 is ideal |
| **No rhythm variety** | Every scene same length — feels monotonous | Alternate scene durations: 1.5s → 2.5s → 1.5s → 3s |
| **Back-to-back fast cuts** | Exhausting to watch, nothing registers | After 2-3 fast cuts, include a 2-3s breathing moment |

---

## Quick Reference: Remotion Implementation Cheat Sheet

### Common Spring Configs

| Use Case | Config |
|---|---|
| **Snappy entrance** | `spring({ fps: 30, config: { damping: 15, stiffness: 250, mass: 0.4 } })` |
| **Bouncy pop** | `spring({ fps: 30, config: { damping: 8, stiffness: 200, mass: 0.6 } })` |
| **Smooth settle** | `spring({ fps: 30, config: { damping: 20, stiffness: 120, mass: 0.8 } })` |
| **Gentle float** | `spring({ fps: 30, config: { damping: 30, stiffness: 80, mass: 1.2 } })` |
| **Quick snap** | `spring({ fps: 30, config: { damping: 20, stiffness: 400, mass: 0.3 } })` |

### Common Easing Patterns

| Pattern | Easing |
|---|---|
| **Entrance** | `Easing.out(Easing.cubic)` — fast start, gentle settle |
| **Exit** | `Easing.in(Easing.cubic)` — gentle start, fast end |
| **Emphasis** | `Easing.bezier(0.68, -0.55, 0.265, 1.55)` — overshoot |
| **Linear movement** | `Easing.linear` — Ken Burns, scrolling |
| **Dramatic** | `Easing.out(Easing.exp)` — very fast start, long settle |

### Position Quick Reference (% of frame)

| Position Name | Coordinates (x%, y%) |
|---|---|
| **Center** | `(50%, 50%)` |
| **Top center** | `(50%, 20%)` |
| **Bottom center** | `(50%, 80%)` |
| **Left third** | `(33%, 50%)` |
| **Right third** | `(67%, 50%)` |
| **Top-left** | `(25%, 25%)` |
| **Top-right** | `(75%, 25%)` |
| **Bottom-left** | `(25%, 75%)` |
| **Bottom-right** | `(75%, 75%)` |
| **Vertical sweet spot** | `(50%, 42%)` — slightly above center, avoids bottom UI |
