// src/app/not-found.tsx
import Link from 'next/link';
export default function NotFound() {
  return (
    <section className="phead"><div className="wrap">
      <div className="crumb"><Link href="/">HOME</Link>/<b>404</b></div>
      <h1>페이지를 찾을 수 없습니다<span>404</span></h1>
      <p>주소가 바뀌었거나 존재하지 않는 페이지입니다.</p>
    </div></section>
  );
}
