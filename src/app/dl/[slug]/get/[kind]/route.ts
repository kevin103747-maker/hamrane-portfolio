// src/app/dl/[slug]/get/[kind]/route.ts — 받기 버튼이 거쳐 가는 주소. 이벤트가 열려 있을 때만 R2 파일로 보냅니다.
import { fileUrl, getDrop, isLive } from '@/lib/drops';

export const dynamic = 'force-dynamic'; // 비공개·종료가 바로 반영되도록 캐시하지 않습니다.

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string; kind: string }> },
) {
  const gone = () => new Response('Not Found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  try {
    const { slug, kind } = await params;
    if (kind !== 'mp3' && kind !== 'wav') return gone();
    const d = await getDrop(slug);
    if (!d || !isLive(d)) return gone();

    const raw = fileUrl(kind === 'mp3' ? d.mp3Path : d.wavPath);
    if (!raw) return gone();

    // URL로 한 번 정리하면 공백·줄바꿈·특수문자가 섞여도 올바른 헤더 값이 됩니다. 정리가 안 되면 아래 catch로 갑니다.
    const target = new URL(raw);
    if (target.protocol !== 'https:') {
      console.error('[drops] DROP_FILES_BASE가 https 주소가 아닙니다:', target.protocol);
      return new Response('Server Error', { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
    return new Response(null, { status: 302, headers: { Location: target.toString(), 'Cache-Control': 'no-store' } });
  } catch (e) {
    console.error('[drops] 받기 이동 실패:', e);
    return new Response('Server Error', { status: 500, headers: { 'Cache-Control': 'no-store' } });
  }
}
