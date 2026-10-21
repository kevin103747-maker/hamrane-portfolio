// src/lib/dict.ts — 화면 고정 문구(언어별). 영어 칸은 한국어 칸과 같은 항목을 모두 채워야 타입 검사를 통과합니다.
import { COPY } from './copy';
import { STATUS_LABEL } from './status';

const ko = {
  common: { askMe: '문의하기', homeLabel: 'HamRanè 홈', language: '언어', theme: '테마 전환', menu: '메뉴', scrollDown: '아래로 스크롤' },
  home: {
    name: '햄버거라네',
    nameSub: 'HamRanè',
    roles: '작곡 · 편곡 · 믹싱 · 마스터링', // 한국어 화면은 어드민 값을 쓰므로 영어 화면에서만 쓰입니다.
    firstQ: '의뢰가 처음이신가요?',
    firstGo: '의뢰 가이드 보기',
    pricing: '단가 보기',
    recentSub: '최근 작업물',
    recentLink: '포트폴리오 전체',
  },
  status: { prefix: '현재 ', label: STATUS_LABEL },
  stats: {
    aria: '작업 현황',
    works: '누적 작업', worksUnit: '곡',
    artists: '함께한 아티스트', artistsUnit: '명',
    latest: '최근 작업',
    numLocale: 'ko-KR',
  },
  social: { aria: '채널 바로가기' },
  ago: { today: '오늘', yesterday: '어제', days: '{n}일 전', thisMonth: '이번 달', months: '{n}개월 전', years: '{n}년 전' },
  notFound: { title: COPY.notFound.title, body: COPY.notFound.body, home: '홈으로', portfolio: '포트폴리오', pricing: '단가 안내' },
  error: { title: COPY.error.title, body: COPY.error.body, retry: COPY.error.retry, home: '홈으로' },
};

// 글자 값이 고정 문구 타입으로 좁혀져도 영어 칸이 막히지 않게 넓혀 둡니다.
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> };
export type Dict = Widen<typeof ko>;

const en: Dict = {
  common: { askMe: 'Contact me', homeLabel: 'HamRanè home', language: 'Language', theme: 'Toggle theme', menu: 'Menu', scrollDown: 'Scroll down' },
  home: {
    name: 'HamRanè',
    nameSub: '',
    roles: 'Composing · Arranging · Mixing · Mastering',
    firstQ: 'New to commissioning?',
    firstGo: 'Read the guide',
    pricing: 'View pricing',
    recentSub: 'Latest works',
    recentLink: 'Full portfolio',
  },
  status: { prefix: 'Status: ', label: { open: 'Available', limited: 'Waitlist', closed: 'Closed' } },
  stats: {
    aria: 'Work stats',
    works: 'Total works', worksUnit: '',
    artists: 'Artists worked with', artistsUnit: '',
    latest: 'Latest work',
    numLocale: 'en-US',
  },
  social: { aria: 'Channels' },
  ago: { today: 'today', yesterday: 'yesterday', days: '{n}d ago', thisMonth: 'this month', months: '{n}mo ago', years: '{n}y ago' },
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
