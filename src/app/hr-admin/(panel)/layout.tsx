// src/app/hr-admin/(panel)/layout.tsx — 대시보드 공통 틀(상단바 + 좌측 메뉴). 입구에서 한 번 더 권한을 확인합니다.
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { visibleMenu } from '@/lib/admin-menu';
import { AdminNav } from '@/components/admin/AdminNav';
import { PublishButton } from '@/components/admin/PublishButton';
import { signOut } from '../actions';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();

  // 클라이언트 컴포넌트에는 href·label만 넘깁니다.
  const sections = visibleMenu((p) => can(me, p)).map((s) => ({
    id: s.id,
    title: s.title,
    items: s.items.map(({ href, label }) => ({ href, label })),
  }));

  return (
    <div className="hr-panel hr-shell">
      <header className="hr-panel-top hr-top2">
        <Link href="/hr-admin" className="hr-top2-brand">HamRanè <small>ADMIN</small></Link>
        <div className="hr-panel-user">
          {can(me, 'publish') && <PublishButton />}
          <span>{me.name || '관리자'} · {me.role === 'master' ? '마스터' : '관리자'}</span>
          <form action={signOut}><button type="submit">로그아웃</button></form>
        </div>
      </header>

      <div className="hr-shell-body">
        <aside className="hr-side">
          <AdminNav sections={sections} />
        </aside>
        <div className="hr-main">{children}</div>
      </div>
    </div>
  );
}
