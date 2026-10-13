// src/app/hr-admin/drop-preview/[id]/page.tsx — 비공개·종료된 배포도 볼 수 있는 관리자 전용 미리보기
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can } from '@/lib/auth/permissions';
import { fromRow, isLive } from '@/lib/drops';
import { DropPage } from '@/components/drop/DropPage';

export const metadata: Metadata = { title: '무료 배포 미리보기', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function DropPreview({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const { data } = await adminDb().from('drops').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const d = fromRow(data as Record<string, unknown>);

  return (
    <DropPage
      drop={d}
      notice={isLive(d)
        ? '관리자 미리보기 · 지금 공개 중인 페이지입니다'
        : '관리자 미리보기 · 비공개이거나 종료되어 방문자에게는 404로 보입니다'}
    />
  );
}
