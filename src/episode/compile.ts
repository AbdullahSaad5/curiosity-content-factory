import { EpisodeInputSchema, type Episode } from "./schema";

function wordCount(text: string): number {
  return text.trim().split(/\s+/u).filter(Boolean).length;
}

function normalize(text: string): string {
  return text.trim().replaceAll(/\s+/gu, " ");
}

function assertUniqueIds(
  label: string,
  items: Array<{ id: string }>,
): void {
  const seen = new Set<string>();
  for (const item of items) {
    if (seen.has(item.id)) {
      throw new Error(`Duplicate ${label} id ${item.id}`);
    }
    seen.add(item.id);
  }
}

export function compileEpisode(raw: unknown): Episode {
  const episode = EpisodeInputSchema.parse(raw);
  assertUniqueIds("source", episode.sources);
  assertUniqueIds("claim", episode.claims);
  assertUniqueIds("scene", episode.scenes);
  assertUniqueIds("segment", episode.script.segments);
  const rightsCategories = new Set(episode.rights.map((right) => right.category));
  for (const required of ["visuals", "narration", "typography"] as const) {
    if (!rightsCategories.has(required)) {
      throw new Error(`Rights ledger is missing ${required} coverage`);
    }
  }
  const sourceIds = new Set(episode.sources.map((source) => source.id));
  const claimIds = new Set(episode.claims.map((claim) => claim.id));
  const sceneIds = new Set(episode.scenes.map((scene) => scene.id));

  for (const claim of episode.claims) {
    for (const sourceId of claim.sourceIds) {
      if (!sourceIds.has(sourceId)) {
        throw new Error(
          `Claim ${claim.id} references missing source ${sourceId}`,
        );
      }
    }
  }

  for (const segment of episode.script.segments) {
    if (!sceneIds.has(segment.sceneId)) {
      throw new Error(
        `Segment ${segment.id} references missing scene ${segment.sceneId}`,
      );
    }
    for (const claimId of segment.claimIds) {
      if (!claimIds.has(claimId)) {
        throw new Error(
          `Segment ${segment.id} references missing claim ${claimId}`,
        );
      }
    }
    if (wordCount(segment.text) > 35) {
      throw new Error(
        `Segment ${segment.id} exceeds the 35-word caption limit`,
      );
    }
  }

  const joinedSegments = normalize(
    episode.script.segments.map((segment) => segment.text).join(" "),
  );
  if (normalize(episode.script.short) !== joinedSegments) {
    throw new Error(
      "script.short must match the joined narration segments",
    );
  }

  return {
    ...episode,
    script: {
      ...episode.script,
      wordCount: wordCount(episode.script.short),
    },
  };
}
