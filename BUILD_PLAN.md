# Content Factory Build Plan

## Outcome

Build a local, zero-incremental-cost system that turns one approved curiosity question into:

- a 35–60 second vertical video for YouTube Shorts and Facebook Reels;
- a thumbnail, title, description, and captions;
- a reproducible episode folder containing the research, script, sources, assets, and render evidence.

The first milestone is a complete pilot: **“Why Don’t Birds Get Electrocuted on Power Lines?”** Publishing automation comes only after the production pipeline is reliable.

## Constraints

- No paid APIs, stock libraries, voice services, render farms, or schedulers.
- Use the existing ChatGPT/Codex subscription for research, writing, and optional image generation.
- Use local software for narration, animation, captions, QA, and encoding.
- Do not store Facebook, Google, or OpenAI credentials in the repository.
- Do not publish content unless research, rights, render, and policy checks pass.
- Prefer original diagrams and motion graphics over third-party footage.
- Stop cleanly when subscription limits are reached; never fall back to usage-based billing.

## Confirmed Local Environment

- macOS 26 on Apple Silicon (`arm64`)
- Node.js 22.23.2 and npm 10.9.8
- FFmpeg and ffprobe 8.0
- Python 3.14.6
- macOS `say` voices for the initial narration prototype

These are sufficient to build the pilot without installing a paid product. A higher-quality local Kokoro voice can be added after the renderer works.

## Architecture

The core seam is a versioned `episode.json` manifest. Every module accepts the manifest or produces an updated manifest. The workflow must not depend on information hidden in a chat.

```text
Topic + sources
      ↓
Episode compiler
      ↓
episode.json
      ↓
Narration adapter ─┐
Visual adapter ────┼→ Renderer → QA → Release bundle
Caption adapter ───┘
                              ↓
                    Publishing adapter (later)
```

### Deep modules

#### 1. Episode compiler

Interface:

```ts
compileEpisode(briefPath: string): Promise<Episode>
```

Hides topic validation, claim-to-source mapping, script parsing, scene timing, asset requirements, disclosure flags, and output naming.

#### 2. Narration module

Interface:

```ts
generateNarration(episode: Episode): Promise<NarrationResult>
```

Initial adapter: macOS `say`. Later adapter: local Kokoro. Both return an audio path, sentence timings, duration, and pronunciation warnings.

#### 3. Visual module

Interface:

```ts
prepareVisuals(episode: Episode): Promise<VisualResult>
```

Initial adapter: SVG/CSS diagrams generated from scene descriptions. Optional adapter: ChatGPT-generated still images saved manually or by Codex into the episode assets folder.

#### 4. Renderer

Interface:

```ts
renderEpisode(episode: Episode, format: "vertical" | "landscape"): Promise<RenderResult>
```

Hides layout, animation, caption positioning, audio mixing, FFmpeg settings, resolution, frame rate, and file naming.

#### 5. QA module

Interface:

```ts
verifyRelease(episode: Episode, render: RenderResult): Promise<QaReport>
```

Returns structured pass/fail results. It never publishes or repairs files silently.

#### 6. Publisher

Interface:

```ts
stageRelease(bundle: ReleaseBundle, platform: "youtube" | "facebook"): Promise<StageResult>
```

This module is deferred. The first adapter will prepare platform-ready upload folders. Native YouTube Studio and Meta Business Suite scheduling are used before any unattended uploader is built.

## Episode Manifest

Minimum fields:

```json
{
  "id": "E0001",
  "slug": "birds-on-power-lines",
  "question": "Why don't birds get electrocuted on power lines?",
  "status": "draft",
  "claims": [],
  "sources": [],
  "script": {
    "short": "",
    "wordCount": 0
  },
  "scenes": [],
  "narration": {},
  "disclosure": {
    "realisticSyntheticMedia": false,
    "reason": "Stylized diagrams only"
  },
  "rights": [],
  "outputs": {},
  "qa": {}
}
```

Each claim records which source supports it. Each asset records its origin and licence. Each render records a checksum to prevent accidental duplicate publishing.

## Repository Layout

```text
content-factory/
├── BUILD_PLAN.md
├── README.md
├── package.json
├── tsconfig.json
├── config/
│   ├── brand.json
│   ├── editorial-policy.md
│   └── render-profiles.json
├── src/
│   ├── episode/
│   ├── narration/
│   ├── visuals/
│   ├── render/
│   ├── captions/
│   ├── qa/
│   └── publish/
├── episodes/
│   └── E0001-birds-on-power-lines/
├── tests/
└── output/
```

## Build Phases

### Phase 1 — Static proof

Goal: prove the visual format before solving automation.

Build:

- brand configuration: colours, fonts, spacing, caption style;
- a manually authored pilot script and six-to-eight scene storyboard;
- SVG scenes for a bird, power lines, current path, and the dangerous exception;
- a vertical storyboard preview as PNG frames.

Acceptance:

- a viewer understands the explanation with the audio muted;
- every frame is legible at phone size;
- no copyrighted footage, logos, or music are required.

### Phase 2 — Narrated vertical pilot

Goal: produce a finished MP4 locally.

Build:

- narration generation using `say`;
- sentence timing extraction;
- caption generation;
- animated SVG/HTML scenes;
- FFmpeg encoding to 1080×1920 H.264/AAC;
- procedural sound effects only.

Acceptance:

- duration between 35 and 60 seconds;
- narration is understandable at normal phone volume;
- captions remain inside the vertical safe area;
- no black frames, missing assets, clipped audio, or broken seeking;
- the MP4 plays in QuickTime and passes ffprobe validation.

### Phase 3 — Data-driven episode generation

Goal: make episode two require data and assets, not renderer edits.

Build:

- JSON schema and manifest validation;
- scene types: title, diagram, comparison, flow, reveal, conclusion;
- deterministic asset and output paths;
- CLI commands:

```text
npm run episode:new -- "Why are airplane windows round?"
npm run episode:validate -- E0002
npm run episode:render -- E0002 --format vertical
npm run episode:qa -- E0002
```

Acceptance:

- a second episode renders without changing renderer code;
- invalid sources, missing scenes, and unknown assets fail before rendering;
- rerendering the same manifest produces the same timeline and output name.

### Phase 4 — Research and editorial automation

Goal: let Codex prepare an episode package while preserving evidence.

Build:

- topic scoring rubric;
- research brief template;
- claim/source ledger;
- script and storyboard templates;
- duplicate-topic detection;
- exclusions for health, finance, politics, active tragedies, allegations, and child-directed content during the pilot period.

Acceptance:

- every factual sentence maps to a saved source;
- unsupported claims block release;
- scripts stay within the word and reading-level targets;
- the output is materially different from previous episodes.

### Phase 5 — Release packaging

Goal: create upload-ready folders.

Build:

- title and description candidates;
- thumbnail renderer;
- `.srt` captions;
- YouTube and Facebook metadata files;
- AI-disclosure recommendation;
- release checksum and status file.

Acceptance:

```text
output/E0001/youtube-short/video.mp4
output/E0001/youtube-short/thumbnail.png
output/E0001/youtube-short/captions.srt
output/E0001/youtube-short/metadata.json
output/E0001/facebook-reel/video.mp4
output/E0001/facebook-reel/metadata.json
output/E0001/qa-report.json
```

### Phase 6 — Publishing and scheduling

Goal: establish a reliable publishing loop without paid services.

Order:

1. Upload and schedule the first six releases using native platform tools.
2. Record the real upload requirements and failure modes.
3. Only then build OAuth-based YouTube and Meta adapters if unattended publishing is still worthwhile.
4. Keep native scheduling as the fallback.

Acceptance:

- uploads begin as private/draft;
- the platform finishes processing before scheduling;
- returned post IDs are recorded;
- retries cannot create duplicates;
- authentication failure stops the queue and requests reauthorization.

### Phase 7 — Recurring production

Goal: run one weekly batch from a scheduled ChatGPT/Codex task.

The scheduled task should:

1. select one eligible topic;
2. research and compile the episode;
3. render it;
4. run QA;
5. place passing releases in the staging folder;
6. report failures without publishing questionable content.

The computer and desktop app must remain running for project-scoped scheduled work. The task should be tested manually several times before being scheduled.

## Pilot Storyboard

### Episode E0001: Birds on power lines

1. **Hook:** bird lands on a high-voltage line; large voltage label appears.
2. **Correction:** “Birds are not immune to electricity.”
3. **Diagram:** both feet are on nearly the same electrical potential.
4. **Current path:** no meaningful path through the bird to a lower potential.
5. **Dangerous exception:** bird touches a second wire or grounded structure.
6. **Reveal:** current can then pass through its body.
7. **Conclusion:** voltage alone is not the whole story; a potential difference across the body creates the danger.

The exact voltage number should be omitted unless the selected source and line type support it.

## QA Gates

### Research

- At least two credible sources.
- Claim-to-source mapping complete.
- No unresolved contradiction affecting the answer.
- No invented statistic or unnecessary precision.

### Rights

- Every asset is original, generated for the episode, or has an explicit compatible licence.
- No third-party music by default.
- No voice imitation.
- Font and model licences stored with the project.

### Editorial

- The title and opening make the same promise.
- Direct answer appears early.
- No fake urgency, misleading thumbnail, or engagement bait.
- General-audience tone; not intentionally child-directed.

### Technical

- Correct resolution, codecs, duration, and aspect ratio.
- Audio peaks and loudness within configured limits.
- Captions fit safe areas and match narration.
- No blank/corrupt frames.
- Output checksum differs from every previously published render.

### Platform

- Original educational value is evident.
- AI disclosure is set when realistic synthetic media is present.
- No reused or mass-produced template content.
- No platform watermark in the master.

## Testing Strategy

- Unit tests for manifest validation, timing calculations, caption wrapping, safe areas, and output naming.
- Golden-frame image tests for core scene types.
- A five-second smoke render for every renderer change.
- Full ffprobe validation for release candidates.
- One end-to-end test episode using generated fixtures and silent placeholder audio.
- Publishing adapters tested against private/draft uploads before scheduling is allowed.

## Initial Work Items

1. Scaffold the TypeScript project and tests.
2. Define `Episode` schema and sample E0001 manifest.
3. Build the brand and render profile files.
4. Implement vertical canvas and caption-safe areas.
5. Implement three first scene types: title, diagram, reveal.
6. Generate pilot narration with `say`.
7. Render and inspect the pilot.
8. Add automated technical QA.
9. Replace rough visuals or narration only after the complete pipeline works.
10. Package E0001 for private upload.

## Definition of MVP Done

The MVP is complete when one command produces an upload-ready vertical MP4, thumbnail, captions, metadata, and passing QA report from a validated E0001 manifest, using no paid API or copyrighted third-party media.

Publishing automation, long-form video, analytics feedback, and higher-quality local TTS are deliberately outside the MVP. They are subsequent modules, not prerequisites for proving the content factory.
