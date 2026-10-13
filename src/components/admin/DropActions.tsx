// src/components/admin/DropActions.tsx — 목록의 주소 복사·삭제 버튼
'use client';
import { useState } from 'react';
import { removeDrop } from '@/app/hr-admin/(panel)/drops/actions';

export function DropActions({ id, slug, title }: { id: string; slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/dl/${slug}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt('주소를 복사해 주세요.', `${window.location.origin}/dl/${slug}`);
    }
  };
  return (
    <>
      <button type="button" className="hr-link" onClick={copy}>{copied ? '복사했어요' : '주소 복사'}</button>
      <form
        action={removeDrop}
        onSubmit={(e) => {
          if (!window.confirm(`"${title}"을(를) 지울까요? 이미 뿌린 링크는 열리지 않습니다. (R2에 올린 음원 파일은 지워지지 않아요. 필요하면 Cloudflare에서 직접 지우세요.)`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <button type="submit" className="hr-link">삭제</button>
      </form>
    </>
  );
}
