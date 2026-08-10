# Run the cinematic pipeline

## One-time setup

```bash
npm install
bash scripts/setup-local-tts.sh
```

The setup downloads approximately 120 MB of Kokoro model files. The first render also downloads the local Whisper model (`base.en` by default). Models, the virtual environment, and generated media remain local and are ignored by Git.

## Render the included approval cut

```bash
npm run pipeline -- prototypes/airplane-window-v2/manifest.json
```

To choose a different output directory:

```bash
npm run pipeline -- prototypes/airplane-window-v2/manifest.json output/my-test
```

## What the command does

1. Validates the cinematic manifest and every referenced image.
2. Generates the narration locally with Kokoro.
3. Transcribes the generated narration locally with Whisper word timestamps.
4. Aligns scene cuts and three-word captions to the spoken words.
5. Renders each image with restrained 30 fps camera movement.
6. Compresses and normalizes narration to approximately -14 LUFS; if configured, it loops a rights-recorded music bed underneath.
7. Encodes a 1080x1920 H.264/AAC MP4.
8. Produces a thumbnail, scene-aware contact sheet, and quality gate.

The command does not upload, publish, schedule, or create a cron job.

## Output

The default output is:

```text
output/prototypes/airplane-window-v2/
  prototype.mp4
  narration-mastered.wav
  captions.ass
  thumbnail.jpg
  contact-sheet.jpg
  timeline.json
  words.json
  aligned-timeline.json
  publish-metadata.json
  quality-gate.json
```

## Create another approval cut

1. Copy `prototypes/airplane-window-v2/manifest.json` to a new prototype directory.
2. Give it a new `id` and `title`.
3. Generate original 9:16 scene images and save them under the matching episode's `assets/cinematic-v2/` directory.
4. Add one manifest scene per image with the exact narration for that beat.
5. Run `npm run pipeline -- <path-to-manifest>`.
6. Watch the entire MP4 with sound and inspect the contact sheet before approving a full episode.

For a 45-60 second Short, target 14-18 images and change the visual every 2-4 seconds.

## Optional music bed

Add this object to the manifest only for music you own or are licensed to use:

```json
"music": {
  "file": "assets/original-bed.wav",
  "license": "Original composition owned by this channel",
  "volume": 0.1
}
```

Volume is capped at `0.25`. A music path without a rights record is rejected.
