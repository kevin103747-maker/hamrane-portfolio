// src/app/(site)/template.tsx — 페이지를 이동할 때마다 다시 마운트되어 등장 효과가 실행됩니다
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="hr-page">{children}</div>;
}
