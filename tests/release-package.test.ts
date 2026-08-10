import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { compileEpisode } from "../src/episode/compile";
import { packageRelease } from "../src/release/package-release";

const workDirs: string[] = [];

afterEach(async () => {
  await Promise.all(
    workDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

describe("packageRelease", () => {
  it("writes staged YouTube and Facebook metadata with sources and review gates", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "content-package-test-"));
    workDirs.push(outputDir);
    await Promise.all([
      writeFile(join(outputDir, "video.mp4"), "video"),
      writeFile(join(outputDir, "captions.srt"), "captions"),
      writeFile(join(outputDir, "thumbnail.png"), "thumbnail"),
    ]);
    const episode = compileEpisode({
      schemaVersion: 1,
      id: "E0009",
      slug: "packaging-test",
      question: "Why does release packaging need a review gate?",
      status: "qa-passed",
      claims: [{ id: "C1", text: "A claim", sourceIds: ["S1"] }],
      sources: [
        {
          id: "S1",
          title: "Primary source",
          url: "https://example.edu/source",
          publisher: "Example University",
          accessedAt: "2026-08-10",
        },
        {
          id: "S2",
          title: "Second source",
          url: "https://example.gov/source",
          publisher: "Example Agency",
          accessedAt: "2026-08-10",
        },
      ],
      script: {
        short: "An original explanation.",
        segments: [
          {
            id: "SEG1",
            sceneId: "SC1",
            claimIds: ["C1"],
            text: "An original explanation.",
          },
        ],
      },
      scenes: [
        {
          id: "SC1",
          type: "title",
          headline: "Review first",
          body: "Then publish.",
          accent: "neutral",
          visual: { kind: "abstract" },
        },
      ],
      disclosure: {
        realisticSyntheticMedia: false,
        reason: "Stylized diagrams only",
      },
      publishing: {
        title: "Why Releases Need Review",
        summary: "A concise explanation of the final safety check.",
        keywords: ["explained", "workflow", "quality"],
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

    const result = await packageRelease(episode, outputDir, {
      now: () => new Date("2026-08-10T12:00:00.000Z"),
    });
    const youtube = JSON.parse(await readFile(result.youtubePath, "utf8")) as {
      title: string;
      description: string;
      alteredContent: boolean;
      publishState: string;
      requiresHumanReview: boolean;
    };
    const facebook = JSON.parse(await readFile(result.facebookPath, "utf8")) as {
      caption: string;
      publishState: string;
    };

    expect(youtube.title).toBe("Why Releases Need Review");
    expect(youtube.description).toContain("Example University");
    expect(youtube.description).toContain("https://example.edu/source");
    expect(youtube.alteredContent).toBe(false);
    expect(youtube.publishState).toBe("staged");
    expect(youtube.requiresHumanReview).toBe(true);
    expect(facebook.caption).toContain("#explained");
    expect(facebook.publishState).toBe("staged");
    expect(await readFile(join(result.youtubeDirectory, "video.mp4"), "utf8")).toBe(
      "video",
    );
    expect(await readFile(join(result.facebookDirectory, "captions.srt"), "utf8")).toBe(
      "captions",
    );
  });

  it("refuses to package a release with missing upload artifacts", async () => {
    const outputDir = await mkdtemp(join(tmpdir(), "content-package-test-"));
    workDirs.push(outputDir);
    await mkdir(outputDir, { recursive: true });
    const episode = compileEpisode({
      schemaVersion: 1,
      id: "E0010",
      slug: "missing-assets",
      question: "Why should missing assets block packaging?",
      status: "validated",
      claims: [{ id: "C1", text: "A claim", sourceIds: ["S1"] }],
      sources: [
        {
          id: "S1",
          title: "Source",
          url: "https://example.edu/source",
          publisher: "Publisher",
          accessedAt: "2026-08-10",
        },
        {
          id: "S2",
          title: "Second source",
          url: "https://example.gov/source",
          publisher: "Example Agency",
          accessedAt: "2026-08-10",
        },
      ],
      script: {
        short: "Text",
        segments: [
          { id: "SEG1", sceneId: "SC1", claimIds: ["C1"], text: "Text" },
        ],
      },
      scenes: [
        {
          id: "SC1",
          type: "title",
          headline: "Missing",
          body: "Assets",
          accent: "neutral",
          visual: { kind: "abstract" },
        },
      ],
      disclosure: { realisticSyntheticMedia: false, reason: "Test" },
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

    await expect(packageRelease(episode, outputDir)).rejects.toThrow(
      /missing release artifact/iu,
    );
  });
});
