// src/components/PricingView.tsx — 단가 페이지 본문. 한국어(/pricing)와 영어(/en/pricing)가 함께 씁니다.
import Link from '@/components/LocaleLink';
import { getSiteData } from '@/lib/site-data';
import { tx, type Text } from '@/lib/i18n';
import { dict } from '@/lib/dict';
import { PageHead, SectionHead } from '@/components/Heads';
import { RateBoard, type BoardGroup } from '@/components/RateBoard';
import { PackageList, type PackageView, type PkgLine } from '@/components/PackageList';
import { turnFor, type GroupTurn } from '@/lib/turnaround';
import { getTurnaround } from '@/lib/turnaround-settings';
import { getDiscounts } from '@/lib/discounts-settings';
import { groupView } from '@/lib/discounts';
import { BundleBox } from '@/components/BundleBox';
import { getBonus } from '@/lib/bonus-settings';
import { getPricingWorks } from '@/lib/pricing-works';
import { getPricingMixer, type MixItem } from '@/lib/pricing-mixer';
import type { BonusView } from '@/lib/bonus';
import { bonusFor } from '@/lib/bonus';

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

export async function PricingView({ lang = 'ko' }: { lang?: string }) {
  const L = dict(lang).pricing;
  const tr = (v: Text) => tx(v, lang);
  // 영어 화면: 영어 기간 문구가 있으면 그것을, 없으면 한국어 값을 씁니다.
  const turnOf = (t?: GroupTurn): GroupTurn | undefined =>
    !t || lang === 'ko' ? t : { ...t, avg: t.avgEn || t.avg, rush: { ...t.rush, days: t.rush.daysEn || t.rush.days } };
  const [d, turnaround, discounts, bn, pw, pm] = await Promise.all([
    getSiteData(), getTurnaround(), getDiscounts(), getBonus(), getPricingWorks(), getPricingMixer(),
  ]);
  // 분야 이름: 한국어는 그대로, 영어는 어드민 영어 이름 → 기존 영어 라벨 → 한국어 순으로 씁니다.
  const gName = (g: (typeof d.groups)[number]) => (lang === 'ko' ? tr(g.name) : g.name[lang] || g.en || g.name.ko);
  const item = (id: string) => d.rateItems.find((i) => i.id === id);
  const mixItems = (gid: string): MixItem[] => {
    const cfg = pm[gid];
    if (!cfg?.on) return [];
    return cfg.ids.flatMap((id) => {
      const w = d.works.find((x) => x.id === id);
      if (w && (w.tracks?.length ?? 0) > 1) {
        const sub = w.artistIds.map((a) => d.artists.find((x) => x.id === a)?.name).filter(Boolean).join(', ');
        return [{ id, title: w.title, sub, youtubeId: w.youtubeId, tracks: w.tracks ?? [] }];
      }
      return cfg.items?.filter((x) => x.id === id) ?? [];
    });
  };
  // 단가 항목이 하나라도 있는 분야만 표시합니다. (리믹스처럼 포트폴리오 전용 분야는 단가 항목을 넣지 않으면 숨겨집니다.)
  const groups = d.groups.filter((g) => d.rateItems.some((i) => i.groupId === g.id));
  // 화면의 분야 번호는 보이는 분야 기준으로 01부터 다시 매깁니다.
  const no = (n: number) => String(n + 1).padStart(2, '0');
  // 서비스 혜택: 켜져 있고 이름이 있을 때만 보입니다. 모든 작업에 기본 적용, 제외 목록만 뺍니다.
  const bonusOn = bn.on && bn.title !== '';
  // 영어 화면은 영어 문구가 있는 곳만 영어로, 비었으면 한국어로 대신합니다.
  const bonusView: BonusView | undefined = bonusOn ? bonusFor(bn, lang) : undefined;
  // 클라이언트 컴포넌트에는 글자만 담은 단순한 데이터로 넘깁니다.
  const board: BoardGroup[] = groups.map((g, n) => ({
    id: g.id,
    no: no(n),
    name: gName(g),
    en: lang === 'ko' ? g.en : '',
    desc: tr(g.desc),
    disc: groupView(discounts, g.id),
    pick: pw[g.id],
    mixer: pm[g.id]?.on && mixItems(g.id).length ? { mode: pm[g.id].mode, items: mixItems(g.id) } : undefined,
    items: d.rateItems
      .filter((i) => i.groupId === g.id)
      .map((i) => ({
        id: i.id, name: tr(i.name), desc: tr(i.desc), price: i.price, priceUsd: i.priceUsd, unit: tr(i.unit), tag: i.tag, discount: i.discount,
        turn: turnOf(turnFor(turnaround, g.id, i.id)),
        noDisc: discounts.excluded.includes(i.id),
        bonus: bonusOn && !bn.excluded.includes(i.id) ? bonusView?.title : undefined,
        noBonus: bonusOn && bn.excluded.includes(i.id) ? bonusView?.title : undefined,
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
          push(gName(g), {
            name: tr(it.name),
            qty: p.qty?.[id] ?? 1,
            unit: amt(p.prices?.[id] ?? it.price),
            unitUsd: amt(p.pricesUsd?.[id]),
            list: amt(it.price),
            est: (p.est ?? []).includes(id),
            noun: lang === 'ko' ? nounOf(tr(it.unit)) : '',
          });
        }
      }
    }
    // 영어 화면: 영어 칸이 있으면 그것을, 비었으면 한국어를 씁니다.
    const pick = (ko?: string, en?: string) => (lang === 'ko' ? ko : en || ko);
    for (const e of p.extras ?? []) {
      push(pick(e.group, e.groupEn)?.trim() || L.extraGroup, {
        name: pick(e.name, e.nameEn) ?? '', qty: 1, unit: amt(e.price), unitUsd: amt(e.priceUsd), collab: true, who: pick(e.who, e.whoEn),
      });
    }

    return {
      id: p.id, no: p.no, tag: p.tag, name: tr(p.name), desc: tr(p.desc),
      total: p.total, totalUsd: p.totalUsd, discount: p.discount,
      rows: Array.from(rows, ([label, lines]) => ({ label, lines })),
    };
  });

  return (
    <>
      <PageHead crumb="PRICING" title={L.pageTitle} en={L.pageSub} desc={L.pageDesc} />

      <section><div className="wrap">
        <RateBoard groups={board} bonus={bonusView} />

        <p className="hr-pt-note sm">
          {L.askNote}{' '}<a className="hr-pt-link" href="#contact">{L.askLink}</a>
        </p>

        <BundleBox
          tiers={discounts.bundle}
          lang={lang}
          yes={groups.filter((g) => discounts.groups[g.id]?.bundle).map((g) => gName(g))}
          no={groups.filter((g) => !discounts.groups[g.id]?.bundle).map((g) => gName(g))}
        />
        <p className="note"><i>NOTE</i>{tr(d.notice)}</p>
      </div></section>

      <section className="blk"><div className="wrap">
        <SectionHead n="EXAMPLES" title={L.exTitle} sub={L.exSub} />
        <p className="hr-rt-cap">{L.exCap}</p>
        <PackageList items={packages} />
      </div></section>

      <section className="hr-faq-sec"><div className="wrap">
        <Link className="hr-gp-banner" href="/guide">
          <span><b>{L.firstQ}</b> {L.firstDesc}</span>
          <span className="go">{L.firstGo}</span>
        </Link>
      </div></section>
    </>
  );
}
