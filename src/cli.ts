import { readFile, writeFile, mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

import { compileEpisode } from "./episode/compile";
import type { Episode } from "./episode/schema";
import type { NarrationResult } from "./narration/generate";
import { verifyRelease, type QaReport } from "./qa/verify-release";
import { packageRelease } from "./release/package-release";
import type { RenderResult } from "./render/render-episode";

type Command = "new" | "validate" | "render" | "qa" | "release";

type RenderReceipt = {
  episodeId: string;
  createdAt: string;
  narration: NarrationResult;
  render: RenderResult;
};

function usage(): never {
  throw new Error(
    "Usage: npm run episode:new -- <question> OR npm run episode:<validate|render|qa|release> -- <E####|episode.json> [--format vertical] [--output directory]",
  );
}

async function resolveManifest(argument: string): Promise<string> {
  if (!/^E\d{4}$/u.test(argument)) return resolve(argument);

  const episodeRoot = resolve("episodes");
  const matches = (await readdir(episodeRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(`${argument}-`))
    .map((entry) => join(episodeRoot, entry.name, "episode.json"));
  if (matches.length !== 1) {
    throw new Error(
      `Expected exactly one episode directory for ${argument}; found ${matches.length}`,
    );
  }
  return matches[0]!;
}

function parseOutput(arguments_: string[]): string | undefined {
  let output: string | undefined;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index]!;
    if (argument === "--format") {
      const format = arguments_[++index];
      if (format !== "vertical") {
        throw new Error(`Only --format vertical is currently supported`);
      }
    } else if (argument === "--output") {
      output = arguments_[++index];
      if (!output) throw new Error("--output requires a directory");
    } else if (!argument.startsWith("--") && !output) {
      output = argument;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  return output;
}

function slugFromQuestion(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[’']/gu, "")
    .replaceAll(/[^a-z0-9]+/gu, "-")
    .replaceAll(/^-+|-+$/gu, "");
}

async function createEpisodeDraft(questionOrSlug: string): Promise<void> {
  const slug = slugFromQuestion(questionOrSlug);
  if (!slug) throw new Error("Episode question must contain letters or numbers");
  const question = questionOrSlug.includes(" ") ? questionOrSlug.trim() : "TODO";
  const episodeRoot = resolve("episodes");
  const entries = await readdir(episodeRoot, { withFileTypes: true });
  const ids = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => /^E(\d{4})-/u.exec(entry.name)?.[1])
    .filter((id): id is string => Boolean(id))
    .map(Number);
  const id = `E${String(Math.max(0, ...ids) + 1).padStart(4, "0")}`;
  const directory = join(episodeRoot, `${id}-${slug}`);
  await mkdir(directory, { recursive: false });
  await writeJson(join(directory, "episode.json"), {
    schemaVersion: 1,
    id,
    slug,
    question,
    status: "draft",
    todo: "Replace this draft with a fully sourced manifest before validation.",
  });
  await writeFile(
    join(directory, "research.md"),
    `# ${id} research ledger\n\nQuestion: ${question}\n\n## Sources\n\n- TODO\n`,
    "utf8",
  );
  process.stdout.write(`${id} draft created: ${directory}\n`);
}

async function readEpisode(path: string): Promise<Episode> {
  const raw = JSON.parse(await readFile(path, "utf8")) as unknown;
  return compileEpisode(raw);
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function artifactDirectory(episodeId: string, explicit?: string): string {
  return resolve(explicit ?? join("output", episodeId));
}

async function createRender(
  episode: Episode,
  outputDir: string,
): Promise<RenderReceipt> {
  throw new Error(
    `${episode.id} legacy render is disabled after its visual and narration quality review. ` +
      `Use the cinematic prototype workflow instead; no files were written to ${outputDir}.`,
  );
}

async function readReceipt(outputDir: string): Promise<RenderReceipt> {
  return JSON.parse(await readFile(join(outputDir, "render.json"), "utf8")) as RenderReceipt;
}

async function createQa(
  episode: Episode,
  receipt: RenderReceipt,
  outputDir: string,
): Promise<QaReport> {
  if (receipt.episodeId !== episode.id) {
    throw new Error(
      `Render receipt belongs to ${receipt.episodeId}, not ${episode.id}`,
    );
  }
  const report = await verifyRelease(episode, receipt.render, {
    previousChecksums: await previousChecksums(episode.id),
  });
  await writeJson(join(outputDir, "qa-report.json"), report);
  return report;
}

async function previousChecksums(currentEpisodeId: string): Promise<string[]> {
  const outputRoot = resolve("output");
  let entries;
  try {
    entries = await readdir(outputRoot, { withFileTypes: true });
  } catch {
    return [];
  }
  const checksums: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === currentEpisodeId) {
      continue;
    }
    try {
      const report = JSON.parse(
        await readFile(join(outputRoot, entry.name, "qa-report.json"), "utf8"),
      ) as { checksum?: string; passed?: boolean };
      if (report.passed && report.checksum) checksums.push(report.checksum);
    } catch {
      // An episode without a release report is not part of the comparison set.
    }
  }
  return checksums;
}

function normalizedTopic(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/gu, "");
}

async function assertNoDuplicateTopic(
  episode: Episode,
  manifestPath: string,
): Promise<void> {
  const episodeRoot = resolve("episodes");
  const entries = await readdir(episodeRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const candidatePath = join(episodeRoot, entry.name, "episode.json");
    if (resolve(candidatePath) === resolve(manifestPath)) continue;
    try {
      const candidate = JSON.parse(await readFile(candidatePath, "utf8")) as {
        id?: string;
        slug?: string;
        question?: string;
      };
      if (
        candidate.slug === episode.slug ||
        (candidate.question &&
          normalizedTopic(candidate.question) === normalizedTopic(episode.question))
      ) {
        throw new Error(
          `${episode.id} duplicates topic ${candidate.id ?? entry.name}`,
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("duplicates topic")) {
        throw error;
      }
      // Deliberately incomplete episode:new drafts are ignored until researched.
    }
  }
}

async function main(): Promise<void> {
  const command = process.argv[2] as Command | undefined;
  const manifestArgument = process.argv[3];
  if (!command || !["new", "validate", "render", "qa", "release"].includes(command)) {
    usage();
  }
  if (!manifestArgument) usage();

  if (command === "new") {
    await createEpisodeDraft(manifestArgument);
    return;
  }

  const manifestPath = await resolveManifest(manifestArgument);
  const explicitOutput = parseOutput(process.argv.slice(4));
  const episode = await readEpisode(manifestPath);
  await assertNoDuplicateTopic(episode, manifestPath);
  const outputDir = artifactDirectory(episode.id, explicitOutput);

  if (command === "validate") {
    process.stdout.write(
      `${episode.id} validated: ${episode.script.wordCount} words, ${episode.claims.length} claims, ${episode.sources.length} sources\n`,
    );
    return;
  }

  if (command === "render") {
    const receipt = await createRender(episode, outputDir);
    process.stdout.write(
      `${episode.id} rendered: ${(receipt.render.durationMs / 1_000).toFixed(1)}s at ${receipt.render.width}x${receipt.render.height}\n`,
    );
    return;
  }

  if (command === "qa") {
    const report = await createQa(episode, await readReceipt(outputDir), outputDir);
    process.stdout.write(`${episode.id} QA ${report.passed ? "passed" : "failed"}\n`);
    if (!report.passed) process.exitCode = 1;
    return;
  }

  const receipt = await createRender(episode, outputDir);
  const report = await createQa(episode, receipt, outputDir);
  if (report.passed) {
    await packageRelease(episode, outputDir);
  }
  process.stdout.write(
    `${episode.id} release ${report.passed ? "ready" : "blocked"}: ${outputDir}\n`,
  );
  if (!report.passed) process.exitCode = 1;
}

await main();
