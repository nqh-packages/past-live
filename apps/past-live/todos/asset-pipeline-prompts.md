# Asset Pipeline Prompts

Prompt engineering for Gemini image generation. Needs brainstorming session.

## Assets to Generate

1. Scene image (immersive era art, sets mood)
2. Character avatar (small, for chat log sender)

## Models

- Scene image: gemini-3.1-flash-image-preview
- Character avatar: gemini-3.1-flash-image-preview (same model, different prompt)

## Prompt Strategy

- Era-specific art style (Byzantine mosaic, NASA photo, Mongolian ink wash)
- Scene image: NOT a portrait — immersive, atmospheric, sets the tone
- Character avatar: small square, recognizable face/silhouette
- Need separate prompts per era AND a template for open topics

## Testing

- Modular tests: can run individual asset generation OR full pipeline
- Detailed error messages per asset type
- Each call tested independently + all together

## Status

- Prompts not yet written
- Needs brainstorming session with Huy
