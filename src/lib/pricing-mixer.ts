// src/lib/pricing-mixer.ts — 단가표 분야별 "트랙 분리 듣기" 설정. site_settings의 'pricing_mixer' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';
import { parseTracks, type Track } from './tracks';

export const PRICING_MIXER_MAX = 4; // 한 분야에 고를 수 있는 최대 곡 수
export type MixerMode = 'mix' | 'ab'; // mix = 섞어 듣기, ab = 하나씩 듣기(Before/After)
export type MixItem = { id: string; title: string; sub: string; youtubeId: string; tracks: Track[] }; // 곡 정보 복사본(숨긴 곡용)
export type MixerCfg = { on: boolean; mode: MixerMode; ids: string[]; items?: MixItem[] };
export type PricingMixer = Record<string, MixerCfg>; // 분야 id → 설정

function parseItems(v: unknown): MixItem[] {
  if (!Array.isArray(v)) return [];
  const out: MixItem[] = [];
  for (const x of v) {
    const o = x as Record<string, unknown> | null;
    if (!o || typeof o.id !== 'string' || typeof o.title !== 'string') continue;
    const tracks = parseTracks(o.tracks);
    if (tracks.length < 2) continue;
    out.push({
      id: o.id,
      title: o.title,
      sub: typeof o.sub === 'string' ? o.sub : '',
      youtubeId: typeof o.youtubeId === 'string' ? o.youtubeId : '',
      tracks,
    });
  }
  return out;
}


export function parsePricingMixer(v: unknown): PricingMixer {
  const out: PricingMixer = {};
  if (!v || typeof v !== 'object') return out;
  for (const [gid, raw] of Object.entries(v as Record<string, unknown>)) {
    const o = raw as { on?: unknown; mode?: unknown; ids?: unknown } | null;
    if (!o || typeof o !== 'object') continue;
    const ids = Array.isArray(o.ids) ? o.ids.filter((x): x is string => typeof x === 'string') : [];
    out[gid] = { on: o.on === true, mode: o.mode === 'ab' ? 'ab' : 'mix', ids, items: parseItems((o as { items?: unknown }).items) };
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
