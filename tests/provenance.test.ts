import { describe, expect, it } from "vitest";

import { validateCinematicEvidence } from "../src/cinematic/provenance";

const episode = {
  claims: [
    { id: "C1", sourceIds: ["S1"] },
    { id: "C2", sourceIds: ["S1", "S2"] },
  ],
  sources: [{ id: "S1" }, { id: "S2" }],
};

const rights = {
  origin: "Generated specifically for this episode",
  license: "Original channel-owned output",
  evidence: "Repository asset and generation record",
};

describe("validateCinematicEvidence", () => {
  it("requires every cinematic scene to map to sourced claims and visual rights", () => {
    expect(validateCinematicEvidence(episode, [
      { claimIds: ["C1"], rights },
      { claimIds: ["C2"], rights },
    ])).toEqual({ claimCount: 2, sourceCount: 2, visualRightsCount: 2 });
  });

  it("rejects an unmapped claim instead of rendering", () => {
    expect(() => validateCinematicEvidence(episode, [
      { claimIds: ["C3"], rights },
    ])).toThrow(/C3/);
  });
});
