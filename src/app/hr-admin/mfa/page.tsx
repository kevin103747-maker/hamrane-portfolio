// src/app/hr-admin/mfa/page.tsx
import { redirect } from 'next/navigation';
import { requireAllowed, isAal2 } from '@/lib/auth/guard';
import { signOut } from '../actions';
import { MfaForm } from './MfaForm';

export default async function MfaPage() {
  await requireAllowed();
  if (await isAal2()) redirect('/hr-admin');
  return (
    <div className="hr-adm-card">
      <small className="hr-adm-eyebrow">TWO-FACTOR</small>
      <h1>2단계 인증</h1>
      <MfaForm />
      <form action={signOut}><button className="hr-adm-btn ghost">로그아웃</button></form>
    </div>
  );
}
