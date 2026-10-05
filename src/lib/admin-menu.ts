// src/lib/admin-menu.ts — 어드민 메뉴의 단일 출처. 사이드바와 대시보드가 같이 읽습니다.
type Perm = 'works' | 'artists' | 'rates' | 'settings';
type MenuItem = { href: string; label: string; desc: string; perm: Perm };
type MenuSection = { id: string; title: string; sub: string; items: MenuItem[] };

export const MENU: MenuSection[] = [
  {
    id: 'works',
    title: '작업물',
    sub: '포트폴리오에 보이는 곡과 사람',
    items: [
      { href: '/hr-admin/works', label: '곡', desc: '곡 추가·수정, 참여 파트와 대표작 설정', perm: 'works' },
      { href: '/hr-admin/featured', label: '홈 대표곡', desc: '홈 화면 대표작 패널에 나올 곡 선택', perm: 'works' },
      { href: '/hr-admin/featured/scopes', label: '분야별 대표곡', desc: '포트폴리오 분야별로 먼저 보여줄 곡 선택', perm: 'works' },
      { href: '/hr-admin/artists', label: '아티스트', desc: '아티스트와 프로필 이미지', perm: 'artists' },
    ],
  },
  {
    id: 'request',
    title: '의뢰 받기',
    sub: '의뢰자가 가장 먼저 보는 안내',
    items: [
      { href: '/hr-admin/status', label: '의뢰 상태', desc: '지금 의뢰 가능 여부, 한 줄 메모, 홈 작업 현황', perm: 'settings' },
      { href: '/hr-admin/guide', label: '의뢰 가이드', desc: '진행 순서, 가격 조율, 안심 포인트, 자주 묻는 질문, 문의 안내 문구', perm: 'settings' },
    ],
  },
  {
    id: 'price',
    title: '가격',
    sub: '단가표와 그 아래에 붙는 모든 규칙',
    items: [
      { href: '/hr-admin/rates', label: '단가표', desc: '파트별 단가와 이벤트 할인', perm: 'rates' },
      { href: '/hr-admin/rates/packages', label: '패키지', desc: '단가표 아래의 구성 예시(질문형 카드와 팝업)', perm: 'rates' },
      { href: '/hr-admin/quote', label: '견적서·명세서', desc: '의뢰인에게 보낼 견적서와 작업 후 명세서를 곡별로 정리해 PNG로 저장', perm: 'rates' },
      { href: '/hr-admin/turnaround', label: '소요·마감', desc: '분야·작업별 평균 소요기간과 빠른·당일 마감 표시', perm: 'rates' },
      { href: '/hr-admin/discounts', label: '할인 규칙', desc: '수량 할인, 묶음 할인과 적용 제외 항목', perm: 'rates' },
    ],
  },
  {
    id: 'site',
    title: '사이트',
    sub: '가끔만 바꾸는 기본 설정',
    items: [
      { href: '/hr-admin/groups', label: '분야·파트', desc: '포트폴리오·단가표의 분야 이름, 순서, 파트', perm: 'settings' },
      { href: '/hr-admin/settings', label: '사이트 설정', desc: '문구, 제목·설명, 채널 링크, 연락처, 공지', perm: 'settings' },
    ],
  },
];

export function visibleMenu(allowed: (p: Perm) => boolean): MenuSection[] {
  return MENU
    .map((s) => ({ ...s, items: s.items.filter((i) => allowed(i.perm)) }))
    .filter((s) => s.items.length > 0);
}
