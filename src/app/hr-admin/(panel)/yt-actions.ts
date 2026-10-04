// src/app/hr-admin/(panel)/yt-actions.ts — 유튜브 링크로 영상 제목 조회(곡 추가 화면 자동 입력용)
'use server';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';

type YtMeta =
  | { ok: true; id: string; title: string; channel: string }
  | { ok: false; msg: string };

function ytId(v: string) {
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = v.match(/(?:[?&]v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export async function fetchYoutubeMeta(input: string): Promise<YtMeta> {
  const me = await requireAdmin();
  if (!can(me, 'works')) return { ok: false, msg: '권한이 없습니다.' };

  const id = ytId(input.trim());
  if (!id) return { ok: false, msg: '유튜브 주소를 해석하지 못했습니다. 주소 전체 또는 11자리 ID를 넣어 주세요.' };

  try {
    const url = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`;
    const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { ok: false, msg: '영상 정보를 가져오지 못했습니다(비공개 영상이거나 주소가 틀렸을 수 있어요). 제목은 직접 입력하세요.' };
    const j = (await res.json()) as { title?: string; author_name?: string };
    return { ok: true, id, title: j.title ?? '', channel: j.author_name ?? '' };
  } catch {
    return { ok: false, msg: '영상 정보를 가져오지 못했습니다. 제목은 직접 입력하세요.' };
  }
}
