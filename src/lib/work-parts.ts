// src/lib/work-parts.ts — 곡의 파트 표시 순서. 강조 파트(mainPartId)를 맨 앞으로 보냅니다.
import type { Work } from './types';

export function orderParts(w: Work): string[] {
  const m = w.mainPartId;
  if (!m || !w.partIds.includes(m)) return w.partIds; // 지정이 없거나 참여 파트에 없으면 원래 순서
  return [m, ...w.partIds.filter((id) => id !== m)];
}
