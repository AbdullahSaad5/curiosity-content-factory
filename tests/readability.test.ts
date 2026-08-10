import { describe, expect, it } from "vitest";

import { estimatedGradeLevel } from "../src/editorial/readability";

describe("estimatedGradeLevel", () => {
  it("scores plain short sentences below dense technical prose", () => {
    const plain = estimatedGradeLevel(
      "The bird sits on one wire. Both feet are at the same level. Very little current moves through it.",
    );
    const dense = estimatedGradeLevel(
      "Electromagnetic differential potential facilitates disproportionately concentrated conduction through heterogeneous biological structures.",
    );

    expect(plain).toBeLessThan(dense);
    expect(plain).toBeLessThanOrEqual(10.5);
  });
});
