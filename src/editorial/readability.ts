function syllablesInWord(rawWord: string): number {
  let word = rawWord.toLowerCase().replaceAll(/[^a-z]/gu, "");
  if (word.length <= 3) return 1;
  if (word.endsWith("e") && !word.endsWith("le")) {
    word = word.slice(0, -1);
  }
  const groups = word.match(/[aeiouy]+/gu);
  return Math.max(1, groups?.length ?? 1);
}

export function estimatedGradeLevel(text: string): number {
  const words = text.match(/[a-z]+(?:'[a-z]+)?/giu) ?? [];
  const sentences = text
    .split(/[.!?]+/gu)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
  if (words.length === 0) return 0;
  const syllables = words.reduce(
    (total, word) => total + syllablesInWord(word),
    0,
  );
  const grade =
    0.39 * (words.length / Math.max(1, sentences.length)) +
    11.8 * (syllables / words.length) -
    15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}
