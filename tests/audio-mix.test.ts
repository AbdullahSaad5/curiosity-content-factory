import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { masterSoundtrack } from "../src/cinematic/audio";
import { run } from "../src/lib/process";

describe("masterSoundtrack", () => {
  it("loops a licensed music bed beneath voice and emits release audio", async () => {
    const directory = await mkdtemp(join(tmpdir(), "music-mix-"));
    const voicePath = join(directory, "voice.wav");
    const musicPath = join(directory, "music.wav");
    const outputPath = join(directory, "master.wav");

    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "sine=frequency=440:duration=2.2",
      "-c:a", "pcm_s16le", voicePath,
    ]);
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-f", "lavfi", "-i", "sine=frequency=110:duration=0.4",
      "-c:a", "pcm_s16le", musicPath,
    ]);

    await masterSoundtrack({
      voicePath,
      musicPath,
      musicLicense: "Original composition owned by this channel",
      musicVolume: 0.1,
      durationSeconds: 2.2,
      outputPath,
    });

    const { stdout } = await run("ffprobe", [
      "-v", "error", "-show_entries", "stream=sample_rate,channels:format=duration",
      "-of", "json", outputPath,
    ]);
    const metadata = JSON.parse(stdout) as {
      streams: Array<{ sample_rate: string; channels: number }>;
      format: { duration: string };
    };
    expect(metadata.streams[0]).toEqual({ sample_rate: "48000", channels: 2 });
    expect(Number(metadata.format.duration)).toBeGreaterThanOrEqual(2.15);
  });

  it("refuses an unlicensed music input", async () => {
    await expect(
      masterSoundtrack({
        voicePath: "voice.wav",
        musicPath: "music.wav",
        musicLicense: "",
        durationSeconds: 2,
        outputPath: "master.wav",
      }),
    ).rejects.toThrow(/license/i);
  });
});
