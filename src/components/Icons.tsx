// src/components/Icons.tsx
import type { ReactNode } from 'react';

const PATHS: Record<string, ReactNode> = {
  arrow: <path d="M7 17L17 7M8 7h9v9" />,
  down: <path d="M12 5v14M6 13l6 6 6-6" />,
  play: <path d="M8 5v14l11-7z" fill="currentColor" stroke="none" />,
  pin: <path d="M12 17v5M9 3h6l-1 6 3 3H7l3-3z" />,
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 0 1 2-2h8" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M5 13l4 4L19 7" />,
  external: <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />,
  prev: <path d="M15 5l-7 7 7 7" />,
  next: <path d="M9 5l7 7-7 7" />,
};

export function Icon({ name, className }: { name: string; className?: string }) {
  return (
    <svg
      className={className || undefined}
      width="1em"
      height="1em"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[name] ?? null}
    </svg>
  );
}

const CHANNEL_LABEL: Record<string, string> = { yt: 'YouTube', soop: 'SOOP', x: 'X', dc: 'Discord' };

const BRAND: Record<string, string> = {
  yt: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  x: 'M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z',
  dc: 'M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z',
};

// 채널 아이콘: 관리자가 올린 이미지(src)가 있으면 그 이미지를, 없으면 기본 아이콘을 표시합니다.
export function ChannelIcon({ name, src, size = 20 }: { name: string; src?: string; size?: number }) {
  const label = CHANNEL_LABEL[name] ?? name;
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={label} width={size} height={size} style={{ objectFit: 'contain' }} />;
  }
  const base = { width: size, height: size, viewBox: '0 0 24 24', 'aria-hidden': true } as const;
  if (name === 'soop') {
    // SOOP은 공식 로고를 알 수 없어 "방송" 느낌의 임시 아이콘입니다. 실제 로고는 이미지로 교체할 수 있습니다.
    return (
      <svg {...base} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5.5" width="18" height="13" rx="4" />
        <path d="M10.2 9.6v4.8l4.3-2.4z" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  const d = BRAND[name];
  if (d) {
    return (
      <svg {...base} fill="currentColor">
        <path d={d} />
      </svg>
    );
  }
  return <span aria-label={label} style={{ fontWeight: 700, fontSize: '0.8em' }}>{label}</span>;
}
