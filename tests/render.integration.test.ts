import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { compileEpisode } from "../src/episode/compile";
import { run } from "../src/lib/process";
import { renderEpisode } from "../src/render/render-episode";

const workDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    workDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("renderEpisode", () => {
  it("renders a playable MP4 and SRT from a narration timeline", async () => {
    const workDir = await mkdtemp(join(tmpdir(), "content-render-test-"));
    workDirs.push(workDir);
    const audioPath = join(workDir, "narration.wav");
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
      "1",
      "-c:a",
      "pcm_s16le",
      audioPath,
    ]);

    const episode = compileEpisode({
      schemaVersion: 1,
      id: "E0001",
      slug: "render-test",
      question: "Why does this renderer produce a video?",
      status: "validated",
      claims: [
        { id: "C1", text: "A supported claim.", sourceIds: ["S1"] },
      ],
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
        short: "A short caption.",
        segments: [
          {
            id: "SEG1",
            sceneId: "SC1",
            claimIds: ["C1"],
            text: "A short caption.",
          },
        ],
      },
      scenes: [
        {
          id: "SC1",
          type: "diagram",
          headline: "A rendered frame",
          body: "Generated from episode data.",
          accent: "electric",
          visual: { kind: "bird-on-wire", mode: "safe" },
        },
      ],
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

    const result = await renderEpisode(
      episode,
      {
        adapter: "test",
        audioPath,
        durationMs: 1_000,
        segments: [
          {
            id: "SEG1",
            sceneId: "SC1",
            claimIds: ["C1"],
            text: "A short caption.",
            startMs: 0,
            endMs: 1_000,
          },
        ],
        warnings: [],
      },
      {
        outputDir: workDir,
        width: 180,
        height: 320,
        fps: 2,
      },
    );

    const { stdout } = await run("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height",
      "-of",
      "csv=p=0:s=x",
      result.videoPath,
    ]);

    expect(stdout.trim()).toBe("180x320");
    expect(await readFile(result.captionsPath, "utf8")).toContain(
      "00:00:00,000 --> 00:00:01,000",
    );
    expect(result.frameCount).toBe(2);
  }, 20_000);
});
