// src/components/LocaleLink.tsx — 언어를 아는 링크. 공개 사이트에서는 next/link 대신 이것을 씁니다.
'use client';
import { createContext, useContext } from 'react';
import NextLink from 'next/link';
import { DEFAULT_LOCALE, localePath } from '@/lib/i18n';

const Ctx = createContext<string>(DEFAULT_LOCALE);

/** 각 루트 레이아웃이 현재 언어를 아래로 내려줍니다. 없으면 한국어. */
export function LocaleProvider({ lang, children }: { lang: string; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);

/** "/..."로 시작하는 문자열 주소에는 현재 언어를 붙입니다. #문의, 바깥 주소 등은 그대로 둡니다. */
export default function Link({ href, ...rest }: React.ComponentProps<typeof NextLink>) {
  const lang = useLocale();
  const to = typeof href === 'string' && href.startsWith('/') && !href.startsWith('//') ? localePath(lang, href) : href;
  return <NextLink href={to} {...rest} />;
}
