// src/app/hr-admin/layout.tsx
import './admin.css';
import { OwnerMark } from '@/components/admin/OwnerMark';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="hr-adm">
      <OwnerMark />
      {children}
    </main>
  );
}
