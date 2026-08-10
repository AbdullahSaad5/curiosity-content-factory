import { access, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { z } from "zod";

const gateSchema = z.object({
  prototypeId: z.string().min(1),
  approved: z.boolean(),
  approvedBy: z.string().min(1).optional(),
  approvedAt: z.string().datetime().optional(),
}).passthrough();

const metadataSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().min(1),
  tags: z.array(z.string().min(1)).max(30).default([]),
});

export type ApprovedRelease = {
  directory: string;
  videoPath: string;
  gate: z.infer<typeof gateSchema>;
  metadata: z.infer<typeof metadataSchema>;
};

async function readGate(directory: string): Promise<z.infer<typeof gateSchema>> {
  return gateSchema.parse(
    JSON.parse(await readFile(join(directory, "quality-gate.json"), "utf8")) as unknown,
  );
}

export async function approveRelease(
  releaseDirectory: string,
  reviewer: string,
): Promise<void> {
  if (!reviewer.trim()) throw new Error("A named human reviewer is required");
  const directory = resolve(releaseDirectory);
  const videoPath = join(directory, "prototype.mp4");
  await access(videoPath);
  const gate = await readGate(directory);
  await writeFile(
    join(directory, "quality-gate.json"),
    `${JSON.stringify({
      ...gate,
      approved: true,
      approvedBy: reviewer.trim(),
      approvedAt: new Date().toISOString(),
    }, null, 2)}\n`,
    "utf8",
  );
}

export async function requireApprovedRelease(
  releaseDirectory: string,
): Promise<ApprovedRelease> {
  const directory = resolve(releaseDirectory);
  const videoPath = join(directory, "prototype.mp4");
  const gate = await readGate(directory);
  if (!gate.approved || !gate.approvedBy || !gate.approvedAt) {
    throw new Error("Release is blocked: named human approval is required");
  }
  await access(videoPath);
  const metadata = metadataSchema.parse(
    JSON.parse(await readFile(join(directory, "publish-metadata.json"), "utf8")) as unknown,
  );
  return { directory, videoPath, gate, metadata };
}
