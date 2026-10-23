// src/components/GuideView.tsx — 의뢰 가이드 본문. /guide(한국어)와 /en/guide(영어)가 함께 씁니다.
import Link from '@/components/LocaleLink';
import { getGuideSettings } from '@/lib/guide-settings';
import { guideFor } from '@/lib/guide';
import { dict } from '@/lib/dict';
import { PageHead, SectionHead } from '@/components/Heads';
import { AssureGrid, QaList, StepList } from '@/components/GuideBlocks';

export async function GuideView({ lang }: { lang: 'ko' | 'en' }) {
  const g = guideFor(await getGuideSettings(), lang);
  const L = dict(lang).guide;
  const { firstTime: ft, priceTalk: pt } = g;

  // 내용이 있는 블록만 보여 주고, 보이는 블록끼리 01부터 번호를 매깁니다.
  const show = [g.steps.length > 0, !!(pt.title || pt.body), g.assure.length > 0, g.faq.length > 0];
  const no = (i: number) => String(show.slice(0, i + 1).filter(Boolean).length).padStart(2, '0');

  return (
    <>
      <PageHead crumb="GUIDE" title={ft.title || L.title} en="Guide" desc={ft.body || L.desc}>
        <a className="hr-pt-cta" href="#contact">{L.cta}</a>
      </PageHead>

      <section><div className="wrap">
        <div className="hr-gp">
          {show[0] && (
            <div className="hr-gp-blk">
              <SectionHead n={no(0)} title={L.stepsTitle} sub="Process" />
              <StepList steps={g.steps} />
            </div>
          )}

          {show[1] && (
            <div className="hr-gp-blk">
              <SectionHead n={no(1)} title={L.priceTitle} sub="Pricing" />
              <div className="hr-gp-price">
                {pt.title && <h3>{pt.title}</h3>}
                {pt.body && <p>{pt.body}</p>}
                <Link className="hr-gp-link" href="/pricing">{L.priceLink}</Link>
              </div>
            </div>
          )}

          {show[2] && (
            <div className="hr-gp-blk">
              <SectionHead n={no(2)} title={L.assureTitle} sub="Assurance" />
              <AssureGrid items={g.assure} />
            </div>
          )}

          {show[3] && (
            <div className="hr-gp-blk">
              <SectionHead n={no(3)} title={L.faqTitle} sub="Q&A" />
              <QaList items={g.faq} />
            </div>
          )}
        </div>

        <p className="hr-pt-note">{L.note}</p>
      </div></section>
    </>
  );
}
