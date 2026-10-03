// src/lib/sample-data.ts  (샘플. 곡명·가격·설명 문구는 모두 임시값)
import { T } from './i18n';
import type { Feat, SiteData, Work, RateItem } from './types';

const P = (id: string, groupId: string, ko: string) => ({ id, groupId, name: T(ko) });
const W = (n: number, artistIds: string[], usageIds: string[], partIds: string[], date: string, duration: string, feat?: Feat): Work =>
  ({ id: `w${n}`, title: `Track Title ${String(n).padStart(2, '0')}`, youtubeId: '', date, duration, artistIds, usageIds, partIds, feat });
const R = (id: string, groupId: string, ko: string, desc: string, price = '000,000', unit = '곡당', tag?: string): RateItem =>
  ({ id, groupId, name: T(ko), desc: T(desc), price, unit: T(unit), tag });

const rateItems: RateItem[] = [
  R('compose', 'g-comp', '작곡', '멜로디 · 코드 진행 · 곡 구성'),
  R('lyrics', 'g-comp', '작사', '한국어 · 일본어 가사'),
  R('arrange', 'g-comp', '편곡', '악기 구성 · 사운드 디자인'),
  R('harmony', 'g-vocal', '화음 가이드', '하모니 라인 설계 및 가이드 녹음', '00,000'),
  R('chorus', 'g-vocal', '코러스', '코러스 파트 설계 및 녹음', '00,000'),
  R('vdir', 'g-vocal', '보컬 디렉팅', '녹음 방향 설정 및 디렉팅', '00,000'),
  R('vocal', 'g-vocal', '보컬', '메인 멜로디 가이드 녹음', '00,000'),
  R('cover-inst', 'g-play', '커버 Inst(MR)', '편곡 · MIDI · 베이스 · 기타 · 건반 포함, 키 조절 · 멀티 트랙 제공'),
  R('midi', 'g-play', 'MIDI', 'MIDI 시퀀싱', '00,000'),
  R('bass', 'g-play', '베이스', '베이스 연주 녹음', '00,000'),
  R('guitar', 'g-play', '기타', '기타 연주 녹음', '00,000'),
  R('keys', 'g-play', '건반', '건반 연주 녹음', '00,000'),
  R('vedit', 'g-eng', '보컬 에딧', '음정 · 박자 튠, 노이즈 정리', '00,000', '트랙당', 'PER TRACK'),
  { ...R('mix', 'g-eng', '믹싱', '밸런스 · 공간계 이펙트'), discount: { on: true, rate: 10, price: '000,000' } },
  R('master', 'g-eng', '마스터링', '음압 최적화 · 플랫폼별 레벨 조정', '00,000'),
];

export const SAMPLE: SiteData = {
  groups: [
    { id: 'g-comp', no: '01', name: T('작곡·작사·편곡'), en: 'Composition', desc: T('곡의 뼈대와 가사, 사운드 구성을 만드는 작업.') },
    { id: 'g-vocal', no: '02', name: T('보컬'), en: 'Vocal', desc: T('보컬 녹음과 화음·코러스 설계에 필요한 작업.') },
    { id: 'g-play', no: '03', name: T('연주'), en: 'Performance', desc: T('악기 연주와 MIDI 프로그래밍 작업.') },
    { id: 'g-eng', no: '04', name: T('엔지니어링'), en: 'Mix & Master', desc: T('녹음된 소스를 정리하고 완성도를 높이는 작업.') },
  ],
  parts: [
    P('compose', 'g-comp', '작곡'), P('lyrics', 'g-comp', '작사'), P('arrange', 'g-comp', '편곡'),
    P('harmony', 'g-vocal', '화음 가이드'), P('chorus', 'g-vocal', '코러스'), P('vdir', 'g-vocal', '보컬 디렉팅'), P('vocal', 'g-vocal', '보컬'),
    P('midi', 'g-play', 'MIDI'), P('bass', 'g-play', '베이스'), P('guitar', 'g-play', '기타'), P('keys', 'g-play', '건반'),
    P('vedit', 'g-eng', '보컬 에딧'), P('mix', 'g-eng', '믹싱'), P('master', 'g-eng', '마스터링'),
  ],
  usageTypes: [{ id: 'u-orig', name: T('오리지널') }, { id: 'u-cover', name: T('커버') }, { id: 'u-concert', name: T('콘서트') }],
  artistTypes: [{ id: 'a-vtuber', name: T('버튜버') }, { id: 'a-utaite', name: T('우타이테') }, { id: 'a-pop', name: T('대중가요') }],
  artists: [
    { id: 'hadia', name: '하디아', typeIds: ['a-vtuber'], useAvatar: false, showWhenEmpty: false },
    { id: 'yangdoki', name: '양도끼', typeIds: ['a-utaite'], useAvatar: false, showWhenEmpty: false },
    { id: 'wakcaloid', name: '왁컬로이드', typeIds: ['a-vtuber'], useAvatar: false, showWhenEmpty: false },
  ],
  works: [
    W(1, ['hadia'], ['u-orig'], ['compose', 'arrange', 'lyrics', 'mix'], '2026.09', '3:52', { default: 'compose', groups: ['g-comp'], parts: ['compose', 'lyrics'] }),
    W(2, ['yangdoki'], ['u-cover'], ['arrange', 'harmony', 'master'], '2026.08', '4:10', { default: 'arrange', groups: ['g-comp'], parts: ['arrange'] }),
    W(3, ['wakcaloid'], ['u-cover'], ['mix', 'vedit', 'master'], '2026.08', '3:31', { default: 'mix', groups: ['g-eng'], parts: ['mix'] }),
    W(4, ['hadia'], ['u-cover'], ['arrange', 'guitar', 'mix'], '2026.07', '3:44', { groups: ['g-play'], parts: ['arrange', 'guitar'] }),
    W(5, ['yangdoki'], ['u-orig'], ['compose', 'lyrics', 'harmony'], '2026.07', '4:02', { groups: ['g-vocal'], parts: ['lyrics', 'harmony'] }),
    W(6, ['hadia'], ['u-cover'], ['vedit', 'mix', 'master'], '2026.06', '3:18', { parts: ['vedit', 'master'] }),
    W(7, ['wakcaloid'], ['u-orig', 'u-concert'], ['compose', 'arrange'], '2026.05', '3:57', { parts: ['compose'] }),
    W(8, ['hadia'], ['u-cover'], ['harmony', 'vedit'], '2026.05', '3:26', { groups: ['g-vocal'], parts: ['harmony'] }),
    W(9, ['yangdoki'], ['u-cover'], ['mix', 'master'], '2026.04', '3:39', { parts: ['master'] }),
    W(10, ['hadia', 'wakcaloid'], ['u-orig'], ['compose', 'arrange', 'mix', 'master'], '2026.03', '4:21', { groups: ['g-eng'], parts: ['mix'] }),
    W(11, ['wakcaloid'], ['u-cover'], ['arrange'], '2026.02', '3:05'),
    W(12, ['hadia'], ['u-cover'], ['mix'], '2026.01', '3:48'),
    W(13, ['yangdoki'], ['u-orig'], ['compose', 'lyrics'], '2025.12', '3:33'),
  ],
  rateItems,
  packages: [
    { id: 'pk1', no: '01', tag: 'ORIGINAL', name: T('오리지널 곡 풀 패키지'), desc: T('작곡부터 마스터링까지 오리지널 곡 제작에 필요한 파트를 묶은 구성.'),
      itemIds: ['compose', 'arrange', 'lyrics', 'vocal', 'mix', 'master'], total: '000,000', discount: { on: true, rate: 10, price: '000,000', endDate: '2026-12-31' } },
    { id: 'pk2', no: '02', tag: 'COVER', name: T('커버곡 Inst + 믹싱'), desc: T('커버 Inst(MR) 제작과 보컬 에딧, 믹싱, 마스터링 구성.'),
      itemIds: ['cover-inst', 'vedit', 'mix', 'master'], total: '000,000' },
    { id: 'pk3', no: '03', tag: 'MIX', name: T('보컬 믹싱 & 마스터링'), desc: T('녹음된 보컬의 에딧, 믹싱, 마스터링 구성.'),
      itemIds: ['vedit', 'mix', 'master'], total: '000,000' },
  ],
  notice: T('※ 위 단가는 기본 구성 기준 예시이며, 실제 의뢰하시는 파트 범위와 트랙 수, 세션 난이도에 따라 유연하게 조율 가능합니다. 모든 금액은 VAT 포함입니다.'),
  links: { youtube: '', soop: '', x: '', discordServer: '', discordUrl: '', discordId: 'hbg_rne', email: 'kevin1037@naver.com', crewUrl: 'https://x.com/VRSounds' },
  indexQueue: [{ workId: 'w1' }, { workId: 'w2' }, { workId: 'w3' }],
};
