// src/components/admin/ConfirmButton.tsx — "정말 삭제할까요?" 확인창이 뜨는 버튼
'use client';
import type { ReactNode } from 'react';

export function ConfirmButton({ message, className, children }: { message: string; className?: string; children: ReactNode }) {
  return (
    <button type="submit" className={className} onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {children}
    </button>
  );
}
