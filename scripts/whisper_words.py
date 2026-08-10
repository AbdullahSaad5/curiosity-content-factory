#!/usr/bin/env python3
"""Transcribe local narration into word timestamps with OpenAI Whisper."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import certifi
import whisper


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audio", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--model", default="base.en")
    parser.add_argument("--model-dir", required=True)
    args = parser.parse_args()

    os.environ.setdefault("SSL_CERT_FILE", certifi.where())
    model_dir = Path(args.model_dir).resolve()
    model_dir.mkdir(parents=True, exist_ok=True)
    model = whisper.load_model(args.model, download_root=str(model_dir))
    result = model.transcribe(
        str(Path(args.audio).resolve()),
        language="en",
        word_timestamps=True,
        fp16=False,
        condition_on_previous_text=False,
    )

    words: list[dict[str, float | str]] = []
    for segment in result.get("segments", []):
        for item in segment.get("words", []):
            word = str(item.get("word", "")).strip()
            if not word:
                continue
            words.append(
                {
                    "word": word,
                    "startSeconds": round(float(item["start"]), 4),
                    "endSeconds": round(float(item["end"]), 4),
                }
            )

    if not words:
        raise RuntimeError("Whisper returned no timed words")

    Path(args.output).resolve().write_text(
        json.dumps(
            {
                "provider": "openai-whisper-local",
                "model": args.model,
                "text": str(result.get("text", "")).strip(),
                "words": words,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
