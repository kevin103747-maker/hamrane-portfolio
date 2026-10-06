// src/lib/bonus-settings.ts — 서비스 혜택 조회. site_settings의 'bonus' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';
import { EMPTY_BONUS, parseBonus, type BonusSettings } from './bonus';

async function load(): Promise<BonusSettings> {
  if (!supabase) return EMPTY_BONUS;
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'bonus').maybeSingle();
  if (error) {
    console.error('[bonus-settings] 조회 실패:', error.message);
    return EMPTY_BONUS;
  }
  return parseBonus(data?.value);
}

export const getBonus = cache(load);
