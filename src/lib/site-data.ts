// src/lib/site-data.ts  — Supabase에서 읽기. 연결 전/비어 있을 때는 샘플 사용
import { cache } from 'react';
import { SAMPLE } from './sample-data';
import { supabase } from './supabase';
import type { SiteData } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
const rows = (x: { data: Row[] | null }) => x.data ?? [];

async function load(): Promise<SiteData | null> {
  if (!supabase) return null;
  const sb = supabase;
  const all = (table: string) => sb.from(table).select('*').order('sort', { ascending: true });

  const [g, p, u, at, a, w, r, k, iq, st] = await Promise.all([
    all('part_groups'), all('parts'), all('usage_types'), all('artist_types'), all('artists'),
    all('works'), all('rate_items'), all('packages'), all('index_queue'),
    sb.from('site_settings').select('*'),
  ]);

  const failed = [g, p, u, at, a, w, r, k, iq, st].find((x) => x.error);
  if (failed?.error) {
    console.error('[site-data] Supabase 조회 실패:', failed.error.message);
    return null;
  }
  if (!g.data?.length) return null; // 아직 초기 데이터가 없음 → 샘플 사용

  const setting = (key: string) => rows(st).find((x) => x.key === key)?.value;
  const visibleWorks = rows(w).filter((x) => !x.hidden);
  const visibleIds = new Set(visibleWorks.map((x) => x.id));

  return {
    groups: rows(g).map((x) => ({ id: x.id, no: x.num, name: x.name, en: x.en, desc: x.descr })),
    parts: rows(p).map((x) => ({ id: x.id, groupId: x.group_id, name: x.name })),
    usageTypes: rows(u).map((x) => ({ id: x.id, name: x.name })),
    artistTypes: rows(at).map((x) => ({ id: x.id, name: x.name })),
    artists: rows(a).map((x) => ({
      id: x.id, name: x.name, typeIds: x.type_ids, useAvatar: x.use_avatar,
      avatarUrl: x.avatar_url ?? undefined, showWhenEmpty: x.show_when_empty,
      hideInStrip: !!x.hide_in_strip, linkUrl: x.link_url ?? undefined,
      
    })),
    works: visibleWorks.map((x) => ({
      id: x.id, title: x.title, youtubeId: x.youtube_id, clipUrl: x.clip_url ?? undefined, date: x.work_date, duration: x.duration,
      thumbUrl: x.thumb_url ?? undefined, artistIds: x.artist_ids, usageIds: x.usage_ids,
      partIds: x.part_ids, mainPartId: x.main_part_id ?? undefined, hidden: x.hidden, feat: x.feat ?? undefined,
    })),
    rateItems: rows(r).map((x) => ({
      id: x.id, groupId: x.group_id, name: x.name, desc: x.descr, price: x.price, unit: x.unit,
      tag: x.tag ?? undefined, discount: x.discount ?? undefined,
    })),
    packages: rows(k).map((x) => ({
      id: x.id, no: x.num, tag: x.tag, name: x.name, desc: x.descr, itemIds: x.item_ids,
      total: x.total, discount: x.discount ?? undefined,
      qty: x.qty ?? {}, extras: x.extras ?? [], prices: x.prices ?? {},

    })),
    notice: setting('notice') ?? SAMPLE.notice,
    links: setting('links') ?? SAMPLE.links,
    indexQueue: rows(iq).filter((x) => visibleIds.has(x.work_id)).map((x) => ({
      workId: x.work_id, labelPartId: x.label_part_id ?? undefined, partCount: x.part_count ?? undefined,
    })),
  };
}

// cache(): 같은 요청 안에서 layout과 page가 각각 불러도 조회는 1번만 합니다.
export const getSiteData = cache(async (): Promise<SiteData> => (await load()) ?? SAMPLE);
