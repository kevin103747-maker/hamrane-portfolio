// src/components/SocialLinks.tsx
import type { Links } from '@/lib/types';
import { DEFAULT_ORDER, PLATFORMS, type SocialKey } from '@/lib/social';
import { ChannelIcon } from './Icons';

/** 채널 바로가기(아이콘 버튼). 어드민에서 정한 순서대로 나오며, 주소가 비어 있는 채널은 표시하지 않습니다. */
export function SocialLinks({ links, order = DEFAULT_ORDER }: { links: Links; order?: SocialKey[] }) {
  const items = order
    .map((k) => PLATFORMS.find((p) => p.key === k))
    .flatMap((p) => {
      if (!p) return [];
      const href = (links[p.field] ?? '').trim();
      return href && href !== '#' ? [{ p, href }] : [];
    });
  if (!items.length) return null;

  return (
    <nav className="hx-soc" aria-label="채널 바로가기">
      {items.map(({ p, href }) => (
        <a
          key={p.key}
          className="hx-soc-a"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={p.label}
          title={p.label}
        >
          <ChannelIcon name={p.key} src={p.icon ? links.icons?.[p.icon] : undefined} size={20} />
        </a>
      ))}
    </nav>
  );
}
