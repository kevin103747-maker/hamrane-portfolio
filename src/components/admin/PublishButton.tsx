// src/components/admin/PublishButton.tsx — 상단바 게시 버튼. 화면을 이동하지 않고 결과만 보여 줍니다.
'use client';
import { useActionState } from 'react';
import { publishSiteInline } from '@/app/hr-admin/(panel)/actions';

type State = { ok: boolean; msg: string } | null;

export function PublishButton() {
  const [state, formAction, pending] = useActionState<State, FormData>(publishSiteInline, null);
  return (
    <form action={formAction} className="hr-pub-form">
      {state && (
        <span role="status" className={`hr-pub-msg${state.ok ? '' : ' err'}`}>
          {state.msg}
        </span>
      )}
      <button type="submit" className="hr-pub" disabled={pending}>
        {pending ? '게시 중…' : '사이트에 게시'}
      </button>
    </form>
  );
}
