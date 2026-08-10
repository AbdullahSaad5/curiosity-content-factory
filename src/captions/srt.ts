import type { NarrationTimelineSegment } from "../narration/generate";

function timestamp(totalMs: number): string {
  const hours = Math.floor(totalMs / 3_600_000);
  const minutes = Math.floor((totalMs % 3_600_000) / 60_000);
  const seconds = Math.floor((totalMs % 60_000) / 1_000);
  const milliseconds = Math.floor(totalMs % 1_000);
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":") + `,${String(milliseconds).padStart(3, "0")}`;
}

export function toSrt(segments: NarrationTimelineSegment[]): string {
  return segments
    .flatMap((segment, index) => [
      String(index + 1),
      `${timestamp(segment.startMs)} --> ${timestamp(segment.endMs)}`,
      segment.text,
      "",
    ])
    .join("\n");
}
