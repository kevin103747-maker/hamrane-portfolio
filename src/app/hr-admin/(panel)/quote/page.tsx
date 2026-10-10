// src/app/hr-admin/(panel)/quote/page.tsx — 프로젝트 견적서·명세서(PNG) 만들기
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { getTurnaround } from '@/lib/turnaround-settings';
import { turnFor } from '@/lib/turnaround';
import { Help } from '@/components/admin/Section';
import { QuoteMaker, type QuoteGroup, type QuotePkg, type PresetLine } from '@/components/admin/QuoteMaker';
import { loadAccounts } from '@/lib/quote-accounts';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

/** "150,000" → 150000. 비었거나 숫자가 아니면 null, "0"은 0 */
const amt = (s: unknown): number | null => {
  const d = String(s ?? '').replace(/[^\d]/g, '');
  return d === '' ? null : Number(d);
};

/** 단가표 단위에서 세는 말만 뽑습니다. "트랙당" → "트랙" */
const nounOf = (u: string) => {
  const m = u.trim().match(/^([^\d\s]{1,6})당$/);
  return m ? m[1] : '';
};

export default async function QuotePage() {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');

  const db = adminDb();
  const [g, r, p, turnaround, accounts] = await Promise.all([
    db.from('part_groups').select('id, num, name').order('sort', { ascending: true }),
    db.from('rate_items').select('id, group_id, name, price, unit').order('sort', { ascending: true }),
    db.from('packages').select('*').order('sort', { ascending: true }),
    getTurnaround(),
    loadAccounts(),
  ]);
  const items = r.data ?? [];

  const groups: QuoteGroup[] = (g.data ?? [])
    .map((grp) => ({
      name: txt(grp.name),
      items: items
        .filter((x) => x.group_id === grp.id)
        .map((x) => {
          const t = turnFor(turnaround, grp.id as string, x.id as string);
          return {
            id: x.id as string, name: txt(x.name), price: amt(x.price), noun: nounOf(txt(x.unit)),
            rush: t?.rush.on ? { days: t.rush.days, fee: t.rush.fee } : undefined,
            same: t?.same.on ? { fee: t.same.fee } : undefined,
          };
        }),
    }))
    .filter((grp) => grp.items.length > 0);

  // 패키지: 패키지에 정해 둔 개당 금액(0=무료 포함)을 그대로 가져옵니다.
  const byId = new Map(items.map((x) => [x.id as string, x]));
  const pkgs: QuotePkg[] = (p.data ?? []).map((x) => {
    const prices = (x.prices ?? {}) as Record<string, string>;
    const qty = (x.qty ?? {}) as Record<string, number>;
    const lines: PresetLine[] = [];
    for (const id of (x.item_ids ?? []) as string[]) {
      const it = byId.get(id);
      if (!it) continue;
      const u = amt(prices[id] ?? it.price);
      lines.push({
        name: txt(it.name), qty: qty[id] ?? 1, unit: u == null ? '' : String(u),
        list: amt(it.price), noun: nounOf(txt(it.unit)), iid: id,
      });
    }
    for (const e of (x.extras ?? []) as { name: string; price?: string }[]) {
      const u = amt(e.price);
      lines.push({ name: e.name, qty: 1, unit: u == null ? '' : String(u), list: null, noun: '' });
    }
    return { id: x.id as string, label: `EX ${x.num} · ${txt(x.name)}`, lines };
  });

  return (
    <div className="hr-pn-body">
      <h1>견적서·명세서</h1>
      <p className="hr-lead">의뢰인에게 보낼 견적서와 작업 후 명세서를 곡별로 정리해서 PNG 이미지로 저장합니다.</p>
      <Help>
        <p>
          <b>곡별로 나눕니다.</b> 곡을 추가하고, 곡마다 단가표·패키지에서 항목을 고르거나 직접 입력하세요.
          비슷한 곡은 &quot;복제&quot;로 빠르게 만들 수 있습니다.
        </p>
        <p>
          <b>개당 금액</b>은 단가표 금액이 채워지며 바꿀 수 있습니다. <b>0은 무료</b>(정가가 취소선으로 같이 나옴),
          <b>비우면 &quot;협의&quot;</b>로 표시되고 합계에서 빠집니다.
        </p>
        <p>
          묶음 할인처럼 합계를 조정할 땐 &quot;할인/조정&quot;에 줄을 추가하세요. 할인은 <b>-50000</b>처럼 마이너스로 적습니다.
          곡이 많으면 오른쪽 미리보기에서 <b>요약</b> 보기를 쓰면 이미지가 짧아집니다.
        </p>
        <p>
          <b>명세서</b>는 같은 내용에서 문서 종류만 바꿔 만듭니다. 작업하면서 달라진 수량·금액을 고치고,
          작업 완료일·입금 기한·입금 계좌와 선입금(기 입금액)을 적으면 남은 금액이 계산됩니다.
          협의로 남은 항목은 확정 금액으로 바꿔 주세요.
        </p>
        <p>
          입력한 내용은 이 브라우저에만 임시 저장되며 서버에는 올라가지 않습니다. 다만 <b>자주 쓰는 입금 계좌 목록</b>은 서버에 저장되어 다른 기기에서도 불러올 수 있습니다.
          견적서를 보낼 때 <b>작업 파일 저장</b>(.json)도 같이 받아 두면, 나중에 <b>불러오기</b>로 이어서 명세서를 만들 수 있습니다.
        </p>
      </Help>
      <QuoteMaker groups={groups} pkgs={pkgs} accounts={accounts} />
    </div>
  );
}
