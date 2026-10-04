// src/lib/social.ts — 홈 화면 채널 바로가기의 종류와 기본 순서. 서버·브라우저 양쪽에서 씁니다.
export type SocialKey = 'yt' | 'yt2' | 'soop' | 'chzzk' | 'x' | 'ig' | 'tt' | 'dc';
type LinkField = 'youtube' | 'youtube2' | 'soop' | 'chzzk' | 'x' | 'instagram' | 'tiktok' | 'discordServer';

export type Platform = {
  key: SocialKey;
  label: string;
  field: LinkField; // Links 안에서 주소가 저장되는 이름(= 어드민 입력란 이름)
  placeholder: string;
  hint?: string;
  icon?: 'youtube' | 'x' | 'discord'; // 관리자가 올린 아이콘 이미지로 바꿀 수 있는 채널(기존 방식 유지)
};

export const PLATFORMS: Platform[] = [
  { key: 'yt', label: 'YouTube', field: 'youtube', placeholder: 'https://youtube.com/@...', icon: 'youtube' },
  { key: 'yt2', label: 'YouTube 서브 채널', field: 'youtube2', placeholder: 'https://youtube.com/@...' },
  { key: 'soop', label: 'SOOP', field: 'soop', placeholder: 'https://ch.sooplive.co.kr/...' },
  { key: 'chzzk', label: '치지직', field: 'chzzk', placeholder: 'https://chzzk.naver.com/...' },
  { key: 'x', label: 'X', field: 'x', placeholder: 'https://x.com/...', icon: 'x' },
  { key: 'ig', label: 'Instagram', field: 'instagram', placeholder: 'https://instagram.com/...' },
  { key: 'tt', label: 'TikTok', field: 'tiktok', placeholder: 'https://tiktok.com/@...' },
  {
    key: 'dc', label: 'Discord', field: 'discordServer', placeholder: 'https://discord.com/users/숫자ID',
    hint: '하단 문의 카드에도 같은 링크가 쓰입니다.', icon: 'discord',
  },
];

export const DEFAULT_ORDER: SocialKey[] = PLATFORMS.map((p) => p.key);

/** 저장된 순서를 검사합니다. 모르는 값·중복은 버리고, 빠진 채널은 기본 순서대로 뒤에 붙입니다. */
export function normalizeOrder(x: unknown): SocialKey[] {
  const valid = new Set<string>(DEFAULT_ORDER);
  const seen = new Set<string>();
  const out: SocialKey[] = [];
  if (Array.isArray(x)) {
    for (const k of x) {
      if (typeof k === 'string' && valid.has(k) && !seen.has(k)) {
        seen.add(k);
        out.push(k as SocialKey);
      }
    }
  }
  for (const k of DEFAULT_ORDER) if (!seen.has(k)) out.push(k);
  return out;
}
