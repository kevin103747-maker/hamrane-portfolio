// src/lib/dict.ts — 화면 고정 문구(언어별). 영어 칸은 한국어 칸과 같은 항목을 모두 채워야 타입 검사를 통과합니다.
const ko = {
  common: { askMe: '문의하기', homeLabel: 'HamRanè 홈', language: '언어', theme: '테마 전환', menu: '메뉴' },
};

export type Dict = typeof ko;

const en: Dict = {
  common: { askMe: 'Contact me', homeLabel: 'HamRanè home', language: 'Language', theme: 'Toggle theme', menu: 'Menu' },
};

const ALL: Record<string, Dict> = { ko, en };

/** 언어 코드에 맞는 문구 묶음. 모르는 언어는 한국어. */
export const dict = (lang: string): Dict => ALL[lang] ?? ko;
