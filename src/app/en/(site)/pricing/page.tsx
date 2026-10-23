// src/app/en/(site)/pricing/page.tsx — 영어 단가 페이지. 본문은 PricingView에 있습니다.
import { PricingView } from '@/components/PricingView';

export const metadata = { title: 'Pricing' };

export default function EnPricing() {
  return <PricingView lang="en" />;
}
