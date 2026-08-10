import { describe, expect, it } from "vitest";

import { compileEpisode } from "../src/episode/compile";
import {
  generateNarration,
  type NarrationAdapter,
} from "../src/narration/generate";

const episode = compileEpisode({
  schemaVersion: 1,
  id: "E0001",
  slug: "narration-test",
  question: "Why does this narration test have timings?",
  status: "researched",
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
    short: "First sentence. Second sentence.",
    segments: [
      { id: "SEG1", sceneId: "SC1", claimIds: ["C1"], text: "First sentence." },
      { id: "SEG2", sceneId: "SC2", claimIds: ["C1"], text: "Second sentence." },
    ],
  },
  scenes: [
    { id: "SC1", type: "title", headline: "One" },
    { id: "SC2", type: "reveal", headline: "Two" },
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

describe("generateNarration", () => {
  it("turns adapter durations into a deterministic caption timeline", async () => {
    const adapter: NarrationAdapter = {
      name: "fake",
      async synthesize(segments, outputPath) {
        expect(segments.map((segment) => segment.text)).toEqual([
          "First sentence.",
          "Second sentence.",
        ]);
        return {
          audioPath: outputPath,
          durationsMs: [1_000, 1_500],
          warnings: [],
        };
      },
    };

    const result = await generateNarration(episode, {
      adapter,
      outputPath: "/tmp/narration.wav",
      gapMs: 200,
    });

    expect(result.durationMs).toBe(2_700);
    expect(result.segments).toEqual([
      {
        id: "SEG1",
        sceneId: "SC1",
        claimIds: ["C1"],
        text: "First sentence.",
        startMs: 0,
        endMs: 1_000,
      },
      {
        id: "SEG2",
        sceneId: "SC2",
        claimIds: ["C1"],
        text: "Second sentence.",
        startMs: 1_200,
        endMs: 2_700,
      },
    ]);
  });

  it("rejects an adapter result with the wrong number of durations", async () => {
    const adapter: NarrationAdapter = {
      name: "broken",
      async synthesize(_segments, outputPath) {
        return { audioPath: outputPath, durationsMs: [1_000], warnings: [] };
      },
    };

    await expect(
      generateNarration(episode, {
        adapter,
        outputPath: "/tmp/narration.wav",
      }),
    ).rejects.toThrow(/returned 1 durations for 2 segments/);
  });
});
