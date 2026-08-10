export type TimedWord = {
  word: string;
  startSeconds: number;
  endSeconds: number;
};

export type NarratedScene = {
  narration: string;
};

export type SceneTiming = {
  startSeconds: number;
  endSeconds: number;
};

export type WordCaptionCue = {
  text: string;
  startSeconds: number;
  endSeconds: number;
};

function tokens(value: string): string[] {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9']+/gu, " ")
    .trim()
    .split(/\s+/u)
    .filter(Boolean);
}

export function alignScenesToWords(
  scenes: NarratedScene[],
  words: TimedWord[],
  totalDurationSeconds: number,
): SceneTiming[] {
  if (scenes.length === 0) return [];
  if (words.length === 0) {
    throw new Error("Cannot align scenes without timed words");
  }

  const transcript = words.flatMap((word, wordIndex) =>
    tokens(word.word).map((token) => ({ token, wordIndex })),
  );
  let cursor = 0;
  const starts = scenes.map((scene, sceneIndex) => {
    if (sceneIndex === 0) {
      cursor = Math.min(transcript.length, tokens(scene.narration).length);
      return 0;
    }

    const target = tokens(scene.narration);
    const anchor = target.slice(0, Math.min(3, target.length));
    let match: number | undefined;
    const from = cursor;
    const to = Math.min(transcript.length - anchor.length, cursor + 12);
    for (let candidate = from; candidate <= to; candidate += 1) {
      if (anchor.every((token, offset) => transcript[candidate + offset]?.token === token)) {
        match = candidate;
        break;
      }
    }
    if (match === undefined) {
      throw new Error(`Whisper scene anchor was not found: ${anchor.join(" ")}`);
    }
    cursor = Math.min(transcript.length, match + target.length);
    const wordIndex = transcript[match]?.wordIndex;
    return wordIndex === undefined ? words.at(-1)!.endSeconds : words[wordIndex]!.startSeconds;
  });

  const timings = starts.map((startSeconds, index) => ({
    startSeconds,
    endSeconds: starts[index + 1] ?? totalDurationSeconds,
  }));
  if (
    timings.some(
      (timing) =>
        timing.startSeconds < 0 ||
        timing.endSeconds > totalDurationSeconds ||
        timing.endSeconds <= timing.startSeconds,
    )
  ) {
    throw new Error("Whisper scene anchors did not produce positive monotonic timings");
  }
  return timings;
}

export function captionCuesFromWords(
  words: TimedWord[],
  maximumWords = 3,
): WordCaptionCue[] {
  if (maximumWords < 1) {
    throw new Error("maximumWords must be at least one");
  }

  const groups: TimedWord[][] = [];
  let current: TimedWord[] = [];
  for (const word of words) {
    const previous = current.at(-1);
    if (
      current.length > 0 &&
      (current.length >= maximumWords ||
        (previous !== undefined && word.startSeconds - previous.endSeconds > 0.6))
    ) {
      groups.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length > 0) groups.push(current);

  return groups.map((group) => ({
    text: group.map((word) => word.word).join(" ").toUpperCase(),
    startSeconds: group[0]!.startSeconds,
    endSeconds: group.at(-1)!.endSeconds,
  }));
}

export function transcriptCoverage(script: string, words: TimedWord[]): number {
  const expected = tokens(script);
  const actual = words.flatMap((word) => tokens(word.word));
  if (expected.length === 0) return actual.length === 0 ? 1 : 0;

  const previous = new Array<number>(actual.length + 1).fill(0);
  for (const expectedToken of expected) {
    const current = new Array<number>(actual.length + 1).fill(0);
    for (let index = 1; index <= actual.length; index += 1) {
      current[index] = expectedToken === actual[index - 1]
        ? (previous[index - 1] ?? 0) + 1
        : Math.max(current[index - 1] ?? 0, previous[index] ?? 0);
    }
    for (let index = 0; index < current.length; index += 1) {
      previous[index] = current[index] ?? 0;
    }
  }
  return (previous.at(-1) ?? 0) / Math.max(expected.length, actual.length);
}
