// src/components/Contact.tsx
'use client';
import Link, { useLocale } from './LocaleLink';
import { useState } from 'react';
import { ChannelIcon, Icon } from './Icons';
import { useSite } from './SiteProvider';
import { StatusBadge } from './Trust';
import { inquiryTemplate, type ContactGuide } from '@/lib/guide';
import type { StatusSettings } from '@/lib/status';
import { dict } from '@/lib/dict';

type Key = 'dc' | 'em' | 'tp';

export function Contact({ guide: G, status }: { guide: ContactGuide; status: StatusSettings }) {
  const { links } = useSite();
  const lang = useLocale();
  const isKo = lang === 'ko';
  const d = dict(lang).contact;
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
  const label = (k: Key, idle: string) => (done?.k === k ? (done.ok ? d.copied : d.copyFail) : idle);

  // 한국어는 어드민 값 그대로. 영어는 lead·reply를 숨기고, ask·fields는 어드민에 값이 있을 때만 영어 기본 문구로 보여 줍니다.
  const lead = isKo ? G.lead : '';
  const reply = isKo ? G.reply : '';
  const ask = G.ask ? (isKo ? G.ask : d.ask) : '';
  const fields = G.fields.length ? (isKo ? G.fields : d.fields) : [];
  const hasGuide = !!(lead || reply || ask || fields.length);

  const dcBody = (
    <>
      <span className="ic"><ChannelIcon name="dc" src={links.icons?.discord} /></span>
      <div><small>DISCORD</small><strong>{links.discordId}</strong></div>
    </>
  );
  return (
    <section className="contact-sec" id="contact"><div className="wrap">
      <div className="sh">
        <div><span className="n">CONTACT</span><h2>{d.title}<span>1:1 Direct</span></h2></div>
        <Link className="lk" href="/pricing">{d.pricing} <Icon name="arrow" /></Link>
      </div>

      <StatusBadge status={status} />

      {hasGuide && (
        <div className="hr-ct-guide">
          <div>
            {(lead || reply) && <p>{lead && <b>{lead}</b>} {reply}</p>}
            {ask && <p className="ask-line">{ask}</p>}
            {fields.length > 0 && <div className="hr-ct-fields">{fields.map((f) => <span key={f}>{f}</span>)}</div>}
            <p className="hr-ct-response">{d.response}</p>
          </div>
          {fields.length > 0 && (
            <button type="button" className="hr-ct-copy" onClick={() => copy('tp', isKo ? inquiryTemplate(fields) : inquiryTemplate(fields, d.formHead))}>
              <Icon name="copy" className="" />
              {label('tp', d.copyForm)}
            </button>
          )}
        </div>
      )}

      <div className="contact">
        {links.discordUrl ? (
          <a className="cb dc" href={links.discordUrl} target="_blank" rel="noopener noreferrer">
            {dcBody}<span className="go">{d.dm} <Icon name="arrow" /></span>
          </a>
        ) : (
          <button className="cb dc" onClick={() => copy('dc', links.discordId)}>
            {dcBody}<span className="go">{label('dc', d.copy)}</span>
          </button>
        )}
        <button className="cb em" onClick={() => copy('em', links.email)}>
          <span className="ic"><Icon name="copy" className="" /></span>
          <div><small>E-MAIL</small><strong>{links.email}</strong></div>
          <span className="go">{label('em', d.copy)}</span>
        </button>
      </div>
    </div></section>
  );
}
