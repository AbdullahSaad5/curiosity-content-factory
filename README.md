# Curiosity Content Factory

A zero-incremental-cost, manifest-driven factory for original English explainer videos. It turns researched episode data into a vertical MP4, local narration, captions, thumbnail, source/rights ledger, QA report, and staged YouTube/Facebook metadata.

The factory uses Node.js, the macOS built-in speech synthesizer, Sharp, and FFmpeg. It does not call a paid API, download stock footage, use third-party music, or publish without account authorization and review.

## What is already built

- E0001: “Why Don't Birds Get Electrocuted on Power Lines?” — 39.7 seconds.
- E0002: “Why Are Airplane Windows Rounded?” — 47.5 seconds.
- Seven reusable scene/animation patterns, adaptive captions, SRT output, H.264/AAC encoding, source validation, rights records, checksums, platform metadata, and release gates.
- Unit and integration tests covering manifests, narration timing, visuals, captions, rendering, packaging, and QA.

Generated video and audio files remain local and are intentionally ignored by Git.

## Requirements

- macOS with a built-in `say` voice
- Node.js 22 or newer
- FFmpeg and ffprobe

No API key is required.

## Use it

From this directory:

```bash
npm install
npm test
npm run typecheck
```

Validate an episode:

```bash
npm run episode:validate -- episodes/E0001-birds-on-power-lines/episode.json
# or simply:
npm run episode:validate -- E0001 --format vertical
```

Create the complete staged release:

```bash
npm run episode:release -- episodes/E0001-birds-on-power-lines/episode.json
```

The command writes this package under `output/E####/`:

- `video.mp4` — 1080×1920 H.264/AAC master
- `narration.wav` — local narration master
- `captions.srt` — uploadable captions
- `thumbnail.png` — vertical cover frame
- `render.json` — timing and render receipt
- `qa-report.json` — codec, dimensions, duration, source, disclosure, and checksum checks
- `youtube-short/` — copy-ready video, captions, thumbnail, and staged metadata
- `facebook-reel/` — copy-ready video, captions, thumbnail, and staged metadata
- `publishing-checklist.md` — mandatory final gate

`say` may need to run outside a restricted terminal sandbox. In Codex, approve the local speech/render command when prompted. This does not create a charge.

## Add an episode

1. Copy an existing episode directory and give it the next `E####` ID and slug.
2. Research the answer using at least two credible institutional or primary sources.
3. Write every factual claim into `claims` and map it to one or more source IDs.
4. Write a 100–145 word script split into scenes of no more than roughly 30 words each.
5. Choose reusable visuals: `abstract`, `bird-on-wire`, `potential-map`, `path-comparison`, `shape-comparison`, or `stress-map`.
6. Complete disclosure, publishing, and rights records.
7. Validate, render, watch the result, and use the staged publishing checklist.

The episode manifest is the stable interface. Narration, visuals, encoding, QA, and platform packaging are replaceable adapters behind it.

To create a deliberately incomplete draft directory instead of copying one:

```bash
npm run episode:new -- "Why does popcorn pop?"
```

The draft will not validate until its research, claims, script, scenes, rights, and publishing fields are completed.

## Operating rules

- Publish one or two strong, materially different episodes per week; do not flood the channel.
- A recurring style is fine, but the explanation, structure, visual logic, and sources must be specific to each subject.
- Keep all source material as research only. The script and visuals must be original expression.
- Upload as private/draft first. Never allow a scheduled job to make an unchecked release public.
- Monetization is not guaranteed. Eligibility, distribution, RPM, and payout remain platform decisions.

Read [the editorial policy](docs/EDITORIAL_POLICY.md), [publishing runbook](docs/PUBLISHING_RUNBOOK.md), and [manual run prompt](docs/MANUAL_RUN_PROMPT.md) before operating the channel.
