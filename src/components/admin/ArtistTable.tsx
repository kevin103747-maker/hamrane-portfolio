// src/components/admin/ArtistTable.tsx — 아티스트 목록: 유형·숨김 바로 수정 + 드래그 순서 변경
'use client';
import { useState, type DragEvent } from 'react';
import Link from 'next/link';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { moveArtist, removeArtist } from '@/app/hr-admin/(panel)/actions';
import { quickSetArtist, reorderArtists } from '@/app/hr-admin/(panel)/artists/quick-actions';

export type ArtistRowData = {
  id: string; name: string; typeIds: string[]; hide: boolean; showWhenEmpty: boolean; works: number;
};
type TypeOpt = { id: string; name: string };
type Msg = { ok: boolean; text: string } | null;

export function ArtistTable({ rows: initial, slots, total, types, editLinks, editingId, q, page }: {
  rows: ArtistRowData[];
  slots: number[];               // 각 행의 전체 목록 기준 순번(위에서부터 같은 순서)
  total: number;                 // 전체 아티스트 수
  types: TypeOpt[];
  editLinks: Record<string, string>;
  editingId?: string;
  q: string;
  page: number;
}) {
  const [rows, setRows] = useState<ArtistRowData[]>(initial);
  const [msg, setMsg] = useState<Msg>(null);
  const [busy, setBusy] = useState<string[]>([]);
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null);
  const [reordering, setReordering] = useState(false);

  /* ---------- 유형·숨김: 누르면 바로 저장 ---------- */
  const patchRow = async (id: string, patch: { typeIds?: string[]; hideInStrip?: boolean }) => {
    const prev = rows.find((r) => r.id === id);
    if (!prev) return;
    setMsg(null);
    setRows((rs) => rs.map((r) => (r.id === id
      ? { ...r, typeIds: patch.typeIds ?? r.typeIds, hide: patch.hideInStrip ?? r.hide }
      : r)));
    setBusy((b) => [...b, id]);

    let res: { ok: boolean; msg?: string };
    try { res = await quickSetArtist(id, patch); }
    catch { res = { ok: false, msg: '저장 중 오류가 났습니다. 네트워크를 확인하세요.' }; }

    setBusy((b) => b.filter((x) => x !== id));
    if (res.ok) {
      setMsg({ ok: true, text: `'${prev.name}' 저장했습니다. 사이트에는 상단의 게시 버튼을 눌러야 반영됩니다.` });
      return;
    }
    // 실패: 바꾸려던 항목만 원래 값으로 되돌립니다
    setRows((rs) => rs.map((r) => (r.id === id
      ? {
          ...r,
          typeIds: patch.typeIds !== undefined ? prev.typeIds : r.typeIds,
          hide: patch.hideInStrip !== undefined ? prev.hide : r.hide,
        }
      : r)));
    setMsg({ ok: false, text: `'${prev.name}' ${res.msg ?? '저장하지 못했습니다.'}` });
  };

  const toggleType = (r: ArtistRowData, tid: string) => {
    const set = new Set(r.typeIds);
    if (set.has(tid)) set.delete(tid); else set.add(tid);
    void patchRow(r.id, { typeIds: types.map((t) => t.id).filter((id) => set.has(id)) });
  };

  /* ---------- 드래그로 순서 변경 ---------- */
  const clearDrag = () => { setDrag(null); setOver(null); };

  const onDragStart = (e: DragEvent<HTMLElement>, id: string) => {
    const tr = e.currentTarget.closest('tr');
    if (tr) e.dataTransfer.setDragImage(tr, 16, 16); // 손잡이만이 아니라 행 전체가 끌려 보이게
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);        // Firefox는 데이터가 있어야 드래그가 시작됩니다
    setDrag(id);
  };

  const onDragOverRow = (e: DragEvent<HTMLTableRowElement>, id: string) => {
    if (!drag) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    setOver((o) => (o && o.id === id && o.after === after ? o : { id, after }));
  };

  const onDrop = async (e: DragEvent<HTMLTableRowElement>) => {
    e.preventDefault();
    const from = drag;
    const target = over;
    clearDrag();
    if (!from || !target || from === target.id || reordering) return;

    const moving = rows.find((r) => r.id === from);
    const rest = rows.filter((r) => r.id !== from);
    const at = rest.findIndex((r) => r.id === target.id);
    if (!moving || at < 0) return;

    const next = [...rest];
    next.splice(at + (target.after ? 1 : 0), 0, moving);
    if (next.every((r, i) => r.id === rows[i].id)) return; // 제자리

    const prev = rows;
    setRows(next);
    setReordering(true);
    setMsg(null);

    let res: { ok: boolean; msg?: string };
    try { res = await reorderArtists(next.map((r) => r.id)); }
    catch { res = { ok: false, msg: '저장 중 오류가 났습니다. 네트워크를 확인하세요.' }; }

    setReordering(false);
    if (res.ok) {
      setMsg({ ok: true, text: `'${moving.name}' 순서를 바꿨습니다. 사이트에는 상단의 게시 버튼을 눌러야 반영됩니다.` });
    } else {
      setRows(prev);
      setMsg({ ok: false, text: res.msg ?? '순서를 저장하지 못했습니다.' });
    }
  };

  const status = (r: ArtistRowData) =>
    r.hide ? '숨김' : (r.works > 0 || r.showWhenEmpty) ? '표시' : '곡 없어서 안 보임';

  return (
    <>
      <div aria-live="polite">
        {msg && <p className={msg.ok ? 'hr-ok' : 'hr-adm-err'}>{msg.text}</p>}
      </div>
      <p className="hr-adm-sub">
        유형 칩과 &quot;칸에서 숨김&quot;은 누르면 바로 저장됩니다. ⠿ 손잡이를 끌어서 순서를 바꿀 수 있고(지금 보이는 목록 안에서),
        다른 페이지로 옮길 때는 &quot;이동&quot; 칸에 순서 번호를 입력하세요.
      </p>

      <table className="hr-tbl">
        <thead><tr><th>순서</th><th>이름</th><th>유형</th><th>곡</th><th>아티스트 칸</th><th></th></tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const no = slots[i];
            const pending = busy.includes(r.id);
            const cls = [
              r.id === editingId ? 'on' : '',
              drag === r.id ? 'is-drag' : '',
              over && drag && over.id === r.id && drag !== r.id ? (over.after ? 'over-after' : 'over-before') : '',
            ].filter(Boolean).join(' ');

            return (
              <tr
                key={r.id}
                id={`a-${r.id}`}
                className={cls || undefined}
                onDragOver={(e) => onDragOverRow(e, r.id)}
                onDrop={onDrop}
              >
                <td className="hr-ord">
                  <span
                    className="hr-drag"
                    draggable={!reordering}
                    onDragStart={(e) => onDragStart(e, r.id)}
                    onDragEnd={clearDrag}
                    title="끌어서 순서 변경"
                    aria-hidden="true"
                  >⠿</span>
                  {no}
                </td>
                <td>{r.name}</td>
                <td>
                  {types.length === 0 ? '-' : (
                    <div className="hr-tchips">
                      {types.map((t) => {
                        const on = r.typeIds.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            className="hr-tchip"
                            aria-pressed={on}
                            disabled={pending}
                            onClick={() => toggleType(r, t.id)}
                          >{t.name}</button>
                        );
                      })}
                    </div>
                  )}
                </td>
                <td>{r.works}</td>
                <td>
                  <label className="hr-chk">
                    <input
                      type="checkbox"
                      checked={r.hide}
                      disabled={pending}
                      onChange={(e) => void patchRow(r.id, { hideInStrip: e.target.checked })}
                    />숨김
                  </label>
                  <small className="hr-adm-sub">{status(r)}</small>
                </td>
                <td className="hr-act">
                  <form action={moveArtist} className="hr-mv">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="q" value={q} />
                    <input type="hidden" name="p" value={String(page)} />
                    <button type="submit" name="mode" value="top" disabled={no === 1} title="맨 위로">⤒</button>
                    <button type="submit" name="mode" value="up" disabled={no === 1} title="한 칸 위로">↑</button>
                    <button type="submit" name="mode" value="down" disabled={no === total} title="한 칸 아래로">↓</button>
                  </form>
                  <form action={moveArtist} className="hr-mv">
                    <input type="hidden" name="id" value={r.id} />
                    <input type="hidden" name="q" value={q} />
                    <input type="hidden" name="p" value={String(page)} />
                    <input type="hidden" name="mode" value="to" />
                    <input type="number" name="pos" min={1} max={total} required placeholder={String(no)} aria-label={`${r.name} 이동할 순서`} />
                    <button type="submit">이동</button>
                  </form>
                  <Link href={editLinks[r.id] ?? '/hr-admin/artists'}>수정</Link>
                  <form action={removeArtist}>
                    <input type="hidden" name="id" value={r.id} />
                    <ConfirmButton className="hr-del" message={`'${r.name}' 아티스트를 삭제할까요? 연결된 곡에서도 빠집니다.`}>삭제</ConfirmButton>
                  </form>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}
