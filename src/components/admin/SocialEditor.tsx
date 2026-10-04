// src/components/admin/SocialEditor.tsx — 채널 주소 입력 + 순서 변경(위/아래 버튼)
'use client';
import { useState } from 'react';
import { PLATFORMS, type SocialKey } from '@/lib/social';

export function SocialEditor({ initialOrder, values }: { initialOrder: SocialKey[]; values: Record<string, string> }) {
  const [order, setOrder] = useState<SocialKey[]>(initialOrder);

  const move = (i: number, d: number) =>
    setOrder((o) => {
      const j = i + d;
      if (j < 0 || j >= o.length) return o;
      const n = [...o];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });

  return (
    <div className="hr-ge">
      {order.map((k, i) => {
        const p = PLATFORMS.find((x) => x.key === k);
        if (!p) return null;
        return (
          <div className="hr-ge-row" key={k}>
            <div className="hr-ge-head">
              <b>{i + 1}번째 · {p.label}</b>
              <span>
                <button type="button" className="hr-ge-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`${p.label} 위로`}>↑</button>
                <button type="button" className="hr-ge-btn" onClick={() => move(i, 1)} disabled={i === order.length - 1} aria-label={`${p.label} 아래로`}>↓</button>
              </span>
            </div>
            <label>
              {p.hint ? `주소 (${p.hint})` : '주소 (비우면 홈에서 표시하지 않습니다)'}
              <input name={p.field} defaultValue={values[p.field] ?? ''} placeholder={p.placeholder} />
            </label>
            {/* 이 줄이 화면에 보이는 순서대로 서버에 전달됩니다 */}
            <input type="hidden" name="socialOrder" value={k} />
          </div>
        );
      })}
    </div>
  );
}
