// src/app/hr-admin/(panel)/rates/builder/page.tsx — 단가 빌더: 폴더+패키지 카드 그리드와 드래그 앤 드롭
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { BuilderBoard } from '@/components/admin/builder/BuilderBoard';
import type { PackageFormWork } from '@/components/admin/PackageFormFields';
import type { BuilderFolder, BuilderSlot, BuilderPkg, BuilderGroup, BuilderItem } from './types';

export default async function BuilderPage({
  searchParams,
}: {
  searchParams: Promise<{ f?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const { f } = await searchParams;

  const db = adminDb();
  const [fo, sl, pk, g, r, ui, w, a] = await Promise.all([
    db.from('price_folders').select('*').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('price_slots').select('*').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('packages').select('*').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('part_groups').select('id, num, name').order('sort', { ascending: true }),
    db.from('rate_items').select('id, group_id, name, price, unit').order('sort', { ascending: true }),
    db.from('site_settings').select('value').eq('key', 'price_ui').maybeSingle(),
    db.from('works').select('id, title, artist_ids, hidden').order('work_date', { ascending: false }),
    db.from('artists').select('id, name'),
  ]);
  const failed = [fo, sl, pk, g, r, w, a].find((x) => x.error);
  if (failed?.error) {
    return (
      <div className="hr-pn-body">
        <h1>단가 빌더</h1>
        <p className="hr-flash bad">불러오지 못했습니다: {failed.error.message}</p>
      </div>
    );
  }

  // 공개 단가 화면 최상위 질문 (site_settings 'price_ui'.question). 조회 실패 시 빈 값.
  const uiV = ui.data?.value as { question?: { ko?: unknown; en?: unknown } } | null | undefined;
  const uiQ = uiV?.question ?? {};
  const priceUi = {
    ko: typeof uiQ.ko === 'string' ? uiQ.ko : '',
    en: typeof uiQ.en === 'string' ? uiQ.en : '',
  };

  const artistName = new Map<string, string>((a.data ?? []).map((x) => [x.id as string, x.name as string]));
  const works: PackageFormWork[] = (w.data ?? []).map((x) => ({
    id: x.id as string,
    title: x.title as string,
    artist: ((x.artist_ids as string[] | null) ?? []).map((i) => artistName.get(i)).filter(Boolean).join(', '),
    hidden: !!x.hidden,
  }));

  return (
    <BuilderBoard
      folders={(fo.data ?? []) as BuilderFolder[]}
      slots={(sl.data ?? []) as BuilderSlot[]}
      packages={(pk.data ?? []) as BuilderPkg[]}
      groups={(g.data ?? []) as BuilderGroup[]}
      items={(r.data ?? []) as BuilderItem[]}
      works={works}
      folderId={f ?? null}
      priceUi={priceUi}
    />
  );
}
