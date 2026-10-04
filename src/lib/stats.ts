// src/lib/stats.ts — 등록된 곡에서 자동으로 계산하는 작업 현황(새로 입력할 데이터 없음)
import type { Work } from './types';

export type Stats = { works: number; artists: number; latest: string };

// '2026.09'와 '2026.09.14'가 섞여 있어도 비교되도록 숫자만 뽑아 8자리로 맞춥니다.
const key = (d: string) => d.replace(/\D/g, '').padEnd(8, '0');

export function computeStats(works: Work[]): Stats | null {
  if (!works.length) return null;
  const artists = new Set(works.flatMap((w) => w.artistIds)).size;
  const latest = works.reduce((a, w) => (key(w.date) > key(a) ? w.date : a), works[0].date);
  return { works: works.length, artists, latest };
}
