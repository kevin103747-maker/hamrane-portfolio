// src/lib/social-settings.ts — 채널 바로가기 순서 조회. site_settings의 'social_order' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';
import { DEFAULT_ORDER, normalizeOrder, type SocialKey } from './social';

async function load(): Promise<SocialKey[]> {
  if (!supabase) return DEFAULT_ORDER;
  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'social_order').maybeSingle();
  if (error) {
    console.error('[social-settings] 조회 실패:', error.message);
    return DEFAULT_ORDER;
  }
  const v = data?.value as { order?: unknown } | null | undefined;
  return normalizeOrder(v?.order);
}

export const getSocialOrder = cache(load);
