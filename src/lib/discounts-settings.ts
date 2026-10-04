// src/lib/discounts-settings.ts — 할인 규칙 조회. site_settings의 'discounts' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';
import { EMPTY_DISCOUNTS, parseDiscounts, type DiscountSettings } from './discounts';

async function load(): Promise<DiscountSettings> {
  if (!supabase) return EMPTY_DISCOUNTS;
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'discounts').maybeSingle();
  if (error) {
    console.error('[discounts-settings] 조회 실패:', error.message);
    return EMPTY_DISCOUNTS;
  }
  return parseDiscounts(data?.value);
}

export const getDiscounts = cache(load);
