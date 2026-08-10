import type { Scene } from "../episode/schema";

type FrameInput = {
  scene: Scene;
  caption: string;
  progress: number;
  episodeProgress: number;
  width: number;
  height: number;
};

function clamp(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function wrap(value: string, maxCharacters: number): string[] {
  const words = value.trim().split(/\s+/u);
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (candidate.length > maxCharacters && line) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function textBlock(
  lines: string[],
  options: {
    x: number;
    y: number;
    fontSize: number;
    lineHeight: number;
    weight?: number;
    fill?: string;
    anchor?: "start" | "middle";
  },
): string {
  const anchor = options.anchor ?? "start";
  return `<text x="${options.x}" y="${options.y}" text-anchor="${anchor}" font-family="Arial, Helvetica, sans-serif" font-size="${options.fontSize}" font-weight="${options.weight ?? 500}" fill="${options.fill ?? "#F8FAFC"}">${lines
    .map(
      (line, index) =>
        `<tspan x="${options.x}" dy="${index === 0 ? 0 : options.lineHeight}">${escapeXml(line)}</tspan>`,
    )
    .join("")}</text>`;
}

function birdVisual(
  width: number,
  progress: number,
  mode: "safe" | "danger",
): string {
  const center = width / 2;
  const pulse = 0.55 + Math.sin(progress * Math.PI * 4) * 0.18;
  const dotX = 90 + progress * (width - 180);
  const danger = mode === "danger";
  const wireY = 1020;

  return `<g data-visual="bird-on-wire" data-mode="${mode}">
    <path d="M60 ${wireY} H${width - 60}" stroke="#71D8FF" stroke-width="18" stroke-linecap="round" opacity="0.88"/>
    <circle cx="${dotX}" cy="${wireY}" r="${18 + pulse * 8}" fill="#E6FBFF" opacity="${pulse}"/>
    <circle cx="${center}" cy="860" r="112" fill="#F8FAFC"/>
    <circle cx="${center + 84}" cy="812" r="54" fill="#F8FAFC"/>
    <path d="M${center + 132} 805 L${center + 196} 832 L${center + 132} 850 Z" fill="#FFC857"/>
    <circle cx="${center + 100}" cy="798" r="9" fill="#0B1020"/>
    <path d="M${center - 78} 840 Q${center - 168} 786 ${center - 210} 844 Q${center - 136} 900 ${center - 62} 904 Z" fill="#B6C7E2"/>
    <path d="M${center - 38} 958 v62 M${center + 38} 958 v62" stroke="#FFC857" stroke-width="16" stroke-linecap="round"/>
    <circle cx="${center - 38}" cy="${wireY}" r="12" fill="#FFC857"/>
    <circle cx="${center + 38}" cy="${wireY}" r="12" fill="#FFC857"/>
    ${danger ? `<path d="M${center + 88} 842 C${center + 230} 900 ${width - 150} 1010 ${width - 118} 1270" fill="none" stroke="#FF5B79" stroke-width="20" stroke-linecap="round" stroke-dasharray="34 28" stroke-dashoffset="${-progress * 180}"/>
    <path d="M${width - 118} 690 V1390" stroke="#8D9AB5" stroke-width="34" stroke-linecap="round"/>
    <path d="M${width - 200} 1390 H${width - 36}" stroke="#FF5B79" stroke-width="14"/>
    <circle cx="${center}" cy="860" r="${150 + pulse * 24}" fill="none" stroke="#FF5B79" stroke-width="10" opacity="${pulse}"/>` : `<path d="M${center - 48} 1100 Q${center} ${1160 + pulse * 20} ${center + 48} 1100" fill="none" stroke="#7AF2B8" stroke-width="14" stroke-linecap="round"/>
    <text x="${center}" y="1218" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="700" fill="#7AF2B8">SAME ELECTRICAL POTENTIAL</text>`}
  </g>`;
}

function abstractVisual(
  width: number,
  progress: number,
  accent: string,
): string {
  const center = width / 2;
  const rotation = progress * 18 - 9;
  return `<g data-visual="abstract" transform="rotate(${rotation} ${center} 1020)">
    <circle cx="${center}" cy="1020" r="280" fill="none" stroke="${accent}" stroke-width="16" opacity="0.3"/>
    <circle cx="${center}" cy="1020" r="${150 + progress * 42}" fill="${accent}" opacity="0.18"/>
    <path d="M${center - 230} 1020 H${center + 230}" stroke="${accent}" stroke-width="24" stroke-linecap="round"/>
    <path d="M${center + 140} 930 L${center + 250} 1020 L${center + 140} 1110" fill="none" stroke="${accent}" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;
}

function potentialMapVisual(
  width: number,
  progress: number,
  mode: "same" | "different" | "principle",
): string {
  const center = width / 2;
  const left = center - 270;
  const right = center + 270;
  const same = mode === "same";
  const principle = mode === "principle";
  const rightColor = same ? "#7AF2B8" : "#FF5B79";
  const leftLabel = principle ? "POTENTIAL A" : same ? "SAME LEVEL" : "HIGHER";
  const rightLabel = principle ? "POTENTIAL B" : same ? "SAME LEVEL" : "LOWER";
  const dash = -progress * 120;

  return `<g data-visual="potential-map" data-mode="${mode}">
    <rect x="${left - 185}" y="720" width="370" height="420" rx="52" fill="#FFFFFF" fill-opacity="0.06" stroke="#71D8FF" stroke-opacity="0.5" stroke-width="8"/>
    <rect x="${right - 185}" y="720" width="370" height="420" rx="52" fill="#FFFFFF" fill-opacity="0.06" stroke="${rightColor}" stroke-opacity="0.5" stroke-width="8"/>
    <circle cx="${left}" cy="905" r="92" fill="#71D8FF" fill-opacity="0.22" stroke="#71D8FF" stroke-width="12"/>
    <circle cx="${right}" cy="905" r="92" fill="${rightColor}" fill-opacity="0.22" stroke="${rightColor}" stroke-width="12"/>
    <text x="${left}" y="934" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="800" fill="#F8FAFC">${same ? "=" : "A"}</text>
    <text x="${right}" y="934" text-anchor="middle" font-family="Arial, sans-serif" font-size="72" font-weight="800" fill="#F8FAFC">${same ? "=" : "B"}</text>
    <text x="${left}" y="1070" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="2" fill="#BFD6EF">${leftLabel}</text>
    <text x="${right}" y="1070" text-anchor="middle" font-family="Arial, sans-serif" font-size="30" font-weight="800" letter-spacing="2" fill="#BFD6EF">${rightLabel}</text>
    <path d="M${left + 105} 905 H${right - 105}" stroke="${same ? "#7AF2B8" : "#FF5B79"}" stroke-width="20" stroke-linecap="round" ${same ? "opacity=\"0.25\"" : `stroke-dasharray="30 24" stroke-dashoffset="${dash}"`}/>
    ${same ? `<path d="M${center - 42} 870 L${center + 42} 940 M${center + 42} 870 L${center - 42} 940" stroke="#7AF2B8" stroke-width="18" stroke-linecap="round"/>` : `<path d="M${center + 35} 852 L${center + 105} 905 L${center + 35} 958" fill="none" stroke="#FF5B79" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/><text x="${center}" y="1228" text-anchor="middle" font-family="Arial, sans-serif" font-size="34" font-weight="800" letter-spacing="3" fill="#FF8198">CURRENT PATH</text>`}
  </g>`;
}

function pathComparisonVisual(width: number, progress: number): string {
  const center = width / 2;
  const pulse = 0.65 + Math.sin(progress * Math.PI * 4) * 0.2;
  return `<g data-visual="path-comparison">
    <rect x="74" y="690" width="438" height="560" rx="54" fill="#7AF2B8" fill-opacity="0.09" stroke="#7AF2B8" stroke-width="8"/>
    <rect x="568" y="690" width="438" height="560" rx="54" fill="#FF5B79" fill-opacity="0.09" stroke="#FF5B79" stroke-width="8"/>
    <text x="293" y="775" text-anchor="middle" font-family="Arial, sans-serif" font-size="29" font-weight="800" letter-spacing="2" fill="#7AF2B8">ONE CONNECTION</text>
    <text x="787" y="775" text-anchor="middle" font-family="Arial, sans-serif" font-size="29" font-weight="800" letter-spacing="2" fill="#FF8198">TWO CONNECTIONS</text>
    <circle cx="293" cy="965" r="118" fill="#7AF2B8" fill-opacity="0.14" stroke="#7AF2B8" stroke-width="12"/>
    <path d="M205 965 H381" stroke="#7AF2B8" stroke-width="22" stroke-linecap="round"/>
    <path d="M293 865 V1065" stroke="#7AF2B8" stroke-width="22" stroke-linecap="round" opacity="0.22"/>
    <text x="293" y="1168" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#E7FFF4">NO PATH</text>
    <circle cx="700" cy="965" r="54" fill="#71D8FF"/>
    <circle cx="874" cy="965" r="54" fill="#FF5B79"/>
    <path d="M754 965 H820" stroke="#FF5B79" stroke-width="22" stroke-dasharray="24 18" stroke-dashoffset="${-progress * 80}"/>
    <path d="M785 900 L850 965 L785 1030" fill="none" stroke="#FF5B79" stroke-width="18" stroke-linecap="round" stroke-linejoin="round" opacity="${pulse}"/>
    <text x="787" y="1168" text-anchor="middle" font-family="Arial, sans-serif" font-size="38" font-weight="800" fill="#FFE8ED">CURRENT FLOWS</text>
    <path d="M${center} 660 V1280" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="4"/>
  </g>`;
}

function shapeComparisonVisual(width: number, progress: number): string {
  const center = width / 2;
  const pulse = 0.55 + Math.sin(progress * Math.PI * 4) * 0.2;
  return `<g data-visual="shape-comparison">
    <text x="285" y="742" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="2" fill="#FF8198">SHARP CORNERS</text>
    <text x="795" y="742" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="800" letter-spacing="2" fill="#7AF2B8">ROUNDED CORNERS</text>
    <rect x="112" y="790" width="346" height="346" rx="8" fill="#FF5B79" fill-opacity="0.1" stroke="#FF5B79" stroke-width="14"/>
    <rect x="622" y="790" width="346" height="346" rx="150" fill="#7AF2B8" fill-opacity="0.1" stroke="#7AF2B8" stroke-width="14"/>
    <path d="M112 848 L112 790 L170 790 M400 790 H458 V848 M458 1078 V1136 H400 M170 1136 H112 V1078" fill="none" stroke="#FFE8ED" stroke-width="18" opacity="${pulse}"/>
    <path d="M665 885 Q622 963 665 1041 M925 885 Q968 963 925 1041" fill="none" stroke="#E7FFF4" stroke-width="18" opacity="${pulse}"/>
    <circle cx="112" cy="790" r="${28 + pulse * 16}" fill="#FF5B79" opacity="${pulse}"/>
    <circle cx="458" cy="790" r="${28 + pulse * 16}" fill="#FF5B79" opacity="${pulse}"/>
    <text x="285" y="1225" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="#FFB3C0">STRESS CONCENTRATES</text>
    <text x="795" y="1225" text-anchor="middle" font-family="Arial, sans-serif" font-size="36" font-weight="800" fill="#B8FAD9">LOAD SPREADS OUT</text>
    <path d="M${center} 690 V1280" stroke="#FFFFFF" stroke-opacity="0.12" stroke-width="4"/>
  </g>`;
}

function stressMapVisual(
  width: number,
  progress: number,
  mode: "sharp" | "rounded",
): string {
  const center = width / 2;
  const sharp = mode === "sharp";
  const color = sharp ? "#FF5B79" : "#7AF2B8";
  const pulse = 0.55 + Math.sin(progress * Math.PI * 4) * 0.22;
  const cornerRadius = sharp ? 10 : 170;
  const dash = -progress * 140;
  return `<g data-visual="stress-map" data-mode="${mode}">
    <rect x="210" y="710" width="${width - 420}" height="520" rx="64" fill="#FFFFFF" fill-opacity="0.05" stroke="#A8B3CF" stroke-opacity="0.35" stroke-width="8"/>
    <rect x="370" y="805" width="${width - 740}" height="330" rx="${cornerRadius}" fill="#08111F" stroke="${color}" stroke-width="18"/>
    <path d="M240 820 C330 750 390 730 ${center} 760 C690 730 750 750 840 820" fill="none" stroke="${color}" stroke-width="14" stroke-dasharray="28 20" stroke-dashoffset="${dash}" opacity="0.85"/>
    <path d="M240 1120 C330 1190 390 1210 ${center} 1180 C690 1210 750 1190 840 1120" fill="none" stroke="${color}" stroke-width="14" stroke-dasharray="28 20" stroke-dashoffset="${dash}" opacity="0.85"/>
    ${sharp ? `<circle cx="370" cy="805" r="${34 + pulse * 28}" fill="#FF5B79" opacity="${pulse}"/><circle cx="710" cy="805" r="${34 + pulse * 28}" fill="#FF5B79" opacity="${pulse}"/><circle cx="370" cy="1135" r="${34 + pulse * 28}" fill="#FF5B79" opacity="${pulse}"/><circle cx="710" cy="1135" r="${34 + pulse * 28}" fill="#FF5B79" opacity="${pulse}"/>` : `<path d="M370 970 Q370 805 540 805 Q710 805 710 970 Q710 1135 540 1135 Q370 1135 370 970" fill="none" stroke="#E7FFF4" stroke-width="8" opacity="${pulse}"/>`}
    <text x="${center}" y="1320" text-anchor="middle" font-family="Arial, sans-serif" font-size="42" font-weight="800" letter-spacing="3" fill="${color}">${sharp ? "STRESS BUILDS" : "STRESS FLOWS"}</text>
  </g>`;
}

export function renderFrameSvg(input: FrameInput): string {
  const progress = clamp(input.progress);
  const episodeProgress = clamp(input.episodeProgress);
  const accentByName: Record<Scene["accent"], string> = {
    electric: "#71D8FF",
    safe: "#7AF2B8",
    danger: "#FF5B79",
    neutral: "#A8B3CF",
  };
  const accent = accentByName[input.scene.accent];
  const headline = wrap(input.scene.headline, 24);
  const body = wrap(input.scene.body, 42);
  const caption = wrap(input.caption, 34);
  if (caption.length > 6) {
    throw new Error(
      `Caption exceeds the six-line safe area: ${input.caption}`,
    );
  }
  const visualSpec = input.scene.visual;
  let visual: string;
  if (visualSpec.kind === "bird-on-wire") {
    visual = birdVisual(
      input.width,
      progress,
      visualSpec.mode,
    );
  } else if (visualSpec.kind === "potential-map") {
    visual = potentialMapVisual(
      input.width,
      progress,
      visualSpec.mode,
    );
  } else if (visualSpec.kind === "path-comparison") {
    visual = pathComparisonVisual(input.width, progress);
  } else if (visualSpec.kind === "shape-comparison") {
    visual = shapeComparisonVisual(input.width, progress);
  } else if (visualSpec.kind === "stress-map") {
    visual = stressMapVisual(
      input.width,
      progress,
      visualSpec.mode,
    );
  } else {
    visual = abstractVisual(input.width, progress, accent);
  }

  const captionFontSize =
    caption.length >= 6
      ? 38
      : caption.length === 5
        ? 42
        : caption.length === 4
          ? 46
          : 52;
  const captionLineHeight =
    caption.length >= 6
      ? 48
      : caption.length === 5
        ? 52
        : caption.length === 4
          ? 58
          : 66;
  const captionHeight = 96 + caption.length * captionLineHeight;
  const captionY = input.height - 260 - captionHeight;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${input.width}" height="${input.height}" viewBox="0 0 ${input.width} ${input.height}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#08111F"/>
        <stop offset="0.55" stop-color="#101A31"/>
        <stop offset="1" stop-color="#07101D"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="48%" r="58%">
        <stop offset="0" stop-color="${accent}" stop-opacity="0.17"/>
        <stop offset="1" stop-color="${accent}" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="18" stdDeviation="24" flood-color="#000" flood-opacity="0.38"/>
      </filter>
    </defs>
    <rect width="100%" height="100%" fill="url(#bg)"/>
    <rect width="100%" height="100%" fill="url(#glow)"/>
    <g opacity="0.16">
      <circle cx="96" cy="390" r="3" fill="#fff"/>
      <circle cx="922" cy="490" r="4" fill="#fff"/>
      <circle cx="164" cy="1320" r="5" fill="#fff"/>
      <circle cx="890" cy="1430" r="3" fill="#fff"/>
    </g>
    <rect x="74" y="74" width="250" height="58" rx="29" fill="#FFFFFF" fill-opacity="0.08" stroke="#FFFFFF" stroke-opacity="0.12"/>
    <text x="199" y="113" text-anchor="middle" font-family="Arial, sans-serif" font-size="25" font-weight="700" letter-spacing="4" fill="#DDE7F8">EXPLAINED</text>
    <rect x="74" y="160" width="${input.width - 148}" height="9" rx="4.5" fill="#FFFFFF" fill-opacity="0.1"/>
    <rect x="74" y="160" width="${(input.width - 148) * episodeProgress}" height="9" rx="4.5" fill="${accent}"/>
    ${textBlock(headline, { x: 74, y: 290, fontSize: 76, lineHeight: 82, weight: 800 })}
    ${textBlock(body, { x: 76, y: 290 + headline.length * 82 + 34, fontSize: 33, lineHeight: 44, fill: "#AEBBD2" })}
    ${visual}
    <g filter="url(#shadow)">
      <rect x="64" y="${captionY}" width="${input.width - 128}" height="${captionHeight}" rx="42" fill="#F8FAFC"/>
      <rect x="64" y="${captionY}" width="12" height="${captionHeight}" rx="6" fill="${accent}"/>
      ${textBlock(caption, { x: input.width / 2, y: captionY + 82, fontSize: captionFontSize, lineHeight: captionLineHeight, weight: 800, fill: "#0B1020", anchor: "middle" })}
    </g>
  </svg>`;
}
