import { describe, expect, it } from "vitest";

import {
  alignScenesToWords,
  captionCuesFromWords,
} from "../src/cinematic/timing";

describe("alignScenesToWords", () => {
  it("starts each visual scene on the first spoken word of its narration", () => {
    const aligned = alignScenesToWords(
      [
        { narration: "Airplane windows were not always rounded." },
        { narration: "Square corners forced pressure to turn sharply." },
      ],
      [
        { word: "Airplane", startSeconds: 0.12, endSeconds: 0.5 },
        { word: "windows", startSeconds: 0.51, endSeconds: 0.86 },
        { word: "were", startSeconds: 0.88, endSeconds: 1.04 },
        { word: "not", startSeconds: 1.06, endSeconds: 1.2 },
        { word: "always", startSeconds: 1.22, endSeconds: 1.55 },
        { word: "rounded", startSeconds: 1.58, endSeconds: 2.08 },
        { word: "Square", startSeconds: 2.35, endSeconds: 2.7 },
        { word: "corners", startSeconds: 2.72, endSeconds: 3.1 },
        { word: "forced", startSeconds: 3.12, endSeconds: 3.4 },
        { word: "pressure", startSeconds: 3.42, endSeconds: 3.86 },
        { word: "to", startSeconds: 3.88, endSeconds: 3.98 },
        { word: "turn", startSeconds: 4, endSeconds: 4.24 },
        { word: "sharply", startSeconds: 4.26, endSeconds: 4.72 },
      ],
      5,
    );

    expect(aligned).toEqual([
      { startSeconds: 0, endSeconds: 2.35 },
      { startSeconds: 2.35, endSeconds: 5 },
    ]);
  });
});

describe("captionCuesFromWords", () => {
  it("uses measured word boundaries and breaks early across a spoken pause", () => {
    const cues = captionCuesFromWords(
      [
        { word: "Sharp", startSeconds: 1, endSeconds: 1.24 },
        { word: "corners", startSeconds: 1.26, endSeconds: 1.6 },
        { word: "concentrate", startSeconds: 2.35, endSeconds: 2.82 },
        { word: "stress", startSeconds: 2.84, endSeconds: 3.12 },
        { word: "right", startSeconds: 3.14, endSeconds: 3.34 },
        { word: "there", startSeconds: 3.36, endSeconds: 3.65 },
      ],
      3,
    );

    expect(cues).toEqual([
      { text: "SHARP CORNERS", startSeconds: 1, endSeconds: 1.6 },
      {
        text: "CONCENTRATE STRESS RIGHT",
        startSeconds: 2.35,
        endSeconds: 3.34,
      },
      { text: "THERE", startSeconds: 3.36, endSeconds: 3.65 },
    ]);
  });
});
