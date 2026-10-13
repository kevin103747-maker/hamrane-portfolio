// src/components/admin/DropUploader.tsx — MP3/WAV 하나를 브라우저에서 Supabase 저장소로 바로 올립니다.
'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { prepareUpload, attachFile, removeFile } from '@/app/hr-admin/(panel)/drops/actions';

type Kind = 'mp3' | 'wav';
const MAX_MB = 50;
const STALL_MS = 60_000; // 이 시간 동안 전송이 전혀 늘지 않으면 멈춘 것으로 보고 중단합니다.

/** 일회용 업로드 주소로 파일을 보냅니다. 성공하면 null, 실패하면 이유를 돌려줍니다. 로그인 세션 조회를 거치지 않습니다. */
function putFile(url: string, file: File, onPct: (n: number) => void): Promise<string | null> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const body = new FormData();
    body.append('cacheControl', '31536000');
    body.append('', file);

    let last = Date.now();
    const timer = setInterval(() => {
      if (Date.now() - last > STALL_MS) xhr.abort();
    }, 5000);
    const done = (err: string | null) => {
      clearInterval(timer);
      resolve(err);
    };

    xhr.upload.onprogress = (e) => {
      last = Date.now();
      if (e.lengthComputable && e.total > 0) onPct(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      done(xhr.status >= 200 && xhr.status < 300 ? null : `저장소가 거절했어요 (${xhr.status}) ${xhr.responseText.slice(0, 120)}`);
    xhr.onerror = () => done('네트워크 오류로 올리지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
    xhr.onabort = () => done(`${STALL_MS / 1000}초 동안 전송이 진행되지 않아 중단했어요. 다시 시도해 주세요.`);

    xhr.open('PUT', url);
    xhr.setRequestHeader('x-upsert', 'false');
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (key) xhr.setRequestHeader('apikey', key);
    xhr.send(body);
  });
}

export function DropUploader({
  id, kind, hasFile, sizeLabel,
}: { id: string; kind: Kind; hasFile: boolean; sizeLabel: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const label = kind.toUpperCase();

  const upload = async () => {
    const f = input.current?.files?.[0];
    if (!f) { setMsg('파일을 먼저 골라 주세요.'); return; }
    if (f.size > MAX_MB * 1024 * 1024) { setMsg(`파일은 ${MAX_MB}MB 이하만 올릴 수 있습니다.`); return; }
    setBusy(true);
    try {
      setMsg('1/3 업로드 준비 중…');
      const p = await prepareUpload({ id, kind, size: f.size, fileName: f.name });
      if (!p.ok) { setMsg(p.msg); return; }

      setMsg('2/3 올리는 중… 0% · 창을 닫지 마세요.');
      const err = await putFile(p.url, f, (n) => setMsg(`2/3 올리는 중… ${n}% · 창을 닫지 마세요.`));
      if (err) { setMsg(err); return; }

      setMsg('3/3 올린 파일을 확인하는 중…');
      const r = await attachFile({ id, kind, path: p.path });
      if (!r.ok) { setMsg(r.msg); return; }

      setMsg('올렸어요.');
      if (input.current) input.current.value = '';
      router.refresh();
    } catch {
      setMsg('업로드 중 오류가 났어요. 다시 시도해 주세요.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(`${label} 파일을 지울까요? 저장소에서도 삭제됩니다.`)) return;
    setBusy(true);
    const r = await removeFile({ id, kind });
    setMsg(r.ok ? '지웠어요.' : r.msg);
    setBusy(false);
    if (r.ok) router.refresh();
  };

  return (
    <div className="hr-drop-up">
      <h3>{label}</h3>
      <p className="hr-adm-sub">{hasFile ? `올려진 파일: ${sizeLabel || '용량 확인 중'}` : '아직 없습니다. 이 칸은 방문자에게 "준비 중"으로 보입니다.'}</p>
      <input ref={input} type="file" accept={kind === 'mp3' ? '.mp3,audio/mpeg' : '.wav,audio/wav,audio/x-wav'} disabled={busy} />
      <div className="hr-row">
        <button type="button" className="hr-adm-btn" onClick={upload} disabled={busy}>
          {hasFile ? `${label} 교체` : `${label} 올리기`}
        </button>
        {hasFile && <button type="button" className="hr-link" onClick={remove} disabled={busy}>파일 지우기</button>}
      </div>
      {msg && <p role="status" className="hr-adm-sub">{msg}</p>}
    </div>
  );
}
