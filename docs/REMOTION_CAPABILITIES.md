# Remotion Capabilities Reference

Comprehensive reference of all Remotion features, packages, and APIs available for programmatic video creation with React.

---

## 1. Core Package (`remotion`)

The foundation of every Remotion project. All videos are React components rendered frame-by-frame.

### Hooks

| Hook | Purpose |
|---|---|
| `useCurrentFrame()` | Returns the current frame number (starts at 0). The primary driver for all animations. |
| `useVideoConfig()` | Returns `{ fps, durationInFrames, width, height }` of the current composition. |

### Components

| Component | Purpose |
|---|---|
| `<Composition>` | Registers a video with `id`, `component`, `durationInFrames`, `width`, `height`, `fps`, `defaultProps`. |
| `<Still>` | Like Composition but for single-frame images (no duration/fps). |
| `<AbsoluteFill>` | Full-size absolutely positioned container. Primary layout primitive for stacking layers. |
| `<Sequence>` | Places children at a specific time. Props: `from` (frame start, can be negative), `durationInFrames`, `layout` ("absolute-fill" or "none"), `name` (timeline label), `showInTimeline`. Resets `useCurrentFrame()` to 0 for children. |
| `<Series>` | Displays multiple sequences one after another. Children use `<Series.Sequence>` with `durationInFrames` and optional `offset` (shift start by N frames). |
| `<Loop>` | Repeats content. Props: `durationInFrames` (per iteration), `times` (repetitions), `loopBehaviorFrame` ("repeat" or "extend"). |
| `<Freeze>` | Freezes children at a specific frame. Pauses videos and mutes audio. Props: `frame` (which frame to freeze at), `active`. |
| `<Img>` | Image component with `src` and `style`. Use instead of raw `<img>` for render reliability. |

### Functions

| Function | Purpose |
|---|---|
| `interpolate(value, inputRange, outputRange, options?)` | Maps a value from one range to another. Core animation function. |
| `interpolateColors(value, inputRange, outputColors)` | Maps a value range to color transitions. Returns RGBA strings. |
| `spring({ frame, fps, config?, from?, to?, durationInFrames?, delay?, reverse? })` | Physics-based animation returning 0-to-1 values with configurable mass, damping, stiffness, overshootClamping. |
| `random(seed)` | Deterministic random number (0-1). Replaces `Math.random()` for frame-stable randomness. |
| `staticFile(path)` | References assets in the `public/` folder. |
| `getInputProps()` | Gets props passed via CLI or programmatic render. |
| `continueRender(handle)` / `delayRender(label?)` | Async data loading: delay rendering until data is fetched, then continue. |

---

## 2. Animation: `interpolate()` Deep Dive

### Parameters

```ts
interpolate(
  value: number,
  inputRange: number[],    // e.g., [0, 30, 60]
  outputRange: number[],   // e.g., [0, 1, 0]
  options?: {
    easing?: (t: number) => number,
    extrapolateLeft?: 'extend' | 'clamp' | 'wrap' | 'identity',
    extrapolateRight?: 'extend' | 'clamp' | 'wrap' | 'identity',
  }
)
```

### Extrapolation Modes

| Mode | Behavior |
|---|---|
| `extend` (default) | Continues interpolation beyond the range |
| `clamp` | Caps at the nearest boundary value |
| `wrap` | Loops the value change |
| `identity` | Returns the input value unchanged |

### Visual Effects Enabled
- Fade in/out (opacity 0 to 1)
- Slide animations (translateX/Y)
- Scale animations
- Rotation animations
- Multi-keyframe animations (multiple points in input/output arrays)
- Color transitions (via `interpolateColors`)

---

## 3. Animation: `spring()` Deep Dive

### Config Object

| Property | Default | Effect |
|---|---|---|
| `mass` | 1 | Weight of the object. Lower = faster animation. |
| `damping` | 10 | Deceleration intensity. Higher = less bounce. |
| `stiffness` | 100 | Bounciness coefficient. Higher = snappier. |
| `overshootClamping` | false | When true, prevents overshooting the target value. |

### Additional Props

| Prop | Default | Effect |
|---|---|---|
| `from` | 0 | Start value |
| `to` | 1 | End value |
| `reverse` | false | Play animation backwards |
| `durationInFrames` | undefined | Stretch animation to exact frame count |
| `delay` | 0 | Frames to wait before starting |
| `durationRestThreshold` | 0.005 | How close to target = "done" (only with durationInFrames) |

### Visual Effects Enabled
- Bouncy entrances and exits
- Natural-feeling scale/position animations
- Elastic text reveals
- Springy button/UI animations
- Combined with `interpolate()` for mapped spring values

---

## 4. Easing Functions (`Easing` from `remotion`)

All easing functions are `(t: number) => number` and plug into `interpolate()`'s `easing` option.

### Stepping Functions
| Function | Description |
|---|---|
| `Easing.step0` | Returns 1 for any positive value of t |
| `Easing.step1` | Returns 1 if t >= 1 |

### Standard Functions
| Function | Formula |
|---|---|
| `Easing.linear` | f(t) = t (constant speed) |
| `Easing.quad` | f(t) = t^2 |
| `Easing.cubic` | f(t) = t^3 |
| `Easing.poly(n)` | f(t) = t^n (quartic, quintic, etc.) |

### Predefined Animations
| Function | Description |
|---|---|
| `Easing.ease` | Basic inertial interaction, smooth acceleration to a rest |
| `Easing.back(s?)` | Object pulls back slightly before moving forward |
| `Easing.bounce` | Bouncing effect at the end |
| `Easing.elastic(bounciness?)` | Spring oscillation (default bounciness=1, higher N = more oscillations) |

### Mathematical Functions
| Function | Description |
|---|---|
| `Easing.sin` | Sinusoidal curve |
| `Easing.circle` | Circular curve |
| `Easing.exp` | Exponential curve |
| `Easing.bezier(x1, y1, x2, y2)` | Cubic bezier (same as CSS transitions) |

### Modifiers (Wrapping Functions)
| Modifier | Effect |
|---|---|
| `Easing.in(easing)` | Runs the easing function forwards (default behavior) |
| `Easing.out(easing)` | Runs the easing function in reverse |
| `Easing.inOut(easing)` | Symmetrical: runs forward then backward |

### Visual Effects Enabled
- Smooth accelerations and decelerations
- Bouncy/elastic entrances
- Pull-back-and-release animations
- Custom bezier curves matching CSS timing functions
- Overshoot effects

---

## 5. Transitions (`@remotion/transitions`)

Smooth scene-to-scene transitions using the `<TransitionSeries>` component.

### Core Component

```tsx
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";

<TransitionSeries>
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneA />
  </TransitionSeries.Sequence>
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: 30 })}
  />
  <TransitionSeries.Sequence durationInFrames={60}>
    <SceneB />
  </TransitionSeries.Sequence>
</TransitionSeries>
```

### Available Presentations

| Presentation | Import Path | Effect |
|---|---|---|
| `fade()` | `@remotion/transitions/fade` | Incoming scene fades in over outgoing scene |
| `slide()` | `@remotion/transitions/slide` | Entering scene pushes out the exiting scene |
| `wipe()` | `@remotion/transitions/wipe` | Entering scene slides over the exiting scene |
| `flip()` | `@remotion/transitions/flip` | Rotates/flips the previous scene to reveal the next |
| `clockWipe()` | `@remotion/transitions/clock-wipe` | Circular wipe reveals next scene underneath |
| `iris()` | `@remotion/transitions/iris` | Circular mask expands from center outward |
| `cube()` | Paid (`@remotion/transitions/cube`) | 3D perspective rotation of both scenes |
| `none()` | `@remotion/transitions/none` | No visual effect (timing only) |
| Custom | User-defined | Implement `TransitionPresentation` interface |

### Custom Presentations

Custom presentations receive three parameters:
- `presentationProgress` (0 to 1, influenced by timing)
- `presentationDirection` ("entering" or "exiting")
- `presentationDurationInFrames`

### Timing Functions

| Timing | Description |
|---|---|
| `linearTiming({ durationInFrames, easing? })` | Linear transition with optional easing function |
| `springTiming({ config?, durationInFrames?, durationRestThreshold? })` | Spring-physics-based transition timing |
| Custom | Implement custom timing interface |

### Visual Effects Enabled
- Fade between scenes
- Slide/push transitions (any direction)
- Wipe reveals
- 3D flip and cube rotations
- Clock/radial wipes
- Iris/circular reveals
- Any custom transition via the extensible API

---

## 6. Media Components

### Video

| Component | Package | Description |
|---|---|---|
| `<OffthreadVideo>` | `remotion` | Recommended. Renders exact frame during render. Props: `src`, `style`, `volume` (0-1), `muted`, `playbackRate`, `startFrom`, `endAt`. Does NOT support `loop`. |
| `<Video>` | `remotion` | Alias for `<Html5Video>`. Syncs with timeline. Supports `loop`. |
| `<Html5Video>` | `remotion` | HTML5 video element synced to Remotion timeline. |

### Audio

| Component | Package | Description |
|---|---|---|
| `<Audio>` | `remotion` | Audio playback synced to timeline. Props: `src`, `volume` (0-1 or callback), `startFrom`, `endAt`, `muted`, `loop`, `playbackRate`. |

### Image

| Component | Package | Description |
|---|---|---|
| `<Img>` | `remotion` | Image with render-safe loading. Props: `src`, `style`. Use over raw `<img>`. |

### GIF (`@remotion/gif`)

| Component/Function | Description |
|---|---|
| `<Gif>` | Displays animated GIFs synced to Remotion timeline. Props: `src`, `width`, `height`, `fit`, `playbackRate`. Does not support AVIF/WebP. |
| `<AnimatedImage>` | Broader format support (GIF, animated PNG, AVIF, WebP). Uses ImageDecoder API (Chrome/Firefox only). |
| `getGifDurationInSeconds()` | Returns the duration of a GIF file. |

### Static Assets

| Function | Description |
|---|---|
| `staticFile(path)` | References files from the `public/` folder. |

---

## 7. Text & Typography

### Google Fonts (`@remotion/google-fonts`)

| API | Description |
|---|---|
| `loadFont()` | Loads a Google Font by importing `@remotion/google-fonts/<FontName>`. Returns `{ fontFamily }`. Supports filtering by `style`, `weight`, `subsets`. Type-safe with autocompletion. Blocks render until font is ready. |
| `getAvailableFonts()` | Returns list of all available Google Fonts. |
| `loadFontFromInfo()` | Load a font from a font info object (useful for dynamic font pickers). |
| `getInfo()` | Get metadata about a specific font. |

### Custom Fonts (`@remotion/fonts`)

| API | Description |
|---|---|
| `loadFont({ family, url, weight?, style?, format?, ... })` | Loads a local or remote font. Supports options: `ascentOverride`, `descentOverride`, `display`, `featureSettings`, `lineGapOverride`, `stretch`, `unicodeRange`, `variant`. |

### Layout Utilities (`@remotion/layout-utils`)

| Function | Description |
|---|---|
| `measureText({ text, fontFamily, fontSize, fontWeight?, letterSpacing?, ... })` | Calculates text width and height. Browser-only. |
| `fitText({ text, withinWidth, fontFamily, fontWeight?, letterSpacing?, ... })` | Returns `{ fontSize }` needed to fit text within a given width. |
| `fillTextBox({ maxWidth, maxLines, ... })` | Returns an `add(word)` method to check if text exceeds box dimensions. Returns `{ exceedsBox }`. |

### Rounded Text Boxes (`@remotion/rounded-text-box`)

| Function | Description |
|---|---|
| `createRoundedTextBox({ textMeasurements, textAlign, horizontalPadding, borderRadius })` | Creates SVG path for TikTok/Instagram-style rounded text backgrounds. Returns `{ d, boundingBox, instructions }`. |

---

## 8. Shapes (`@remotion/shapes`)

Each shape is available as both a React component and a pure function that returns an SVG path.

### Components & Functions

| Component | Function | Shape |
|---|---|---|
| `<Rect>` | `makeRect()` | Rectangle |
| `<Circle>` | `makeCircle()` | Circle |
| `<Ellipse>` | `makeEllipse()` | Ellipse |
| `<Triangle>` | `makeTriangle()` | Triangle |
| `<Star>` | `makeStar()` | Star (configurable points) |
| `<Pie>` | `makePie()` | Pie/arc segment |
| `<Polygon>` | `makePolygon()` | Regular polygon (configurable sides) |
| `<Heart>` | `makeHeart()` | Heart shape |

### Key Features
- All shapes are pure, dependency-free SVG
- Functions return SVG path strings compatible with `@remotion/paths`
- Components accept standard SVG props (fill, stroke, etc.)
- Easy to animate: interpolate props like radius, points, progress over time

### Visual Effects Enabled
- Animated shape morphing
- Progress indicators (pie charts)
- Decorative backgrounds and masks
- Star ratings, polygonal frames
- Shape-based transitions and reveals

---

## 9. SVG Paths (`@remotion/paths`)

Zero-dependency SVG path manipulation utilities. Can be used outside of Remotion.

### Path Information

| Function | Description |
|---|---|
| `getLength(path)` | Returns the total length of an SVG path. |
| `getPointAtLength(path, length)` | Returns `{ x, y }` coordinates at a given length along the path. |
| `getTangentAtLength(path, length)` | Returns tangent `{ x, y }` at a given length (useful for rotation along paths). |
| `getBoundingBox(path)` | Returns the bounding box of the path. |
| `getSubpaths(path)` | Splits a complex path into individual sub-paths. |

### Path Transformation

| Function | Description |
|---|---|
| `scalePath(path, scaleX, scaleY?)` | Grows or shrinks the path. |
| `translatePath(path, x, y)` | Moves the path by x/y offset. |
| `reversePath(path)` | Reverses the direction of the path. |
| `normalizePath(path)` | Converts all relative coordinates to absolute. |
| `resetPath(path)` | Translates the path so it starts at (0, 0). |
| `warpPath(path, fn)` | Remaps coordinates through a custom function. |
| `extendViewBox(viewBox, amount)` | Widens an SVG viewBox in all directions. |

### Path Animation

| Function | Description |
|---|---|
| `evolvePath(progress, path)` | Animates a path from invisible to fully drawn. The core "drawing" animation. |
| `interpolatePath(progress, path1, path2)` | Morphs between two SVG paths. |

### Visual Effects Enabled
- Line drawing animations (evolvePath)
- Path morphing between shapes
- Moving elements along a path (getPointAtLength)
- Rotating elements to follow a path (getTangentAtLength)
- Shape scaling and transformation animations
- Complex SVG animation choreography

---

## 10. Animation Utilities (`@remotion/animation-utils`)

Type-safe CSS animation helpers. Available from v4.0.92.

### Style Interpolation

| Function | Description |
|---|---|
| `interpolateStyles(value, inputRange, outputStylesRange)` | Interpolates entire CSS style objects. Maps a value range to style object transitions. |

### Transform Helpers

`makeTransform([...transforms])` combines multiple CSS transforms into a single string.

| Function | CSS Output |
|---|---|
| `rotate(deg)` | `rotate(Xdeg)` |
| `rotateX(deg)` | `rotateX(Xdeg)` |
| `rotateY(deg)` | `rotateY(Xdeg)` |
| `rotateZ(deg)` | `rotateZ(Xdeg)` |
| `rotate3d(x, y, z, deg)` | `rotate3d(...)` |
| `scale(x, y?)` | `scale(X, Y)` |
| `scaleX(x)` | `scaleX(X)` |
| `scaleY(y)` | `scaleY(Y)` |
| `scaleZ(z)` | `scaleZ(Z)` |
| `scale3d(x, y, z)` | `scale3d(...)` |
| `translate(x, y?)` | `translate(Xpx, Ypx)` |
| `translateX(x)` | `translateX(Xpx)` |
| `translateY(y)` | `translateY(Ypx)` |
| `translateZ(z)` | `translateZ(Zpx)` |
| `translate3d(x, y, z)` | `translate3d(...)` |
| `skew(x, y?)` | `skew(Xdeg, Ydeg)` |
| `skewX(x)` | `skewX(Xdeg)` |
| `skewY(y)` | `skewY(Ydeg)` |
| `perspective(px)` | `perspective(Xpx)` |
| `matrix(a,b,c,d,tx,ty)` | `matrix(...)` |
| `matrix3d(...)` | `matrix3d(...)` |

### Visual Effects Enabled
- Type-safe CSS transform composition
- 3D rotations and perspective effects
- Complex multi-transform animations
- Style object interpolation for smooth CSS transitions

---

## 11. Noise (`@remotion/noise`)

Deterministic noise generation based on simplex noise. Zero dependencies.

### Functions

| Function | Parameters | Description |
|---|---|---|
| `noise2D(seed, x, y)` | seed: string/number, x/y: number | Returns noise value for 2D coordinates. |
| `noise3D(seed, x, y, z)` | seed: string/number, x/y/z: number | Returns noise value for 3D coordinates. Use z=time for animated 2D noise. |
| `noise4D(seed, x, y, z, w)` | seed: string/number, x/y/z/w: number | Returns noise value for 4D coordinates. |

### Visual Effects Enabled
- Organic, non-repetitive motion (clouds, water, terrain)
- Particle system perturbation
- Animated gradient backgrounds
- Jittery/hand-drawn text effects
- Procedural texture generation
- Smooth random value transitions over time

---

## 12. Three.js Integration (`@remotion/three`)

Bridges React Three Fiber (R3F) with Remotion's timeline.

### APIs

| API | Description |
|---|---|
| `<ThreeCanvas>` | R3F Canvas wrapper that enables `useCurrentFrame()` and Remotion hooks inside Three.js scenes. Renders animations in markup (not `useFrame()`). |
| `useVideoTexture()` | Uses a Remotion `<Html5Video>` as a Three.js texture map. |
| `useOffthreadVideoTexture()` | Uses exact-frame video as a `Three.ImageTexture` (render-accurate). |

### Visual Effects Enabled
- Full 3D scenes rendered as video
- 3D text and typography
- Particle systems
- 3D product showcases
- Video textures mapped onto 3D objects
- Camera animations through 3D space
- All Three.js/R3F capabilities with frame-accurate rendering

---

## 13. Lottie (`@remotion/lottie`)

Display Lottie/Bodymovin animations synced to Remotion's timeline.

### Component

```tsx
<Lottie
  animationData={data}          // LottieAnimationData object
  style={style}                 // CSS for container div
  renderer="svg"                // "svg" (default), "canvas", or "html"
  preserveAspectRatio="..."     // SVG aspect ratio handling
  onReady={(item) => {}}        // Callback with AnimationItem
  assetsPath="/path/"           // Folder for external assets
/>
```

### Utility

| Function | Description |
|---|---|
| `getLottieMetadata(data)` | Returns metadata including duration, FPS, dimensions from Lottie data. |

### Data Loading
- From static file: `staticFile()` + fetch
- From URL: fetch remote JSON
- From npm: import JSON directly

### Limitations
- Uses `lottie-web`'s `.goToAndStop()` for seeking
- Limited expression support (may cause flickering)
- Some complex After Effects expressions may not render deterministically

### Visual Effects Enabled
- Thousands of premade animations from LottieFiles
- After Effects animations exported via Bodymovin
- Icon animations, loading spinners, illustrations
- Complex vector animations without manual coding

---

## 14. Motion Blur (`@remotion/motion-blur`)

Higher-order components that create motion blur and trail effects.

### Components

| Component | Description | Key Props |
|---|---|---|
| `<CameraMotionBlur>` | Natural film-camera-style motion blur. Renders the scene at multiple sub-frames and composites them at lower opacity. | `shutterAngle` (default: 180, higher = more blur), `samples` (number of sub-frames, keep low for performance) |
| `<Trail>` | Creates trailing/ghosting effect. Renders multiple copies of children with frame lag. | `layers` (number of trail copies), `lagInFrames` (frame offset per layer), `trailOpacity` (opacity of trail copies) |

### Requirements
- Children must be absolutely positioned (use `<AbsoluteFill>`)
- Higher `samples`/`layers` = better quality but slower render

### Visual Effects Enabled
- Realistic camera motion blur on fast-moving elements
- Ghosting/afterimage trails
- Speed/velocity visual indicators
- Cinematic motion effects

---

## 15. Skia Integration (`@remotion/skia`)

React Native Skia components rendered in Remotion via CanvasKit (WebAssembly).

### APIs

| API | Description |
|---|---|
| `<SkiaCanvas>` | Wraps Remotion contexts for React Native Skia components. |
| `enableSkia()` | Webpack override to enable Skia support in the Remotion bundler. |

### Requirements
- Requires `@shopify/react-native-skia`
- CanvasKit WASM file (~2.9MB gzipped) loaded asynchronously
- May need `--gl=angle` for GPU acceleration on some systems

### Visual Effects Enabled
- GPU-accelerated 2D graphics
- Advanced shader effects (blur, gradient, color matrix)
- Path drawing with GPU rendering
- Image filters and compositing
- All React Native Skia drawing operations

---

## 16. Rive Integration (`@remotion/rive`)

Renders Rive animations synced to Remotion's timeline.

### Key Features
- Rive is a real-time interactive animation tool
- Supports both Canvas2D and WebGL rendering
- State machine integration for interactive animations
- Rive animations are compact and performant

### Visual Effects Enabled
- Interactive vector animations
- State-machine-driven animation sequences
- Character animations
- UI micro-interactions exported from Rive

---

## 17. Preloading (`@remotion/preload`)

Preloads assets to prevent loading delays during playback.

### Functions

| Function | Description |
|---|---|
| `preloadVideo(src)` | Preloads a video source via `<link type="preload">`. |
| `preloadAudio(src)` | Preloads an audio source. |
| `preloadImage(src)` | Preloads an image source. |
| `preloadFont(src)` | Preloads a font file. |
| `resolveRedirect(url)` | Follows redirects to get the final URL. Requires CORS support. |

### Usage
- Call outside components or in `useEffect()`
- Returns a cleanup function to remove the preload tag

---

## 18. Media Utilities (`@remotion/media-utils`)

Helper functions for media file metadata and manipulation.

### Functions

| Function | Description |
|---|---|
| `getAudioDurationInSeconds(src)` | Returns audio duration by creating an invisible audio element. |
| `getVideoMetadata(src)` | Returns video metadata including `durationInSeconds`. (Deprecated in favor of other methods.) |
| `getAudioData(src)` | Returns detailed audio data including waveform information. |
| `useAudioData(src)` | Hook version of `getAudioData()`. |
| `useWindowedAudioData(src)` | Windowed version for large audio files. |
| `audioBufferToDataUrl(buffer)` | Converts AudioBuffer to a data URL. |
| `visualizeAudio({ fps, frame, audioData, numberOfSamples })` | Returns frequency data array for audio visualization. |

### Visual Effects Enabled
- Audio-reactive visualizations (waveforms, frequency bars)
- Dynamic duration matching (composition matches media length)
- Audio-driven animations

---

## 19. Player (`@remotion/player`)

Embeds a Remotion composition as an interactive player in any React app.

### Components

| Component | Description |
|---|---|
| `<Player>` | Interactive video player with play/pause, seeking, and fullscreen. |
| `<Thumbnail>` | Renders a single frame preview of a composition. |

### Key Features
- No server required for playback
- Customizable controls
- Programmatic API (play, pause, seek, get current frame)
- Responsive sizing
- Click-to-play, autoplay, loop options

---

## 20. Rendering & Deployment

### CLI (`@remotion/cli`)

| Command | Description |
|---|---|
| `npx remotion render [comp-id]` | Render a video to MP4/WebM/etc. |
| `npx remotion still [comp-id]` | Render a single frame as PNG/JPEG/etc. |
| `npx remotion studio` | Open the Remotion Studio for preview and development. |
| `npx remotion versions` | Check version alignment across packages. |

### Server-Side Rendering (`@remotion/renderer`)

| Function | Description |
|---|---|
| `renderMedia()` | Render video/audio programmatically from Node.js/Bun. |
| `renderStill()` | Render a single frame programmatically. |
| `renderFrames()` | Render individual frames. |
| `stitchFramesToVideo()` | Combine frames into a video. |
| `getCompositions()` | List available compositions. |
| `selectComposition()` | Select a specific composition for rendering. |

### AWS Lambda (`@remotion/lambda`)

| Function | Description |
|---|---|
| `deployFunction()` | Deploy a Lambda function for rendering. |
| `deploySite()` | Upload the Remotion bundle to S3. |
| `renderMediaOnLambda()` | Trigger a render on Lambda. |
| `getRenderProgress()` | Poll render progress. |
| `renderStillOnLambda()` | Render a still image on Lambda. |

### Google Cloud Run (`@remotion/cloudrun`)
- Similar to Lambda but for Google Cloud Platform

### Bundler (`@remotion/bundler`)
- Webpack-based bundling for Remotion compositions
- Configurable via `remotion.config.ts`

---

## 21. Studio (`@remotion/studio`)

Development environment for previewing and iterating on videos.

### Key Features
- Real-time preview with timeline
- Visual props editor (when using Zod schemas)
- Render button for quick exports
- Timeline with sequence visualization

---

## Summary: All @remotion Packages

| Package | Purpose |
|---|---|
| `remotion` | Core: hooks, components, interpolate, spring |
| `@remotion/transitions` | Scene transitions (fade, slide, wipe, flip, etc.) |
| `@remotion/shapes` | SVG shape components and path generators |
| `@remotion/paths` | SVG path manipulation and animation |
| `@remotion/animation-utils` | CSS transform helpers and style interpolation |
| `@remotion/layout-utils` | Text measurement, fitting, and layout |
| `@remotion/noise` | Perlin/simplex noise (2D, 3D, 4D) |
| `@remotion/three` | Three.js / React Three Fiber integration |
| `@remotion/lottie` | Lottie/Bodymovin animation playback |
| `@remotion/gif` | Animated GIF display |
| `@remotion/motion-blur` | Motion blur and trail effects |
| `@remotion/skia` | React Native Skia (GPU-accelerated 2D) |
| `@remotion/rive` | Rive animation integration |
| `@remotion/google-fonts` | Google Fonts loader (type-safe) |
| `@remotion/fonts` | Custom/local font loader |
| `@remotion/rounded-text-box` | TikTok/Instagram-style rounded text backgrounds |
| `@remotion/media-utils` | Audio/video metadata and visualization |
| `@remotion/preload` | Asset preloading |
| `@remotion/player` | Embeddable React video player |
| `@remotion/renderer` | Server-side rendering APIs |
| `@remotion/lambda` | AWS Lambda rendering |
| `@remotion/cloudrun` | Google Cloud Run rendering |
| `@remotion/cli` | Command-line interface |
| `@remotion/studio` | Development preview environment |
| `@remotion/bundler` | Webpack bundler configuration |
| `@remotion/mcp` | Model Context Protocol integration |
