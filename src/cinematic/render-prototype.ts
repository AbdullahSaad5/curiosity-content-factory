import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import sharp from "sharp";
import { z } from "zod";

import { run } from "../lib/process";
import { masterSoundtrack } from "./audio";
import {
  alignScenesToWords,
  captionCuesFromWords,
  type TimedWord,
} from "./timing";

const sceneSchema = z.object({
  image: z.string().min(1),
  narration: z.string().min(1),
});

const manifestSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1).default("An original visual explainer."),
  tags: z.array(z.string().min(1)).max(30).default([]),
  voice: z.string().min(1),
  speed: z.number().min(0.5).max(2),
  music: z.object({
    file: z.string().min(1),
    license: z.string().min(1),
    volume: z.number().min(0).max(0.25).default(0.1),
  }).optional(),
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

const transcriptSchema = z.object({
  provider: z.literal("openai-whisper-local"),
  model: z.string().min(1),
  text: z.string(),
  words: z.array(
    z.object({
      word: z.string().min(1),
      startSeconds: z.number().nonnegative(),
      endSeconds: z.number().positive(),
    }),
  ).min(1),
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
  const musicPath = manifest.music
    ? resolve(dirname(absoluteManifest), manifest.music.file)
    : undefined;
  await Promise.all([...images, ...(musicPath ? [musicPath] : [])].map((path) => access(path)));

  const python = join(projectRoot, ".venv-local-tts", "bin", "python");
  const ttsScript = join(projectRoot, "scripts", "kokoro_tts.py");
  const whisperScript = join(projectRoot, "scripts", "whisper_words.py");
  const model = join(projectRoot, "models", "kokoro", "kokoro-v1.0.int8.onnx");
  const voices = join(projectRoot, "models", "kokoro", "voices-v1.0.bin");
  await Promise.all(
    [python, ttsScript, whisperScript, model, voices].map((path) => access(path)),
  );

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

  const rawNarration = join(outputDir, "narration-raw.wav");
  const wordsPath = join(outputDir, "words.json");
  const whisperModel = process.env.WHISPER_MODEL ?? "base.en";
  await run(python, [
    whisperScript,
    "--audio",
    rawNarration,
    "--output",
    wordsPath,
    "--model",
    whisperModel,
    "--model-dir",
    join(projectRoot, "models", "whisper"),
  ]);
  const transcript = transcriptSchema.parse(
    JSON.parse(await readFile(wordsPath, "utf8")) as unknown,
  );
  const timedWords: TimedWord[] = transcript.words;
  const sceneTimings = alignScenesToWords(
    manifest.scenes,
    timedWords,
    timeline.durationSeconds,
  );
  await writeFile(
    join(outputDir, "aligned-timeline.json"),
    `${JSON.stringify({ scenes: sceneTimings }, null, 2)}\n`,
    "utf8",
  );

  const clipPaths: string[] = [];
  for (let index = 0; index < manifest.scenes.length; index += 1) {
    const timing = sceneTimings[index]!;
    const clipPath = join(clipsDir, `scene-${String(index + 1).padStart(2, "0")}.mp4`);
    await renderSceneClip(
      images[index]!,
      timing.endSeconds - timing.startSeconds,
      index,
      clipPath,
    );
    clipPaths.push(clipPath);
  }

  const concatPath = join(outputDir, "clips.txt");
  await writeFile(
    concatPath,
    `${clipPaths.map(concatEntry).join("\n")}\n`,
    "utf8",
  );

  const cues = sceneTimings.flatMap((timing) =>
    captionCuesFromWords(
      timedWords.filter(
        (word) =>
          word.startSeconds >= timing.startSeconds &&
          word.startSeconds < timing.endSeconds,
      ),
      3,
    ),
  );
  const captionsPath = join(outputDir, "captions.ass");
  await writeFile(captionsPath, buildAss(cues), "utf8");

  const narrationPath = join(outputDir, "narration-mastered.wav");
  await masterSoundtrack({
    voicePath: rawNarration,
    outputPath: narrationPath,
    durationSeconds: timeline.durationSeconds,
    ...(musicPath && manifest.music
      ? {
          musicPath,
          musicLicense: manifest.music.license,
          musicVolume: manifest.music.volume,
        }
      : {}),
  });

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
  const contactInputs = sceneTimings.flatMap((scene) => [
    "-ss",
    ((scene.startSeconds + scene.endSeconds) / 2).toFixed(3),
    "-i",
    videoPath,
  ]);
  const contactTiles = sceneTimings
    .map((_, index) => `[${index}:v]scale=270:480[t${index}]`)
    .join(";");
  const contactStack = sceneTimings
    .map((_, index) => `[t${index}]`)
    .join("");
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    ...contactInputs,
    "-filter_complex",
    `${contactTiles};${contactStack}hstack=inputs=${sceneTimings.length}[sheet]`,
    "-map",
    "[sheet]",
    "-frames:v",
    "1",
    contactSheetPath,
  ]);

  await writeFile(
    join(outputDir, "publish-metadata.json"),
    `${JSON.stringify({
      title: manifest.title,
      description: manifest.description,
      tags: manifest.tags,
    }, null, 2)}\n`,
    "utf8",
  );

  await writeFile(
    join(outputDir, "quality-gate.json"),
    `${JSON.stringify(
      {
        prototypeId: manifest.id,
        renderer: "cinematic-image-v2",
        narrationProvider: timeline.provider,
        narrationVoice: timeline.voice,
        captionTimingProvider: transcript.provider,
        captionTimingModel: transcript.model,
        sceneTiming: "whisper-word-aligned",
        fps: 30,
        imageCount: images.length,
        maximumCaptionWords: Math.max(
          ...cues.map((cue) => cue.text.split(/\s+/u).length),
        ),
        musicBed: manifest.music
          ? {
              included: true,
              volume: manifest.music.volume,
              rights: manifest.music.license,
            }
          : { included: false },
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
