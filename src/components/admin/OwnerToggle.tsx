// src/components/admin/OwnerToggle.tsx — 이 기기를 통계에서 제외/포함
'use client';
import { useEffect, useState } from 'react';
import { isOwnerDevice, setOwnerDevice } from '@/lib/track';

export function OwnerToggle() {
  const [on, setOn] = useState<boolean | null>(null);
  useEffect(() => { setOn(isOwnerDevice()); }, []);
  if (on === null) return null;

  return (
    <p className="hr-sx-dev">
      이 기기는 지금 <b>{on ? '내 활동으로 제외 중' : '일반 방문자로 기록 중'}</b>입니다.{' '}
      <button type="button" onClick={() => { setOwnerDevice(!on); setOn(!on); }}>
        {on ? '이 기기도 기록에 포함하기' : '이 기기를 제외하기'}
      </button>
    </p>
  );
}
