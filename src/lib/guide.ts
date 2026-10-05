// src/lib/guide.ts — 의뢰 가이드 문구의 형식과 기본값. 실제 문구는 어드민 "의뢰 가이드 문구"에서 고치며, 저장 전에는 이 기본값이 쓰입니다.
// 서버·브라우저 양쪽에서 쓰므로 DB 조회 코드는 넣지 않습니다(조회는 guide-settings.ts).

export type GuideStep = { title: string; desc: string; note: string };
export type GuideFaq = { q: string; a: string };
export type GuideAssure = { title: string; desc: string };
export type ContactGuide = { lead: string; reply: string; ask: string; fields: string[] };
export type GuideSettings = {
  firstTime: { title: string; body: string };
  steps: GuideStep[];
  priceTalk: { title: string; body: string };
  assure: GuideAssure[];
  faq: GuideFaq[];
  contact: ContactGuide;
};

/** 어드민 입력란과 저장 검사에 같이 쓰는 글자 수·개수 제한 */
export const GUIDE_LIMITS = {
  ftTitle: 30, ftBody: 300,
  stepMax: 6, stepTitle: 30, stepDesc: 300, stepNote: 160,
  ptTitle: 40, ptBody: 800,
  assureMax: 6, assureTitle: 30, assureDesc: 200,
  faqMax: 20, faqQ: 80, faqA: 800,
  lead: 100, reply: 100, ask: 100,
  fieldMax: 8, fieldLen: 30,
};

// 기본값에는 "사장님만 아는 조건"(수정 횟수, 결제, 기간, 답변 시간 등)을 넣지 않습니다. 비어 있으면 사이트에서 표시되지 않습니다.
export const DEFAULT_GUIDE: GuideSettings = {
  firstTime: {
    title: '처음 의뢰하시나요?',
    body: '처음이어도 괜찮습니다. 곡이나 레퍼런스가 아직 정해지지 않았어도, 어떤 곡을 원하시는지만 편하게 말씀해 주세요. 어떻게 시작해야 할지 막막하다면 이 페이지를 천천히 읽어 보세요.',
  },
  steps: [
    {
      title: '문의',
      desc: '디스코드나 이메일로 원하시는 작업을 간단히 알려주세요. 곡의 용도와 원하는 분위기만 말씀해 주셔도 시작할 수 있고, 정리되지 않은 상태여도 괜찮습니다.',
      note: '',
    },
    {
      title: '확인',
      desc: '곡과 레퍼런스를 보고 작업 범위와 난이도를 확인합니다. 정확한 견적을 위해 몇 가지를 여쭤볼 수 있습니다.',
      note: '',
    },
    {
      title: '견적·일정 안내',
      desc: '확인한 내용을 바탕으로 금액과 일정을 안내드리고, 서로 조율한 뒤 진행 여부를 정합니다.',
      note: '안내를 받으신 뒤 진행하지 않기로 하셔도 괜찮습니다.',
    },
    {
      title: '작업·전달',
      desc: '작업 후 결과물을 전달하고, 수정 사항을 반영해 마무리합니다.',
      note: '',
    },
  ],
  priceTalk: {
    title: '금액은 곡에 맞춰 조율할 수 있습니다',
    body: '표기된 금액은 기준이 되는 기본가입니다. 곡의 길이와 구성, 악기·트랙 수, 장르, 작업 기간에 따라 달라지고, 곡을 확인한 뒤 기본가보다 낮아지기도 하고 높아지기도 합니다.\n예산이 정해져 있다면 먼저 말씀해 주세요. 그 안에서 할 수 있는 범위를 함께 찾아보겠습니다.',
  },
  assure: [
    { title: '문의만으로 확정되지 않아요', desc: '문의는 견적을 확인하기 위한 첫 단계입니다. 금액과 일정을 안내받고 조율한 뒤에 진행 여부를 정하시면 됩니다.' },
    { title: '정리되지 않아도 괜찮아요', desc: '곡의 용도와 원하는 분위기만 알려주셔도 됩니다. 레퍼런스나 가이드 음원이 없어도, 모르는 항목은 비워 두셔도 됩니다.' },
    { title: '용어를 몰라도 괜찮아요', desc: '음악 용어를 몰라도 됩니다. 원하는 느낌을 편한 말로 설명해 주세요.' },
    { title: '작업 스타일을 먼저 들어 보세요', desc: '포트폴리오에서 이전 작업물을 미리 들어 보실 수 있습니다. 비슷한 곡을 레퍼런스로 보내 주시면 방향을 맞추기 쉽습니다.' },
  ],
  faq: [
    {
      q: '뭘 준비해야 하나요?',
      a: '곡의 용도와 원하는 분위기만 알려주셔도 시작할 수 있습니다. 참고할 곡(레퍼런스)이나 가이드 음원이 있으면 더 정확한 견적을 드릴 수 있습니다.',
    },
    {
      q: '금액이 왜 곡마다 달라지나요?',
      a: '같은 분야여도 곡의 길이와 구성, 악기·트랙 수, 장르, 작업 기간에 따라 작업량이 크게 달라지기 때문입니다. 표기된 금액은 기준이 되는 기본가이고, 곡을 확인한 뒤 기본가보다 낮아지기도 하고 높아지기도 합니다.',
    },
    {
      q: '견적을 받으면 꼭 진행해야 하나요?',
      a: '아니요. 안내드린 금액과 일정을 보고 조율하거나, 진행하지 않기로 하셔도 괜찮습니다.',
    },
  ],
  contact: {
    lead: '',
    reply: '',
    ask: '아래 내용을 알려주시면 답변이 빨라집니다. 모르는 항목은 비워두셔도 됩니다.',
    fields: ['곡의 용도', '필요한 작업', '대략적인 분량', '원하는 분위기·레퍼런스', '희망 일정', '예산 범위'],
  },
};

/** "문의 양식 복사" 버튼으로 복사되는 글 */
export const inquiryTemplate = (fields: string[]) =>
  ['[문의 양식] 모르는 항목은 비워두셔도 됩니다.', '', ...fields.map((f) => `- ${f}:`)].join('\n');
