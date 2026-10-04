// src/app/error.tsx — 예기치 못한 오류가 났을 때 보이는 화면
'use client';
import Link from 'next/link';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="phead"><div className="wrap">
      <div className="crumb"><Link href="/">HOME</Link>/<b>ERROR</b></div>
      <h1>문제가 발생했습니다<span>ERROR</span></h1>
      <p>잠시 후 다시 시도해 주세요. 계속되면 문의 부탁드립니다.</p>
      <p style={{ marginTop: 20 }}>
        <button onClick={reset} style={{ padding: '10px 18px', border: '1px solid var(--line-2)', borderRadius: 8, color: 'var(--text)' }}>
          다시 시도
        </button>
      </p>
    </div></section>
  );
}
