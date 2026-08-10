import { describe, expect, it } from "vitest";

import { renderFrameSvg } from "../src/visuals/render-frame";

describe("renderFrameSvg", () => {
  it("renders escaped episode text and a caption inside a vertical SVG", () => {
    const svg = renderFrameSvg({
      scene: {
        id: "SC1",
        type: "diagram",
        headline: "Birds & electricity",
        body: "Same wire < different wire",
        accent: "electric",
        visual: { kind: "bird-on-wire", mode: "safe" },
      },
      caption: "Electricity needs a path.",
      progress: 0.5,
      episodeProgress: 0.25,
      width: 1080,
      height: 1920,
    });

    expect(svg).toContain('width="1080"');
    expect(svg).toContain('height="1920"');
    expect(svg).toContain("Birds &amp; electricity");
    expect(svg).toContain("Same wire &lt; different wire");
    expect(svg).toContain("Electricity needs a path.");
    expect(svg).toContain('data-visual="bird-on-wire"');
  });

  it("keeps the final words of a long caption", () => {
    const svg = renderFrameSvg({
      scene: {
        id: "SC1",
        type: "title",
        headline: "Why is this bird safe?",
        body: "The connection is what matters.",
        accent: "electric",
        visual: { kind: "bird-on-wire", mode: "safe" },
      },
      caption:
        "Early de Havilland Comet investigations found high stress concentrations around squarish window frames. Modern rounded windows reflect that hard-earned engineering lesson.",
      progress: 0.5,
      episodeProgress: 0.1,
      width: 1080,
      height: 1920,
    });

    expect(svg).toContain("lesson.");
    expect(svg.match(/<tspan x="540"/gu)?.length).toBeLessThanOrEqual(6);
  });

  it("renders the dangerous path differently from the safe path", () => {
    const common = {
      id: "SC1",
      type: "reveal" as const,
      headline: "A second contact changes everything",
      body: "Current now has a path.",
      accent: "danger" as const,
    };

    const safe = renderFrameSvg({
      scene: { ...common, visual: { kind: "bird-on-wire", mode: "safe" } },
      caption: "Safe",
      progress: 0.5,
      episodeProgress: 0.5,
      width: 1080,
      height: 1920,
    });
    const danger = renderFrameSvg({
      scene: { ...common, visual: { kind: "bird-on-wire", mode: "danger" } },
      caption: "Danger",
      progress: 0.5,
      episodeProgress: 0.5,
      width: 1080,
      height: 1920,
    });

    expect(safe).toContain('data-mode="safe"');
    expect(danger).toContain('data-mode="danger"');
    expect(danger).not.toBe(safe);
  });

  it("renders a potential map for same and different electrical levels", () => {
    const common = {
      id: "SC2",
      type: "comparison" as const,
      headline: "Compare the potential",
      body: "The difference determines the path.",
      accent: "electric" as const,
    };
    const same = renderFrameSvg({
      scene: { ...common, visual: { kind: "potential-map", mode: "same" } },
      caption: "Same potential",
      progress: 0.5,
      episodeProgress: 0.5,
      width: 1080,
      height: 1920,
    });
    const different = renderFrameSvg({
      scene: {
        ...common,
        visual: { kind: "potential-map", mode: "different" },
      },
      caption: "Different potential",
      progress: 0.5,
      episodeProgress: 0.5,
      width: 1080,
      height: 1920,
    });

    expect(same).toContain('data-visual="potential-map"');
    expect(same).toContain('data-mode="same"');
    expect(different).toContain('data-mode="different"');
    expect(different).toContain("CURRENT PATH");
  });

  it("renders a two-panel path comparison", () => {
    const svg = renderFrameSvg({
      scene: {
        id: "SC3",
        type: "conclusion",
        headline: "One connection versus two",
        body: "The path is the difference.",
        accent: "electric",
        visual: { kind: "path-comparison", mode: "summary" },
      },
      caption: "One connection versus two",
      progress: 0.5,
      episodeProgress: 0.9,
      width: 1080,
      height: 1920,
    });

    expect(svg).toContain('data-visual="path-comparison"');
    expect(svg).toContain("ONE CONNECTION");
    expect(svg).toContain("TWO CONNECTIONS");
  });

  it("renders reusable shape and stress comparisons", () => {
    const common = {
      id: "SC4",
      type: "comparison" as const,
      headline: "Corners change the load",
      body: "Compare two openings.",
      accent: "electric" as const,
    };
    const shapes = renderFrameSvg({
      scene: { ...common, visual: { kind: "shape-comparison" } },
      caption: "Square versus rounded",
      progress: 0.5,
      episodeProgress: 0.5,
      width: 1080,
      height: 1920,
    });
    const sharpStress = renderFrameSvg({
      scene: { ...common, visual: { kind: "stress-map", mode: "sharp" } },
      caption: "Stress gathers at a corner",
      progress: 0.5,
      episodeProgress: 0.5,
      width: 1080,
      height: 1920,
    });
    const roundedStress = renderFrameSvg({
      scene: { ...common, visual: { kind: "stress-map", mode: "rounded" } },
      caption: "Stress flows around a curve",
      progress: 0.5,
      episodeProgress: 0.5,
      width: 1080,
      height: 1920,
    });

    expect(shapes).toContain('data-visual="shape-comparison"');
    expect(shapes).toContain("SHARP CORNERS");
    expect(shapes).toContain("ROUNDED CORNERS");
    expect(sharpStress).toContain('data-mode="sharp"');
    expect(sharpStress).toContain("STRESS BUILDS");
    expect(roundedStress).toContain('data-mode="rounded"');
    expect(roundedStress).toContain("STRESS FLOWS");
  });
});
