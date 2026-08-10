# Third-party model record

## Kokoro v1.0

- Purpose: on-device English text-to-speech for original narration.
- Runtime: `kokoro-onnx` 0.5.0.
- Model: `kokoro-v1.0.int8.onnx`.
- Voice embeddings: `voices-v1.0.bin`; current prototype uses the built-in `bm_george` voice.
- Runtime source: https://github.com/thewh1teagle/kokoro-onnx
- Model source: https://huggingface.co/hexgrad/Kokoro-82M
- Runtime license: MIT.
- Model license: Apache-2.0.
- Privacy: inference runs on-device; narration text is not sent to the model host or a TTS API.
- Storage: model binaries and generated audio are ignored by Git and remain local.

The voice is a stock model voice. Do not use it to imitate or imply endorsement by a real person.

## OpenAI Whisper

- Purpose: on-device word timestamps for caption and scene alignment.
- Runtime: `openai-whisper` 20250625.
- Default model: `base.en`; override locally with `WHISPER_MODEL`.
- Source: https://github.com/openai/whisper
- Code and model license: MIT.
- Privacy: transcription runs on-device after model download; audio is not sent to a speech API.
- Storage: model binaries and transcript artifacts are ignored by Git or stay in the selected output directory.
