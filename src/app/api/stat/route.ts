// src/app/api/stat/route.ts — 방문·분야·클릭 기록 (브라우저가 보냅니다)
import { adminDb } from '@/lib/auth/admin-db';

const BOT = /bot|crawl|spider|slurp|headless|lighthouse|facebookexternalhit|preview/i;
const PATH_OK = /^\/[a-z0-9/_-]{0,60}$/i;
const GROUP_OK = /^[\w-]{1,64}$/;
const VID_OK = /^[0-9a-f-]{20,40}$/i;
const CLICK_OK = /^(contact|ch|rate|ask|work):[\w.%-]{1,64}$/; // 정해진 종류만 받습니다.
const REF_OK = /^[a-z0-9._()-]{1,60}$/i;
const done = () => new Response(null, { status: 204 });

export async function POST(req: Request) {
  // 실제 배포에서만 기록합니다. 로컬 개발과 미리보기 배포는 제외.
  if (process.env.VERCEL_ENV !== 'production') return done();
  if (BOT.test(req.headers.get('user-agent') ?? '')) return done();

  let b: { kind?: unknown; value?: unknown; vid?: unknown; owner?: unknown; ref?: unknown; dev?: unknown };
  try {
    b = await req.json();
  } catch {
    return new Response(null, { status: 400 });
  }

  const { kind, value, vid } = b;
  if (typeof vid !== 'string' || !VID_OK.test(vid)) return done();
  if (typeof value !== 'string') return done();
  const is_owner = b.owner === true;
  const device = b.dev === 'm' || b.dev === 'd' ? b.dev : null;

  let row: Record<string, unknown>;
  if (kind === 'view') {
    if (!PATH_OK.test(value) || /^\/(hr-admin|auth|api)(\/|$)/i.test(value)) return done();
    const ref = typeof b.ref === 'string' && REF_OK.test(b.ref) ? b.ref.toLowerCase() : null;
    row = { kind: 'view', path: value.toLowerCase(), vid, is_owner, device, ref };
  } else if (kind === 'group') {
    if (!GROUP_OK.test(value)) return done();
    row = { kind: 'group', group_id: value, vid, is_owner, device };
  } else if (kind === 'click') {
    if (!CLICK_OK.test(value)) return done();
    row = { kind: 'click', label: value, vid, is_owner, device };
  } else {
    return done();
  }

  try {
    const db = adminDb();
    const { error } = await db.from('stat_events').insert(row);
    if (error) {
      console.error('[stat] 기록 실패:', error.message);
    } else if (Math.random() < 0.01) {
      // 가끔 180일이 지난 기록을 지웁니다.
      await db.from('stat_events').delete().lt('created_at', new Date(Date.now() - 180 * 864e5).toISOString());
    }
  } catch (e) {
    console.error('[stat] 오류:', e);
  }
  return done();
}
