// src/app/en/(site)/guide/page.tsx — 영어 의뢰 가이드. 본문은 GuideView에 있습니다.
import { GuideView } from '@/components/GuideView';

export const metadata = { title: 'Guide' };

export default function EnGuide() {
  return <GuideView lang="en" />;
}
