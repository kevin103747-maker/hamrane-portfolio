// src/app/dl/[slug]/get/[kind]/route.ts — 받기 버튼이 거쳐 가는 주소. 이벤트가 열려 있을 때만 R2 파일로 보냅니다.
import { fileUrl, getDrop, isLive } from '@/lib/drops';

export const dynamic = 'force-dynamic'; // 비공개·종료가 바로 반영되도록 캐시하지 않습니다.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; kind: string }> },
) {
  const { slug, kind } = await params;
  const gone = () => new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });

  if (kind !== 'mp3' && kind !== 'wav') return gone();
  const d = await getDrop(slug);
  if (!d || !isLive(d)) return gone();

  const url = fileUrl(kind === 'mp3' ? d.mp3Path : d.wavPath);
  if (!url) return gone();

  return new Response(null, { status: 302, headers: { Location: url, 'Cache-Control': 'no-store' } });
}
