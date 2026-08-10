import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import { z } from "zod";

const gateSchema = z.object({
  prototypeId: z.string().min(1),
  technicalPassed: z.boolean(),
  researchPassed: z.boolean(),
  rightsPassed: z.boolean(),
  publishable: z.boolean(),
  approved: z.boolean(),
  approvedBy: z.string().min(1).optional(),
  approvedAt: z.string().datetime().optional(),
  approvedVideoSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
  approvedMetadataSha256: z.string().regex(/^[a-f0-9]{64}$/u).optional(),
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

async function sha256(path: string): Promise<string> {
  return createHash("sha256").update(await readFile(path)).digest("hex");
}

function assertPublishableGate(gate: z.infer<typeof gateSchema>): void {
  if (
    !gate.technicalPassed ||
    !gate.researchPassed ||
    !gate.rightsPassed ||
    !gate.publishable
  ) {
    throw new Error("Release is not publishable: production quality gates must pass");
  }
}

export async function approveRelease(
  releaseDirectory: string,
  reviewer: string,
): Promise<void> {
  if (!reviewer.trim()) throw new Error("A named human reviewer is required");
  const directory = resolve(releaseDirectory);
  const videoPath = join(directory, "prototype.mp4");
  const metadataPath = join(directory, "publish-metadata.json");
  await Promise.all([access(videoPath), access(metadataPath)]);
  const gate = await readGate(directory);
  assertPublishableGate(gate);
  await writeFile(
    join(directory, "quality-gate.json"),
    `${JSON.stringify({
      ...gate,
      approved: true,
      approvedBy: reviewer.trim(),
      approvedAt: new Date().toISOString(),
      approvedVideoSha256: await sha256(videoPath),
      approvedMetadataSha256: await sha256(metadataPath),
    }, null, 2)}\n`,
    "utf8",
  );
}

export async function requireApprovedRelease(
  releaseDirectory: string,
): Promise<ApprovedRelease> {
  const directory = resolve(releaseDirectory);
  const videoPath = join(directory, "prototype.mp4");
  const metadataPath = join(directory, "publish-metadata.json");
  const gate = await readGate(directory);
  assertPublishableGate(gate);
  if (
    !gate.approved ||
    !gate.approvedBy ||
    !gate.approvedAt ||
    !gate.approvedVideoSha256 ||
    !gate.approvedMetadataSha256
  ) {
    throw new Error("Release is blocked: named human approval is required");
  }
  await Promise.all([access(videoPath), access(metadataPath)]);
  if (
    await sha256(videoPath) !== gate.approvedVideoSha256 ||
    await sha256(metadataPath) !== gate.approvedMetadataSha256
  ) {
    throw new Error("Release changed after approval; review and approve it again");
  }
  const metadata = metadataSchema.parse(
    JSON.parse(await readFile(metadataPath, "utf8")) as unknown,
  );
  return { directory, videoPath, gate, metadata };
}
