// src/components/RateBoard.tsx — 단가표: 분야 탭 + 카드 격자 + 난이도 변동 안내
'use client';
import { useEffect, useState } from 'react';
import { Price, Until } from './Price';
import type { Discount } from '@/lib/types';

export type BoardItem = {
  id: string; name: string; desc: string; price: string; unit: string; tag?: string; discount?: Discount;
};
export type BoardGroup = { id: string; no: string; name: string; en: string; desc: string; items: BoardItem[] };

// 안내 박스에 나오는 "금액에 영향을 주는 요소". 실제 작업 기준에 맞게 고쳐 쓰세요.
const FACTORS = ['곡 길이·구성', '악기·트랙 수', '장르와 레퍼런스', '작업 기간', '수정 횟수'];

export function RateBoard({ groups }: { groups: BoardGroup[] }) {
  const [cur, setCur] = useState(groups[0]?.id ?? '');

  // 주소의 #cat-분야ID 로 들어오면 해당 탭을 엽니다.
  useEffect(() => {
    const fromHash = () => {
      const id = window.location.hash.replace(/^#cat-/, '');
      if (!id || !groups.some((g) => g.id === id)) return;
      setCur(id);
      requestAnimationFrame(() => document.getElementById(`cat-${id}`)?.scrollIntoView({ block: 'start' }));
    };
    fromHash();
    window.addEventListener('hashchange', fromHash);
    return () => window.removeEventListener('hashchange', fromHash);
  }, [groups]);

  const pick = (id: string) => {
    setCur(id);
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#cat-${id}`);
  };

  return (
    <div className="hr-rt">
      <div className="hr-rt-info">
        <div className="hr-rt-legend" aria-hidden="true">
          <div className="hr-rt-gauge"><span /></div>
          <div className="hr-rt-ends"><span>가볍고 단순한 곡</span><span>기본가</span><span>난이도 높은 곡</span></div>
        </div>
        <div className="hr-rt-txt">
          <p>
            <b>표기된 금액은 기준이 되는 기본가입니다.</b> 같은 분야여도 곡마다 작업량과 난이도가 크게 달라서,
            곡을 확인한 뒤 기본가보다 낮아지기도 하고 높아지기도 합니다.
          </p>
          <div className="hr-rt-factors">
            <small>금액에 영향을 주는 요소</small>
            {FACTORS.map((f) => <span key={f}>{f}</span>)}
          </div>
        </div>
        <a className="hr-rt-ask" href="#contact">곡 보내고 견적 받기 →</a>
      </div>

      <div className="hr-rt-tabhead">
  <b>분야 선택</b>
  <span>총 {groups.length}개 분야 · 눌러서 단가를 확인하세요</span>
</div>
<div className="hr-rt-tabs" role="group" aria-label="분야 선택">
  {groups.map((g) => (
    <button
      key={g.id}
      type="button"
      className={`hr-rt-tab${g.id === cur ? ' on' : ''}`}
      aria-pressed={g.id === cur}
      aria-controls={`cat-${g.id}`}
      onClick={() => pick(g.id)}
    >
      <small>{g.no}</small>
      {g.name}
      <em>{g.items.length}</em>
    </button>
  ))}
</div>


      {groups.map((g) => (
        <section key={g.id} id={`cat-${g.id}`} className="hr-rt-panel" hidden={g.id !== cur} aria-label={g.name}>
          <div className="hr-rt-head">
            <h3>{g.name}<span>{g.en}</span></h3>
            {g.desc && <p>{g.desc}</p>}
          </div>
          <ul className="hr-rt-grid">
            {g.items.map((i) => (
              <li key={i.id} className="hr-rt-card">
                <div className="hr-rt-top">
                  <b>{i.name}</b>
                  {i.tag && <em>{i.tag}</em>}
                </div>
                {i.desc && <p>{i.desc}</p>}
                <div className="hr-rt-price">
                  <span className="hr-rt-lab">기본가</span>
                  <strong><Price price={i.price} discount={i.discount} /></strong>
                  <i>{i.unit} · VAT 포함<Until discount={i.discount} /></i>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
