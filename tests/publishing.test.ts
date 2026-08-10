import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it, vi } from "vitest";

import { approveRelease, requireApprovedRelease } from "../src/publish/release";
import { uploadYouTubeDraft } from "../src/publish/youtube";
import { uploadFacebookDraft } from "../src/publish/facebook";

async function stagedRelease(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "publish-release-"));
  await writeFile(join(directory, "prototype.mp4"), "video", "utf8");
  await writeFile(
    join(directory, "quality-gate.json"),
    JSON.stringify({
      prototypeId: "E-test",
      technicalPassed: true,
      researchPassed: true,
      rightsPassed: true,
      publishable: true,
      approved: false,
    }),
    "utf8",
  );
  await writeFile(
    join(directory, "publish-metadata.json"),
    JSON.stringify({
      title: "Why test videos work",
      description: "An original visual explainer.",
      tags: ["science", "curiosity"],
    }),
    "utf8",
  );
  return directory;
}

describe("release approval", () => {
  it("blocks publishing until a named human approves the rendered release", async () => {
    const directory = await stagedRelease();
    await expect(requireApprovedRelease(directory)).rejects.toThrow(/approval/i);

    await approveRelease(directory, "channel-owner");
    const release = await requireApprovedRelease(directory);
    expect(release.gate.approved).toBe(true);
    expect(release.gate.approvedBy).toBe("channel-owner");
    expect(JSON.parse(await readFile(join(directory, "quality-gate.json"), "utf8")))
      .toMatchObject({ approved: true, approvedBy: "channel-owner" });
  });

  it("invalidates approval if the reviewed video changes", async () => {
    const directory = await stagedRelease();
    await approveRelease(directory, "channel-owner");
    await writeFile(join(directory, "prototype.mp4"), "different video", "utf8");

    await expect(requireApprovedRelease(directory)).rejects.toThrow(/changed/i);
  });

  it("invalidates approval if the reviewed metadata changes", async () => {
    const directory = await stagedRelease();
    await approveRelease(directory, "channel-owner");
    await writeFile(
      join(directory, "publish-metadata.json"),
      JSON.stringify({ title: "Changed title", description: "Changed", tags: [] }),
      "utf8",
    );

    await expect(requireApprovedRelease(directory)).rejects.toThrow(/changed/i);
  });

  it("refuses approval when production quality gates have not passed", async () => {
    const directory = await stagedRelease();
    await writeFile(
      join(directory, "quality-gate.json"),
      JSON.stringify({
        prototypeId: "E-test",
        technicalPassed: true,
        researchPassed: true,
        rightsPassed: true,
        publishable: false,
        approved: false,
      }),
      "utf8",
    );

    await expect(approveRelease(directory, "channel-owner")).rejects.toThrow(/publishable/i);
  });
});

describe("manual draft upload adapters", () => {
  it("requires an explicit upload confirmation even after approval", async () => {
    const directory = await stagedRelease();
    await approveRelease(directory, "channel-owner");
    const fetcher = vi.fn<typeof fetch>();

    await expect(
      uploadYouTubeDraft({
        releaseDirectory: directory,
        accessToken: "token",
        confirmUpload: false,
        fetcher,
      }),
    ).rejects.toThrow(/confirm/i);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("uploads YouTube with private privacy status", async () => {
    const directory = await stagedRelease();
    await approveRelease(directory, "channel-owner");
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, {
        status: 200,
        headers: { location: "https://upload.example/youtube" },
      }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ id: "yt-123" }), { status: 200 }));

    const result = await uploadYouTubeDraft({
      releaseDirectory: directory,
      accessToken: "token",
      confirmUpload: true,
      fetcher,
    });

    expect(result).toEqual({ id: "yt-123", privacyStatus: "private" });
    const initiation = fetcher.mock.calls[0]!;
    expect(String(initiation[0])).toContain("upload/youtube/v3/videos");
    expect(JSON.parse(String((initiation[1] as RequestInit).body))).toMatchObject({
      status: { privacyStatus: "private" },
    });
  });

  it("finishes Facebook Reels as a draft", async () => {
    const directory = await stagedRelease();
    await approveRelease(directory, "channel-owner");
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        video_id: "fb-123",
        upload_url: "https://upload.example/facebook",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }));

    const result = await uploadFacebookDraft({
      releaseDirectory: directory,
      pageId: "page-1",
      pageAccessToken: "token",
      confirmUpload: true,
      fetcher,
    });

    expect(result).toEqual({ id: "fb-123", state: "DRAFT" });
    const finishUrl = String(fetcher.mock.calls[2]![0]);
    expect(finishUrl).toContain("video_state=DRAFT");
  });

  it("does not claim a Facebook draft when finalization reports false", async () => {
    const directory = await stagedRelease();
    await approveRelease(directory, "channel-owner");
    const fetcher = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        video_id: "fb-123",
        upload_url: "https://upload.example/facebook",
      }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ success: false }), { status: 200 }));

    await expect(uploadFacebookDraft({
      releaseDirectory: directory,
      pageId: "page-1",
      pageAccessToken: "token",
      confirmUpload: true,
      fetcher,
    })).rejects.toThrow(/finalization/i);
  });
});
