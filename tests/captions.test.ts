import { describe, expect, it } from "vitest";

import { toSrt } from "../src/captions/srt";

describe("toSrt", () => {
  it("formats narration timings as SRT", () => {
    const srt = toSrt([
      {
        id: "SEG1",
        sceneId: "SC1",
        claimIds: ["C1"],
        text: "First caption.",
        startMs: 0,
        endMs: 1_250,
      },
      {
        id: "SEG2",
        sceneId: "SC2",
        claimIds: ["C1"],
        text: "Second caption.",
        startMs: 1_430,
        endMs: 61_500,
      },
    ]);

    expect(srt).toBe(
      [
        "1",
        "00:00:00,000 --> 00:00:01,250",
        "First caption.",
        "",
        "2",
        "00:00:01,430 --> 00:01:01,500",
        "Second caption.",
        "",
      ].join("\n"),
    );
  });
});
