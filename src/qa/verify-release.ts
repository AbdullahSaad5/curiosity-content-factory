import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";

import type { Episode } from "../episode/schema";
import { estimatedGradeLevel } from "../editorial/readability";
import { run } from "../lib/process";
import type { RenderResult } from "../render/render-episode";

export type MediaProbeResult = {
  width: number;
  height: number;
  durationMs: number;
  videoCodec: string;
  audioCodec: string;
  audioPeakDb: number;
  audioMeanDb: number;
  blackDurationMs: number;
};

export type MediaProbe = (videoPath: string) => Promise<MediaProbeResult>;

export type QaCheck = {
  id: string;
  passed: boolean;
  details: string;
};

export type QaReport = {
  episodeId: string;
  passed: boolean;
  checksum: string;
  checkedAt: string;
  checks: QaCheck[];
};

async function nonEmpty(path: string): Promise<boolean> {
  try {
    return (await stat(path)).size > 0;
  } catch {
    return false;
  }
}

async function checksum(path: string): Promise<string> {
  const contents = await readFile(path);
  return createHash("sha256").update(contents).digest("hex");
}

export const ffprobeMedia: MediaProbe = async (videoPath) => {
  const [probeResult, volumeResult, blackResult] = await Promise.all([
    run("ffprobe", [
      "-v",
      "error",
      "-show_streams",
      "-show_format",
      "-of",
      "json",
      videoPath,
    ]),
    run("ffmpeg", [
      "-hide_banner",
      "-nostats",
      "-i",
      videoPath,
      "-af",
      "volumedetect",
      "-vn",
      "-sn",
      "-dn",
      "-f",
      "null",
      "-",
    ]),
    run("ffmpeg", [
      "-hide_banner",
      "-nostats",
      "-i",
      videoPath,
      "-vf",
      "blackdetect=d=1:pix_th=0.02",
      "-an",
      "-sn",
      "-dn",
      "-f",
      "null",
      "-",
    ]),
  ]);
  const { stdout } = probeResult;
  const result = JSON.parse(stdout) as {
    streams?: Array<{
      codec_type?: string;
      codec_name?: string;
      width?: number;
      height?: number;
      duration?: string;
    }>;
    format?: { duration?: string };
  };
  const video = result.streams?.find((stream) => stream.codec_type === "video");
  const audio = result.streams?.find((stream) => stream.codec_type === "audio");
  const seconds = Number.parseFloat(
    result.format?.duration ?? video?.duration ?? "0",
  );

  if (!video || !audio || !Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`ffprobe did not find valid audio and video streams in ${videoPath}`);
  }
  const peakMatch = volumeResult.stderr.match(/max_volume:\s*(-?[\d.]+) dB/iu);
  const meanMatch = volumeResult.stderr.match(/mean_volume:\s*(-?[\d.]+) dB/iu);
  const blackDurations = [...blackResult.stderr.matchAll(/black_duration:([\d.]+)/gu)]
    .map((match) => Number.parseFloat(match[1] ?? "0"))
    .filter(Number.isFinite);
  if (!peakMatch || !meanMatch) {
    throw new Error(`Could not measure audio levels in ${videoPath}`);
  }

  return {
    width: video.width ?? 0,
    height: video.height ?? 0,
    durationMs: Math.round(seconds * 1_000),
    videoCodec: video.codec_name ?? "unknown",
    audioCodec: audio.codec_name ?? "unknown",
    audioPeakDb: Number.parseFloat(peakMatch[1] ?? "-Infinity"),
    audioMeanDb: Number.parseFloat(meanMatch[1] ?? "-Infinity"),
    blackDurationMs: Math.round(
      blackDurations.reduce((sum, value) => sum + value, 0) * 1_000,
    ),
  };
};

function check(id: string, passed: boolean, details: string): QaCheck {
  return { id, passed, details };
}

export async function verifyRelease(
  episode: Episode,
  render: RenderResult,
  options: { probe?: MediaProbe; previousChecksums?: string[] } = {},
): Promise<QaReport> {
  const probe = options.probe ?? ffprobeMedia;
  const [videoExists, captionsExist, thumbnailExists] = await Promise.all([
    nonEmpty(render.videoPath),
    nonEmpty(render.captionsPath),
    nonEmpty(render.thumbnailPath),
  ]);

  if (!videoExists) {
    throw new Error(`Release video is missing or empty: ${render.videoPath}`);
  }

  const media = await probe(render.videoPath);
  const videoChecksum = await checksum(render.videoPath);
  const captionsText = captionsExist
    ? (await readFile(render.captionsPath, "utf8")).replaceAll(/\s+/gu, " ")
    : "";
  const durationToleranceMs = Math.max(250, Math.ceil(2_000 / render.fps));
  const specificVisuals = episode.scenes.filter(
    (scene) => scene.visual.kind !== "abstract",
  ).length;
  const readingGrade = estimatedGradeLevel(episode.script.short);
  const checks: QaCheck[] = [
    check("video-file", videoExists, `Video: ${render.videoPath}`),
    check("captions-file", captionsExist, `Captions: ${render.captionsPath}`),
    check("thumbnail-file", thumbnailExists, `Thumbnail: ${render.thumbnailPath}`),
    check(
      "dimensions",
      media.width === render.width && media.height === render.height,
      `Expected ${render.width}x${render.height}; found ${media.width}x${media.height}`,
    ),
    check(
      "duration",
      Math.abs(media.durationMs - render.durationMs) <= durationToleranceMs,
      `Expected about ${render.durationMs}ms; found ${media.durationMs}ms`,
    ),
    check(
      "video-codec",
      media.videoCodec === "h264",
      `Expected h264; found ${media.videoCodec}`,
    ),
    check(
      "audio-codec",
      media.audioCodec === "aac",
      `Expected aac; found ${media.audioCodec}`,
    ),
    check(
      "audio-peak",
      media.audioPeakDb > -12 && media.audioPeakDb <= 0.5,
      `Peak ${media.audioPeakDb.toFixed(1)} dB; required (-12, 0.5] dB`,
    ),
    check(
      "audio-mean",
      media.audioMeanDb > -35 && media.audioMeanDb < -6,
      `Mean ${media.audioMeanDb.toFixed(1)} dB; required (-35, -6) dB`,
    ),
    check(
      "black-frames",
      media.blackDurationMs < 1_000,
      `${media.blackDurationMs}ms of continuous near-black video detected`,
    ),
    check(
      "caption-content",
      episode.script.segments.every((segment) =>
        captionsText.includes(segment.text.replaceAll(/\s+/gu, " ")),
      ),
      "Every narration segment must appear verbatim in captions.srt",
    ),
    check(
      "script-length",
      episode.script.wordCount >= 100 && episode.script.wordCount <= 145,
      `${episode.script.wordCount} words; required 100–145`,
    ),
    check(
      "reading-level",
      readingGrade <= 10.5,
      `Estimated Flesch–Kincaid grade ${readingGrade.toFixed(1)}; maximum 10.5`,
    ),
    check(
      "release-duration",
      render.durationMs >= 35_000 && render.durationMs <= 60_000,
      `${render.durationMs}ms; required 35000–60000ms`,
    ),
    check(
      "source-ledger",
      episode.sources.length >= 2 &&
        episode.claims.every((claim) => claim.sourceIds.length > 0),
      `${episode.claims.length} claims and ${episode.sources.length} sources`,
    ),
    check(
      "claim-mapping",
      episode.script.segments.every((segment) => segment.claimIds.length > 0),
      `${episode.script.segments.length} narration segments mapped to claims`,
    ),
    check(
      "rights-ledger",
      ["visuals", "narration", "typography"].every((category) =>
        episode.rights.some((right) => right.category === category),
      ),
      `${episode.rights.length} rights records covering ${episode.rights.map((right) => right.category).join(", ")}`,
    ),
    check(
      "topic-specific-visuals",
      specificVisuals >= Math.ceil(episode.scenes.length / 2),
      `${specificVisuals}/${episode.scenes.length} scenes use specific visual primitives`,
    ),
    check(
      "unique-render",
      !(options.previousChecksums ?? []).includes(videoChecksum),
      `${options.previousChecksums?.length ?? 0} previous release checksums compared`,
    ),
    check(
      "disclosure",
      episode.disclosure.reason.trim().length > 0,
      episode.disclosure.reason,
    ),
  ];

  return {
    episodeId: episode.id,
    passed: checks.every((item) => item.passed),
    checksum: videoChecksum,
    checkedAt: new Date().toISOString(),
    checks,
  };
}
