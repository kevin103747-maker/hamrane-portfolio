// src/app/hr-admin/layout.tsx
export const metadata = { title: 'Admin', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <main className="hr-adm">{children}</main>;
}
