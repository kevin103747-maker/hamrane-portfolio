// src/app/en/dl/[slug]/page.tsx — 영어 무료 배포 페이지. 한국어(/dl/...)와 같은 데이터를 쓰고, 영어 칸이 비면 한국어로 대신합니다.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { dropFor, getDrop, isLive } from '@/lib/drops';
import { dict } from '@/lib/dict';
import { DropPage } from '@/components/drop/DropPage';

export const revalidate = 60; // 어드민에서 고친 내용이 최대 1분 안에 반영됩니다.

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const raw = await getDrop(slug);
  const hidden = { index: false, follow: false };
  if (!raw || !isLive(raw)) return { title: dict('en').drop.notFoundTitle, robots: hidden };
  const d = dropFor(raw, 'en');
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

export default async function EnDropRoute({ params }: Props) {
  const { slug } = await params;
  const d = await getDrop(slug);
  if (!d || !isLive(d)) notFound();
  return <DropPage drop={d} tracked lang="en" />;
}
