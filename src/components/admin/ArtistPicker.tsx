// src/components/admin/ArtistPicker.tsx — 검색해서 고르는 아티스트 선택기(새 이름 즉시 추가 포함)
'use client';
import { useMemo, useRef, useState } from 'react';

type A = { id: string; name: string };
const LIMIT = 8;
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

export function ArtistPicker({ artists, initial }: { artists: A[]; initial: string[] }) {
  const byId = useMemo(() => new Map<string, A>(artists.map((a): [string, A] => [a.id, a])), [artists]);
  const [picked, setPicked] = useState<string[]>(() => initial.filter((id) => byId.has(id)));
  const [fresh, setFresh] = useState<string[]>([]); // 저장할 때 새로 만들 이름
  const [text, setText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const q = norm(text);
  const exact = q ? artists.find((a) => norm(a.name) === q) : undefined;
  const results = useMemo(() => {
    if (!q) return [];
    const hit = artists.filter((a) => !picked.includes(a.id) && norm(a.name).includes(q));
    // 앞글자가 일치하는 이름을 위로
    hit.sort((a, b) => Number(norm(b.name).startsWith(q)) - Number(norm(a.name).startsWith(q)));
    return hit;
  }, [artists, picked, q]);
  const canCreate = !!q && !exact && !fresh.some((n) => norm(n) === q);

  const done = () => { setText(''); inputRef.current?.focus(); };
  const add = (id: string) => { setPicked((p) => (p.includes(id) ? p : [...p, id])); done(); };
  const addFresh = () => {
    const name = text.replace(/\s+/g, ' ').trim();
    if (!name) return;
    setFresh((f) => [...f, name]);
    done();
  };

  return (
    <div className="hr-ap">
      {picked.map((id) => <input key={id} type="hidden" name="artistIds" value={id} />)}
      {fresh.map((n) => <input key={n} type="hidden" name="newArtistNames" value={n} />)}

      <div className="hr-ap-chips">
        {picked.length + fresh.length === 0 && <span className="hr-adm-sub">선택된 아티스트가 없습니다.</span>}
        {picked.map((id) => (
          <span key={id} className="hr-ap-chip">
            {byId.get(id)?.name}
            <button type="button" onClick={() => setPicked(picked.filter((x) => x !== id))} aria-label={`${byId.get(id)?.name} 빼기`}>✕</button>
          </span>
        ))}
        {fresh.map((n) => (
          <span key={n} className="hr-ap-chip new">
            {n}<em>새로 추가</em>
            <button type="button" onClick={() => setFresh(fresh.filter((x) => x !== n))} aria-label={`${n} 빼기`}>✕</button>
          </span>
        ))}
      </div>

      <input
        ref={inputRef}
        type="search"
        value={text}
        autoComplete="off"
        placeholder="이름을 검색해서 추가 (없으면 그대로 새로 추가할 수 있어요)"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return;
          e.preventDefault(); // Enter로 곡 저장 폼이 제출되는 것을 막습니다
          if (e.nativeEvent.isComposing) return; // 한글 조합 중
          if (exact && !picked.includes(exact.id)) add(exact.id);
          else if (!results.length && canCreate) addFresh();
        }}
      />

      {q && (
        <ul className="hr-ap-list">
          {results.slice(0, LIMIT).map((a) => (
            <li key={a.id}><button type="button" onClick={() => add(a.id)}>{a.name}</button></li>
          ))}
          {results.length > LIMIT && <li className="hr-adm-sub">외 {results.length - LIMIT}명 — 검색어를 더 입력하세요.</li>}
          {exact && picked.includes(exact.id) && <li className="hr-adm-sub">&apos;{exact.name}&apos;은(는) 이미 추가했습니다.</li>}
          {canCreate && (
            <li><button type="button" className="hr-ap-new" onClick={addFresh}>＋ &apos;{text.trim()}&apos; 새 아티스트로 추가</button></li>
          )}
        </ul>
      )}
    </div>
  );
}
