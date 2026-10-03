// src/app/hr-admin/denied/page.tsx
import { redirect } from 'next/navigation';
import { whoami, findAdmin } from '@/lib/auth/guard';
import { signOut } from '../actions';

export default async function Denied() {
  const me = await whoami();
  if (!me) redirect('/hr-admin/login');
  if (await findAdmin(me.discordId)) redirect('/hr-admin');
  return (
    <div className="hr-adm-card">
      <small className="hr-adm-eyebrow">ACCESS DENIED</small>
      <h1>허용되지 않은 계정입니다</h1>
      <p>이 Discord 계정은 관리자로 등록되어 있지 않습니다. 본인이 관리자라면 마스터에게 아래 ID를 전달해 등록을 요청하세요.</p>
      <p className="hr-adm-id">{me.discordId || '(Discord ID를 확인하지 못했습니다)'}</p>
      <form action={signOut}><button className="hr-adm-btn ghost">로그아웃</button></form>
    </div>
  );
}
