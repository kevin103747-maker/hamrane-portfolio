// src/lib/track.ts — 방문·분야 클릭을 서버로 보냅니다. 브라우저에서만 호출하세요.
const VID = 'hr-vid';     // 방문자 임의 ID (개인정보 아님)
const OWNER = 'hr-owner'; // '1' = 내 기기(제외), '0' = 직접 포함으로 바꿈

export const isOwnerDevice = (): boolean => {
  try { return localStorage.getItem(OWNER) === '1'; } catch { return false; }
};

/** 관리자 화면에 들어올 때: 아직 선택한 적이 없을 때만 "내 기기"로 표시합니다. */
export function markOwnerDevice() {
  try { if (localStorage.getItem(OWNER) === null) localStorage.setItem(OWNER, '1'); } catch { /* 저장소를 못 쓰는 브라우저 */ }
}

/** 통계 화면의 버튼에서 직접 바꿉니다. */
export function setOwnerDevice(on: boolean) {
  try { localStorage.setItem(OWNER, on ? '1' : '0'); } catch { /* 저장소를 못 쓰는 브라우저 */ }
}

function visitorId(): string {
  try {
    let v = localStorage.getItem(VID);
    if (!v) {
      v = crypto.randomUUID();
      localStorage.setItem(VID, v);
    }
    return v;
  } catch {
    return '';
  }
}

export function track(kind: 'view' | 'group', value: string) {
  const vid = visitorId();
  if (!vid) return; // 저장소를 못 쓰면 기록하지 않습니다.
  fetch('/api/stat', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ kind, value, vid, owner: isOwnerDevice() }),
    keepalive: true,
  }).catch(() => {});
}
