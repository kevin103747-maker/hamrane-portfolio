// src/app/hr-admin/login/page.tsx
import { LoginButton } from './LoginButton';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <div className="hr-adm-card">
      <small className="hr-adm-eyebrow">HAMRANÈ ADMIN</small>
      <h1>관리자 로그인</h1>
      <p>등록된 관리자만 접근할 수 있습니다. 로그인 후 2단계 인증이 필요합니다.</p>
      {error && <p className="hr-adm-err">로그인에 실패했습니다. 다시 시도해 주세요.</p>}
      <LoginButton />
    </div>
  );
}
