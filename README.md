# Curiosity Content Factory

A zero-incremental-cost, manifest-driven factory for original English explainer videos. The current production direction is cinematic AI-generated imagery, restrained 30 fps camera movement, short burned-in captions, and private on-device neural narration.

The factory uses Node.js, Sharp, FFmpeg, and the open-weight Kokoro voice model. Image assets are generated through the existing ChatGPT/Codex subscription. It does not call a paid API, use stock footage, create a cron job, or publish without account authorization and review.

## What is already built

- A 19.9-second cinematic approval prototype for “Why Are Airplane Windows Rounded?”
- Four original vertical scene images, slow Ken Burns movement, 3-word caption groups, and local Kokoro narration.
- 1080×1920 H.264/AAC at 30 fps with 48 kHz stereo audio mastered to about −14 LUFS.
- Aesthetic approval, contact-sheet inspection, legacy-voice blocking, and technical tests.

The earlier 12 fps SVG renders for E0001 and E0002 are deprecated. Their renderer remains in source for comparison tests, but the main `episode:render` and `episode:release` commands deliberately refuse to produce it.

Generated video and audio files remain local and are intentionally ignored by Git.

## Requirements

- macOS on Apple Silicon
- Node.js 22 or newer
- FFmpeg and ffprobe
- Python 3.12, `kokoro-onnx`, and the Kokoro v1.0 INT8 model

No API key is required. Narration text remains on the machine.

## Use it

From this directory:

```bash
npm install
npm test
npm run typecheck
bash scripts/setup-local-tts.sh
```

If Python 3.12 is not named `python3.12` on the machine, set `TTS_PYTHON_BIN` to its executable path for the setup command.

Validate an episode:

```bash
npm run episode:validate -- episodes/E0001-birds-on-power-lines/episode.json
# or simply:
npm run episode:validate -- E0001 --format vertical
```

Render the current approval prototype:

```bash
npm run prototype:render -- prototypes/airplane-window-v2/manifest.json
```

The command writes this package under `output/prototypes/airplane-window-v2/`:

- `prototype.mp4` — 1080×1920 H.264/AAC approval cut
- `narration-mastered.wav` — local neural narration at release loudness
- `captions.ass` — timed three-word caption groups
- `thumbnail.jpg` — clean opening frame
- `contact-sheet.jpg` — one representative frame per scene
- `quality-gate.json` — renderer, voice, caption, and approval status

The Kokoro model and generated media are local and ignored by Git. The one-time setup downloads about 120 MB of open model files; it does not transmit episode text. See [the model record](docs/THIRD_PARTY_MODELS.md). The approval prototype is not a release and is not uploaded anywhere.

## Add an episode

1. Copy an existing episode directory and give it the next `E####` ID and slug.
2. Research the answer using at least two credible institutional or primary sources.
3. Write every factual claim into `claims` and map it to one or more source IDs.
4. Write a 100–145 word script split into scenes of no more than roughly 30 words each.
5. Create 14–18 original, topic-specific vertical images for a full Short and change the visual every 2–4 seconds.
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
- Run production manually. No cron or recurring task belongs in this project.
- Upload as private/draft first and require an explicit human aesthetic approval before public release.
- Monetization is not guaranteed. Eligibility, distribution, RPM, and payout remain platform decisions.

Read [the editorial policy](docs/EDITORIAL_POLICY.md), [publishing runbook](docs/PUBLISHING_RUNBOOK.md), and [manual run prompt](docs/MANUAL_RUN_PROMPT.md) before operating the channel.
