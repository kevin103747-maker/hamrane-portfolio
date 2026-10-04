// src/lib/status.ts — 의뢰 상태의 형식·기본값. 조회는 status-settings.ts, 저장은 어드민 "의뢰 상태"에서 합니다.
export type StatusState = 'open' | 'limited' | 'closed';

export type StatusSettings = {
  state: StatusState | ''; // '' = 사이트에 표시하지 않음
  note: string;
  updatedAt: string; // YYYY-MM-DD (KST). 저장할 때 자동으로 기록됩니다.
  showStats: boolean; // 홈 화면의 작업 현황 표시 여부
};

export const STATUS_LABEL: Record<StatusState, string> = {
  open: '의뢰 가능',
  limited: '대기 있음',
  closed: '의뢰 마감',
};

export const STATUS_LIMITS = { note: 60 };

export const DEFAULT_STATUS: StatusSettings = { state: '', note: '', updatedAt: '', showStats: true };

export const todayKst = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date());

export function daysSince(iso: string): number | null {
  const t = Date.parse(`${iso}T00:00:00+09:00`);
  return Number.isNaN(t) ? null : Math.max(0, Math.floor((Date.now() - t) / 86_400_000));
}
