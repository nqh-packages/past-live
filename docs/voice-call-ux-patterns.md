# Past Live — Quick Reference (TL;DR)

## What Works (Production Apps Prove This)

| Pattern | Why | Apps | Rating |
|---------|-----|------|--------|
| **Dark full-bleed avatar** | Avatar is hero, focuses attention | FaceTime, Zoom, Discord | ⭐⭐⭐⭐⭐ |
| **Bottom-aligned controls** | Thumb reach on mobile | WhatsApp, Discord, Telegram | ⭐⭐⭐⭐⭐ |
| **Yellow/blue active indicator** | Instant visual feedback who's talking | Discord (yellow), Daily.co (yellow) | ⭐⭐⭐⭐⭐ |
| **Animated waveform (7-12 bars)** | Real-time = feels live | Discord, Google Duo | ⭐⭐⭐⭐⭐ |
| **Bottom caption overlay** | Transcript visible while watching avatar | Google Meet, Zoom (CC mode) | ⭐⭐⭐⭐⭐ |
| **Skeleton screen (shimmer)** | Feels faster than spinner | Facebook, LinkedIn (industry standard) | ⭐⭐⭐⭐⭐ |
| **No confirmation on hang-up** | Fast, no friction | FaceTime, WhatsApp | ⭐⭐⭐⭐⭐ |
| **Haptic feedback** | Tactile = premium feel | iPhones, some Android | ⭐⭐⭐⭐⭐ |
| **Floating card drawer** | Non-blocking choice interaction | Clubhouse (reactions) | ⭐⭐⭐⭐ |
| **Barge-in (interrupt AI)** | Natural conversation | Discord voice bots can do this | ⭐⭐⭐⭐ |

---

## What Fails (Avoid These)

| Anti-Pattern | Why Fails | Better Alternative |
|--------------|-----------|-------------------|
| Spinner during load | Feels slow (psychology) | Skeleton screen with shimmer |
| Light gray text on light bg | Low contrast, unreadable | White (#fff) on dark (#000) |
| Tiny buttons (44px) | Hard to tap, poor UX | 56x56px minimum |
| Modal dialog to hang up | Extra friction, slow | Instant red button |
| Top-aligned controls | Unreachable on mobile | Bottom-aligned (thumb zone) |
| Robotic voice tone | Breaks immersion | Natural speech synthesis (Gemini does this) |
| Lag in captions (>2s) | Feels disconnected | Stream transcriptions real-time |
| Light mode | Washes out on projection | Dark mode only for calls |
| No visual feedback | Unclear if audio is on/off | Color-coded mute button (red/gray) |

---

## Component Specs (Copy-Paste Reference)

### Mute Button
```
Size:        56x56px (min 48px)
Color:       Red (#ef4444) when muted, gray (#4b5563) when unmuted
Icon:        Microphone.slash (muted) or Microphone (unmuted)
Feedback:    Haptic light + beep sound (80ms, G4 note)
Label:       aria-label="Toggle microphone"
Transition:  Instant visual toggle, 200ms haptic delay
```

### Hang Up Button
```
Size:        56x60px (slightly larger)
Color:       Destructive red (#ef4444)
Icon:        Phone with diagonal slash
Feedback:    Haptic heavy (strong buzz) + fade to red
Label:       aria-label="End call"
Behavior:    NO confirmation dialog (instant)
Sound:       Short beep (120ms, low pitch)
```

### Timer
```
Font:        Monospace (Menlo, Courier)
Size:        14px (12-16px acceptable)
Weight:      500 (medium)
Color:       White (#ffffff)
Position:    Top-right, 12px from edge
Format:      MM:SS or H:MM:SS
Update:      Every 1s exactly
Update code: setInterval(() => updateTimer(), 1000)
```

### Caption Box
```
Position:    Bottom overlay, above controls
Height:      Auto, 2-4 lines visible (min 60px)
Font:        System font, 13px, white
Line-height: 1.5
Background:  rgba(0,0,0,0.85) with blur
Padding:     12px
Border:      12px radius
Max-width:   calc(100% - 24px)
Scroll:      Pause during user speech, resume on AI text
Fade-out:    After 6s silence (opacity: 0, 500ms)
Speaker ID:  10px uppercase label, 80% opacity
```

### Waveform
```
Bars:        7-12 (8 is standard)
Width each:  3-6px
Height:      2-16px (based on audio level)
Gap:         2-4px between bars
Color:       Blue (#2563eb) during user speech
Color:       Green (#10b981, 50% opacity) during AI
Update:      60fps real-time (sync to Web Audio API)
Animation:   No easing (instant height changes)
Code:        analyser.getByteFrequencyData(dataArray)
```

### Choice Cards (Expanded)
```
Position:    Floating drawer, bottom (above controls)
Height:      50-60% of screen (max 400px)
Item height: 48px (touch target)
Item margin: 8px vertical, 12px horizontal
Expand time: 200ms spring animation
Selected:    Blue bg, white text, radio filled
Audio cue:   Ding when appears (80ms, G4 at 392Hz)
Auto-close:  After 3s if no interaction
Haptic:      Light on expand, medium on select
```

### Image Placeholder
```
Size:        200x150px (portrait) or 280x180px (landscape)
Aspect:      4:3 ratio
Background:  Shimmer animation (1.5s left→right)
Gradient:    rgba(255,255,255,0) → 0.15 → 0
Animation:   @keyframes shimmer { 0% { bg-pos: -1000px } 100% { 1000px } }
Load audio:  Ding (80ms)
Loaded fade: 300-400ms cross-fade (opacity 0→1)
Easing:      ease-out
Interaction: Tap expand, pinch zoom, swipe dismiss
```

---

## Mobile Ergonomics (Anatomy of Phone Call UI)

```
┌─────────────────────────────────────┐
│ [Status] Timer (44px safe area)    │ ← Notch / unsafe zone
├─────────────────────────────────────┤
│                                     │
│           [Avatar]                  │ ← Can fit easily
│           Full-bleed or centered    │ ← (200-240px wide)
│                                     │
├─────────────────────────────────────┤
│         [Captions]                  │ ← Scrollable
│    Semi-transparent dark overlay    │
│         13-14px white text          │
├─────────────────────────────────────┤
│  [Mute] [Speaker] [Hang Up]        │ ← Thumb zone (easy)
│  56px   56px       56px             │ ← 8px spacing
│  8px margins                        │ ← Safe area 34px below
└─────────────────────────────────────┘
```

**Thumb Reach Zones** (Apple HIG):
- Green (easy): Bottom 50% of screen
- Yellow (stretch): Top 50%, edges
- Red (unreachable): Very top, outside edges

**Safe Area Padding**:
- Top: 44px (notch + status bar)
- Bottom: 34px (home indicator on iPhone)
- Sides: 16px minimum edge padding

---

## 30-Second Demo Script

```
[0s] Open app
     Title: "Call a Historical Figure"
     Small avatar carousel

[2s] Tap "Call Lincoln"
     (haptic feedback, instant transition)

[3-4s] Call screen appears
       Large avatar + name "Abraham Lincoln"
       Waveform in idle state (pulse)

[5s] "Hello, I'm Abraham Lincoln. What would
      you like to discuss?"
     (Natural voice, not robotic)

[8s] Waveform animates (blue bars)

[10s] User: "What was your biggest challenge?"
      (Caption appears below avatar)

[12-14s] Lincoln responds:
         "That's an excellent question..."
         (Waveform pulses green)

[15s] Scene image fades in
      (Gettysburg, loading done)

[20-30s] Q&A continues naturally
         Captions flow
         Image visible without blocking
         Judges see: Low-latency, natural, polished
```

**What Judges Notice**:
1. ✅ No loading spinner (skeleton screen = faster)
2. ✅ Haptic feedback (premium polish)
3. ✅ Natural voice tone (not robotic)
4. ✅ Live captions <1s latency (real-time)
5. ✅ One-handed controls (mobile-first)
6. ✅ Uninterrupted conversation (image doesn't block)

---

## Color Reference (Just Copy These)

```
--bg-dark:           #000000
--text-white:        #ffffff
--text-gray:         #b3b3b3
--accent-blue:       #2563eb  (active speaker, focus)
--accent-green:      #10b981  (AI responding)
--destructive-red:   #ef4444  (mute, hang-up)
--overlay:           rgba(0,0,0,0.85)
--overlay-blur:      10px (backdrop-filter)
```

**Contrast Checks**:
- `#ffffff` on `#000000` = 21:1 (AAA, best)
- `#b3b3b3` on `#000000` = 7:1 (AA, acceptable)
- `#2563eb` on `#000000` = 3.5:1 (NOT sufficient for text, OK for borders)
- `#ef4444` on `#000000` = 5.5:1 (AA for borders, OK)

---

## Audio Cues (Exact Specs)

| Event | Sound | Duration | Volume | Note |
|-------|-------|----------|--------|------|
| Mute toggle | G4 beep (392 Hz) | 80ms | Notification level | Confirm audio |
| Hang up | Phone disconnect tone | 120ms | Low-medium | Don't startle |
| Image loading starts | G4 ding (392 Hz) | 80ms | Notification | Non-intrusive |
| Choice cards appear | G4 ding (392 Hz) | 80ms | Notification | Subtle cue |
| Barge-in (optional) | Short chirp | 60ms | Very low | Feedback that interrupt was received |

**Tools**:
- Use Web Audio API for sine waves: `const osc = ac.createOscillator(); osc.frequency.value = 392`
- OR use small MP3 files (load in browser cache)
- Don't use system sounds (copyright, licensing)

---

## Common Implementation Mistakes (Avoid These)

| Mistake | Why Bad | Fix |
|---------|---------|-----|
| **Spinner during image load** | Feels slow (psychology) | Use shimmer skeleton screen |
| **Caption text 12px or smaller** | Hard to read during call | Use 13-14px minimum |
| **Mute button same size as other buttons** | Hard to find, stressed UX | Make it prominent (56px+) |
| **Fade out captions too fast** | User doesn't read it | Keep visible 4-6s minimum |
| **Modal dialog to hang up** | Adds friction, breaks flow | No confirmation, instant red button |
| **Storing user mute preference** | Confusing on next call | Always start unmuted |
| **Auto-playing caption audio over voice** | Cacophony, unusable | Never auto-play, captions text-only |
| **Image overlays avatar** | Blocks speaker identification | Image appears BELOW avatar or in separate area |
| **No haptic feedback on mobile** | Feels cheap, unpolished | Add light/medium/heavy on key actions |
| **Light mode for call screen** | Looks washed out on projection | Dark mode ONLY for calls |

---

## Testing Checklist (Pre-Demo)

- [ ] Audio latency <1s (caption appears <1s after speech)
- [ ] Waveform updates smoothly (no stuttering, 30+ fps)
- [ ] Mute button responds instantly (<50ms visual feedback)
- [ ] Hang-up transition <200ms (quick close)
- [ ] Image loads and fades in within 15s
- [ ] Captions visible and readable on projection screen
- [ ] Haptic feedback works (test on actual device)
- [ ] No errors in browser console
- [ ] Tested on iOS and Android (different notch/safe areas)
- [ ] Tested in landscape and portrait
- [ ] No memory leaks (WebRTC cleanup on hang-up)
- [ ] Voice quality is clear (test mic and speakers)

---

## Why This Matters (For Product Sense)

**Students learn better when**:
- They can see the historical figure's avatar (visual connection)
- Real-time captions show they're understood (confirmation)
- Images provide context without disrupting conversation (education + immersion)
- They can ask questions naturally, interrupt if needed (agency)
- No lag, no friction, no spinners (flow state)

**This is NOT a chatbot** — it's a **phone call** with a historical AI. Design accordingly.

---

## One More Thing: The "Wow" Factor

What judges remember after 30 seconds:

1. **Natural voice** (not robotic)
   → Gemini Live delivers this natively
2. **Live captions** (proof of real-time understanding)
   → Show <1s latency in demo
3. **Scene image** (contextual intelligence)
   → Let it load, show shimmer, fade in with soft curve
4. **One-handed UX** (mobile-first mindset)
   → All controls at thumb reach
5. **No lag** (feels instant, not "processing...")
   → Critical for voice calls

**If you nail these 5, judges will say**: "This is a hackathon winner."

