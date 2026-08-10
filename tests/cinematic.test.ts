import { describe, expect, it } from "vitest";

import { captionCues } from "../src/cinematic/render-prototype";

describe("captionCues", () => {
  it("limits cinematic caption groups to three words", () => {
    const cues = captionCues(
      "Curves give that load a smoother path",
      2,
      5.5,
      3,
    );

    expect(cues.map((cue) => cue.text)).toEqual([
      "CURVES GIVE THAT",
      "LOAD A SMOOTHER",
      "PATH",
    ]);
    expect(cues[0]?.startSeconds).toBe(2);
    expect(cues.at(-1)?.endSeconds).toBe(5.5);
  });

  it("keeps a long hook out of a four-word caption block", () => {
    const cues = captionCues(
      "Airplane windows were not always rounded.",
      0,
      3,
      3,
    );

    expect(cues.map((cue) => cue.text)).toEqual([
      "AIRPLANE WINDOWS WERE",
      "NOT ALWAYS ROUNDED.",
    ]);
    expect(Math.max(...cues.map((cue) => cue.text.split(/\s+/u).length))).toBe(3);
  });
});
