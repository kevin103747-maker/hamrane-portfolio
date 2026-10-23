// src/components/SocialLinks.tsx
import type { Links } from '@/lib/types';
import { DEFAULT_ORDER, PLATFORMS, type SocialKey } from '@/lib/social';
import { dict } from '@/lib/dict';
import { ChannelIcon } from './Icons';

/** 채널 바로가기(아이콘 버튼). 어드민에서 정한 순서대로 나오며, 주소가 비어 있는 채널은 표시하지 않습니다.
 *  마우스를 올리거나 키보드로 이동하면 채널 이름이 아이콘 아래에 나타납니다(globals.css의 data-tip).
 *  영어 화면에서는 영어 이름(en)이 있는 채널만 영어로 보입니다.
 *  data-ch는 통계(채널 클릭 수)용입니다. */
export function SocialLinks({ links, order = DEFAULT_ORDER, lang = 'ko' }: { links: Links; order?: SocialKey[]; lang?: string }) {
  const items = order
    .map((k) => PLATFORMS.find((p) => p.key === k))
    .flatMap((p) => {
      if (!p) return [];
      const href = (links[p.field] ?? '').trim();
      return href && href !== '#' ? [{ p, href, label: lang === 'en' && p.en ? p.en : p.label }] : [];
    });
  if (!items.length) return null;

  return (
    <nav className="hx-soc" aria-label={dict(lang).social.aria}>
      {items.map(({ p, href, label }) => (
        <a
          key={p.key}
          className="hx-soc-a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          data-tip={label}
          data-ch={p.key}
        >
          <ChannelIcon name={p.key} src={p.icon ? links.icons?.[p.icon] : undefined} size={20} />
        </a>
      ))}
    </nav>
  );
}
