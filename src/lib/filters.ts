// src/lib/filters.ts
import type { Discount, SiteData, Work } from './types';

export type Filter = { q: string; groupId: string | null; partId: string | null; usage: string[]; aType: string[] };

/** scope=false 이면 그룹/파트 조건은 건너뜀(대표작은 지정 자체가 범위이므로) */
export function matches(w: Work, d: SiteData, f: Filter, scope = true) {
  if (scope) {
    if (f.partId && !w.partIds.includes(f.partId)) return false;
    if (!f.partId && f.groupId) {
      const ids = d.parts.filter((p) => p.groupId === f.groupId).map((p) => p.id);
      if (!w.partIds.some((i) => ids.includes(i))) return false;
    }
  }
  if (f.usage.length && !w.usageIds.some((i) => f.usage.includes(i))) return false;
  if (f.aType.length && !w.artistIds.some((a) => d.artists.find((x) => x.id === a)?.typeIds.some((t) => f.aType.includes(t)))) return false;
  if (f.q) {
    const hay = (w.title + ' ' + w.artistIds.map((a) => d.artists.find((x) => x.id === a)?.name ?? '').join(' ')).toLowerCase();
    if (!hay.includes(f.q.toLowerCase())) return false;
  }
  return true;
}

/** 할인 표시 여부. 종료일은 한국 시간(KST) 그날 23:59:59까지 */
export function isDiscountActive(d?: Discount, now = Date.now()) {
  if (!d || !d.on || !d.price) return false;
  if (!d.endDate) return true;
  return now <= Date.parse(`${d.endDate}T23:59:59.999+09:00`);
}
