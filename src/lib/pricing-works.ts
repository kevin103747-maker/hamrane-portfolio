// src/lib/pricing-works.ts — 단가표 분야별 예시 작업물. site_settings의 'pricing_works' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';

export const PRICING_WORKS_MAX = 8; // 한 분야에 고를 수 있는 최대 곡 수
export type PricingWorks = Record<string, string[]>; // 분야 id → 곡 id 목록

export function parsePricingWorks(v: unknown): PricingWorks {
  const out: PricingWorks = {};
  if (!v || typeof v !== 'object') return out;
  for (const [gid, ids] of Object.entries(v as Record<string, unknown>)) {
    if (!Array.isArray(ids)) continue;
    const list = ids.filter((x): x is string => typeof x === 'string');
    if (list.length) out[gid] = list;
  }
  return out;
}

async function load(): Promise<PricingWorks> {
  if (!supabase) return {};
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'pricing_works').maybeSingle();
  if (error) {
    console.error('[pricing-works] 조회 실패:', error.message);
    return {};
  }
  return parsePricingWorks(data?.value);
}

export const getPricingWorks = cache(load);
