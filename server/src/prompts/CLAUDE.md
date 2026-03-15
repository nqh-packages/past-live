# Prompt Templates

## Files

| File | Exported | Used by |
|------|----------|---------|
| `character-avatar.ts` | `buildCharacterAvatarPrompt`, `getAvatarReferenceImage` | `session-preview.ts` |
| `scene-image.ts` | `buildSceneImagePrompt`, `getSceneReferenceImage` | `session-preview.ts`, `scene-image.ts` |
| `extract-topic.ts` | `buildExtractTopicPrompt` | `extract-topic.ts` |
| `post-call-summary.ts` | `buildSummaryPrompt`, `SummaryParams` | `post-call-summary.ts` |
| `session-metadata.ts` | `buildMetadataOnlyPrompt` | `session-preview.ts` |
| `story-script.ts` | `buildStoryScriptPrompt` | `session-preview.ts` |

---

# Image Prompt Templates

## LOCKED: Brand Image Style

**DO NOT modify the art style in these prompt templates.** The currency engraving + brand orange style was decided by Huy on 2026-03-15 after iterating through 20+ variations.

| Rule | Detail |
|------|--------|
| Base style | Currency engraving / banknote, ultra-fine crosshatching |
| Avatars | B&W engraving figure on vivid orange textured background (30% orange) |
| Scenes | B&W engraving with main event highlighted in vivid orange (30% orange) |
| Reference image | `../assets/brand-orange-reference.webp` sent with every call |
| Forbidden | Text, letters, words, frames, borders in any generated image |
| Forbidden | Per-character or per-era art style variations |
| Forbidden | Changing the orange color, saturation, or placement ratio |

## What you CAN change

- Character appearance descriptions (clothing, features, expression)
- Scene subject matter (what's depicted)
- Which element is the "main event" for selective orange
- Prompt wording improvements that maintain the same visual output
- Adding new characters/scenarios (must use same style template)

## What you CANNOT change without Huy's approval

- Art style (currency engraving)
- Color scheme (B&W + brand orange)
- Orange ratio (~30%)
- Reference image usage
- "No text" rule
