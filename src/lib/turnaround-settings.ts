// src/lib/turnaround-settings.ts — 분야별 기간·마감 조회. site_settings의 'turnaround' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';
import { parseTurnaround, type TurnaroundSettings } from './turnaround';

async function load(): Promise<TurnaroundSettings> {
  if (!supabase) return {};
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'turnaround').maybeSingle();
  if (error) {
    console.error('[turnaround-settings] 조회 실패:', error.message);
    return {};
  }
  return parseTurnaround(data?.value);
}

export const getTurnaround = cache(load);
