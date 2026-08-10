import { run } from "../lib/process";
import { estimatedGradeLevel } from "../editorial/readability";
import { ffprobeMedia } from "../qa/verify-release";

export type CinematicMedia = {
  width: number;
  height: number;
  durationMs: number;
  videoCodec: string;
  audioCodec: string;
  frameRate: number;
  audioSampleRate: number;
  audioChannels: number;
  audioPeakDb: number;
  audioMeanDb: number;
  blackDurationMs: number;
};

export type TechnicalCheck = { id: string; passed: boolean; details: string };

function check(id: string, passed: boolean, details: string): TechnicalCheck {
  return { id, passed, details };
}

function ratio(value: string): number {
  const [numerator = "0", denominator = "1"] = value.split("/");
  return Number(numerator) / Number(denominator);
}

export async function probeCinematicOutput(videoPath: string): Promise<CinematicMedia> {
  const [media, { stdout }] = await Promise.all([
    ffprobeMedia(videoPath),
    run("ffprobe", [
      "-v", "error",
      "-show_entries", "stream=codec_type,r_frame_rate,sample_rate,channels",
      "-of", "json",
      videoPath,
    ]),
  ]);
  const details = JSON.parse(stdout) as {
    streams?: Array<{
      codec_type?: string;
      r_frame_rate?: string;
      sample_rate?: string;
      channels?: number;
    }>;
  };
  const video = details.streams?.find((stream) => stream.codec_type === "video");
  const audio = details.streams?.find((stream) => stream.codec_type === "audio");
  return {
    ...media,
    frameRate: ratio(video?.r_frame_rate ?? "0/1"),
    audioSampleRate: Number(audio?.sample_rate ?? 0),
    audioChannels: audio?.channels ?? 0,
  };
}

export function evaluateCinematicTechnical(
  media: CinematicMedia,
  expectedDurationMs: number,
  captionCueCount: number,
  captionCoverage: number,
): { passed: boolean; checks: TechnicalCheck[] } {
  const checks = [
    check("dimensions", media.width === 1080 && media.height === 1920, `${media.width}x${media.height}`),
    check("duration", Math.abs(media.durationMs - expectedDurationMs) <= 300, `${media.durationMs}ms; expected ${expectedDurationMs}ms`),
    check("video-codec", media.videoCodec === "h264", media.videoCodec),
    check("audio-codec", media.audioCodec === "aac", media.audioCodec),
    check("frame-rate", Math.abs(media.frameRate - 30) < 0.01, `${media.frameRate} fps`),
    check("audio-layout", media.audioSampleRate === 48_000 && media.audioChannels === 2, `${media.audioSampleRate} Hz, ${media.audioChannels} channels`),
    check("audio-peak", media.audioPeakDb > -12 && media.audioPeakDb <= -1, `${media.audioPeakDb} dB`),
    check("audio-mean", media.audioMeanDb > -35 && media.audioMeanDb < -6, `${media.audioMeanDb} dB`),
    check("black-frames", media.blackDurationMs < 1_000, `${media.blackDurationMs}ms`),
    check("captions", captionCueCount > 0, `${captionCueCount} cues`),
    check("caption-coverage", captionCoverage >= 0.9, `${(captionCoverage * 100).toFixed(1)}%`),
  ];
  return { passed: checks.every((item) => item.passed), checks };
}

export function evaluatePublication(input: {
  durationSeconds: number;
  imageHashes: string[];
  sceneDurations: number[];
  narration: string;
}): { passed: boolean; checks: TechnicalCheck[] } {
  const wordCount = input.narration.trim().split(/\s+/u).filter(Boolean).length;
  const readingGrade = estimatedGradeLevel(input.narration);
  const uniqueImages = new Set(input.imageHashes).size;
  const checks = [
    check(
      "release-duration",
      input.durationSeconds >= 35 && input.durationSeconds <= 60,
      `${input.durationSeconds.toFixed(2)} seconds; required 35–60`,
    ),
    check(
      "visual-density",
      input.imageHashes.length >= 14 && input.imageHashes.length <= 18,
      `${input.imageHashes.length} images; required 14–18`,
    ),
    check(
      "unique-visuals",
      uniqueImages === input.imageHashes.length,
      `${uniqueImages}/${input.imageHashes.length} images are unique by SHA-256`,
    ),
    check(
      "scene-pacing",
      input.sceneDurations.every((duration) => duration >= 2 && duration <= 4),
      `${input.sceneDurations.map((duration) => duration.toFixed(2)).join(", ")} seconds; each required 2–4`,
    ),
    check(
      "script-length",
      wordCount >= 100 && wordCount <= 145,
      `${wordCount} words; required 100–145`,
    ),
    check(
      "reading-level",
      readingGrade <= 10.5,
      `Estimated Flesch–Kincaid grade ${readingGrade.toFixed(1)}; maximum 10.5`,
    ),
  ];
  return { passed: checks.every((item) => item.passed), checks };
}
