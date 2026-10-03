// src/components/Price.tsx
'use client';
import { useEffect, useState } from 'react';
import type { Discount } from '@/lib/types';
import { isDiscountActive } from '@/lib/filters';

/** 할인이 지금 유효한지. 화면이 뜬 뒤 방문자 기기의 현재 시각으로 다시 확인합니다 */
function useActive(d?: Discount) {
  const [now, setNow] = useState<number | undefined>(undefined);
  useEffect(() => { setNow(Date.now()); }, []);
  return isDiscountActive(d, now ?? Date.now());
}

export function Price({ price, discount }: { price: string; discount?: Discount }) {
  const on = useActive(discount);
  if (on && discount?.price) {
    return (
      <span className="pdisc">
        <span className="old"><s>{price}</s><small>원~</small></span>
        <span className="now">
          {discount.price}<small>원~</small>
          {discount.rate ? <span className="rate">-{discount.rate}%</span> : null}
        </span>
      </span>
    );
  }
  return <>{price}<small>원~</small></>;
}

/** 할인 종료일 표시. 종료일을 입력했고 아직 할인 중일 때만 나옵니다 */
export function Until({ discount }: { discount?: Discount }) {
  const on = useActive(discount);
  if (!on || !discount?.endDate) return null;
  return <> · {discount.endDate.replace(/-/g, '.')} 까지</>;
}
