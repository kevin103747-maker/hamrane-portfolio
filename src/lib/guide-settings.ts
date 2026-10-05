// src/lib/guide-settings.ts — 의뢰 가이드 문구 조회. site_settings의 'guide' 키를 읽습니다.
import { cache } from 'react';
import { supabase } from './supabase';
import { DEFAULT_GUIDE, type GuideSettings } from './guide';

const str = (x: unknown, def: string) => (typeof x === 'string' ? x : def);
const rec = (x: unknown): Record<string, unknown> =>
  x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {};

async function load(): Promise<GuideSettings> {
  if (!supabase) return DEFAULT_GUIDE;

  const { data, error } = await supabase.from('site_settings').select('value').eq('key', 'guide').maybeSingle();
  if (error) {
    console.error('[guide-settings] 조회 실패:', error.message);
    return DEFAULT_GUIDE;
  }
  if (!data?.value) return DEFAULT_GUIDE; // 저장한 적 없음 → 기본 문구

  // 저장한 적이 있으면 저장한 값이 우선입니다. 목록이 비어 있으면 "일부러 비운 것"이므로 그대로 비워 둡니다.
  // 다만 예전에 저장된 값에는 새 항목(priceTalk, assure)이 없으므로, 그 경우에만 기본 문구를 씁니다.
  const v = rec(data.value);
  const ft = rec(v.firstTime);
  const pt = rec(v.priceTalk);
  const ct = rec(v.contact);
  const D = DEFAULT_GUIDE;

  return {
    firstTime: { title: str(ft.title, D.firstTime.title), body: str(ft.body, D.firstTime.body) },
    steps: Array.isArray(v.steps)
      ? v.steps
          .map((s) => rec(s))
          .map((s) => ({ title: str(s.title, ''), desc: str(s.desc, ''), note: str(s.note, '') }))
          .filter((s) => s.title && s.desc)
      : D.steps,
    priceTalk: { title: str(pt.title, D.priceTalk.title), body: str(pt.body, D.priceTalk.body) },
    assure: Array.isArray(v.assure)
      ? v.assure
          .map((a) => rec(a))
          .map((a) => ({ title: str(a.title, ''), desc: str(a.desc, '') }))
          .filter((a) => a.title && a.desc)
      : D.assure,
    faq: Array.isArray(v.faq)
      ? v.faq
          .map((f) => rec(f))
          .map((f) => ({ q: str(f.q, ''), a: str(f.a, '') }))
          .filter((f) => f.q && f.a)
      : D.faq,
    contact: {
      lead: str(ct.lead, D.contact.lead),
      reply: str(ct.reply, D.contact.reply),
      ask: str(ct.ask, D.contact.ask),
      fields: Array.isArray(ct.fields)
        ? ct.fields.filter((f): f is string => typeof f === 'string' && !!f.trim())
        : D.contact.fields,
    },
  };
}

export const getGuideSettings = cache(load);
