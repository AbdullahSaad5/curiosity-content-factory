import { z } from "zod";

const IdSchema = z.string().min(1).regex(/^[A-Z0-9_-]+$/);

export const SourceSchema = z.object({
  id: IdSchema,
  title: z.string().min(1),
  url: z.url(),
  publisher: z.string().min(1),
  accessedAt: z.iso.date(),
});

export const ClaimSchema = z.object({
  id: IdSchema,
  text: z.string().min(1),
  sourceIds: z.array(IdSchema).min(1),
});

export const VisualSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("abstract") }),
  z.object({
    kind: z.literal("bird-on-wire"),
    mode: z.enum(["safe", "danger"]),
  }),
  z.object({
    kind: z.literal("potential-map"),
    mode: z.enum(["principle", "same", "different"]),
  }),
  z.object({ kind: z.literal("path-comparison"), mode: z.literal("summary") }),
  z.object({ kind: z.literal("shape-comparison") }),
  z.object({
    kind: z.literal("stress-map"),
    mode: z.enum(["sharp", "rounded"]),
  }),
]);

export const SceneSchema = z.object({
  id: IdSchema,
  type: z.enum(["title", "diagram", "comparison", "flow", "reveal", "conclusion"]),
  headline: z.string().min(1),
  body: z.string().default(""),
  accent: z.enum(["electric", "safe", "danger", "neutral"]).default("neutral"),
  visual: VisualSchema.default({ kind: "abstract" }),
});

export const ScriptSegmentSchema = z.object({
  id: IdSchema,
  sceneId: IdSchema,
  claimIds: z.array(IdSchema).min(1),
  text: z.string().min(1),
});

export const RightSchema = z.object({
  category: z.enum(["visuals", "narration", "typography"]),
  asset: z.string().min(1),
  origin: z.string().min(1),
  license: z.string().min(1),
  evidence: z.string().min(1),
});

export const EpisodeInputSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^E\d{4}$/),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  question: z.string().min(8),
  status: z.enum([
    "draft",
    "researched",
    "validated",
    "rendered",
    "qa-passed",
    "released",
  ]),
  claims: z.array(ClaimSchema).min(1),
  sources: z.array(SourceSchema).min(2),
  script: z.object({
    short: z.string().min(1),
    segments: z.array(ScriptSegmentSchema).min(1),
  }),
  scenes: z.array(SceneSchema).min(1),
  disclosure: z.object({
    realisticSyntheticMedia: z.boolean(),
    reason: z.string().min(1),
  }),
  publishing: z
    .object({
      title: z.string().min(1).max(100),
      summary: z.string().min(1).max(500),
      keywords: z.array(z.string().min(1)).min(3).max(15),
    })
    .optional(),
  rights: z.array(RightSchema).min(1),
});

export type EpisodeInput = z.infer<typeof EpisodeInputSchema>;
export type Scene = z.infer<typeof SceneSchema>;
export type ScriptSegment = z.infer<typeof ScriptSegmentSchema>;

export type Episode = Omit<EpisodeInput, "script"> & {
  script: EpisodeInput["script"] & {
    wordCount: number;
  };
};
