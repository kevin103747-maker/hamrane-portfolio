// src/lib/pricing-mixer.ts — 단가표 분야별 "트랙 분리 듣기" 설정. site_settings의 'pricing_mixer' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';

export const PRICING_MIXER_MAX = 4; // 한 분야에 고를 수 있는 최대 곡 수
export type MixerMode = 'mix' | 'ab'; // mix = 섞어 듣기, ab = 하나씩 듣기(Before/After)
export type MixerCfg = { on: boolean; mode: MixerMode; ids: string[] };
export type PricingMixer = Record<string, MixerCfg>; // 분야 id → 설정

export function parsePricingMixer(v: unknown): PricingMixer {
  const out: PricingMixer = {};
  if (!v || typeof v !== 'object') return out;
  for (const [gid, raw] of Object.entries(v as Record<string, unknown>)) {
    const o = raw as { on?: unknown; mode?: unknown; ids?: unknown } | null;
    if (!o || typeof o !== 'object') continue;
    const ids = Array.isArray(o.ids) ? o.ids.filter((x): x is string => typeof x === 'string') : [];
    out[gid] = { on: o.on === true, mode: o.mode === 'ab' ? 'ab' : 'mix', ids };
  }
  return out;
}

async function load(): Promise<PricingMixer> {
  if (!supabase) return {};
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'pricing_mixer').maybeSingle();
  if (error) {
    console.error('[pricing-mixer] 조회 실패:', error.message);
    return {};
  }
  return parsePricingMixer(data?.value);
}

export const getPricingMixer = cache(load);
