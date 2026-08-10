import type { Episode, ScriptSegment } from "../episode/schema";

export type NarrationSynthesis = {
  audioPath: string;
  durationsMs: number[];
  warnings: string[];
};

export type NarrationAdapter = {
  name: string;
  synthesize(
    segments: ScriptSegment[],
    outputPath: string,
    gapMs: number,
  ): Promise<NarrationSynthesis>;
};

export type NarrationTimelineSegment = ScriptSegment & {
  startMs: number;
  endMs: number;
};

export type NarrationResult = {
  adapter: string;
  audioPath: string;
  durationMs: number;
  segments: NarrationTimelineSegment[];
  warnings: string[];
};

export async function generateNarration(
  episode: Episode,
  options: {
    adapter: NarrationAdapter;
    outputPath: string;
    gapMs?: number;
  },
): Promise<NarrationResult> {
  const gapMs = options.gapMs ?? 180;
  const synthesis = await options.adapter.synthesize(
    episode.script.segments,
    options.outputPath,
    gapMs,
  );

  if (synthesis.durationsMs.length !== episode.script.segments.length) {
    throw new Error(
      `${options.adapter.name} returned ${synthesis.durationsMs.length} durations for ${episode.script.segments.length} segments`,
    );
  }

  let cursorMs = 0;
  const segments = episode.script.segments.map((segment, index) => {
    const durationMs = synthesis.durationsMs[index];
    if (durationMs === undefined || durationMs <= 0) {
      throw new Error(
        `${options.adapter.name} returned an invalid duration for ${segment.id}`,
      );
    }

    const startMs = cursorMs;
    const endMs = startMs + durationMs;
    cursorMs = endMs + (index === episode.script.segments.length - 1 ? 0 : gapMs);

    return {
      ...segment,
      startMs,
      endMs,
    };
  });

  return {
    adapter: options.adapter.name,
    audioPath: synthesis.audioPath,
    durationMs: cursorMs,
    segments,
    warnings: synthesis.warnings,
  };
}
