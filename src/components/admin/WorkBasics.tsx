// src/components/admin/WorkBasics.tsx — 유튜브 링크를 붙여넣으면 제목을 자동으로 채움
'use client';
import { useRef, useState } from 'react';
import { fetchYoutubeMeta } from '@/app/hr-admin/(panel)/yt-actions';

export function WorkBasics({ title, youtube, date }: { title: string; youtube: string; date: string }) {
  const titleRef = useRef<HTMLInputElement>(null);
  const last = useRef(youtube.trim()); // 이미 저장된 링크는 다시 조회하지 않습니다
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const [thumb, setThumb] = useState('');

  const lookup = async (raw: string) => {
    const v = raw.trim();
    if (!v || v === last.current) return;
    last.current = v;
    setBusy(true);
    setNote('');
    try {
      const r = await fetchYoutubeMeta(v);
      if (!r.ok) {
        last.current = ''; // 실패하면 다시 시도할 수 있게
        setThumb('');
        setNote(r.msg);
        return;
      }
      setThumb(`https://i.ytimg.com/vi/${r.id}/mqdefault.jpg`);
      const el = titleRef.current;
      if (el && !el.value.trim()) {
        el.value = r.title;
        setNote(`제목을 영상 제목으로 채웠습니다. 필요하면 고쳐 쓰세요. (채널: ${r.channel})`);
      } else {
        setNote(`영상 확인됨: "${r.title}" (채널: ${r.channel})`);
      }
    } catch {
      last.current = '';
      setNote('영상 정보를 가져오지 못했습니다. 제목은 직접 입력하세요.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <label>
        YouTube 링크 또는 영상 ID (붙여넣으면 제목이 자동으로 채워집니다)
        <input
          name="youtube"
          placeholder="https://youtu.be/..."
          defaultValue={youtube}
          onPaste={(e) => { void lookup(e.clipboardData.getData('text')); }}
          onBlur={(e) => { void lookup(e.target.value); }}
        />
      </label>
      {(busy || note || thumb) && (
        <div className="hr-yt">
          {thumb && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" width={96} height={54} />
          )}
          <span className="hr-adm-sub">{busy ? '영상 정보를 확인하는 중…' : note}</span>
        </div>
      )}
      <label>제목<input ref={titleRef} name="title" required defaultValue={title} /></label>
      <label>공개일<input type="date" name="date" defaultValue={date} /></label>
    </>
  );
}
