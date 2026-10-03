// src/components/admin/CountedField.tsx — 글자 수를 보여 주는 입력란
'use client';
import { useState } from 'react';

type Props = {
  name: string;
  label: string;
  defaultValue: string;
  placeholder?: string;
  soft: number; // 권장 글자 수
  max: number; // 최대 글자 수
  rows?: number; // 지정하면 여러 줄 입력란
};

export function CountedField({ name, label, defaultValue, placeholder, soft, max, rows }: Props) {
  const [n, setN] = useState(defaultValue.length);
  return (
    <label>
      {label}
      {rows ? (
        <textarea
          name={name} rows={rows} defaultValue={defaultValue} placeholder={placeholder} maxLength={max}
          onChange={(e) => setN(e.currentTarget.value.length)}
        />
      ) : (
        <input
          name={name} defaultValue={defaultValue} placeholder={placeholder} maxLength={max}
          onChange={(e) => setN(e.currentTarget.value.length)}
        />
      )}
      <small style={{ opacity: n > soft ? 1 : 0.65, fontWeight: n > soft ? 600 : 400 }}>
        {n}자 · 권장 {soft}자 이내 (최대 {max}자)
      </small>
    </label>
  );
}
