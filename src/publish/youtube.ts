import { readFile, stat } from "node:fs/promises";

import { requireApprovedRelease } from "./release";

type YouTubeUploadOptions = {
  releaseDirectory: string;
  accessToken: string;
  confirmUpload: boolean;
  fetcher?: typeof fetch;
};

async function requireOk(response: Response, stage: string): Promise<void> {
  if (response.ok) return;
  throw new Error(`YouTube ${stage} failed (${response.status}): ${await response.text()}`);
}

export async function uploadYouTubeDraft(
  options: YouTubeUploadOptions,
): Promise<{ id: string; privacyStatus: "private" }> {
  if (!options.confirmUpload) {
    throw new Error("Explicit --confirm-upload is required before any network request");
  }
  if (!options.accessToken.trim()) throw new Error("YOUTUBE_ACCESS_TOKEN is required");
  const release = await requireApprovedRelease(options.releaseDirectory);
  const fetcher = options.fetcher ?? fetch;
  const size = (await stat(release.videoPath)).size;
  const metadata = {
    snippet: {
      title: release.metadata.title,
      description: release.metadata.description,
      tags: release.metadata.tags,
      categoryId: "27",
    },
    status: {
      privacyStatus: "private",
      selfDeclaredMadeForKids: false,
      containsSyntheticMedia: true,
    },
  };

  const initiation = await fetcher(
    "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status&notifySubscribers=false",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${options.accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Length": String(size),
        "X-Upload-Content-Type": "video/mp4",
      },
      body: JSON.stringify(metadata),
    },
  );
  await requireOk(initiation, "upload initialization");
  const uploadUrl = initiation.headers.get("location");
  if (!uploadUrl) throw new Error("YouTube did not return a resumable upload URL");

  const video = new Uint8Array(await readFile(release.videoPath));
  const uploaded = await fetcher(uploadUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      "Content-Type": "video/mp4",
      "Content-Length": String(video.byteLength),
    },
    body: video,
  });
  await requireOk(uploaded, "video upload");
  const result = await uploaded.json() as { id?: string };
  if (!result.id) throw new Error("YouTube upload succeeded without a video ID");
  return { id: result.id, privacyStatus: "private" };
}
