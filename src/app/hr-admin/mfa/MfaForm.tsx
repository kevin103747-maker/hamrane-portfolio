// src/app/hr-admin/mfa/MfaForm.tsx
'use client';
import { useEffect, useState } from 'react';
import { createBrowser } from '@/lib/auth/browser';

type Mode = 'loading' | 'idle' | 'enroll' | 'verify';

export function MfaForm() {
  const [sb] = useState(() => createBrowser());
  const [mode, setMode] = useState<Mode>('loading');
  const [factorId, setFactorId] = useState('');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    sb.auth.mfa.listFactors().then(({ data, error }) => {
      if (error) { setMsg(error.message); setMode('idle'); return; }
      const t = data.totp[0];
      if (t) { setFactorId(t.id); setMode('verify'); } else setMode('idle');
    });
  }, [sb]);

  async function startEnroll() {
    setBusy(true);
    setMsg('');
    const { data: list } = await sb.auth.mfa.listFactors();
    for (const f of list?.all ?? []) {
      if (f.status === 'unverified') await sb.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await sb.auth.mfa.enroll({ factorType: 'totp', issuer: 'HamRane Admin' });
    setBusy(false);
    if (error || !data) { setMsg(error?.message ?? '등록을 시작하지 못했습니다.'); return; }
    setFactorId(data.id);
    setQr(data.totp.qr_code);
    setSecret(data.totp.secret);
    setMode('enroll');
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMsg('');
    const ch = await sb.auth.mfa.challenge({ factorId });
    if (ch.error) { setBusy(false); setMsg(ch.error.message); return; }
    const v = await sb.auth.mfa.verify({ factorId, challengeId: ch.data.id, code: code.trim() });
    if (v.error) { setBusy(false); setMsg('코드가 맞지 않습니다. 앱에 표시된 최신 6자리를 입력해 주세요.'); return; }
    window.location.assign('/hr-admin');
  }

  const qrSrc = qr.startsWith('data:') ? qr : `data:image/svg+xml;utf-8,${encodeURIComponent(qr)}`;

  if (mode === 'loading') return <p>불러오는 중…</p>;

  if (mode === 'idle') {
    return (
      <>
        <p>관리자는 2단계 인증(인증 앱)이 필수입니다. 휴대폰에 Google Authenticator, Authy, 1Password 같은 인증 앱을 준비해 주세요.</p>
        <button type="button" className="hr-adm-btn" onClick={startEnroll} disabled={busy}>2단계 인증 등록 시작</button>
        {msg && <p className="hr-adm-err">{msg}</p>}
      </>
    );
  }

  return (
    <form onSubmit={submit} className="hr-adm-form">
      {mode === 'enroll' && (
        <>
          <p>인증 앱에서 QR 코드를 스캔한 뒤, 앱에 표시되는 6자리 코드를 입력하세요.</p>
          <div className="hr-adm-qr"><img src={qrSrc} alt="2단계 인증 QR 코드" /></div>
          <p className="hr-adm-sub">스캔이 안 되면 앱에 아래 키를 직접 입력하세요.</p>
          <p className="hr-adm-id">{secret}</p>
        </>
      )}
      {mode === 'verify' && <p>인증 앱에 표시된 6자리 코드를 입력하세요.</p>}
      <input
        className="hr-adm-in" inputMode="numeric" autoComplete="one-time-code" maxLength={6}
        placeholder="000000" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus
      />
      <button className="hr-adm-btn" disabled={busy || code.length !== 6}>{busy ? '확인 중…' : '확인'}</button>
      {msg && <p className="hr-adm-err">{msg}</p>}
    </form>
  );
}
