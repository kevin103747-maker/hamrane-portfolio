// src/lib/admin/rate-forms.ts — 패키지·폴더 폼의 입력 해석(검증). 저장 자체는 각 액션이 합니다.
import { adminDb } from '@/lib/auth/admin-db';
import {
  str, list, flag, validMoney, digits, money, buildDiscount,
} from './forms';

export type FormResult<T> = { ok: true; data: T } | { ok: false; error: string };
const bad = <T>(error: string): FormResult<T> => ({ ok: false, error });

export type PackageExtra = {
  name: string; nameEn?: string; group?: string; groupEn?: string;
  who?: string; whoEn?: string; price?: string; priceUsd?: string; optional?: boolean;
};

export type ParsedPackage = {
  id: string;
  num: string;
  tag: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  total: string;
  totalUsd?: string;
  itemIds: string[];
  qty: Record<string, number>;
  prices: Record<string, string>;
  pricesUsd: Record<string, string>;
  est: string[];
  optional: string[];
  extras: PackageExtra[];
  discount: Record<string, unknown> | null;
  folderId: string;
  workIds: string[];
};

/** savePackage의 입력 해석 부분. rate_items 존재 확인까지 하고, 폴더 확인·저장은 호출부가 합니다. */
export async function parsePackageForm(fd: FormData): Promise<FormResult<ParsedPackage>> {
  const id = str(fd, 'id');
  const num = str(fd, 'num');
  const tag = str(fd, 'tag');
  const name = str(fd, 'name');
  const desc = str(fd, 'desc');
  const totalIn = str(fd, 'total');
  const nameEn = str(fd, 'nameEn');
  const descEn = str(fd, 'descEn');
  const itemIds = list(fd, 'itemIds');
  const folderId = str(fd, 'folderId');
  // 샘플 곡: 폼이 보낸 순서대로, 중복은 첫 등장만 남깁니다.
  const workIds = [...new Set(list(fd, 'workIds'))];
  if (workIds.length > 3) return bad('샘플 곡은 최대 3개까지 연결할 수 있습니다.');

  // 수량: 선택한 항목만 저장하고, 1이면 저장하지 않습니다.
  const qty: Record<string, number> = {};
  // 개당 금액: 입력한 항목만 저장합니다. 비우면 단가표 금액, 0이면 무료입니다.
  const prices: Record<string, string> = {};
  // 개당 금액 USD
  const pricesUsd: Record<string, string> = {};
  // 수량이 예시인 항목(곡마다 달라질 수 있음)
  const est: string[] = [];
  // 방문자가 끌 수 있는 항목 id들
  const optional: string[] = [];
  for (const iid of itemIds) {
    const n = Number(str(fd, `qty_${iid}`) || '1');
    if (!Number.isInteger(n) || n < 1 || n > 99) return bad('수량은 1~99 사이의 정수로 입력하세요.');
    if (n > 1) qty[iid] = n;

    const pr = str(fd, `price_${iid}`);
    if (pr) {
      if (!validMoney(pr)) return bad('개당 금액은 숫자로 입력하세요. (무료는 0, 단가표 금액을 쓰려면 비워 두세요)');
      prices[iid] = money(pr);
    }

    const prUsd = str(fd, `priceUsd_${iid}`);
    if (prUsd) {
      if (!validMoney(prUsd)) return bad('개당 금액 USD는 숫자로 입력하세요.');
      pricesUsd[iid] = money(prUsd);
    }

    if (flag(fd, `est_${iid}`)) est.push(iid);
    if (flag(fd, `opt_${iid}`)) optional.push(iid);
  }

  // 협업·외부 상품: 이름·분야·담당·금액 입력칸이 같은 순서로 넘어옵니다.
  const exName = fd.getAll('exName').map(String);
  const exGroup = fd.getAll('exGroup').map(String);
  const exWho = fd.getAll('exWho').map(String);
  const exPrice = fd.getAll('exPrice').map(String);
  const exPriceUsd = fd.getAll('exPriceUsd').map(String);
  const exNameEn = fd.getAll('exNameEn').map(String);
  const exGroupEn = fd.getAll('exGroupEn').map(String);
  const exWhoEn = fd.getAll('exWhoEn').map(String);
  const exOpt = fd.getAll('exOpt').map(String); // '0' = 고정, '1' = 끌 수 있음
  const extras: PackageExtra[] = [];
  for (let i = 0; i < exName.length; i++) {
    const n = exName[i].trim();
    const group = (exGroup[i] ?? '').trim();
    const who = (exWho[i] ?? '').trim();
    const price = (exPrice[i] ?? '').trim();
    const priceUsd = (exPriceUsd[i] ?? '').trim();
    const nEn = (exNameEn[i] ?? '').trim();
    const groupEn = (exGroupEn[i] ?? '').trim();
    const whoEn = (exWhoEn[i] ?? '').trim();
    const opt = (exOpt[i] ?? '0') === '1';
    if (!n && !group && !who && !price && !priceUsd && !nEn && !groupEn && !whoEn) continue; // 빈 줄은 건너뜀
    if (!n) return bad('협업·외부 상품은 한국어 이름을 입력해야 합니다.');
    if (n.length > 30) return bad(`협업 상품 이름은 30자 이내로 입력하세요. (${n})`);
    if (group.length > 20 || who.length > 20) return bad('분야 표기와 담당은 각각 20자 이내로 입력하세요.');
    if (nEn.length > 60 || groupEn.length > 40 || whoEn.length > 40) return bad(`영어 문구가 너무 깁니다. (이름 60자, 분야·담당 40자 이내) (${n})`);
    if (price && !validMoney(price)) return bad(`협업 상품 금액은 숫자로 입력하세요. (무료는 0) (${n})`);
    if (priceUsd && !validMoney(priceUsd)) return bad(`협업 상품 USD 금액은 숫자로 입력하세요. (${n})`);
    extras.push({
      name: n,
      ...(nEn ? { nameEn: nEn } : {}),
      ...(group ? { group } : {}),
      ...(groupEn ? { groupEn } : {}),
      ...(who ? { who } : {}),
      ...(whoEn ? { whoEn } : {}),
      ...(price ? { price: money(price) } : {}),
      ...(priceUsd ? { priceUsd: money(priceUsd) } : {}),
      ...(opt ? { optional: true } : {}),
    });
  }
  if (extras.length > 12) return bad('협업·외부 상품은 최대 12개까지 넣을 수 있습니다.');

  if (!num) return bad('번호를 입력하세요. (예: 01)');
  if (!tag) return bad('태그를 입력하세요. (예: ORIGINAL)');
  if (!name) return bad('이름을 입력하세요.');
  if (nameEn.length > 120 || descEn.length > 300) return bad('영어 문구가 너무 깁니다. (이름 120자, 설명 300자 이내)');
  if (!validMoney(totalIn) || digits(totalIn) <= 0) return bad('합계는 0보다 큰 숫자로 입력하세요.');
  if (!itemIds.length && !extras.length) return bad('포함할 항목을 하나 이상 선택하거나 협업 상품을 추가하세요.');
  const total = money(totalIn);
  const totalUsdIn = str(fd, 'totalUsd');
  const totalUsd = totalUsdIn && validMoney(totalUsdIn) ? money(totalUsdIn) : undefined;
  const disc = buildDiscount(fd, total, totalUsd);
  if (!disc.ok) return bad(disc.error);

  const db = adminDb();
  if (itemIds.length) {
    const { data: found } = await db.from('rate_items').select('id').in('id', itemIds);
    if ((found ?? []).length !== new Set(itemIds).size) {
      return bad('존재하지 않는 항목이 포함되어 있습니다. 새로고침 후 다시 선택하세요.');
    }
  }
  if (workIds.length) {
    const { data: foundWorks } = await db.from('works').select('id').in('id', workIds);
    if ((foundWorks ?? []).length !== workIds.length) {
      return bad('존재하지 않는 곡이 포함되어 있습니다. 새로고침 후 다시 선택하세요.');
    }
  }

  // optional에서 현재 패키지에 없는 항목 id를 제거
  const optionalFiltered = optional.filter((x) => itemIds.includes(x));

  return {
    ok: true,
    data: {
      id, num, tag, name, nameEn, desc, descEn, total, totalUsd,
      itemIds, qty, prices, pricesUsd, est, optional: optionalFiltered,
      extras, discount: disc.discount, folderId, workIds,
    },
  };
}

export type ParsedFolder = {
  id: string;
  parentId: string;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  hidden: boolean;
  question: string;
  questionEn: string;
};

/** saveFolder의 입력 해석 부분. 상위 폴더 존재·순환·깊이 확인은 호출부가 합니다. */
export function parseFolderForm(fd: FormData): FormResult<ParsedFolder> {
  const id = str(fd, 'id');
  const parentId = str(fd, 'parentId');
  const name = str(fd, 'name');
  const nameEn = str(fd, 'nameEn');
  const desc = str(fd, 'desc');
  const descEn = str(fd, 'descEn');
  const hidden = flag(fd, 'hidden');
  const question = str(fd, 'question');
  const questionEn = str(fd, 'questionEn');

  if (!name) return bad('한국어 이름을 입력하세요.');
  if (name.length > 20) return bad('한국어 이름은 20자 이내로 입력하세요.');
  if (nameEn.length > 40) return bad('영어 이름은 40자 이내로 입력하세요.');
  if (desc.length > 60) return bad('한국어 설명은 60자 이내로 입력하세요.');
  if (descEn.length > 120) return bad('영어 설명은 120자 이내로 입력하세요.');
  if (question.length > 40) return bad('한국어 질문은 40자 이내로 입력하세요.');
  if (questionEn.length > 80) return bad('영어 질문은 80자 이내로 입력하세요.');

  return { ok: true, data: { id, parentId, name, nameEn, desc, descEn, hidden, question, questionEn } };
}
