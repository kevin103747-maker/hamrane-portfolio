// src/lib/drops.ts — 무료 배포(다운로드 페이지) 조회·공용 도우미. 서버/브라우저 어디서든 import 가능.
import { cache } from 'react';
import { supabase } from './supabase';

export const DROP_BUCKET = 'drops';
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,40}$/;
export const DROP_LIMITS = { title: 60, subtitle: 80, description: 600, terms: 600 };
const YT_RE = /^[\w-]{11}$/;

export type Drop = {
  id: string; slug: string; title: string; subtitle: string; description: string; terms: string;
  youtubeId: string; mp3Path: string; mp3Size: number; wavPath: string; wavSize: number;
  published: boolean; endsOn: string;
};

type Row = Record<string, unknown>;
const str = (v: unknown) => (typeof v === 'string' ? v : '');
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0);

export function fromRow(r: Row): Drop {
  const yt = str(r.youtube_id);
  return {
    id: str(r.id), slug: str(r.slug), title: str(r.title), subtitle: str(r.subtitle),
    description: str(r.description), terms: str(r.terms),
    youtubeId: YT_RE.test(yt) ? yt : '',
    mp3Path: str(r.mp3_path), mp3Size: num(r.mp3_size),
    wavPath: str(r.wav_path), wavSize: num(r.wav_size),
    published: r.published === true, endsOn: str(r.ends_on),
  };
}

const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

/** 공개 상태이고 종료일(그날 포함)이 지나지 않았을 때만 true */
export function isLive(d: Drop) {
  return d.published && (!d.endsOn || d.endsOn >= todayKst());
}

/** 방문자용 조회. RLS가 공개 상태인 행만 돌려줍니다. */
export const getDrop = cache(async (slug: string): Promise<Drop | null> => {
  if (!supabase || !SLUG_RE.test(slug)) return null;
  const { data, error } = await supabase.from('drops').select('*').eq('slug', slug).maybeSingle();
  if (error) {
    console.error('[drops] 조회 실패:', error.message);
    return null;
  }
  return data ? fromRow(data as Row) : null;
});

/** 음원 파일의 받기 주소(Cloudflare Worker 주소 + R2 파일 이름). 서버에서만 쓰세요. 설정이 없으면 ''. */
export function fileUrl(path: string) {
  const base = (process.env.DROP_FILES_BASE ?? '').trim().replace(/\/+$/, '');
  if (!base || !path) return '';
  return `${base}/${path.split('/').map(encodeURIComponent).join('/')}`;
}

/** 저장될 파일 이름(확장자 제외). 제목에서 파일 이름에 못 쓰는 문자를 뺍니다. */
export function saveName(d: Drop) {
  return d.title.replace(/[\\/:*?"<>|\r\n]+/g, '').trim() || d.slug;
}

export function fmtSize(b: number) {
  if (!b) return '';
  return b >= 1048576 ? `${(b / 1048576).toFixed(1)}MB` : `${Math.max(1, Math.round(b / 1024))}KB`;
}
