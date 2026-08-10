# Combined pipeline specification

This project combines the strongest parts of the original Curiosity Content Factory and the referenced `osama2jz/utube-fb-automation` implementation.

## Retained from this project

- Original, source-led explainers and explicit rights records.
- ChatGPT/Codex-created cinematic images rather than scraped stock footage.
- On-device Kokoro narration with no paid TTS API.
- Technical and aesthetic quality gates.
- Manual operation only; no cron, unattended publishing, or automatic public release.

## Adopted and hardened from the reference

- Local Whisper word timestamps and transcript-aligned scene timing.
- Three-word captions driven by real speech boundaries.
- 30 fps Ken Burns movement and release audio mastering.
- Optional quiet music mixing, now requiring an explicit license/ownership record.
- Direct YouTube and Facebook Reels adapters, now protected by named human approval, explicit upload confirmation, and private/draft-only states.

## Stable operator flow

1. Build a manifest and original visual assets.
2. Run `npm run pipeline -- <manifest>`.
3. Watch the MP4 and inspect its contact sheet and quality gate.
4. Run `npm run release:approve -- <output-dir> <reviewer>`.
5. Optionally run one of the manual draft upload commands with `--confirm-upload`.
6. Complete platform processing checks and public scheduling manually in the platform UI.

Generating a render must never trigger steps 4–6 automatically.
