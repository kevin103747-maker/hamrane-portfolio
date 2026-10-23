// src/app/hr-admin/(panel)/guide/actions.ts — 의뢰 가이드 문구 저장
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { GUIDE_LIMITS as L, type GuideSettings } from '@/lib/guide';

const BACK = '/hr-admin/guide';

function fail(msg: string): never {
  redirect(`${BACK}?err=${encodeURIComponent(msg)}`);
}

const one = (s: string) => s.replace(/\s+/g, ' ').trim();
const multi = (s: string) =>
  s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.trimEnd()).join('\n').replace(/\n{3,}/g, '\n\n').trim();
const text = (fd: FormData, k: string) => String(fd.get(k) ?? '');

function tooLong(label: string, s: string, max: number) {
  if (s.length > max) fail(`${label}은(는) ${max}자 이내로 입력해 주세요. (현재 ${s.length}자)`);
}

/** 영어 문구는 한국어보다 길어지기 쉬워서 한국어 제한의 2배까지 허용합니다. (화면 입력란 maxLength와 같은 값) */
const EN_X = 2;
function tooLongEn(label: string, s: string, max: number) {
  tooLong(`${label} (영어)`, s, max * EN_X);
}

/** 같은 이름의 입력란이 여러 개일 때 행 단위로 묶어 돌려줍니다. */
function table(fd: FormData, names: string[]): string[][] {
  const cols = names.map((n) => fd.getAll(n).map(String));
  const len = Math.max(0, ...cols.map((c) => c.length));
  return Array.from({ length: len }, (_, i) => cols.map((c) => c[i] ?? ''));
}

export async function saveGuide(fd: FormData) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');

  const db = adminDb();
  const { data: old } = await db.from('site_settings').select('value').eq('key', 'guide').maybeSingle();

  // 기본 문구로 되돌리기: 저장된 값을 지우면 코드의 기본 문구가 다시 쓰입니다.
  if (fd.get('reset') === 'on') {
    const del = await db.from('site_settings').delete().eq('key', 'guide');
    if (del.error) fail(`되돌리기 실패: ${del.error.message}`);
    await logEdit(me, 'delete', 'site_settings', 'guide', old?.value ?? null, null);
    redirect(`${BACK}?ok=reset`);
  }

  // 페이지 맨 위 인사말
  const ftTitle = one(text(fd, 'ftTitle'));
  const ftBody = one(text(fd, 'ftBody'));
  const ftTitleEn = one(text(fd, 'ftTitleEn'));
  const ftBodyEn = one(text(fd, 'ftBodyEn'));
  tooLong('인사말 제목', ftTitle, L.ftTitle);
  tooLong('인사말 소개 문장', ftBody, L.ftBody);
  tooLongEn('인사말 제목', ftTitleEn, L.ftTitle);
  tooLongEn('인사말 소개 문장', ftBodyEn, L.ftBody);

  // 진행 순서: 한국어·영어 모두 완전히 빈 줄은 버립니다.
  const steps: GuideSettings['steps'] = [];
  table(fd, ['stepTitle', 'stepDesc', 'stepNote', 'stepTitleEn', 'stepDescEn', 'stepNoteEn']).forEach(
    ([t, d, n, te, de, ne], i) => {
      const title = one(t), desc = one(d), note = one(n);
      const titleEn = one(te), descEn = one(de), noteEn = one(ne);
      if (!title && !desc && !note && !titleEn && !descEn && !noteEn) return;
      if (!title || !desc) fail(`${i + 1}번째 진행 단계: 한국어 제목과 설명을 모두 입력하세요. (필요 없으면 삭제 버튼을 누르세요)`);
      tooLong(`${i + 1}번째 단계 제목`, title, L.stepTitle);
      tooLong(`${i + 1}번째 단계 설명`, desc, L.stepDesc);
      tooLong(`${i + 1}번째 단계 덧붙임`, note, L.stepNote);
      tooLongEn(`${i + 1}번째 단계 제목`, titleEn, L.stepTitle);
      tooLongEn(`${i + 1}번째 단계 설명`, descEn, L.stepDesc);
      tooLongEn(`${i + 1}번째 단계 덧붙임`, noteEn, L.stepNote);
      steps.push({ title, desc, note, titleEn, descEn, noteEn });
    },
  );
  if (steps.length > L.stepMax) fail(`진행 단계는 ${L.stepMax}개까지 가능합니다.`);

  // 가격 조율 안내
  const ptTitle = one(text(fd, 'ptTitle'));
  const ptBody = multi(text(fd, 'ptBody'));
  const ptTitleEn = one(text(fd, 'ptTitleEn'));
  const ptBodyEn = multi(text(fd, 'ptBodyEn'));
  tooLong('가격 조율 안내 제목', ptTitle, L.ptTitle);
  tooLong('가격 조율 안내 본문', ptBody, L.ptBody);
  tooLongEn('가격 조율 안내 제목', ptTitleEn, L.ptTitle);
  tooLongEn('가격 조율 안내 본문', ptBodyEn, L.ptBody);

  // 안심 포인트 카드
  const assure: GuideSettings['assure'] = [];
  table(fd, ['assureTitle', 'assureDesc', 'assureTitleEn', 'assureDescEn']).forEach(([t, d, te, de], i) => {
    const title = one(t), desc = multi(d);
    const titleEn = one(te), descEn = multi(de);
    if (!title && !desc && !titleEn && !descEn) return;
    if (!title || !desc) fail(`${i + 1}번째 안심 카드: 한국어 제목과 설명을 모두 입력하세요. (필요 없으면 삭제 버튼을 누르세요)`);
    tooLong(`${i + 1}번째 안심 카드 제목`, title, L.assureTitle);
    tooLong(`${i + 1}번째 안심 카드 설명`, desc, L.assureDesc);
    tooLongEn(`${i + 1}번째 안심 카드 제목`, titleEn, L.assureTitle);
    tooLongEn(`${i + 1}번째 안심 카드 설명`, descEn, L.assureDesc);
    assure.push({ title, desc, titleEn, descEn });
  });
  if (assure.length > L.assureMax) fail(`안심 카드는 ${L.assureMax}개까지 가능합니다.`);

  // 자주 묻는 질문
  const faq: GuideSettings['faq'] = [];
  table(fd, ['faqQ', 'faqA', 'faqQEn', 'faqAEn']).forEach(([qq, aa, qe, ae], i) => {
    const q = one(qq), a = multi(aa);
    const qEn = one(qe), aEn = multi(ae);
    if (!q && !a && !qEn && !aEn) return;
    if (!q || !a) fail(`${i + 1}번째 질문: 한국어 질문과 답변을 모두 입력하세요. (필요 없으면 삭제 버튼을 누르세요)`);
    tooLong(`${i + 1}번째 질문`, q, L.faqQ);
    tooLong(`${i + 1}번째 답변`, a, L.faqA);
    tooLongEn(`${i + 1}번째 질문`, qEn, L.faqQ);
    tooLongEn(`${i + 1}번째 답변`, aEn, L.faqA);
    faq.push({ q, a, qEn, aEn });
  });
  if (faq.length > L.faqMax) fail(`질문은 ${L.faqMax}개까지 가능합니다.`);

  // 문의 영역 (이번 단계에서는 영어 칸 없음)
  const lead = one(text(fd, 'contactLead'));
  const reply = one(text(fd, 'contactReply'));
  const ask = one(text(fd, 'contactAsk'));
  tooLong('문의 영역 첫 문장', lead, L.lead);
  tooLong('답변 시간 안내', reply, L.reply);
  tooLong('문의 요청 문구', ask, L.ask);
  const fields = [...new Set(text(fd, 'contactFields').split(/\r?\n/).map(one).filter(Boolean))];
  if (fields.length > L.fieldMax) fail(`문의 항목은 ${L.fieldMax}개까지 가능합니다. (현재 ${fields.length}개)`);
  fields.forEach((f) => tooLong(`문의 항목 "${f}"`, f, L.fieldLen));

  const value: GuideSettings = {
    firstTime: { title: ftTitle, body: ftBody, titleEn: ftTitleEn, bodyEn: ftBodyEn },
    steps,
    priceTalk: { title: ptTitle, body: ptBody, titleEn: ptTitleEn, bodyEn: ptBodyEn },
    assure,
    faq,
    contact: { lead, reply, ask, fields },
  };

  const saved = await db.from('site_settings').upsert({ key: 'guide', value }, { onConflict: 'key' });
  if (saved.error) fail(`저장 실패: ${saved.error.message}`);
  await logEdit(me, 'update', 'site_settings', 'guide', old?.value ?? null, value);
  redirect(`${BACK}?ok=1`);
}
