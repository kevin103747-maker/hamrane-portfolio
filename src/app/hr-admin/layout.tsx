// src/app/hr-admin/layout.tsx — 어드민 루트 레이아웃(공개 사이트와 분리)
import '../globals.css';
import './admin.css';
import { RootShell } from '@/components/RootShell';
import { OwnerMark } from '@/components/admin/OwnerMark';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootShell lang="ko">
      <main className="hr-adm">
        <OwnerMark />
        {children}
      </main>
    </RootShell>
  );
}
