// src/lib/featured.ts — 대표곡 어드민 화면 공통
export const HOME_FEATURED_MAX = 6; // 홈 대표곡 최대 개수

export type PickWork = {
  id: string; title: string; date: string; artists: string; thumb: string;
  hidden: boolean; partIds: string[]; mainPartId: string | null;
  blocked?: string; // 이 화면에서 새로 담을 수 없는 이유
};
export type PickPart = { id: string; name: string };

export type WorkRow = {
  id: string; title: string; work_date: string | null; hidden: boolean | null;
  part_ids: string[] | null; main_part_id: string | null; artist_ids: string[] | null;
  youtube_id: string | null; thumb_url: string | null;
};

// 문자열 또는 { ko: "..." } 형태 모두 글자로 바꿉니다.
export const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

export function toPickWork(x: WorkRow, artistName: (id: string) => string): PickWork {
  return {
    id: x.id,
    title: x.title,
    date: x.work_date ?? '',
    artists: (x.artist_ids ?? []).map(artistName).filter(Boolean).join(', '),
    thumb: x.thumb_url || (x.youtube_id ? `https://i.ytimg.com/vi/${x.youtube_id}/mqdefault.jpg` : ''),
    hidden: !!x.hidden,
    partIds: x.part_ids ?? [],
    mainPartId: x.main_part_id,
  };
}
