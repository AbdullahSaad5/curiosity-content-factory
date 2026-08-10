#!/usr/bin/env python3
"""Generate scene-timed narration locally with Kokoro ONNX."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", required=True)
    parser.add_argument("--voices", required=True)
    parser.add_argument("--gap-ms", type=int, default=160)
    args = parser.parse_args()

    manifest_path = Path(args.manifest).resolve()
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    kokoro = Kokoro(str(Path(args.model).resolve()), str(Path(args.voices).resolve()))
    voice = manifest["voice"]
    speed = float(manifest.get("speed", 1.0))
    gap_ms = max(0, args.gap_ms)

    chunks: list[np.ndarray] = []
    timeline: list[dict[str, float | int | str]] = []
    cursor_samples = 0
    sample_rate: int | None = None

    for index, scene in enumerate(manifest["scenes"]):
        audio, rate = kokoro.create(
            scene["narration"],
            voice=voice,
            speed=speed,
            lang="en-gb" if voice.startswith("b") else "en-us",
        )
        audio = np.asarray(audio, dtype=np.float32).reshape(-1)
        if sample_rate is None:
            sample_rate = rate
        elif sample_rate != rate:
            raise RuntimeError("Kokoro returned inconsistent sample rates")

        start_seconds = cursor_samples / rate
        chunks.append(audio)
        cursor_samples += len(audio)
        end_seconds = cursor_samples / rate
        timeline.append(
            {
                "index": index,
                "narration": scene["narration"],
                "startSeconds": round(start_seconds, 4),
                "endSeconds": round(end_seconds, 4),
            }
        )

        if index < len(manifest["scenes"]) - 1 and gap_ms:
            gap = np.zeros(round(rate * gap_ms / 1000), dtype=np.float32)
            chunks.append(gap)
            cursor_samples += len(gap)

    if sample_rate is None or not chunks:
        raise RuntimeError("Manifest contains no narration scenes")

    combined = np.concatenate(chunks)
    audio_path = output_dir / "narration-raw.wav"
    sf.write(audio_path, combined, sample_rate, subtype="PCM_24")
    (output_dir / "timeline.json").write_text(
        json.dumps(
            {
                "provider": "kokoro-onnx-local",
                "voice": voice,
                "speed": speed,
                "sampleRate": sample_rate,
                "durationSeconds": round(len(combined) / sample_rate, 4),
                "scenes": timeline,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
