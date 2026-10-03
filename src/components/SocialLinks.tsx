// src/components/SocialLinks.tsx
import type { Links } from '@/lib/types';
import { ChannelIcon } from './Icons';

/** 채널 바로가기(아이콘 버튼). 주소가 비어 있는 채널은 흐리게 표시되고 눌러도 이동하지 않습니다. */
export function SocialLinks({ links }: { links: Links }) {
  const items = [
    { key: 'yt', label: 'YouTube', href: links.youtube, icon: links.icons?.youtube },
    { key: 'soop', label: 'SOOP', href: links.soop, icon: links.icons?.soop },
    { key: 'x', label: 'X', href: links.x, icon: links.icons?.x },
    { key: 'dc', label: 'Discord', href: links.discordServer, icon: links.icons?.discord },
  ];
  return (
    <nav className="hx-soc" aria-label="채널 바로가기">
      {items.map((i) => {
        const ok = !!i.href && i.href !== '#';
        return (
          <a
            key={i.key}
            className={`hx-soc-a ${ok ? '' : 'off'}`}
            href={ok ? i.href : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={i.label}
            title={i.label}
            aria-disabled={!ok}
          >
            <ChannelIcon name={i.key} src={i.icon} size={20} />
          </a>
        );
      })}
    </nav>
  );
}
