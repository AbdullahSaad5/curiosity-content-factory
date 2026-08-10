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
    let match = cursor;
    const from = Math.max(0, cursor - 6);
    const to = Math.min(transcript.length - anchor.length, cursor + 12);
    for (let candidate = from; candidate <= to; candidate += 1) {
      if (anchor.every((token, offset) => transcript[candidate + offset]?.token === token)) {
        match = candidate;
        break;
      }
    }
    cursor = Math.min(transcript.length, match + target.length);
    const wordIndex = transcript[match]?.wordIndex;
    return wordIndex === undefined ? words.at(-1)!.endSeconds : words[wordIndex]!.startSeconds;
  });

  return starts.map((startSeconds, index) => ({
    startSeconds,
    endSeconds: starts[index + 1] ?? totalDurationSeconds,
  }));
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
