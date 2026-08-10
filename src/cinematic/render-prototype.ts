import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import sharp from "sharp";
import { z } from "zod";

import { run } from "../lib/process";

const sceneSchema = z.object({
  image: z.string().min(1),
  narration: z.string().min(1),
});

const manifestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  voice: z.string().min(1),
  speed: z.number().min(0.5).max(2),
  scenes: z.array(sceneSchema).min(2),
});

const timelineSchema = z.object({
  provider: z.literal("kokoro-onnx-local"),
  voice: z.string(),
  speed: z.number(),
  sampleRate: z.number().positive(),
  durationSeconds: z.number().positive(),
  scenes: z.array(
    z.object({
      index: z.number().int().nonnegative(),
      narration: z.string(),
      startSeconds: z.number().nonnegative(),
      endSeconds: z.number().positive(),
    }),
  ),
});

type CaptionCue = {
  text: string;
  startSeconds: number;
  endSeconds: number;
};

function assTime(seconds: number): string {
  const centiseconds = Math.max(0, Math.round(seconds * 100));
  const hours = Math.floor(centiseconds / 360_000);
  const minutes = Math.floor((centiseconds % 360_000) / 6_000);
  const remainingSeconds = Math.floor((centiseconds % 6_000) / 100);
  const fraction = centiseconds % 100;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}.${String(fraction).padStart(2, "0")}`;
}

function escapeAss(value: string): string {
  return value
    .replaceAll("\\", "\\\\")
    .replaceAll("{", "\\{")
    .replaceAll("}", "\\}");
}

export function captionCues(
  text: string,
  startSeconds: number,
  endSeconds: number,
  wordsPerCue = 3,
): CaptionCue[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (words.length === 0 || endSeconds <= startSeconds) return [];
  const secondsPerWord = (endSeconds - startSeconds) / words.length;
  const cues: CaptionCue[] = [];

  for (let index = 0; index < words.length; index += wordsPerCue) {
    const group = words.slice(index, index + wordsPerCue);
    cues.push({
      text: group.join(" ").toUpperCase(),
      startSeconds: startSeconds + index * secondsPerWord,
      endSeconds:
        startSeconds + Math.min(words.length, index + group.length) * secondsPerWord,
    });
  }
  return cues;
}

function buildAss(cues: CaptionCue[]): string {
  const events = cues
    .map(
      (cue) =>
        `Dialogue: 0,${assTime(cue.startSeconds)},${assTime(cue.endSeconds)},Caption,,0,0,0,,{\\fad(55,70)}${escapeAss(cue.text)}`,
    )
    .join("\n");
  return `[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 2
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Caption,Arial,70,&H00FFFFFF,&H00FFFFFF,&HCC05070B,&H50000000,-1,0,0,0,100,100,1,0,1,6,2,2,78,78,325,1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
${events}
`;
}

function concatEntry(path: string): string {
  return `file '${path.replaceAll("'", "'\\''")}'`;
}

async function renderSceneClip(
  imagePath: string,
  durationSeconds: number,
  index: number,
  outputPath: string,
): Promise<void> {
  const fps = 30;
  const frames = Math.max(1, Math.round(durationSeconds * fps));
  const zoom =
    index % 2 === 0
      ? "min(zoom+0.00075,1.105)"
      : "if(eq(on,1),1.105,max(1.001,zoom-0.00075))";
  const filter = [
    "scale=2160:3840:force_original_aspect_ratio=increase",
    "crop=2160:3840",
    `zoompan=z='${zoom}':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${frames}:s=1080x1920:fps=${fps}`,
    "eq=contrast=1.045:saturation=0.92:brightness=-0.018",
    "vignette=PI/7",
    "format=yuv420p",
  ].join(",");

  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-loop",
    "1",
    "-i",
    imagePath,
    "-vf",
    filter,
    "-frames:v",
    String(frames),
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "fast",
    "-crf",
    "18",
    outputPath,
  ]);
}

export async function renderCinematicPrototype(
  manifestPath: string,
  outputDirectory?: string,
): Promise<{ videoPath: string; contactSheetPath: string; narrationPath: string }> {
  const absoluteManifest = resolve(manifestPath);
  const manifest = manifestSchema.parse(
    JSON.parse(await readFile(absoluteManifest, "utf8")) as unknown,
  );
  const projectRoot = resolve(dirname(absoluteManifest), "../..");
  const outputDir = resolve(
    outputDirectory ?? join(projectRoot, "output", "prototypes", manifest.id),
  );
  const clipsDir = join(outputDir, "clips");
  await mkdir(clipsDir, { recursive: true });

  const images = manifest.scenes.map((scene) =>
    resolve(dirname(absoluteManifest), scene.image),
  );
  await Promise.all(images.map((path) => access(path)));

  const python = join(projectRoot, ".venv-local-tts", "bin", "python");
  const ttsScript = join(projectRoot, "scripts", "kokoro_tts.py");
  const model = join(projectRoot, "models", "kokoro", "kokoro-v1.0.int8.onnx");
  const voices = join(projectRoot, "models", "kokoro", "voices-v1.0.bin");
  await Promise.all([python, ttsScript, model, voices].map((path) => access(path)));

  await run(python, [
    ttsScript,
    "--manifest",
    absoluteManifest,
    "--output",
    outputDir,
    "--model",
    model,
    "--voices",
    voices,
  ]);

  const timeline = timelineSchema.parse(
    JSON.parse(await readFile(join(outputDir, "timeline.json"), "utf8")) as unknown,
  );
  if (timeline.scenes.length !== manifest.scenes.length) {
    throw new Error("Narration timeline does not match the visual scene count");
  }

  const clipPaths: string[] = [];
  for (let index = 0; index < manifest.scenes.length; index += 1) {
    const current = timeline.scenes[index]!;
    const next = timeline.scenes[index + 1];
    const end = next?.startSeconds ?? timeline.durationSeconds;
    const clipPath = join(clipsDir, `scene-${String(index + 1).padStart(2, "0")}.mp4`);
    await renderSceneClip(images[index]!, end - current.startSeconds, index, clipPath);
    clipPaths.push(clipPath);
  }

  const concatPath = join(outputDir, "clips.txt");
  await writeFile(
    concatPath,
    `${clipPaths.map(concatEntry).join("\n")}\n`,
    "utf8",
  );

  const cues = timeline.scenes.flatMap((scene) =>
    captionCues(
      scene.narration,
      scene.startSeconds,
      scene.endSeconds,
      3,
    ),
  );
  const captionsPath = join(outputDir, "captions.ass");
  await writeFile(captionsPath, buildAss(cues), "utf8");

  const rawNarration = join(outputDir, "narration-raw.wav");
  const narrationPath = join(outputDir, "narration-mastered.wav");
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-i",
    rawNarration,
    "-af",
    "highpass=f=75,acompressor=threshold=-20dB:ratio=3:attack=8:release=180,loudnorm=I=-14:TP=-1.5:LRA=11,aformat=channel_layouts=stereo",
    "-ar",
    "48000",
    "-c:a",
    "pcm_s24le",
    narrationPath,
  ]);

  const videoPath = join(outputDir, "prototype.mp4");
  await run(
    "ffmpeg",
    [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      concatPath,
      "-i",
      narrationPath,
      "-vf",
      "subtitles=captions.ass",
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      "18",
      "-pix_fmt",
      "yuv420p",
      "-r",
      "30",
      "-c:a",
      "aac",
      "-b:a",
      "192k",
      "-shortest",
      "-movflags",
      "+faststart",
      videoPath,
    ],
    { cwd: outputDir },
  );

  await sharp(images[0])
    .resize(1080, 1920, { fit: "cover" })
    .jpeg({ quality: 92 })
    .toFile(join(outputDir, "thumbnail.jpg"));

  const contactSheetPath = join(outputDir, "contact-sheet.jpg");
  const contactInputs = timeline.scenes.flatMap((scene) => [
    "-ss",
    ((scene.startSeconds + scene.endSeconds) / 2).toFixed(3),
    "-i",
    videoPath,
  ]);
  const contactTiles = timeline.scenes
    .map((_, index) => `[${index}:v]scale=270:480[t${index}]`)
    .join(";");
  const contactStack = timeline.scenes
    .map((_, index) => `[t${index}]`)
    .join("");
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...contactInputs,
    "-filter_complex",
    `${contactTiles};${contactStack}hstack=inputs=${timeline.scenes.length}[sheet]`,
    "-map",
    "[sheet]",
    "-frames:v",
    "1",
    contactSheetPath,
  ]);

  await writeFile(
    join(outputDir, "quality-gate.json"),
    `${JSON.stringify(
      {
        prototypeId: manifest.id,
        renderer: "cinematic-image-v2",
        narrationProvider: timeline.provider,
        narrationVoice: timeline.voice,
        fps: 30,
        imageCount: images.length,
        maximumCaptionWords: Math.max(
          ...cues.map((cue) => cue.text.split(/\s+/u).length),
        ),
        legacySystemVoiceBlocked: true,
        aestheticApprovalRequired: true,
        approved: false,
      },
      null,
      2,
    )}\n`,
    "utf8",
  );

  return { videoPath, contactSheetPath, narrationPath };
}

async function main(): Promise<void> {
  const manifestPath = process.argv[2];
  if (!manifestPath) {
    throw new Error("Usage: npm run prototype:render -- <manifest.json> [output-dir]");
  }
  const result = await renderCinematicPrototype(manifestPath, process.argv[3]);
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

if (process.argv[1]?.endsWith("render-prototype.ts")) {
  await main();
}
