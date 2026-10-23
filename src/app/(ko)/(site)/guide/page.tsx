// src/app/(ko)/(site)/guide/page.tsx — 한국어 의뢰 가이드. 본문은 GuideView에 있습니다.
import { GuideView } from '@/components/GuideView';

export const metadata = { title: 'Guide' };

export default function GuidePage() {
  return <GuideView lang="ko" />;
}
