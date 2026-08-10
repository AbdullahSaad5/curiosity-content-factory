import { approveRelease } from "./release";
import { uploadFacebookDraft } from "./facebook";
import { uploadYouTubeDraft } from "./youtube";

function required(value: string | undefined, name: string): string {
  if (!value?.trim()) throw new Error(`${name} is required`);
  return value;
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const releaseDirectory = process.argv[3];
  if (!command || !releaseDirectory) {
    throw new Error(
      "Usage: npm run release:approve -- <output-dir> <reviewer> | npm run publish:youtube-draft -- <output-dir> --confirm-upload | npm run publish:facebook-draft -- <output-dir> --confirm-upload",
    );
  }

  if (command === "approve") {
    await approveRelease(releaseDirectory, required(process.argv[4], "reviewer name"));
    process.stdout.write("Release approved for private/draft upload.\n");
    return;
  }

  const confirmUpload = process.argv.includes("--confirm-upload");
  if (command === "youtube-draft") {
    const result = await uploadYouTubeDraft({
      releaseDirectory,
      accessToken: required(process.env.YOUTUBE_ACCESS_TOKEN, "YOUTUBE_ACCESS_TOKEN"),
      confirmUpload,
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  if (command === "facebook-draft") {
    const result = await uploadFacebookDraft({
      releaseDirectory,
      pageId: required(process.env.FB_PAGE_ID, "FB_PAGE_ID"),
      pageAccessToken: required(
        process.env.FB_PAGE_ACCESS_TOKEN,
        "FB_PAGE_ACCESS_TOKEN",
      ),
      confirmUpload,
      ...(process.env.FB_GRAPH_VERSION
        ? { graphVersion: process.env.FB_GRAPH_VERSION }
        : {}),
    });
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }
  throw new Error(`Unknown publishing command: ${command}`);
}

await main();
