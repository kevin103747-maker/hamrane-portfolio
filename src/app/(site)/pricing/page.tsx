// src/app/(site)/pricing/page.tsx
import Link from 'next/link';
import { getSiteData } from '@/lib/site-data';
import { tx } from '@/lib/i18n';
import { PageHead, SectionHead } from '@/components/Heads';
import { RateBoard, type BoardGroup } from '@/components/RateBoard';
import { PackageList, type PackageView, type PkgLine } from '@/components/PackageList';
import { turnFor } from '@/lib/turnaround';
import { getTurnaround } from '@/lib/turnaround-settings';
import { getDiscounts } from '@/lib/discounts-settings';
import { groupView } from '@/lib/discounts';
import { BundleBox } from '@/components/BundleBox';

export const metadata = { title: 'Pricing' };

/** "150,000" 같은 글자에서 금액을 읽습니다. 비었거나 숫자가 아니면 null, "0"은 0(무료)입니다. */
const amt = (s?: string): number | null => {
  const digits = (s ?? '').replace(/[^\d]/g, '');
  return digits === '' ? null : Number(digits);
};

/** 단가표 단위에서 세는 말만 뽑습니다. "트랙당" → "트랙", "곡당" → "곡". 그 외(숫자 포함 등)는 빈 글자 */
const nounOf = (u: string) => {
  const m = u.trim().match(/^([^\d\s]{1,6})당$/);
  return m ? m[1] : '';
};

export default async function Pricing() {
  const [d, turnaround, discounts] = await Promise.all([
    getSiteData(), getTurnaround(), getDiscounts(),
  ]);
  const item = (id: string) => d.rateItems.find((i) => i.id === id);
  // 단가 항목이 하나라도 있는 분야만 표시합니다. (리믹스처럼 포트폴리오 전용 분야는 단가 항목을 넣지 않으면 숨겨집니다.)
  const groups = d.groups.filter((g) => d.rateItems.some((i) => i.groupId === g.id));
  // 화면의 분야 번호는 보이는 분야 기준으로 01부터 다시 매깁니다.
  const no = (n: number) => String(n + 1).padStart(2, '0');

  // 클라이언트 컴포넌트에는 글자만 담은 단순한 데이터로 넘깁니다.
  const board: BoardGroup[] = groups.map((g, n) => ({
    id: g.id,
    no: no(n),
    name: tx(g.name),
    en: g.en,
    desc: tx(g.desc),
    disc: groupView(discounts, g.id),
    items: d.rateItems
      .filter((i) => i.groupId === g.id)
      .map((i) => ({
        id: i.id, name: tx(i.name), desc: tx(i.desc), price: i.price, unit: tx(i.unit), tag: i.tag, discount: i.discount,
        turn: turnFor(turnaround, g.id, i.id),
        noDisc: discounts.excluded.includes(i.id),
      })),
  }));

  // 패키지: 분야별로 묶고, 협업·외부 상품은 같은 줄(또는 새 줄)에 넣습니다.
  // 금액: 패키지에서 따로 정한 개당 금액이 있으면 그 값(0이면 무료), 없으면 단가표의 정가를 씁니다.
  const packages: PackageView[] = d.packages.map((p) => {
    const rows = new Map<string, PkgLine[]>();
    const push = (label: string, line: PkgLine) => rows.set(label, [...(rows.get(label) ?? []), line]);

    for (const g of d.groups) {
      for (const id of p.itemIds) {
        const it = item(id);
        if (it && it.groupId === g.id) {
          push(tx(g.name), {
            name: tx(it.name),
            qty: p.qty?.[id] ?? 1,
            unit: amt(p.prices?.[id] ?? it.price),
            list: amt(it.price),
            est: (p.est ?? []).includes(id),
            noun: nounOf(tx(it.unit)),
          });
        }
      }
    }
    for (const e of p.extras ?? []) {
      push(e.group?.trim() || '추가 구성', { name: e.name, qty: 1, unit: amt(e.price), collab: true, who: e.who });
    }

    return {
      id: p.id, no: p.no, tag: p.tag, name: tx(p.name), desc: tx(p.desc),
      total: p.total, discount: p.discount,
      rows: Array.from(rows, ([label, lines]) => ({ label, lines })),
    };
  });

  return (
    <>
      <PageHead
        crumb="PRICING"
        title="외주 단가"
        en="Pricing"
        desc="파트별 기본 단가입니다. 곡의 난이도와 작업량에 따라 달라지므로, 곡을 보내주시면 확인 후 정확한 견적을 드립니다."
      >
      </PageHead>

      <section><div className="wrap">
        <RateBoard groups={board} />

        <div className="hr-pt-end">
          <p>찾는 작업이 없거나 조합이 궁금하시면 편하게 물어보세요.</p>
          <a className="hr-pt-cta sm" href="#contact">문의하기 →</a>
        </div>

        <BundleBox
          tiers={discounts.bundle}
          yes={groups.filter((g) => discounts.groups[g.id]?.bundle).map((g) => tx(g.name))}
          no={groups.filter((g) => !discounts.groups[g.id]?.bundle).map((g) => tx(g.name))}
        />
        <p className="note"><i>NOTE</i>{tx(d.notice)}</p>
      </div></section>

      <section className="blk"><div className="wrap">
        <SectionHead n="EXAMPLES" title="패키지 예시" sub="Packages" />
        <p className="hr-rt-cap">예시 구성이며, 실제 금액은 곡의 난이도와 작업량에 따라 달라집니다.</p>
        <PackageList items={packages} />
      </div></section>

      <section className="hr-faq-sec"><div className="wrap">
        <Link className="hr-gp-banner" href="/guide">
          <span><b>처음 의뢰하시나요?</b> 진행 방식, 가격 조율, 자주 묻는 질문을 정리해 두었어요.</span>
          <span className="go">의뢰 가이드 보기 →</span>
        </Link>
      </div></section>
    </>
  );
}
