#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
tts_python_bin="${TTS_PYTHON_BIN:-python3.12}"
venv_dir="$project_root/.venv-local-tts"
model_dir="$project_root/models/kokoro"

if ! command -v "$tts_python_bin" >/dev/null 2>&1; then
  echo "Python 3.12 is required. Set TTS_PYTHON_BIN to its executable path." >&2
  exit 1
fi

"$tts_python_bin" -m venv "$venv_dir"
"$venv_dir/bin/python" -m pip install \
  kokoro-onnx==0.5.0 \
  openai-whisper==20250625 \
  soundfile==0.13.1

mkdir -p "$model_dir"
curl --fail --location --show-error \
  "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/kokoro-v1.0.int8.onnx" \
  --output "$model_dir/kokoro-v1.0.int8.onnx"
curl --fail --location --show-error \
  "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/voices-v1.0.bin" \
  --output "$model_dir/voices-v1.0.bin"

echo "Local Kokoro narration runtime is ready."
