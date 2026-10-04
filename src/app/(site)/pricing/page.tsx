// src/app/(site)/pricing/page.tsx
import { getSiteData } from '@/lib/site-data';
import { getGuideSettings } from '@/lib/guide-settings';
import { tx } from '@/lib/i18n';
import { PageHead, SectionHead } from '@/components/Heads';
import { Price, Until } from '@/components/Price';
import { RateBoard, type BoardGroup } from '@/components/RateBoard';
import { FirstTimeNote, ProcessSteps, FaqList } from '@/components/Guide';
import { Icon } from '@/components/Icons';

export const metadata = { title: 'Pricing' };

export default async function Pricing() {
  const [d, guide] = await Promise.all([getSiteData(), getGuideSettings()]);
  const item = (id: string) => d.rateItems.find((i) => i.id === id);
  const gname = (id: string) => { const g = d.groups.find((x) => x.id === id); return g ? tx(g.name) : ''; };
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
    items: d.rateItems
      .filter((i) => i.groupId === g.id)
      .map((i) => ({
        id: i.id, name: tx(i.name), desc: tx(i.desc), price: i.price, unit: tx(i.unit), tag: i.tag, discount: i.discount,
      })),
  }));

  return (
    <>
      <PageHead
        crumb="PRICING"
        title="외주 단가"
        en="Pricing"
        desc="파트별 기본 단가입니다. 곡의 난이도와 작업량에 따라 달라지므로, 곡을 보내주시면 확인 후 정확한 견적을 드립니다."
      />
      <section><div className="wrap">
        <FirstTimeNote data={guide.firstTime} />
        <ProcessSteps steps={guide.steps} />
        <RateBoard groups={board} />
        <p className="note"><i>NOTE</i>{tx(d.notice)}</p>
      </div></section>

      <section className="blk"><div className="wrap">
        <SectionHead n="EXAMPLES" title="패키지 예시" sub="Packages" />
        <p className="hr-rt-cap">예시 구성이며, 실제 금액은 곡의 난이도와 작업량에 따라 달라집니다.</p>
        <div className="pk">
          {d.packages.map((p) => (
            <div className="pc" key={p.id}>
              <div className="top"><span>EX {p.no}</span><em>{p.tag}</em></div>
              <h3>{tx(p.name)}</h3>
              <p className="pd">{tx(p.desc)}</p>
              <ul className="rec">
                {p.itemIds.map((id) => { const it = item(id); return it && <li key={id}><span>{tx(it.name)}</span><span>{gname(it.groupId)}</span></li>; })}
              </ul>
              <div className="sum">
                <small>EST.</small>
                <div className="tot"><strong><Price price={p.total} discount={p.discount} /></strong><div className="vat">VAT 포함<Until discount={p.discount} /></div></div>
              </div>
              <a className="ask" href="#contact">이 구성으로 문의 <Icon name="arrow" /></a>
            </div>
          ))}
        </div>
      </div></section>

      {guide.faq.length > 0 && (
        <section><div className="wrap">
          <SectionHead n="FAQ" title="자주 묻는 질문" sub="FAQ" />
          <FaqList faq={guide.faq} />
        </div></section>
      )}
    </>
  );
}
