// src/app/hr-admin/(panel)/layout.tsx — 대시보드 공통 틀(상단 메뉴). 입구에서 한 번 더 권한을 확인합니다.
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { AdminNav, type NavItem } from '@/components/admin/AdminNav';
import { PublishButton } from '@/components/admin/PublishButton';
import { signOut } from '../actions';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await requireAdmin();

  const items: NavItem[] = [
    { href: '/hr-admin', label: '대시보드', group: 0 },
    ...(can(me, 'works')
      ? [
          { href: '/hr-admin/works', label: '곡', group: 1 },
          { href: '/hr-admin/featured', label: '대표곡', group: 1 },
        ]
      : []),
    ...(can(me, 'artists') ? [{ href: '/hr-admin/artists', label: '아티스트', group: 1 }] : []),
    ...(can(me, 'rates')
      ? [
          { href: '/hr-admin/rates', label: '단가표', group: 2 },
          { href: '/hr-admin/rates/packages', label: '패키지', group: 2 },
        ]
      : []),
    ...(can(me, 'settings') ? [{ href: '/hr-admin/settings', label: '설정', group: 3 }] : []),
  ];

  return (
    <div className="hr-panel">
      <header className="hr-panel-top">
        <AdminNav items={items} />
        <div className="hr-panel-user">
          {can(me, 'publish') && <PublishButton />}
          <span>{me.name || '관리자'} · {me.role === 'master' ? '마스터' : '관리자'}</span>
          <form action={signOut}><button type="submit">로그아웃</button></form>
        </div>
      </header>
      {children}
    </div>
  );
}
