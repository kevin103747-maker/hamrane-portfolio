// src/lib/clip.ts — SOOP·치지직 등 클립 링크 해석
export type Clip = {
  platform: 'chzzk' | 'soop' | 'other';
  label: string;       // "치지직에서 보기" 같은 버튼 문구에 씁니다
  watchUrl: string;    // 원본 보기 링크
  embedUrl?: string;   // 있으면 모달에서 바로 재생
};

/** SOOP 임베드가 실제로 재생되지 않으면 false로 바꾸세요. 그러면 "SOOP에서 보기" 링크만 보입니다. */
const SOOP_EMBED = true;

const hostIs = (h: string, base: string) => h === base || h.endsWith(`.${base}`);

/** 저장 전 검사: http(s) 주소만 허용하고 https로 통일. 해석할 수 없으면 '' */
export function normalizeClipUrl(raw: string): string {
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return '';
    u.protocol = 'https:';
    return u.toString();
  } catch {
    return '';
  }
}

export function parseClip(raw?: string | null): Clip | null {
  if (!raw) return null;
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const h = u.hostname.toLowerCase();
  const watchUrl = u.toString();

  if (hostIs(h, 'chzzk.naver.com')) {
    const m = u.pathname.match(/\/(?:clips|embed\/clip)\/([\w-]+)/);
    return {
      platform: 'chzzk', label: '치지직', watchUrl,
      embedUrl: m ? `https://chzzk.naver.com/embed/clip/${m[1]}` : undefined,
    };
  }
  if (hostIs(h, 'sooplive.co.kr') || hostIs(h, 'sooplive.com') || hostIs(h, 'afreecatv.com')) {
    const m = u.pathname.match(/\/player\/(\d+)/);
    return {
      platform: 'soop', label: 'SOOP', watchUrl,
      embedUrl: SOOP_EMBED && m ? `https://vod.sooplive.co.kr/player/${m[1]}/embed?showChat=false&autoPlay=true` : undefined,
    };
  }
  return { platform: 'other', label: '원본', watchUrl };
}
