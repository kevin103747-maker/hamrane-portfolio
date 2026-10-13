// src/components/admin/DropUploader.tsx — MP3/WAV 하나를 브라우저에서 Supabase로 바로 올립니다.
'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowser } from '@/lib/auth/browser';
import { prepareUpload, attachFile, removeFile } from '@/app/hr-admin/(panel)/drops/actions';

type Kind = 'mp3' | 'wav';
const MAX_MB = 50;

export function DropUploader({
  id, kind, bucket, hasFile, sizeLabel,
}: { id: string; kind: Kind; bucket: string; hasFile: boolean; sizeLabel: string }) {
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
    setMsg('올리는 중… 창을 닫지 마세요.');
    try {
      const p = await prepareUpload({ id, kind, size: f.size, fileName: f.name });
      if (!p.ok) { setMsg(p.msg); return; }
      const { error } = await createBrowser()
        .storage.from(bucket)
        .uploadToSignedUrl(p.path, p.token, f, { contentType: kind === 'mp3' ? 'audio/mpeg' : 'audio/wav' });
      if (error) { setMsg(`업로드 실패: ${error.message}`); return; }
      setMsg('올린 파일을 확인하는 중…');
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
