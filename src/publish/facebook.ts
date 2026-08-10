import { readFile, stat } from "node:fs/promises";

import { requireApprovedRelease } from "./release";

type FacebookUploadOptions = {
  releaseDirectory: string;
  pageId: string;
  pageAccessToken: string;
  confirmUpload: boolean;
  graphVersion?: string;
  fetcher?: typeof fetch;
};

async function jsonOrThrow<T>(response: Response, stage: string): Promise<T> {
  const body = await response.text();
  if (!response.ok) throw new Error(`Facebook ${stage} failed (${response.status}): ${body}`);
  return JSON.parse(body) as T;
}

export async function uploadFacebookDraft(
  options: FacebookUploadOptions,
): Promise<{ id: string; state: "DRAFT" }> {
  if (!options.confirmUpload) {
    throw new Error("Explicit --confirm-upload is required before any network request");
  }
  if (!options.pageId.trim() || !options.pageAccessToken.trim()) {
    throw new Error("FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN are required");
  }
  const release = await requireApprovedRelease(options.releaseDirectory);
  const fetcher = options.fetcher ?? fetch;
  const version = options.graphVersion ?? "v25.0";
  const endpoint = `https://graph.facebook.com/${version}/${encodeURIComponent(options.pageId)}/video_reels`;
  const authorization = { Authorization: `OAuth ${options.pageAccessToken}` };

  const started = await jsonOrThrow<{ video_id?: string; upload_url?: string }>(
    await fetcher(`${endpoint}?upload_phase=start`, {
      method: "POST",
      headers: authorization,
    }),
    "upload initialization",
  );
  if (!started.video_id || !started.upload_url) {
    throw new Error("Facebook did not return a video ID and upload URL");
  }

  const size = (await stat(release.videoPath)).size;
  const video = new Uint8Array(await readFile(release.videoPath));
  const binaryResult = await jsonOrThrow<{ success: boolean }>(
    await fetcher(started.upload_url, {
      method: "POST",
      headers: {
        ...authorization,
        offset: "0",
        file_size: String(size),
        "Content-Type": "application/octet-stream",
      },
      body: video,
    }),
    "binary upload",
  );
  if (binaryResult.success !== true) {
    throw new Error("Facebook binary upload reported success=false");
  }

  const finish = new URL(endpoint);
  finish.searchParams.set("upload_phase", "finish");
  finish.searchParams.set("video_id", started.video_id);
  finish.searchParams.set("video_state", "DRAFT");
  finish.searchParams.set("title", release.metadata.title);
  finish.searchParams.set("description", release.metadata.description);
  const finalResult = await jsonOrThrow<{ success: boolean }>(
    await fetcher(finish, { method: "POST", headers: authorization }),
    "draft finalization",
  );
  if (finalResult.success !== true) {
    throw new Error("Facebook draft finalization reported success=false");
  }
  return { id: started.video_id, state: "DRAFT" };
}
