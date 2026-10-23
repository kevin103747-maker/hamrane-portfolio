// src/lib/bonus.ts — 서비스 혜택(리릭비디오 등) 설정의 형식과 읽기. 서버/브라우저 양쪽에서 씁니다.
export type BonusSettings = {
  on: boolean;
  title: string;        // 예: 리릭비디오 제작 서비스
  line: string;         // 단가표 맨 위 한 줄 문구
  detail: string;       // 팝업 설명
  conditions: string[]; // 팝업 조건 목록
  videos: string[];     // 예시 영상 유튜브 ID
  excluded: string[];   // 혜택에서 제외할 단가 항목 id
  titleEn: string;      // 영어 화면용. 비면 한국어 값을 씁니다.
  lineEn: string;
  detailEn: string;
  conditionsEn: string[]; // 한국어 조건과 같은 줄 순서. 빈 줄은 그 줄만 한국어로 나옵니다.
};

/** 단가표 화면에 넘기는 값 (켜져 있을 때만) */
export type BonusView = Pick<BonusSettings, 'title' | 'line' | 'detail' | 'conditions' | 'videos'>;

export const BONUS_LIMITS = { title: 30, line: 60, detail: 300, conditions: 6, condLen: 80, videos: 3 };

export const EMPTY_BONUS: BonusSettings = {
  on: false,
  title: '리릭비디오 제작 서비스',
  line: '의뢰 시 함께 제작해 드려요',
  detail: '',
  conditions: [],
  videos: [],
  excluded: [],
  titleEn: '',
  lineEn: '',
  detailEn: '',
  conditionsEn: [],
};

/** 유튜브 주소 또는 11자리 ID에서 ID를 뽑습니다. 알아볼 수 없으면 null */
export function ytId(s: string): string | null {
  const t = s.trim();
  if (/^[\w-]{11}$/.test(t)) return t;
  const m = t.match(/(?:[?&]v=|youtu\.be\/|shorts\/|embed\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const strs = (v: unknown): string[] =>
  (Array.isArray(v) ? v : []).filter((x): x is string => typeof x === 'string');

export function parseBonus(v: unknown): BonusSettings {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const s = (k: 'title' | 'line' | 'detail') =>
    typeof o[k] === 'string' ? (o[k] as string).trim() : EMPTY_BONUS[k];
  const e = (k: 'titleEn' | 'lineEn' | 'detailEn') => (typeof o[k] === 'string' ? (o[k] as string).trim() : '');
  return {
    on: o.on === true,
    title: s('title'),
    line: s('line'),
    detail: s('detail'),
    conditions: strs(o.conditions).map((x) => x.trim()).filter(Boolean).slice(0, BONUS_LIMITS.conditions),
    videos: strs(o.videos).map(ytId).filter((x): x is string => !!x).slice(0, BONUS_LIMITS.videos),
    excluded: strs(o.excluded),
    titleEn: e('titleEn'),
    lineEn: e('lineEn'),
    detailEn: e('detailEn'),
    conditionsEn: strs(o.conditionsEn).map((x) => x.trim()).slice(0, BONUS_LIMITS.conditions),
  };
}
/** 화면에 넘길 값. 영어 화면은 영어 문구가 있는 곳만 영어로, 비었으면 한국어로 대신합니다. */
export function bonusFor(b: BonusSettings, lang = 'ko'): BonusView {
  const base: BonusView = { title: b.title, line: b.line, detail: b.detail, conditions: b.conditions, videos: b.videos };
  if (lang === 'ko') return base;
  return {
    ...base,
    title: b.titleEn || b.title,
    line: b.lineEn || b.line,
    detail: b.detailEn || b.detail,
    conditions: b.conditions.map((c, i) => b.conditionsEn[i] || c),
  };
}
