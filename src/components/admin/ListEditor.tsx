// src/components/admin/ListEditor.tsx — 항목을 추가·삭제·순서 변경하는 목록 입력란(진행 순서, 자주 묻는 질문에 사용)
'use client';
import { useState } from 'react';

type ListField = { key: string; name: string; label: string; max: number; rows?: number; placeholder?: string };
type Row = { id: number; v: Record<string, string> };

let seq = 0;

export function ListEditor({ initial, fields, max, itemLabel, addLabel, emptyNote }: {
  initial: Record<string, string>[];
  fields: ListField[];
  max: number;
  itemLabel: string;
  addLabel: string;
  emptyNote: string;
}) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((v) => ({ id: ++seq, v })));

  const edit = (id: number, key: string, val: string) =>
    setRows((r) => r.map((x) => (x.id === id ? { ...x, v: { ...x.v, [key]: val } } : x)));
  const move = (i: number, d: number) =>
    setRows((r) => {
      const j = i + d;
      if (j < 0 || j >= r.length) return r;
      const n = [...r];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const remove = (id: number) => setRows((r) => r.filter((x) => x.id !== id));
  const add = () =>
    setRows((r) => (r.length >= max ? r : [...r, { id: ++seq, v: Object.fromEntries(fields.map((f) => [f.key, ''])) }]));

  return (
    <div className="hr-ge">
      {rows.length === 0 && <p className="hr-ge-empty">{emptyNote}</p>}
      {rows.map((r, i) => (
        <div className="hr-ge-row" key={r.id}>
          <div className="hr-ge-head">
            <b>{i + 1}번째 {itemLabel}</b>
            <span className="hr-ge-tools">
              <button type="button" className="hr-ge-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로 이동">↑</button>
              <button type="button" className="hr-ge-btn" onClick={() => move(i, 1)} disabled={i === rows.length - 1} aria-label="아래로 이동">↓</button>
              <button type="button" className="hr-ge-btn" onClick={() => remove(r.id)} aria-label="삭제">삭제</button>
            </span>
          </div>
          {fields.map((f) => (
            <label key={f.key}>
              {f.label}
              {f.rows ? (
                <textarea
                  name={f.name} rows={f.rows} value={r.v[f.key] ?? ''} maxLength={f.max} placeholder={f.placeholder}
                  onChange={(e) => edit(r.id, f.key, e.currentTarget.value)}
                />
              ) : (
                <input
                  name={f.name} value={r.v[f.key] ?? ''} maxLength={f.max} placeholder={f.placeholder}
                  onChange={(e) => edit(r.id, f.key, e.currentTarget.value)}
                />
              )}
            </label>
          ))}
        </div>
      ))}
      <button type="button" className="hr-ge-btn hr-ge-add" onClick={add} disabled={rows.length >= max}>
        {rows.length >= max ? `최대 ${max}개까지 추가할 수 있습니다` : addLabel}
      </button>
    </div>
  );
}
