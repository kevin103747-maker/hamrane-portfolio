// src/components/SiteProvider.tsx
'use client';
import { createContext, useContext, useMemo } from 'react';
import type { Artist, SiteData, Tag, Work } from '@/lib/types';
import { tx, type Text } from '@/lib/i18n';

function build(data: SiteData) {
  const works = data.works.filter((w) => !w.hidden).sort((a, b) => b.date.localeCompare(a.date)); // 최신순(동월은 입력순)
  const map = <X extends { id: string }>(l: X[]) => new Map(l.map((x) => [x.id, x]));
  const parts = map(data.parts), groups = map(data.groups), usage = map<Tag>(data.usageTypes), artists = map<Artist>(data.artists);
  const t = (v: Text) => tx(v);
  const nm = (m: Map<string, { name: Text }>, id: string) => { const v = m.get(id); return v ? t(v.name) : ''; };
  const artistWorks = (id: string) => works.filter((w) => w.artistIds.includes(id));
  return {
    ...data, works, t,
    partName: (id: string) => nm(parts, id),
    groupName: (id: string) => nm(groups, id),
    artistById: artists,
    artistNames: (w: Work) => w.artistIds.map((i) => artists.get(i)?.name).filter(Boolean).join(', '),
    usageNames: (w: Work) => w.usageIds.map((i) => nm(usage, i)).filter(Boolean).join(' / '),
    artistWorks,
    visibleArtists: data.artists.filter((a) => a.showWhenEmpty || artistWorks(a.id).length > 0),
    // 포트폴리오 "Artists" 칸용: 숨김으로 지정한 아티스트는 곡이 있어도 뺍니다. 순서는 DB의 sort를 따릅니다.
    stripArtists: data.artists.filter((a) => !a.hideInStrip && (a.showWhenEmpty || artistWorks(a.id).length > 0)),
  };
}
type Site = ReturnType<typeof build>;
const Ctx = createContext<Site | null>(null);

export function SiteProvider({ data, children }: { data: SiteData; children: React.ReactNode }) {
  const value = useMemo(() => build(data), [data]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useSite = () => { const c = useContext(Ctx); if (!c) throw new Error('SiteProvider missing'); return c; };
