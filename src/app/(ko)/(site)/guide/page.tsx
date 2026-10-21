// src/app/(site)/guide/page.tsx — 의뢰 가이드: 처음 의뢰하는 분을 위한 진행 방식·가격 조율·안심 안내·자주 묻는 질문
import Link from 'next/link';
import { getGuideSettings } from '@/lib/guide-settings';
import { PageHead, SectionHead } from '@/components/Heads';
import { AssureGrid, QaList, StepList } from '@/components/GuideBlocks';

export const metadata = { title: 'Guide' };

export default async function GuidePage() {
  const g = await getGuideSettings();
  const { firstTime: ft, priceTalk: pt } = g;

  // 내용이 있는 블록만 보여 주고, 보이는 블록끼리 01부터 번호를 매깁니다.
  const show = [g.steps.length > 0, !!(pt.title || pt.body), g.assure.length > 0, g.faq.length > 0];
  const no = (i: number) => String(show.slice(0, i + 1).filter(Boolean).length).padStart(2, '0');

  return (
    <>
      <PageHead
        crumb="GUIDE"
        title={ft.title || '의뢰 가이드'}
        en="Guide"
        desc={ft.body || '진행 방식과 금액 조율, 자주 묻는 질문을 한곳에 정리했습니다.'}
      >
        <a className="hr-pt-cta" href="#contact">문의하기 →</a>
      </PageHead>

      <section><div className="wrap">
        <div className="hr-gp">
          {show[0] && (
            <div className="hr-gp-blk">
              <SectionHead n={no(0)} title="의뢰는 이렇게 진행됩니다" sub="Process" />
              <StepList steps={g.steps} />
            </div>
          )}

          {show[1] && (
            <div className="hr-gp-blk">
              <SectionHead n={no(1)} title="가격과 조율" sub="Pricing" />
              <div className="hr-gp-price">
                {pt.title && <h3>{pt.title}</h3>}
                {pt.body && <p>{pt.body}</p>}
                <Link className="hr-gp-link" href="/pricing">외주 단가 보기 →</Link>
              </div>
            </div>
          )}

          {show[2] && (
            <div className="hr-gp-blk">
              <SectionHead n={no(2)} title="안심하고 문의하세요" sub="Assurance" />
              <AssureGrid items={g.assure} />
            </div>
          )}

          {show[3] && (
            <div className="hr-gp-blk">
              <SectionHead n={no(3)} title="자주 묻는 질문" sub="Q&A" />
              <QaList items={g.faq} />
            </div>
          )}
        </div>

        <p className="hr-pt-note">더 궁금한 점이 있다면 편하게 물어보세요.</p>
      </div></section>
    </>
  );
}
