// src/lib/status-settings.ts — 의뢰 상태 조회. site_settings의 'status' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';
import { DEFAULT_STATUS, type StatusSettings } from './status';

async function load(): Promise<StatusSettings> {
  if (!supabase) return DEFAULT_STATUS;

  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'status').maybeSingle();
  if (error) {
    console.error('[status-settings] 조회 실패:', error.message);
    return DEFAULT_STATUS;
  }
  if (!data?.value || typeof data.value !== 'object') return DEFAULT_STATUS;

  const v = data.value as Record<string, unknown>;
  const state = (['open', 'limited', 'closed'] as const).find((s) => s === v.state) ?? '';
  return {
    state,
    note: typeof v.note === 'string' ? v.note : '',
    updatedAt: typeof v.updatedAt === 'string' ? v.updatedAt : '',
    showStats: typeof v.showStats === 'boolean' ? v.showStats : true,
  };
}

export const getStatusSettings = cache(load);
