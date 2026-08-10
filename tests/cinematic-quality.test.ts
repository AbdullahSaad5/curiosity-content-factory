import { describe, expect, it } from "vitest";

import {
  evaluateCinematicTechnical,
  evaluatePublication,
} from "../src/cinematic/quality";

const validMedia = {
  width: 1080,
  height: 1920,
  durationMs: 45_000,
  videoCodec: "h264",
  audioCodec: "aac",
  frameRate: 30,
  audioSampleRate: 48_000,
  audioChannels: 2,
  audioPeakDb: -2,
  audioMeanDb: -16,
  blackDurationMs: 0,
};

describe("evaluateCinematicTechnical", () => {
  it("passes a complete vertical release encoding", () => {
    const report = evaluateCinematicTechnical(validMedia, 45_000, 12, 0.98);
    expect(report.passed).toBe(true);
    expect(report.checks.every((check) => check.passed)).toBe(true);
  });

  it("fails invalid frame rate, silence, and missing captions", () => {
    const report = evaluateCinematicTechnical(
      { ...validMedia, frameRate: 12, audioMeanDb: -80 },
      45_000,
      0,
      0.4,
    );
    expect(report.passed).toBe(false);
    expect(report.checks.filter((check) => !check.passed).map((check) => check.id))
      .toEqual(expect.arrayContaining([
        "frame-rate",
        "audio-mean",
        "captions",
        "caption-coverage",
      ]));
  });
});

describe("evaluatePublication", () => {
  it("passes distinct visuals, readable narration, and two-to-four-second pacing", () => {
    const report = evaluatePublication({
      durationSeconds: 45,
      imageHashes: Array.from({ length: 15 }, (_, index) => `hash-${index}`),
      sceneDurations: Array.from({ length: 15 }, () => 3),
      narration: Array.from({ length: 37 }, () => "Birds fly high.").join(" "),
    });
    expect(report.passed).toBe(true);
  });

  it("rejects duplicated visuals, slow scenes, and difficult prose", () => {
    const report = evaluatePublication({
      durationSeconds: 45,
      imageHashes: Array.from({ length: 15 }, () => "same-hash"),
      sceneDurations: [6, ...Array.from({ length: 14 }, () => 3)],
      narration: Array.from(
        { length: 25 },
        () => "Institutionalization characteristically complicates interoperability.",
      ).join(" "),
    });
    expect(report.passed).toBe(false);
    expect(report.checks.filter((check) => !check.passed).map((check) => check.id))
      .toEqual(expect.arrayContaining([
        "unique-visuals",
        "scene-pacing",
        "reading-level",
      ]));
  });
});
