// src/lib/copy.ts — 사이트 곳곳의 짧은 안내 문구. 말투는 의뢰 안내(guide.ts)와 같은 "~합니다" 체로 맞춥니다.
export const COPY = {
  copied: '복사했습니다',
  copyFail: '복사하지 못했습니다',
  resetFilters: '필터 초기화',

  emptySearch: '조건에 맞는 작업물을 찾지 못했습니다. 검색어나 필터를 바꿔 보세요.',
  emptyExtra: '대표작 외에 더 보여드릴 작업물이 없습니다.',
  emptyAll: '아직 등록된 작업물이 없습니다.',
  emptyArtist: '아직 공개된 작업물이 없습니다.',

  notFound: {
    title: '찾으시는 페이지가 없습니다',
    body: '주소가 바뀌었거나 삭제된 페이지일 수 있습니다. 아래에서 다시 찾아보세요.',
  },
  error: {
    title: '일시적인 문제가 생겼습니다',
    body: '잠시 후 다시 시도해 주세요. 계속되면 디스코드나 이메일로 알려주세요.',
    retry: '다시 시도',
  },
};
