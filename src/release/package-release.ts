import { copyFile, mkdir, stat, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import type { Episode } from "../episode/schema";

export type ReleasePackage = {
  youtubePath: string;
  facebookPath: string;
  publishingChecklistPath: string;
  youtubeDirectory: string;
  facebookDirectory: string;
};

async function requireArtifact(path: string): Promise<void> {
  try {
    if ((await stat(path)).size > 0) return;
  } catch {
    // The common error below includes the exact missing path.
  }
  throw new Error(`Missing release artifact: ${path}`);
}

function hashtag(value: string): string {
  return `#${value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "")}`;
}

function sourceList(episode: Episode): string {
  return episode.sources
    .map((source) => `- ${source.publisher}: ${source.title}\n  ${source.url}`)
    .join("\n");
}

function publishingData(episode: Episode): {
  title: string;
  summary: string;
  keywords: string[];
} {
  return (
    episode.publishing ?? {
      title: episode.question,
      summary: "An original, source-backed visual explanation.",
      keywords: ["explained", "curiosity", "education"],
    }
  );
}

export async function packageRelease(
  episode: Episode,
  outputDirectory: string,
  options: { now?: () => Date } = {},
): Promise<ReleasePackage> {
  const outputDir = resolve(outputDirectory);
  const videoPath = join(outputDir, "video.mp4");
  const captionsPath = join(outputDir, "captions.srt");
  const thumbnailPath = join(outputDir, "thumbnail.png");
  await Promise.all(
    [videoPath, captionsPath, thumbnailPath].map(requireArtifact),
  );

  const publishing = publishingData(episode);
  const createdAt = (options.now ?? (() => new Date()))().toISOString();
  const productionNote =
    "Production note: original stylized diagrams and locally synthesized narration were used. No third-party footage or music is included.";
  const description = `${publishing.summary}\n\n${productionNote}\n\nSources:\n${sourceList(episode)}\n\n#Explained #Curiosity #Education`;
  const tags = publishing.keywords.map((keyword) => keyword.trim());
  const hashtags = tags.map(hashtag).filter((tag) => tag.length > 1).slice(0, 6);

  const common = {
    episodeId: episode.id,
    createdAt,
    publishState: "staged",
    requiresHumanReview: true,
    videoFile: "video.mp4",
    captionsFile: "captions.srt",
    thumbnailFile: "thumbnail.png",
  } as const;
  const youtube = {
    ...common,
    platform: "youtube",
    title: publishing.title,
    description,
    tags,
    categoryId: "27",
    language: "en",
    madeForKids: false,
    alteredContent: episode.disclosure.realisticSyntheticMedia,
    visibility: "private",
  };
  const facebook = {
    ...common,
    platform: "facebook",
    title: publishing.title,
    caption: `${publishing.summary}\n\n${hashtags.join(" ")}`,
    language: "en",
    visibility: "draft",
  };
  const checklist = `# Publishing review — ${episode.id}\n\nGenerated: ${createdAt}\n\n- [ ] Watch the entire exported video with sound.\n- [ ] Confirm captions are complete and synchronized.\n- [ ] Confirm title and thumbnail match the actual explanation.\n- [ ] Confirm all factual claims remain supported by the source ledger.\n- [ ] Confirm the rights ledger covers every visual, audio, and font asset.\n- [ ] Confirm the platform's current AI/synthetic-media answer.\n- [ ] Upload as private/draft first and wait for platform checks.\n- [ ] Schedule only after all checks pass.\n\nThe package intentionally cannot publish by itself. Account authorization and a final human review are required.\n`;

  const youtubeDirectory = join(outputDir, "youtube-short");
  const facebookDirectory = join(outputDir, "facebook-reel");
  await Promise.all([
    mkdir(youtubeDirectory, { recursive: true }),
    mkdir(facebookDirectory, { recursive: true }),
  ]);
  const youtubePath = join(youtubeDirectory, "metadata.json");
  const facebookPath = join(facebookDirectory, "metadata.json");
  const publishingChecklistPath = join(outputDir, "publishing-checklist.md");
  await Promise.all([
    writeFile(youtubePath, `${JSON.stringify(youtube, null, 2)}\n`, "utf8"),
    writeFile(facebookPath, `${JSON.stringify(facebook, null, 2)}\n`, "utf8"),
    writeFile(publishingChecklistPath, checklist, "utf8"),
    copyFile(videoPath, join(youtubeDirectory, "video.mp4")),
    copyFile(captionsPath, join(youtubeDirectory, "captions.srt")),
    copyFile(thumbnailPath, join(youtubeDirectory, "thumbnail.png")),
    copyFile(videoPath, join(facebookDirectory, "video.mp4")),
    copyFile(captionsPath, join(facebookDirectory, "captions.srt")),
    copyFile(thumbnailPath, join(facebookDirectory, "thumbnail.png")),
  ]);

  return {
    youtubePath,
    facebookPath,
    publishingChecklistPath,
    youtubeDirectory,
    facebookDirectory,
  };
}
