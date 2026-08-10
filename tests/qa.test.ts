import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { compileEpisode } from "../src/episode/compile";
import { verifyRelease, type MediaProbe } from "../src/qa/verify-release";

const workDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    workDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

const segmentTexts = Array.from({ length: 4 }, (_, segmentIndex) =>
  `${Array.from(
    { length: 25 },
    (_, wordIndex) => `word${segmentIndex + 1}_${wordIndex + 1}`,
  ).join(" ")}.`,
);

const episode = compileEpisode({
  schemaVersion: 1,
  id: "E0001",
  slug: "qa-test",
  question: "Why does this release pass quality checks?",
  status: "validated",
  claims: [{ id: "C1", text: "Supported.", sourceIds: ["S1"] }],
  sources: [
    {
      id: "S1",
      title: "Source",
      url: "https://example.edu/source",
      publisher: "Example University",
      accessedAt: "2026-08-10",
    },
    {
      id: "S2",
      title: "Independent source",
      url: "https://example.gov/source",
      publisher: "Example Agency",
      accessedAt: "2026-08-10",
    },
  ],
  script: {
    short: segmentTexts.join(" "),
    segments: segmentTexts.map((text, index) => ({
      id: `SEG${index + 1}`,
      sceneId: `SC${index + 1}`,
      claimIds: ["C1"],
      text,
    })),
  },
  scenes: segmentTexts.map((_text, index) => ({
    id: `SC${index + 1}`,
    type: index === 0 ? ("title" as const) : ("diagram" as const),
    headline: `Valid scene ${index + 1}`,
    visual:
      index < 2
        ? ({ kind: "stress-map", mode: "rounded" } as const)
        : ({ kind: "abstract" } as const),
  })),
  disclosure: {
    realisticSyntheticMedia: false,
    reason: "Stylized diagrams only",
  },
  rights: [
    {
      category: "visuals",
      asset: "Test output",
      origin: "Generated fixture",
      license: "Original test output",
      evidence: "This test",
    },
    {
      category: "narration",
      asset: "Test narration",
      origin: "Generated fixture",
      license: "Original test output",
      evidence: "This test",
    },
    {
      category: "typography",
      asset: "Test typography",
      origin: "Generated fixture",
      license: "Original test output",
      evidence: "This test",
    },
  ],
});

describe("verifyRelease", () => {
  it("passes a correctly encoded release and creates a checksum", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "content-qa-test-"));
    workDirs.push(workDir);
    const videoPath = join(workDir, "video.mp4");
    const captionsPath = join(workDir, "captions.srt");
    const thumbnailPath = join(workDir, "thumbnail.png");
    await writeFile(videoPath, "video");
    await writeFile(captionsPath, segmentTexts.join("\n\n"));
    await writeFile(thumbnailPath, "thumbnail");

    const probe: MediaProbe = async () => ({
      width: 1080,
      height: 1920,
      durationMs: 40_020,
      videoCodec: "h264",
      audioCodec: "aac",
      audioPeakDb: -2,
      audioMeanDb: -18,
      blackDurationMs: 0,
    });

    const report = await verifyRelease(
      episode,
      {
        videoPath,
        captionsPath,
        thumbnailPath,
        frameCount: 600,
        width: 1080,
        height: 1920,
        fps: 15,
        durationMs: 40_000,
      },
      { probe },
    );

    expect(report.passed).toBe(true);
    expect(report.checksum).toMatch(/^[a-f0-9]{64}$/);
    expect(report.checks.every((check) => check.passed)).toBe(true);
  });

  it("fails a release with the wrong dimensions and codec", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "content-qa-test-"));
    workDirs.push(workDir);
    const videoPath = join(workDir, "video.mp4");
    const captionsPath = join(workDir, "captions.srt");
    const thumbnailPath = join(workDir, "thumbnail.png");
    await writeFile(videoPath, "video");
    await writeFile(captionsPath, segmentTexts.join("\n\n"));
    await writeFile(thumbnailPath, "thumbnail");

    const report = await verifyRelease(
      episode,
      {
        videoPath,
        captionsPath,
        thumbnailPath,
        frameCount: 600,
        width: 1080,
        height: 1920,
        fps: 15,
        durationMs: 40_000,
      },
      {
        probe: async () => ({
          width: 1920,
          height: 1080,
          durationMs: 40_000,
          videoCodec: "hevc",
          audioCodec: "aac",
          audioPeakDb: -2,
          audioMeanDb: -18,
          blackDurationMs: 0,
        }),
      },
    );

    expect(report.passed).toBe(false);
    expect(report.checks.find((check) => check.id === "dimensions")?.passed).toBe(false);
    expect(report.checks.find((check) => check.id === "video-codec")?.passed).toBe(false);
  });

  it("blocks silent or continuously black releases", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "content-qa-test-"));
    workDirs.push(workDir);
    const videoPath = join(workDir, "video.mp4");
    const captionsPath = join(workDir, "captions.srt");
    const thumbnailPath = join(workDir, "thumbnail.png");
    await writeFile(videoPath, "video");
    await writeFile(captionsPath, segmentTexts.join("\n\n"));
    await writeFile(thumbnailPath, "thumbnail");

    const report = await verifyRelease(
      episode,
      {
        videoPath,
        captionsPath,
        thumbnailPath,
        frameCount: 600,
        width: 1080,
        height: 1920,
        fps: 15,
        durationMs: 40_000,
      },
      {
        probe: async () => ({
          width: 1080,
          height: 1920,
          durationMs: 40_000,
          videoCodec: "h264",
          audioCodec: "aac",
          audioPeakDb: -91,
          audioMeanDb: -91,
          blackDurationMs: 40_000,
        }),
      },
    );

    expect(report.passed).toBe(false);
    expect(report.checks.find((check) => check.id === "audio-peak")?.passed).toBe(false);
    expect(report.checks.find((check) => check.id === "black-frames")?.passed).toBe(false);
  });
});
