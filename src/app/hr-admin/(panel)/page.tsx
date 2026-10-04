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

  const shortcuts = [
    { href: '/hr-admin/works', title: '곡 관리', desc: '곡 추가·수정, 참여 파트와 대표작 설정', ok: can(me, 'works') },
    { href: '/hr-admin/featured', title: '대표곡 지정', desc: '홈 화면 대표작 패널에 나올 곡 선택', ok: can(me, 'works') },
    { href: '/hr-admin/artists', title: '아티스트 관리', desc: '아티스트와 프로필 이미지', ok: can(me, 'artists') },
    { href: '/hr-admin/rates', title: '단가표', desc: '파트별 단가와 할인', ok: can(me, 'rates') },
    { href: '/hr-admin/rates/packages', title: '패키지', desc: '단가표 아래의 구성 예시', ok: can(me, 'rates') },
    { href: '/hr-admin/groups', title: '분야·파트', desc: '포트폴리오·단가표의 분야 이름, 순서, 파트', ok: can(me, 'settings') },
    { href: '/hr-admin/guide', title: '의뢰 안내', desc: '진행 순서, 자주 묻는 질문, 문의 안내 문구', ok: can(me, 'settings') },
    { href: '/hr-admin/status', title: '의뢰 상태', desc: '지금 의뢰 가능 여부, 한 줄 메모, 홈 작업 현황', ok: can(me, 'settings') },
    { href: '/hr-admin/settings', title: '사이트 설정', desc: '문구, 제목·설명, 채널 링크, 연락처, 공지', ok: can(me, 'settings') },
  ].filter((x) => x.ok);

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
        <div className="hr-shortcuts">
          {shortcuts.map((x) => (
            <Link key={x.href} href={x.href}>
              <b>{x.title}</b>
              <small>{x.desc}</small>
            </Link>
          ))}
        </div>
      </div>

      {can(me, 'publish') && (
        <div className="hr-card">
          <h2>게시</h2>
          <p>저장한 변경 사항을 공개 사이트에 반영합니다. 상단바의 &quot;사이트에 게시&quot; 버튼으로도 어느 화면에서나 게시할 수 있습니다.</p>
          <form action={publishSite}>
            <button type="submit">사이트에 게시</button>
          </form>
        </div>
      )}
    </div>
  );
}