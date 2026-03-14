# Asset Pipeline Prompts

Image generation for character portraits and scene banners.

## Assets Per Call

| Asset | Model | Aspect | Cached? | Where Used |
|-------|-------|--------|---------|-----------|
| Character portrait | `gemini-3.1-flash-image-preview` | Square (1:1) | YES — per character in Firestore | Person cards, calling screen, in-call header, call log, share card |
| Scene banner | `gemini-3.1-flash-image-preview` | 16:9 landscape | Per call (not cached) | In-call screen top banner |

## Generation Flow

Flash JSON runs first → returns `characterName`, `historicalSetting`, `year`. Then portrait + scene banner run in parallel using that metadata.

```
Flash JSON (characterName, setting, year, voiceName, etc.)
  ↓
Promise.allSettled([
  portrait(characterName, setting, year),
  sceneBanner(setting, year, topic)
])
```

## Character Portrait Prompt Strategy

**Goal**: Neutral, recognizable, historically appropriate portrait. Same face every time for the same character (cached).

| Element | Rule |
|---------|------|
| Composition | Head and shoulders, centered, square crop |
| Expression | Neutral to slight intensity. NO extreme emotions. NO crying, laughing, screaming |
| Art style | Painterly/digital art — NOT photorealistic, NOT cartoon |
| Background | Solid dark or simple gradient matching era palette |
| Clothing | Period-appropriate. Armor, robes, uniform, etc. |
| Lighting | Dramatic side-lighting. Conveys character without expression extremes |

### Per-Preset Portraits

| Character | Key visual details |
|-----------|-------------------|
| Constantine XI | Byzantine emperor, 40s, dark beard, gold-trimmed purple robe, tired eyes, iron crown |
| Gene Kranz | 1960s NASA, crew cut, white vest, headset around neck, calm focus |
| Jamukha | Mongol warrior, weathered face, leather armor, braided hair, dark steppe background |

### Open-Topic Portraits

Flash provides `characterName` + `historicalSetting` + `year`. Portrait prompt:

```
Portrait of {characterName}, {historicalSetting}, {year}.
Head and shoulders composition, square crop.
Neutral expression with slight intensity.
Period-appropriate clothing and styling.
Painterly digital art style, dramatic side-lighting.
Dark background matching the era.
```

## Scene Banner Prompt Strategy

**Goal**: Immersive, atmospheric, sets the era's mood. NOT a portrait — a wide establishing shot.

| Element | Rule |
|---------|------|
| Composition | Wide landscape (16:9), establishing shot |
| Subject | The PLACE, not the person. City, battlefield, command room, steppe |
| Art style | Era-specific: Byzantine mosaic feel for 1453, NASA archive photo feel for 1969, ink wash for 1206 |
| Mood | Match the story palette OKLCH colors |
| People | Small figures in distance OK, no close-up faces |

### Per-Preset Banners

| Scenario | Scene description |
|----------|------------------|
| Constantinople 1453 | The Golden Horn at night, harbor chain glinting, Ottoman fires on distant hills, walls silhouetted |
| Apollo 11, 1969 | Mission Control room, banks of screens glowing, backs of heads in headsets, the Moon on the main screen |
| Mongol Steppe, 1206 | Vast grassland at dawn, scattered yurt fires, a single rider approaching on the horizon |

## Caching Strategy

| Asset | Cache key | Storage | TTL |
|-------|-----------|---------|-----|
| Character portrait | `portrait:{characterName}:{setting}` | Firestore + R2 | Permanent (same character = same face) |
| Scene banner | Not cached | Generated fresh per call | — |
| Preset portraits | Static assets at build time | `public/portraits/` | Permanent |

## Preset Portraits (Static)

Pre-generate the 3 preset character portraits and ship as static assets. No API call needed for presets.

```
public/portraits/constantine-xi.webp
public/portraits/gene-kranz.webp
public/portraits/jamukha.webp
```

Generated once via `gemini-3.1-flash-image-preview`, converted to WebP, committed to repo.

## Testing

- Each prompt tested independently (portrait alone, banner alone)
- Verify portrait consistency: same prompt → visually similar output
- Verify banner aspect ratio: must be 16:9
- Verify no extreme emotions in portraits
