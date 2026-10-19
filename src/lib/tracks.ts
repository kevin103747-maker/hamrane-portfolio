// src/lib/tracks.ts — 곡의 "트랙 분리 듣기" 목록 (파일은 Cloudflare R2 hamrane-mixer 버킷)
export type Track = { label: string; file: string };

export const TRACKS_MAX = 6;
export const TRACK_LABEL_MAX = 20;
// Worker(mixer-files)의 KEY_RE와 같아야 합니다. 한쪽을 고치면 다른 쪽도 고치세요.
export const TRACK_FILE_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,80}\.mp3$/;

/** DB의 jsonb 값을 안전하게 Track[]로 바꿉니다. 형식이 틀린 항목은 버립니다. */
export function parseTracks(v: unknown): Track[] {
  if (!Array.isArray(v)) return [];
  const out: Track[] = [];
  for (const x of v) {
    const o = x as { label?: unknown; file?: unknown } | null;
    const label = typeof o?.label === 'string' ? o.label.trim() : '';
    const file = typeof o?.file === 'string' ? o.file.trim() : '';
    if (label && TRACK_FILE_RE.test(file)) out.push({ label, file });
  }
  return out.slice(0, TRACKS_MAX);
}
