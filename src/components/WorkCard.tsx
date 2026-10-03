// src/components/WorkCard.tsx
'use client';
import type { Work } from '@/lib/types';
import { Icon } from './Icons';
import { Thumb } from './Thumb';
import { useSite } from './SiteProvider';
import { useModal } from './ModalContext';

export function WorkCard({ work, pin, parts = true }: { work: Work; pin?: string; parts?: boolean }) {
  const s = useSite();
  const { openWork } = useModal();
  return (
    <a className="card" href={`?work=${work.id}`} onClick={(e) => { e.preventDefault(); openWork(work.id); }}>
      <Thumb work={work}>
        {pin && <span className="pin"><Icon name="pin" className="" />{pin}</span>}
        <span className="ov"><span><Icon name="play" /></span></span>
      </Thumb>
      <h3>{work.title}</h3>
      <p><span>{s.artistNames(work)}</span><span className="d">· {s.usageNames(work)} · {work.date}</span></p>
      {parts && <div className="pts">{work.partIds.map((id, i) => <span key={id} className={i === 0 ? 'k' : ''}>{s.partName(id)}</span>)}</div>}
    </a>
  );
}
