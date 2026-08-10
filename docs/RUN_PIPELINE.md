# Run the cinematic pipeline

## One-time setup

```bash
npm install
bash scripts/setup-local-tts.sh
```

The TTS setup downloads approximately 120 MB of open model files. The models, virtual environment, and generated media remain local and are ignored by Git.

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
3. Measures the real duration of each narration beat.
4. Renders each image with restrained 30 fps camera movement.
5. Creates three-word timed captions.
6. Compresses and normalizes narration to approximately -14 LUFS.
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
