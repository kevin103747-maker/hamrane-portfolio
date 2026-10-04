// src/app/hr-admin/(panel)/page.tsx — 대시보드 홈
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { visibleMenu } from '@/lib/admin-menu';
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

  const sections = visibleMenu((p) => can(me, p));

  return (
    <div className="hr-pn-body">
      <h1>대시보드</h1>

      {published && <p role="status">게시했습니다. 공개 사이트에 반영됩니다.</p>}

      {can(me, 'publish') && (
        <div className="hr-card">
          <h2>수정한 내용을 사이트에 반영하기</h2>
          <p>
            각 화면에서 저장한 내용은 &quot;게시&quot;를 눌러야 공개 사이트에 나타납니다.
            상단바의 게시 버튼으로도 어느 화면에서나 게시할 수 있습니다.
          </p>
          <form action={publishSite}>
            <button type="submit">사이트에 게시</button>
          </form>
        </div>
      )}

      <div className="hr-stats">
        <div className="hr-card"><small>곡</small><strong>{w.count ?? 0}</strong></div>
        <div className="hr-card"><small>아티스트</small><strong>{a.count ?? 0}</strong></div>
        <div className="hr-card"><small>대표곡</small><strong>{q.count ?? 0}</strong></div>
      </div>

      {sections.map((s) => (
        <div key={s.id} className="hr-card">
          <h2>{s.title}</h2>
          <p>{s.sub}</p>
          <div className="hr-shortcuts">
            {s.items.map((x) => (
              <Link key={x.href} href={x.href}>
                <b>{x.label}</b>
                <small>{x.desc}</small>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
