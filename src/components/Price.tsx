// src/components/Price.tsx
'use client';
import { useEffect, useState } from 'react';
import type { Discount } from '@/lib/types';
import { isDiscountActive } from '@/lib/filters';
import { useLocale } from './LocaleLink';
import { dict, fill } from '@/lib/dict';

/** 할인이 지금 유효한지. 화면이 뜬 뒤 방문자 기기의 현재 시각으로 다시 확인합니다 */
function useActive(d?: Discount) {
  const [now, setNow] = useState<number | undefined>(undefined);
  useEffect(() => { setNow(Date.now()); }, []);
  return isDiscountActive(d, now ?? Date.now());
}

export function Price({ price, priceUsd, discount }: { price: string; priceUsd?: string; discount?: Discount }) {
  const on = useActive(discount);
  const lang = useLocale();
  const L = dict(lang).pricing;
  const cur = lang === 'en' && priceUsd ? L.curUsd : L.cur;

  // 영어이고 USD가 있으면 USD로, 할인 중이면 할인가 USD도 있어야 USD로 표시
  const useUsd = lang === 'en' && priceUsd != null;
  const discUsd = useUsd && discount?.priceUsd ? discount.priceUsd : undefined;
  const discPrice = discUsd || discount?.price;

  if (on && discPrice) {
    const basePrice = useUsd && priceUsd ? priceUsd : price;
    return (
      <span className="pdisc">
        <span className="old"><s>{basePrice}</s><small>{`${cur}~`}</small></span>
        <span className="now">
          {discPrice}<small>{`${cur}~`}</small>
          {discount?.rate ? <span className="rate">-{discount.rate}%</span> : null}
        </span>
      </span>
    );
  }
  const displayPrice = useUsd && priceUsd ? priceUsd : price;
  return <>{displayPrice}<small>{`${cur}~`}</small></>;
}

/** 할인 종료일 표시. 종료일을 입력했고 아직 할인 중일 때만 나옵니다 */
export function Until({ discount }: { discount?: Discount }) {
  const on = useActive(discount);
  const L = dict(useLocale()).pricing;
  if (!on || !discount?.endDate) return null;
  return <> · {fill(L.until, { date: discount.endDate.replace(/-/g, '.') })}</>;
}
