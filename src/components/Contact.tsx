// src/components/Contact.tsx
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ChannelIcon, Icon } from './Icons';
import { useSite } from './SiteProvider';
import { StatusBadge } from './Trust';
import { inquiryTemplate, type ContactGuide } from '@/lib/guide';
import type { StatusSettings } from '@/lib/status';
import { COPY } from '@/lib/copy';

type Key = 'dc' | 'em' | 'tp';

export function Contact({ guide: G, status }: { guide: ContactGuide; status: StatusSettings }) {
  const { links } = useSite();
  const [done, setDone] = useState<{ k: Key; ok: boolean } | null>(null);

  // 복사에 실패하면(권한·보안 문맥 문제 등) "복사됨"이 아니라 실패했다고 알립니다.
  const copy = async (k: Key, v: string) => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(v);
      ok = true;
    } catch {
      ok = false;
    }
    setDone({ k, ok });
    setTimeout(() => setDone(null), 4000);
  };
  const label = (k: Key, idle: string) => (done?.k === k ? (done.ok ? COPY.copied : COPY.copyFail) : idle);

  const dcBody = (
    <>
      <span className="ic"><ChannelIcon name="dc" src={links.icons?.discord} /></span>
      <div><small>DISCORD</small><strong>{links.discordId}</strong></div>
    </>
  );
  const hasGuide = !!(G.lead || G.reply || G.ask || G.fields.length);
  return (
    <section className="contact-sec" id="contact"><div className="wrap">
      <div className="sh">
        <div><span className="n">CONTACT</span><h2>문의<span>1:1 Direct</span></h2></div>
        <Link className="lk" href="/pricing">단가 안내 보기 <Icon name="arrow" /></Link>
      </div>

      <StatusBadge status={status} />

      {hasGuide && (
        <div className="hr-ct-guide">
          <div>
            {(G.lead || G.reply) && <p>{G.lead && <b>{G.lead}</b>} {G.reply}</p>}
            {G.ask && <p className="ask-line">{G.ask}</p>}
            {G.fields.length > 0 && <div className="hr-ct-fields">{G.fields.map((f) => <span key={f}>{f}</span>)}</div>}
            <p className="hr-ct-response">평균 응답 시간: 24시간 이내</p>
          </div>
          {G.fields.length > 0 && (
            <button type="button" className="hr-ct-copy" onClick={() => copy('tp', inquiryTemplate(G.fields))}>
              <Icon name="copy" className="" />
              {label('tp', '문의 양식 복사')}
            </button>
          )}
        </div>
      )}

      <div className="contact">
        {links.discordUrl ? (
          <a className="cb dc" href={links.discordUrl} target="_blank" rel="noopener noreferrer">
            {dcBody}<span className="go">DM 보내기 <Icon name="arrow" /></span>
          </a>
        ) : (
          <button className="cb dc" onClick={() => copy('dc', links.discordId)}>
            {dcBody}<span className="go">{label('dc', '복사')}</span>
          </button>
        )}
        <button className="cb em" onClick={() => copy('em', links.email)}>
          <span className="ic"><Icon name="copy" className="" /></span>
          <div><small>E-MAIL</small><strong>{links.email}</strong></div>
          <span className="go">{label('em', '복사')}</span>
        </button>
      </div>
    </div></section>
  );
}
