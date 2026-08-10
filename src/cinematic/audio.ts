import { run } from "../lib/process";

export type SoundtrackOptions = {
  voicePath: string;
  outputPath: string;
  durationSeconds: number;
  musicPath?: string;
  musicLicense?: string;
  musicVolume?: number;
};

const VOICE_MASTER =
  "highpass=f=75,acompressor=threshold=-20dB:ratio=3:attack=8:release=180,loudnorm=I=-14:TP=-1.5:LRA=11,aformat=sample_rates=48000:channel_layouts=stereo";

export async function masterSoundtrack(options: SoundtrackOptions): Promise<void> {
  const volume = options.musicVolume ?? 0.1;
  if (volume < 0 || volume > 0.25) {
    throw new Error("Music volume must be between 0 and 0.25");
  }
  if (options.musicPath && !options.musicLicense?.trim()) {
    throw new Error("A music license or ownership record is required");
  }

  const base = ["-hide_banner", "-loglevel", "error", "-y", "-i", options.voicePath];
  if (!options.musicPath) {
    await run("ffmpeg", [
      ...base,
      "-af", VOICE_MASTER,
      "-ar", "48000",
      "-c:a", "pcm_s24le",
      options.outputPath,
    ]);
    return;
  }

  const fadeIn = Math.min(0.8, options.durationSeconds / 4);
  const fadeOut = Math.min(0.8, options.durationSeconds / 4);
  const fadeOutStart = Math.max(0, options.durationSeconds - fadeOut);
  const filter = [
    `[0:a]${VOICE_MASTER}[voice]`,
    `[1:a]atrim=duration=${options.durationSeconds},asetpts=PTS-STARTPTS,volume=${volume},afade=t=in:st=0:d=${fadeIn},afade=t=out:st=${fadeOutStart}:d=${fadeOut},aformat=sample_rates=48000:channel_layouts=stereo[music]`,
    "[voice][music]amix=inputs=2:duration=first:dropout_transition=0:normalize=0,aformat=sample_rates=48000:channel_layouts=stereo[out]",
  ].join(";");

  await run("ffmpeg", [
    ...base,
    "-stream_loop", "-1", "-i", options.musicPath,
    "-filter_complex", filter,
    "-map", "[out]",
    "-ar", "48000",
    "-c:a", "pcm_s24le",
    options.outputPath,
  ]);
}
