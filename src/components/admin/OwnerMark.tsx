// src/components/admin/OwnerMark.tsx — 관리자 화면에 들어오면 이 기기를 "내 기기"로 표시
'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { markOwnerDevice } from '@/lib/track';

// 로그인 전 화면에서는 표시하지 않습니다. (우연히 들어온 방문자가 제외되는 것을 막기 위해)
const SKIP = /^\/hr-admin\/(login|denied|mfa)(\/|$)/;

export function OwnerMark() {
  const path = usePathname();
  useEffect(() => {
    if (!SKIP.test(path)) markOwnerDevice();
  }, [path]);
  return null;
}
