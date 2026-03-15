# Gemini API Cost Estimation — Past, Live

## Per-Session Cost (~$0.25)

| Component | Model | Usage | Cost | % |
|-----------|-------|-------|------|---|
| Voice call (5 min) | `gemini-2.5-flash-native-audio-preview-12-2025` | 300s audio I/O | $0.043 | 17% |
| Preview + Summary | `gemini-3-flash-preview` | 2 text calls (~2K in + 500 out each) | $0.005 | 2% |
| Images (3x @ 1K) | `gemini-3.1-flash-image-preview` | 1 portrait + 2 scene images | $0.201 | 81% |
| **Total** | | | **~$0.25** | |

## Unit Pricing (Pay-As-You-Go)

| Model | Component | Rate |
|-------|-----------|------|
| Live API (audio) | Input | $3.00 / 1M tokens |
| Live API (audio) | Output | $12.00 / 1M tokens |
| Flash (text) | Input | $0.50 / 1M tokens |
| Flash (text) | Output | $3.00 / 1M tokens |
| Flash Image | Per image @ 1K | $0.067 |
| Flash Image | Per image @ 2K | $0.134 |

## Scale Estimates

| Sessions/month | Cost | Notes |
|----------------|------|-------|
| 100 | $25 | Demo / hackathon |
| 1,000 | $250 | Early users |
| 10,000 | $2,500 | Growth |

## Key Insight

Images = 81% of cost. Voice is cheap ($0.04/call). Text is negligible.

## Free Tier vs Paid

| Aspect | Free | Paid |
|--------|------|------|
| Image gen latency | 12-15s (queue throttling) | Expected 2-3s |
| Rate limits | 5 RPM (text), limited RPM (image) | Higher limits |
| Back-to-back calls | Escalating latency (10s → 17s → 30s) | Consistent |
| Image gen availability | Preview grace period (officially "Not available") | Fully supported |

## Decision

For demo: sign up for paid tier (pay-as-you-go). A full demo session costs ~$0.25.
Free tier image gen latency (12-15s) is too slow for live demo — paid tier should bring it to 2-3s.
