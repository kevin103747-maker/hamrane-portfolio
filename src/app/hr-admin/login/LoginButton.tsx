// src/app/hr-admin/login/LoginButton.tsx
'use client';
import { useState } from 'react';
import { createBrowser } from '@/lib/auth/browser';

export function LoginButton() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setBusy(true);
    setErr('');
    const { error } = await createBrowser().auth.signInWithOAuth({
      provider: 'discord',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setErr(error.message); setBusy(false); }
  }
  return (
    <>
      <button type="button" className="hr-adm-btn" onClick={go} disabled={busy}>
        {busy ? '이동 중…' : 'Discord로 로그인'}
      </button>
      {err && <p className="hr-adm-err">{err}</p>}
    </>
  );
}
