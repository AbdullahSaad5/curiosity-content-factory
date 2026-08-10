import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { compileEpisode } from "../src/episode/compile";

const fixture = fileURLToPath(
  new URL("./fixtures/valid-episode.json", import.meta.url),
);

describe("compileEpisode", () => {
  it("accepts a sourced episode and derives its word count", async () => {
    const raw = JSON.parse(await readFile(fixture, "utf8"));

    const episode = compileEpisode(raw);

    expect(episode.id).toBe("E0001");
    expect(episode.script.wordCount).toBe(6);
    expect(episode.claims[0]?.sourceIds).toEqual(["S1"]);
  });

  it("rejects a claim that names a missing source", async () => {
    const raw = JSON.parse(await readFile(fixture, "utf8"));
    raw.claims[0].sourceIds = ["MISSING"];

    expect(() => compileEpisode(raw)).toThrow(
      /Claim C1 references missing source MISSING/,
    );
  });

  it("rejects a narration segment that names a missing scene", async () => {
    const raw = JSON.parse(await readFile(fixture, "utf8"));
    raw.script.segments[0].sceneId = "MISSING";

    expect(() => compileEpisode(raw)).toThrow(
      /Segment SEG1 references missing scene MISSING/,
    );
  });

  it("rejects a narration segment that names a missing claim", async () => {
    const raw = JSON.parse(await readFile(fixture, "utf8"));
    raw.script.segments[0].claimIds = ["MISSING"];

    expect(() => compileEpisode(raw)).toThrow(
      /Segment SEG1 references missing claim MISSING/,
    );
  });

  it("rejects an unknown visual kind before rendering", async () => {
    const raw = JSON.parse(await readFile(fixture, "utf8"));
    raw.scenes[0].visual = { kind: "stress-maap", mode: "rounded" };

    expect(() => compileEpisode(raw)).toThrow();
  });

  it("rejects duplicate domain identifiers", async () => {
    const raw = JSON.parse(await readFile(fixture, "utf8"));
    raw.scenes.push({ ...raw.scenes[0] });

    expect(() => compileEpisode(raw)).toThrow(/Duplicate scene id SC1/);
  });

  it("rejects a short script that differs from its narration segments", async () => {
    const raw = JSON.parse(await readFile(fixture, "utf8"));
    raw.script.short = "This text does not match the narration.";

    expect(() => compileEpisode(raw)).toThrow(
      /script.short must match the joined narration segments/,
    );
  });
});
