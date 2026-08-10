import {
  copyFile,
  mkdir,
  readdir,
  rm,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";

import sharp from "sharp";

import { toSrt } from "../captions/srt";
import type { Episode, Scene } from "../episode/schema";
import { run } from "../lib/process";
import type {
  NarrationResult,
  NarrationTimelineSegment,
} from "../narration/generate";
import { renderFrameSvg } from "../visuals/render-frame";

export type RenderResult = {
  videoPath: string;
  captionsPath: string;
  thumbnailPath: string;
  frameCount: number;
  width: number;
  height: number;
  fps: number;
  durationMs: number;
};

function currentSegment(
  segments: NarrationTimelineSegment[],
  timeMs: number,
): NarrationTimelineSegment {
  const active = segments.find(
    (segment) => timeMs >= segment.startMs && timeMs < segment.endMs,
  );
  if (active) return active;

  const previous = [...segments]
    .reverse()
    .find((segment) => segment.endMs <= timeMs);
  return previous ?? segments[0]!;
}

async function renderInBatches(
  tasks: Array<() => Promise<void>>,
  concurrency: number,
): Promise<void> {
  for (let index = 0; index < tasks.length; index += concurrency) {
    await Promise.all(tasks.slice(index, index + concurrency).map((task) => task()));
  }
}

export async function renderEpisode(
  episode: Episode,
  narration: NarrationResult,
  options: {
    outputDir: string;
    width?: number;
    height?: number;
    fps?: number;
    keepFrames?: boolean;
  },
): Promise<RenderResult> {
  if (narration.segments.length === 0) {
    throw new Error("Cannot render an episode without narration segments");
  }

  const width = options.width ?? 1080;
  const height = options.height ?? 1920;
  const fps = options.fps ?? 15;
  const outputDir = resolve(options.outputDir);
  const workDir = join(outputDir, "render-work");
  const framesDir = join(workDir, "frames");
  const videoPath = join(outputDir, "video.mp4");
  const captionsPath = join(outputDir, "captions.srt");
  const thumbnailPath = join(outputDir, "thumbnail.png");

  if (width <= 0 || height <= 0 || fps <= 0) {
    throw new Error("Render width, height, and fps must be positive");
  }

  await mkdir(outputDir, { recursive: true });
  await rm(workDir, { recursive: true, force: true });
  await mkdir(framesDir, { recursive: true });
  await writeFile(captionsPath, toSrt(narration.segments), "utf8");

  const scenes = new Map(episode.scenes.map((scene) => [scene.id, scene]));
  const frameCount = Math.max(
    1,
    Math.ceil((narration.durationMs / 1_000) * fps),
  );
  const frameTasks: Array<() => Promise<void>> = [];

  for (let frame = 0; frame < frameCount; frame += 1) {
    frameTasks.push(async () => {
      const timeMs = (frame / fps) * 1_000;
      const segment = currentSegment(narration.segments, timeMs);
      const scene: Scene | undefined = scenes.get(segment.sceneId);
      if (!scene) {
        throw new Error(`Narration references missing scene ${segment.sceneId}`);
      }
      const segmentDuration = Math.max(1, segment.endMs - segment.startMs);
      const progress = Math.min(
        1,
        Math.max(0, (timeMs - segment.startMs) / segmentDuration),
      );
      const svg = renderFrameSvg({
        scene,
        caption: segment.text,
        progress,
        episodeProgress: frame / Math.max(1, frameCount - 1),
        width,
        height,
      });
      const framePath = join(framesDir, `frame-${String(frame).padStart(6, "0")}.png`);
      await sharp(Buffer.from(svg)).png({ compressionLevel: 4 }).toFile(framePath);
    });
  }

  await renderInBatches(frameTasks, 6);
  const renderedFrames = (await readdir(framesDir)).filter((name) => name.endsWith(".png"));
  if (renderedFrames.length !== frameCount) {
    throw new Error(
      `Renderer produced ${renderedFrames.length} frames; expected ${frameCount}`,
    );
  }

  await copyFile(join(framesDir, "frame-000000.png"), thumbnailPath);
  await run("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-y",
    "-framerate",
    String(fps),
    "-i",
    join(framesDir, "frame-%06d.png"),
    "-i",
    narration.audioPath,
    "-map",
    "0:v:0",
    "-map",
    "1:a:0",
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "19",
    "-pix_fmt",
    "yuv420p",
    "-r",
    String(fps),
    "-c:a",
    "aac",
    "-b:a",
    "160k",
    "-movflags",
    "+faststart",
    "-t",
    (narration.durationMs / 1_000).toFixed(3),
    videoPath,
  ]);

  if (!options.keepFrames) {
    await rm(workDir, { recursive: true, force: true });
  }

  return {
    videoPath,
    captionsPath,
    thumbnailPath,
    frameCount,
    width,
    height,
    fps,
    durationMs: narration.durationMs,
  };
}
