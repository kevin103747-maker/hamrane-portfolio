// src/app/pricing/page.tsx
import { getSiteData } from '@/lib/site-data';
import { tx } from '@/lib/i18n';
import { PageHead, SectionHead } from '@/components/Heads';
import { Price, Until } from '@/components/Price';
import { Icon } from '@/components/Icons';

export const metadata = { title: 'Pricing' };

export default async function Pricing() {
  const d = await getSiteData();
  const item = (id: string) => d.rateItems.find((i) => i.id === id);
  const gname = (id: string) => { const g = d.groups.find((x) => x.id === id); return g ? tx(g.name) : ''; };
  // 단가 항목이 하나라도 있는 분야만 표시합니다. (리믹스처럼 포트폴리오 전용 분야는 단가 항목을 넣지 않으면 숨겨집니다.)
  const groups = d.groups.filter((g) => d.rateItems.some((i) => i.groupId === g.id));
  // 화면의 분야 번호는 보이는 분야 기준으로 01부터 다시 매깁니다.
  const no = (n: number) => String(n + 1).padStart(2, '0');
  return (
    <>
      <PageHead crumb="PRICING" title="외주 단가" en="Pricing" desc="파트별 기본 단가입니다. 필요한 파트만 골라 의뢰하실 수 있습니다." />
      <section><div className="wrap">
        <nav className="cat-nav">{groups.map((g, n) => <a key={g.id} href={`#cat-${g.id}`}><small>{no(n)}</small>{tx(g.name)}</a>)}</nav>
        <div className="rates">
          {groups.map((g, n) => (
            <article className="cat" id={`cat-${g.id}`} key={g.id}>
              <div className="chd"><span className="no">{no(n)}</span><h3>{tx(g.name)}<span>{g.en}</span></h3><p>{tx(g.desc)}</p></div>
              <ul className="items">
                {d.rateItems.filter((i) => i.groupId === g.id).map((i) => (
                  <li className="it" key={i.id}>
                    <b>{tx(i.name)}{i.tag && <em>{i.tag}</em>}</b>
                    <p>{tx(i.desc)}</p>
                    <div className="amt"><Price price={i.price} discount={i.discount} /><i>{tx(i.unit)} · VAT 포함<Until discount={i.discount} /></i></div>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
        <p className="note"><i>NOTE</i>{tx(d.notice)}</p>
      </div></section>

      <section className="blk"><div className="wrap">
        <SectionHead n="EXAMPLES" title="패키지 예시" sub="Packages" />
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
    </>
  );
}
