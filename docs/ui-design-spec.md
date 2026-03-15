# Past Live — Visual UI Design Spec

## Call Screen Reference Layout

### Portrait (Primary)
```
┌─────────────────────────────────────┐
│ 45:32                    [⋯ More]  │ ← Timer (monospace, top-right)
├─────────────────────────────────────┤
│                                     │
│        ┌─────────────────┐          │
│        │                 │          │
│        │   [Avatar]      │          │
│        │   or Video      │          │
│        │                 │          │
│        └─────────────────┘          │
│   "Abraham Lincoln"                │ ← Name overlay
│   [Active indicator border]        │
│                                     │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ "That's a profound question   │   │ ← Caption (scrollable)
│ │ about the nature of union..." │   │    dark bg, white text
│ │                               │   │
│ │ ABRAHAM LINCOLN [⊗ Badge]    │   │ ← Speaker ID
│ └───────────────────────────────┘   │
│                                     │
│  [⊗]    [🔊]    [❌]    [⋯]       │ ← Mute / Speaker / HangUp / More
│ 56px   56px    56px    56px        │    Bottom-aligned, safe area 34px
│                                     │
└─────────────────────────────────────┘
```

### Landscape (Secondary)
```
┌────────────────────────────────────────────────┐
│ Timer ┌──────────────────┐ Captions, scrolled │
│ 45:32 │   [Avatar]       │ "I believe the    │
│       │   LINCOLN        │ Union was meant   │
│       │   (icon border)  │ to endure..."     │
│       │                  │ [LINCOLN]         │
│       └──────────────────┘                     │
│                                                │
│  [Mute] [Speaker] [End]        [Options]     │
└────────────────────────────────────────────────┘
```

---

## Component Specs

### 1. Avatar & Active Speaker Indicator
```
SIZE:
  Desktop width: 200-240px
  Mobile: Full-width - 32px padding
  Aspect ratio: 1:1 (circle)

BORDER:
  Active speaker: 2-3px solid #2563eb (blue)
  Pulse every 200ms when AI speaking
  Fade to 1px when idle

OVERLAY:
  Name: "ABRAHAM LINCOLN" (14px, bold)
  Position: Bottom-left corner
  Background: rgba(0,0,0,0.6)
  Padding: 8px 12px
  Border-radius: 4px
```

### 2. Call Timer
```
TYPOGRAPHY:
  Font: Monospace (Menlo, Courier)
  Size: 14px
  Weight: Regular (500)
  Color: #ffffff (white)
  Letter-spacing: normal

POSITION:
  Top-right corner
  Margin-top: 12px (safe from notch)
  Margin-right: 16px
  Format: MM:SS or H:MM:SS

UPDATE:
  Every 1 second exactly
  Use setInterval(updateTimer, 1000)
  Align to clock second boundary
```

### 3. Bottom Control Bar
```
LAYOUT:
  Flex row, center-aligned
  Spacing: 8px between buttons
  Height: 80px (includes safe area padding)
  Background: transparent (relies on avatar blur)
  Padding-bottom: 34px (iOS home indicator)

BUTTONS (Left to Right):
  [Mute] [Speaker] [HangUp] [More]
  OR: [Mute] [Speaker] [HangUp] (if no more options)

SIZING:
  Each button: 56x56px minimum
  Icon inside: 24-28px
  Touch padding: 8px around

COLORS:
  Muted:    Red fill #ef4444
  Unmuted:  Gray outline #4b5563
  Speaker:  Gray outline
  HangUp:   Red fill #ef4444
  More:     Gray outline

HAPTIC:
  Light feedback on toggle
  Heavy feedback on hang-up
  Type: UIImpactFeedback.light / heavy
```

### 4. Caption Area
```
POSITION:
  Bottom overlay, above control bar
  Height: Auto (2-4 lines), min 60px

BACKGROUND:
  Semi-transparent dark
  Color: rgba(0, 0, 0, 0.85)
  Blur: backdrop-filter: blur(10px)
  Border-radius: 12px
  Padding: 12px

TYPOGRAPHY:
  Font: System font (-apple-system, Segoe UI)
  Size: 13px
  Line-height: 1.5
  Color: #ffffff
  Letter-spacing: normal

SPEAKER LABEL:
  Font-size: 10px
  Color: #ffffff, opacity: 0.8
  Text-transform: uppercase
  Letter-spacing: 0.5px
  Margin-top: 6px

SCROLL BEHAVIOR:
  Auto-scroll to bottom on new text
  Freeze during user speech (lock until AI speaks)
  Show "scroll to latest" indicator if user scrolls up
  Fade-out after 6s of silence (opacity: 0 over 500ms)

MAX CONTENT:
  ~3-4 lines visible
  Scroll if longer
  Max-width: calc(100% - 24px)
```

### 5. Waveform (Real-Time Audio Indicator)
```
POSITION:
  Center, between avatar and captions
  OR overlay on avatar border (optional)

SIZE:
  Width: 80-120px
  Height: 20-24px
  Space-evenly distribution

BARS:
  Count: 7-12 bars (8 is typical)
  Width each: 3-6px
  Gap between: 2-4px
  Radius: 2px (slight rounding)

ANIMATION:
  Update: 30-60fps (sync with audio)
  Height: 2-16px (based on frequency data)
  Color: #2563eb (blue) or #10b981 (green)
  Easing: Linear (no smoothing, real-time feel)

STATES:
  User speaking: Animated bars
  AI responding: Gentle pulse or shimmer
  Idle: Single baseline or hidden

COLORS:
  Primary (user): #2563eb (bright blue)
  Secondary (AI): #10b981 (softer green) or fade to 50% opacity
```

### 6. Interactive Cards (Choice Drawer)
```
COLLAPSED STATE (Hint):
  Height: 40px
  Content: "⬆️ 2 responses available"
  Font: 13px, white
  Background: rgba(0,0,0,0.7)
  Tap to expand, or AI responds auto after 5s

EXPANDED STATE (Full):
  Height: 50-60% of screen
  Max-height: 400px (tablet)
  Options list scrollable if >3 items

OPTION HEIGHT:
  Each: 48px (min touch target)
  Padding: 12px horiz, 8px vert
  Border: 1px solid #333333 (subtle separator)
  Radius: 8px

OPTION STATES:
  Default: Gray text, no background
  Hover: Light gray bg (10% opacity)
  Selected: Blue bg, white text, radio filled
  Focused: Blue outline

ANIMATION:
  Expand: Spring curve (100-200ms)
  Collapse: Spring curve (150ms)
  Selection: Flash, then fade

HAPTIC:
  Light feedback on expand
  Medium feedback on selection

AUDIO:
  Ding sound (80ms, G4 note at 392Hz) when drawer appears
  Low volume (notification level)
```

### 7. Image Loading & Reveal
```
PLACEHOLDER (During Load):
  Size: 200x150px (portrait) or 280x180px (landscape)
  Aspect ratio: 4:3
  Background: Linear gradient shimmer
  Animation: Left-to-right wave (1.5s cycle)

SHIMMER GRADIENT:
  From: rgba(255,255,255,0.05)
  Via: rgba(255,255,255,0.15)
  To: rgba(255,255,255,0.05)
  Background-size: 200px
  Background-position: -1000px → 1000px

LOADED IMAGE:
  Fade-in: opacity 0 → 1 over 300-400ms
  Easing: ease-out
  Max-width: 280px (mobile), 400px (tablet)
  Border-radius: 8px
  Preserve aspect ratio

AUDIO CUE:
  Ding when load starts (same as choice drawer)
  Success chime when ready (200ms, higher pitch)

INTERACTION:
  Tap: Expand to full-screen (optional)
  Pinch: Zoom in/out
  Swipe down: Dismiss and return to waveform
```

---

## Color Palette (Dark Mode)

```
PRIMARY COLORS:
  Background:        #000000 (pure black)
  Surface (overlay): rgba(0, 0, 0, 0.85)
  Surface alt:       #1a1a1a (slight elevation)

TEXT COLORS:
  Primary:           #ffffff (100% white, 21:1 contrast on black)
  Secondary:         #b3b3b3 (light gray, 7:1 contrast)
  Muted:             #808080 (medium gray, 5.5:1)
  Disabled:          #595959 (dark gray, 3.6:1)

ACCENT COLORS:
  Active (blue):     #2563eb (button states, indicators)
  Success (green):   #10b981 (AI responding, positive feedback)
  Destructive (red): #ef4444 (mute, hang-up, errors)
  Warning (orange):  #f97316 (caution, not critical)

INTERACTION STATES:
  Hover (dark):      rgba(255,255,255,0.08) overlay
  Pressed (dark):    rgba(255,255,255,0.12) overlay
  Focus (outline):   #2563eb 2px solid

SAFE COLORS FOR TEXT:
  On #000000: Use #ffffff (any text)
  On #1a1a1a: Use #ffffff (any text)
  On rgba(0,0,0,0.85): Use #ffffff (any text)
  On #2563eb: Use #ffffff (text, 5.5:1 min)
```

---

## Typography System

```
HEADING (Name overlay):
  Font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
  Font-size: 14px
  Font-weight: 600 (bold)
  Line-height: 1.2
  Letter-spacing: 0
  Color: #ffffff

BODY (Captions):
  Font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
  Font-size: 13px
  Font-weight: 400 (regular)
  Line-height: 1.5
  Letter-spacing: 0
  Color: #ffffff

CAPTION (Speaker label):
  Font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
  Font-size: 10px
  Font-weight: 500 (medium)
  Line-height: 1.2
  Letter-spacing: 0.5px (slight)
  Color: #ffffff, opacity: 0.8
  Text-transform: uppercase

TIMER (Monospace):
  Font-family: 'Menlo', 'Courier New', monospace
  Font-size: 14px
  Font-weight: 500 (medium)
  Line-height: 1
  Letter-spacing: 0 (monospace = fixed)
  Color: #ffffff

BUTTON (Action):
  Font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto
  Font-size: 11px
  Font-weight: 600 (bold)
  Line-height: 1
  Letter-spacing: 0
  Color: #ffffff
  Text-transform: uppercase
```

---

## Animation Timings

```
MICRO-INTERACTIONS:
  Button press:      150ms cubic-bezier(0.34, 1.56, 0.64, 1) (spring)
  Fade-in/out:       300ms ease-out
  Slide-up:          250ms ease-out
  Waveform update:   Instant (60fps, no easing)

MACROSCOPIC:
  Card expand:       200ms cubic-bezier(0.34, 1.56, 0.64, 1)
  Card collapse:     150ms cubic-bezier(0.34, 1.56, 0.64, 1)
  Image cross-fade:  400ms ease-out
  Caption scroll:    Smooth (auto-scroll, 200-300ms)

CONTINUOUS:
  Waveform bars:     30-60fps (sync to audio level detection)
  Shimmer (image):   1500ms linear (infinite loop)
  Active border:     200ms pulse (opacity 0.5 → 1.0, infinite)
  Hover state:       Instant (no transition)
```

---

## Spacing System (8px Grid)

```
PADDING:
  xs: 4px
  sm: 8px (default button padding)
  md: 12px (caption padding)
  lg: 16px (screen edge padding)
  xl: 24px (major sections)

MARGINS:
  Between controls: 8px (min)
  Between sections: 16px
  Safe areas: 12px (from notch), 34px (from home indicator)

GAPS:
  Button row spacing: 8px
  Menu items: 4px (visual separator)
  Waveform bars: 2-4px
```

---

## State Machine (Call Screen States)

```
IDLE (Waiting for user to speak)
  Avatar: Static
  Waveform: Hidden or faint pulse
  Mute button: Gray (enabled)
  Border: Subtle (1px)
  Caption: Hidden or fading out

USER_SPEAKING:
  Avatar: Static
  Waveform: Animated bars (blue)
  Mute button: Red (toggling allowed)
  Border: Bright blue (2-3px)
  Caption: Scrolling paused (lock to latest)

AI_RESPONDING:
  Avatar: Static with active border
  Waveform: Gentle pulse or shimmer (green, 50% opacity)
  Mute button: Gray (disabled? or red)
  Border: Bright blue (pulsing)
  Caption: Auto-scrolling to bottom

IMAGE_LOADING:
  Avatar: Dimmed (opacity 0.7)
  Waveform: Hidden
  Placeholder: Shimmer animation (4-6s)
  Caption: Continues normally below
  Mute: Disabled briefly

IMAGE_LOADED:
  Avatar: Dimmed or replaced with image
  Image: Cross-fade in (300ms)
  Waveform: Hidden
  Caption: Visible below image
  Mute: Re-enabled

CALL_ENDED:
  Avatar: Fade out (200ms)
  All controls: Disabled
  Transition: Post-call screen (summary, rating, etc.)
```

---

## Accessibility Checklist

- [ ] **Color contrast**: All text 7:1 minimum (AA), 21:1 for critical (AAA)
- [ ] **Touch targets**: 48x48px minimum, 56x56px recommended
- [ ] **Spacing**: 8px minimum between interactive elements
- [ ] **Aria labels**: All buttons have `aria-label` ("Toggle microphone", "End call")
- [ ] **Focus states**: Visible 2px outline, color #2563eb
- [ ] **Keyboard**: Tab/Shift-Tab navigates buttons, Enter/Space activates, Escape dismisses drawers
- [ ] **Screen reader**: `role="button"`, `aria-pressed="true|false"` for toggles
- [ ] **Motion**: `@media (prefers-reduced-motion: reduce)` → No animations
- [ ] **Dark mode only**: High contrast on black, no light mode variant needed for call screen
- [ ] **Haptic**: Optional, but standard for mobile calls (vibrate on toggle)
```

---

## Implementation Priority (MVP → Polish)

### MVP (Week 1-2)
- [ ] Dark background + avatar + name
- [ ] Static mute/hangup buttons
- [ ] Bottom caption display (no scroll)
- [ ] Timer (ticking every 1s)
- [ ] Basic waveform (8 bars, static or simple animation)

### Phase 2 (Week 3)
- [ ] Caption auto-scroll (pause during user speech)
- [ ] Interactive choice cards (hint + expanded drawer)
- [ ] Image placeholder + loading state
- [ ] Haptic feedback on button press

### Polish (Week 4)
- [ ] Animated waveform (real audio level sync)
- [ ] Image cross-fade reveal
- [ ] Spring animations on card expand
- [ ] Active speaker border pulse
- [ ] Shimmer animation on image placeholder

---

## Design Tokens (CSS Variables)

```css
:root {
  /* Colors */
  --color-bg-primary: #000000;
  --color-bg-overlay: rgba(0, 0, 0, 0.85);
  --color-text-primary: #ffffff;
  --color-text-secondary: #b3b3b3;
  --color-accent-blue: #2563eb;
  --color-accent-green: #10b981;
  --color-accent-red: #ef4444;

  /* Sizing */
  --touch-target-min: 48px;
  --touch-target-preferred: 56px;
  --safe-area-top: 44px;
  --safe-area-bottom: 34px;

  /* Typography */
  --font-system: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto;
  --font-mono: 'Menlo', 'Courier New', monospace;
  --font-size-xs: 10px;
  --font-size-sm: 13px;
  --font-size-base: 14px;
  --line-height-tight: 1.2;
  --line-height-normal: 1.5;

  /* Spacing */
  --spacing-xs: 4px;
  --spacing-sm: 8px;
  --spacing-md: 12px;
  --spacing-lg: 16px;

  /* Animation */
  --duration-fast: 150ms;
  --duration-normal: 300ms;
  --duration-slow: 500ms;
  --easing-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
  --easing-out: cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

---

## Handoff to Engineering

### Component Files (Recommended)
```
src/components/
  CallScreen/
    ├── CallScreen.astro          (Layout container)
    ├── Avatar.svelte             (Avatar + border)
    ├── Timer.svelte              (Monospace timer)
    ├── ControlBar.svelte         (Mute/Speaker/HangUp)
    ├── CaptionBox.svelte         (Transcript overlay)
    ├── Waveform.svelte           (Audio bars)
    ├── ChoiceCard.svelte         (Interactive drawer)
    ├── ImagePlaceholder.svelte   (Loading state)
    └── CallScreen.styles.css     (Shared tokens)
```

### Props & State
```typescript
interface CallScreenProps {
  historicalFigure: {
    name: string;
    avatar: string;
    bio?: string;
  };
  callDuration: number; // seconds
  isMuted: boolean;
  onMuteToggle: () => void;
  onHangUp: () => void;
  transcript: Array<{
    speaker: 'user' | 'ai';
    text: string;
    timestamp: number;
  }>;
  audioLevel: number; // 0-100 for waveform
  choices?: Array<{ id: string; text: string }>;
  onChoiceSelect: (id: string) => void;
  image?: {
    src: string;
    loading?: boolean;
  };
}
```

