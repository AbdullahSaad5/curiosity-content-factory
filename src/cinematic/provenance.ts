export type ResearchLedger = {
  claims: Array<{ id: string; sourceIds: string[] }>;
  sources: Array<{ id: string }>;
};

export type VisualEvidence = {
  claimIds: string[];
  rights: {
    origin: string;
    license: string;
    evidence: string;
  };
};

export function validateCinematicEvidence(
  episode: ResearchLedger,
  scenes: VisualEvidence[],
): { claimCount: number; sourceCount: number; visualRightsCount: number } {
  if (episode.sources.length < 2) {
    throw new Error("Cinematic research requires at least two sources");
  }
  const sources = new Set(episode.sources.map((source) => source.id));
  const claims = new Map(episode.claims.map((claim) => [claim.id, claim]));
  for (const claim of episode.claims) {
    if (
      claim.sourceIds.length === 0 ||
      claim.sourceIds.some((sourceId) => !sources.has(sourceId))
    ) {
      throw new Error(`Claim ${claim.id} is not fully covered by the source ledger`);
    }
  }
  for (const scene of scenes) {
    if (scene.claimIds.length === 0) {
      throw new Error("Every cinematic scene requires at least one claim ID");
    }
    for (const claimId of scene.claimIds) {
      if (!claims.has(claimId)) {
        throw new Error(`Cinematic scene references missing claim ${claimId}`);
      }
    }
    if (
      !scene.rights.origin.trim() ||
      !scene.rights.license.trim() ||
      !scene.rights.evidence.trim()
    ) {
      throw new Error("Every cinematic scene requires complete visual rights evidence");
    }
  }
  return {
    claimCount: new Set(scenes.flatMap((scene) => scene.claimIds)).size,
    sourceCount: episode.sources.length,
    visualRightsCount: scenes.length,
  };
}
