// src/components/WorkCard.tsx
'use client';
import type { Work } from '@/lib/types';
import { orderParts } from '@/lib/work-parts';
import { Icon } from './Icons';
import { Thumb } from './Thumb';
import { useSite } from './SiteProvider';
import { useModal } from './ModalContext';

const MAX_ARTISTS = 2; // 카드에 이름을 직접 보여줄 최대 인원. 넘으면 "외 N명"으로 줄입니다.

function artistLabel(names: string[]) {
  if (names.length <= MAX_ARTISTS) return names.join(', ');
  return `${names.slice(0, MAX_ARTISTS).join(', ')} 외 ${names.length - MAX_ARTISTS}명`;
}

export function WorkCard({ work, pin, parts = true, tabIndex }: { work: Work; pin?: string; parts?: boolean; tabIndex?: number }) {
  const s = useSite();
  const { openWork } = useModal();
  const names = work.artistIds.map((i) => s.artistById.get(i)?.name).filter(Boolean).map(String);
  return (
    <a className="card" href={`?work=${work.id}`} tabIndex={tabIndex} onClick={(e) => { e.preventDefault(); openWork(work.id); }}>
      <Thumb work={work}>
        {pin && <span className="pin"><Icon name="pin" className="" />{pin}</span>}
        <span className="ov"><span><Icon name="play" /></span></span>
      </Thumb>
      <h3>{work.title}</h3>
      <p>
        <span title={names.join(', ')}>{artistLabel(names)}</span>
        <span className="d"><i>· </i>{s.usageNames(work)} · {work.date}</span>
      </p>
      {parts && <div className="pts">{orderParts(work).map((id, i) => <span key={id} className={i === 0 ? 'k' : ''}>{s.partName(id)}</span>)}</div>}
    </a>
  );
}
