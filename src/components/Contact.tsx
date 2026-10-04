// src/components/Contact.tsx
'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ChannelIcon, Icon } from './Icons';
import { useSite } from './SiteProvider';
import { CONTACT_GUIDE as G } from '@/lib/guide';

export function Contact() {
  const { links } = useSite();
  const [copied, setCopied] = useState<'' | 'dc' | 'em' | 'tp'>('');
  const copy = (k: 'dc' | 'em' | 'tp', v: string) => {
    navigator.clipboard?.writeText(v);
    setCopied(k);
    setTimeout(() => setCopied(''), 1400);
  };
  const dcBody = (
    <>
      <span className="ic"><ChannelIcon name="dc" src={links.icons?.discord} /></span>
      <div><small>DISCORD</small><strong>{links.discordId}</strong></div>
    </>
  );
  return (
    <section className="contact-sec" id="contact"><div className="wrap">
      <div className="sh">
        <div><span className="n">CONTACT</span><h2>문의<span>1:1 Direct</span></h2></div>
        <Link className="lk" href="/pricing">단가 안내 보기 <Icon name="arrow" /></Link>
      </div>

      <div className="hr-ct-guide">
        <div>
          <p><b>{G.lead}</b> {G.reply}</p>
          <p className="ask-line">{G.ask}</p>
          <div className="hr-ct-fields">{G.fields.map((f) => <span key={f}>{f}</span>)}</div>
        </div>
        <button type="button" className="hr-ct-copy" onClick={() => copy('tp', G.template)}>
          {copied === 'tp' ? '복사됨' : '문의 양식 복사'}
        </button>
      </div>

      <div className="contact">
        {links.discordUrl ? (
          <a className="cb dc" href={links.discordUrl} target="_blank" rel="noopener noreferrer">
            {dcBody}<span className="go">DM 보내기 <Icon name="arrow" /></span>
          </a>
        ) : (
          <button className="cb dc" onClick={() => copy('dc', links.discordId)}>
            {dcBody}<span className="go">{copied === 'dc' ? '복사됨' : '복사'}</span>
          </button>
        )}
        <button className="cb em" onClick={() => copy('em', links.email)}>
          <span className="ic"><Icon name="copy" className="" /></span>
          <div><small>E-MAIL</small><strong>{links.email}</strong></div>
          <span className="go">{copied === 'em' ? '복사됨' : '복사'}</span>
        </button>
      </div>
    </div></section>
  );
}
