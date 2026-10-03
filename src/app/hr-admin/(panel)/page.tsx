// src/app/hr-admin/(panel)/page.tsx — 대시보드 홈
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { publishSite } from './actions';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ published?: string }>;
}) {
  const me = await requireAdmin();
  const { published } = await searchParams;

  const db = adminDb();
  const [w, a, q] = await Promise.all([
    db.from('works').select('*', { count: 'exact', head: true }),
    db.from('artists').select('*', { count: 'exact', head: true }),
    db.from('index_queue').select('*', { count: 'exact', head: true }),
  ]);

  return (
    <div className="hr-pn-body">
      <h1>대시보드</h1>

      {published && <p role="status">게시했습니다. 공개 사이트에 반영됩니다.</p>}

      <div className="hr-stats">
        <div className="hr-card"><small>곡</small><strong>{w.count ?? 0}</strong></div>
        <div className="hr-card"><small>아티스트</small><strong>{a.count ?? 0}</strong></div>
        <div className="hr-card"><small>대표곡</small><strong>{q.count ?? 0}</strong></div>
      </div>

      <div className="hr-card">
        <h2>바로가기</h2>
        <p>
          <Link href="/hr-admin/works">곡 관리</Link>
          {' · '}
          <Link href="/hr-admin/artists">아티스트 관리</Link>
          {' · '}
          <Link href="/hr-admin/featured">대표곡 지정</Link>
        </p>
      </div>

      {can(me, 'publish') && (
        <div className="hr-card">
          <h2>게시</h2>
          <p>저장한 변경 사항을 공개 사이트에 반영합니다.</p>
          <form action={publishSite}>
            <button type="submit">사이트에 게시</button>
          </form>
        </div>
      )}
    </div>
  );
}
