// src/app/hr-admin/(panel)/layout.tsx — 대시보드 공통 틀(상단 메뉴). 입구에서 한 번 더 권한을 확인합니다.
import Link from 'next/link';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { signOut } from '../actions';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();
  return (
    <div className="hr-panel">
      <header className="hr-panel-top">
        <nav>
          <Link href="/hr-admin">대시보드</Link>
          {can(me, 'works') && <Link href="/hr-admin/works">곡</Link>}
          {can(me, 'works') && <Link href="/hr-admin/featured">대표곡</Link>}
          {can(me, 'artists') && <Link href="/hr-admin/artists">아티스트</Link>}
          {can(me, 'rates') && <Link href="/hr-admin/rates">단가표</Link>}
          {can(me, 'rates') && <Link href="/hr-admin/rates/packages">패키지</Link>}
          {can(me, 'settings') && <Link href="/hr-admin/settings">설정</Link>}
        </nav>
        <div className="hr-panel-user">
          <span>{me.name || '관리자'} · {me.role === 'master' ? '마스터' : '관리자'}</span>
          <form action={signOut}><button type="submit">로그아웃</button></form>
        </div>
      </header>
      {children}
    </div>
  );
}
