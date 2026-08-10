import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

import type { ScriptSegment } from "../episode/schema";
import { run } from "../lib/process";
import type { NarrationAdapter, NarrationSynthesis } from "./generate";

async function durationMs(audioPath: string): Promise<number> {
  const { stdout } = await run("ffprobe", [
    "-v",
    "error",
    "-show_entries",
    "format=duration",
    "-of",
    "default=noprint_wrappers=1:nokey=1",
    audioPath,
  ]);
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Could not measure narration duration for ${audioPath}`);
  }
  return Math.round(seconds * 1_000);
}

function concatEntry(path: string): string {
  return `file '${path.replaceAll("'", "'\\''")}'`;
}

export class MacOsSayAdapter implements NarrationAdapter {
  readonly name = "macos-say";

  constructor(
    private readonly options: {
      voice?: string;
      rate?: number;
    } = {},
  ) {}

  async synthesize(
    segments: ScriptSegment[],
    outputPath: string,
    gapMs: number,
  ): Promise<NarrationSynthesis> {
    const workDir = await mkdtemp(join(tmpdir(), "content-narration-"));
    const absoluteOutput = resolve(outputPath);
    const voice = this.options.voice ?? "Samantha";
    const rate = this.options.rate ?? 185;

    try {
      await mkdir(dirname(absoluteOutput), { recursive: true });
      const segmentPaths: string[] = [];
      const durationsMs: number[] = [];
      const warnings: string[] = [];

      for (const [index, segment] of segments.entries()) {
        const aiffPath = join(workDir, `segment-${index}.aiff`);
        const wavPath = join(workDir, `segment-${index}.wav`);
        await run("say", [
          "-v",
          voice,
          "-r",
          String(rate),
          "-o",
          aiffPath,
          segment.text,
        ]);
        await run("ffmpeg", [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-i",
          aiffPath,
          "-ar",
          "48000",
          "-ac",
          "1",
          "-c:a",
          "pcm_s16le",
          wavPath,
        ]);

        const measured = await durationMs(wavPath);
        durationsMs.push(measured);
        segmentPaths.push(wavPath);
        if (measured < 450) {
          warnings.push(`${segment.id} narration is unusually short (${measured}ms)`);
        }
        if (measured > 12_000) {
          warnings.push(`${segment.id} narration is unusually long (${measured}ms)`);
        }
      }

      let gapPath: string | undefined;
      if (gapMs > 0 && segments.length > 1) {
        gapPath = join(workDir, "gap.wav");
        await run("ffmpeg", [
          "-hide_banner",
          "-loglevel",
          "error",
          "-y",
          "-f",
          "lavfi",
          "-i",
          "anullsrc=r=48000:cl=mono",
          "-t",
          (gapMs / 1_000).toFixed(3),
          "-c:a",
          "pcm_s16le",
          gapPath,
        ]);
      }

      const concatPaths = segmentPaths.flatMap((path, index) =>
        gapPath && index < segmentPaths.length - 1 ? [path, gapPath] : [path],
      );
      const concatPath = join(workDir, "concat.txt");
      await writeFile(
        concatPath,
        `${concatPaths.map(concatEntry).join("\n")}\n`,
        "utf8",
      );
      await run("ffmpeg", [
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
        "-ar",
        "48000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        absoluteOutput,
      ]);

      return {
        audioPath: absoluteOutput,
        durationsMs,
        warnings,
      };
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }
  }
}
