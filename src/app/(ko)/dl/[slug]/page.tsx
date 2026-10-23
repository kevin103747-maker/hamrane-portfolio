// src/app/dl/[slug]/page.tsx — 이벤트용 무료 배포 페이지. 일반 사이트 어디에서도 링크하지 않습니다.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getDrop, isLive } from '@/lib/drops';
import { DropPage } from '@/components/drop/DropPage';

export const revalidate = 60; // 어드민에서 고친 내용이 최대 1분 안에 반영됩니다.

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getDrop(slug);
  const hidden = { index: false, follow: false };
  if (!d || !isLive(d)) return { title: '페이지를 찾을 수 없습니다', robots: hidden };
  const desc = d.subtitle || d.description.replace(/\s+/g, ' ').slice(0, 100);
  return {
    title: d.title,
    description: desc,
    robots: hidden,
    openGraph: {
      title: d.title,
      description: desc,
      siteName: 'HamRanè',
      type: 'website',
      ...(d.youtubeId ? { images: [`https://i.ytimg.com/vi/${d.youtubeId}/hqdefault.jpg`] } : {}),
    },
  };
}

export default async function DropRoute({ params }: Props) {
  const { slug } = await params;
  const d = await getDrop(slug);
  if (!d || !isLive(d)) notFound();
  return <DropPage drop={d} tracked />;
}
