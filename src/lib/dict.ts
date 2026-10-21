// src/lib/dict.ts — 화면 고정 문구(언어별). 영어 칸은 한국어 칸과 같은 항목을 모두 채워야 타입 검사를 통과합니다.
import { COPY } from './copy';

const ko = {
  common: { askMe: '문의하기', homeLabel: 'HamRanè 홈', language: '언어', theme: '테마 전환', menu: '메뉴' },
  notFound: { title: COPY.notFound.title, body: COPY.notFound.body, home: '홈으로', portfolio: '포트폴리오', pricing: '단가 안내' },
  error: { title: COPY.error.title, body: COPY.error.body, retry: COPY.error.retry, home: '홈으로' },
};

// 글자 값이 고정 문구 타입으로 좁혀져도 영어 칸이 막히지 않게 넓혀 둡니다.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dict = Widen<typeof ko>;

const en: Dict = {
  common: { askMe: 'Contact me', homeLabel: 'HamRanè home', language: 'Language', theme: 'Toggle theme', menu: 'Menu' },
  notFound: {
    title: 'Page not found',
    body: 'The address may have changed, or the page may have been removed.',
    home: 'Home',
    portfolio: 'Portfolio',
    pricing: 'Pricing',
  },
  error: {
    title: 'Something went wrong',
    body: 'A temporary error occurred. Please try again in a moment.',
    retry: 'Try again',
    home: 'Home',
  },
};

const ALL: Record<string, Dict> = { ko, en };

/** 언어 코드에 맞는 문구 묶음. 모르는 언어는 한국어. */
export const dict = (lang: string): Dict => ALL[lang] ?? ko;
