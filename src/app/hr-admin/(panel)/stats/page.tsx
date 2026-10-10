// src/app/hr-admin/(panel)/stats/page.tsx — 방문 통계 (기간 요약 · 하루 보기 · 유입/기기/클릭)
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { PLATFORMS } from '@/lib/social';
import { OwnerToggle } from '@/components/admin/OwnerToggle';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

type Overview = {
  daily: { day: string; views: number; visitors: number }[];
  groups: { id: string; clicks: number; visitors: number }[];
  pages: { path: string; views: number }[];
  total_views: number;
  total_visitors: number;
};

type DayData = {
  views: number;
  visitors: number;
  pages: { path: string; views: number }[];
  groups: { id: string; clicks: number; visitors: number }[];
};

type Extra = {
  prev_views: number;
  prev_visitors: number;
  devices: { d: string; views: number; visitors: number }[];
  refs: { ref: string; sessions: number; visitors: number }[];
  clicks: { label: string; clicks: number; visitors: number }[];
};

type Row = { key: string; name: string; value: number; sub: string };

const RANGES = [7, 30, 90] as const;
const PAGE_NAME: Record<string, string> = { '/': '홈', '/portfolio': '포트폴리오', '/pricing': '외주 단가', '/guide': '의뢰 가이드' };
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const DAY_OK = /^\d{4}-\d{2}-\d{2}$/;

// 'YYYY-MM-DD'에서 k일 만큼 이동한 날짜
const shift = (day: string, k: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) + k * 864e5).toISOString().slice(0, 10);

// 형식이 맞고, 실제로 있는 날짜이며, 오늘(한국 시간)보다 미래가 아닐 때만 인정
const validDay = (s: string | undefined, today: string): string | null => {
  if (!s || !DAY_OK.test(s) || Number.isNaN(Date.parse(`${s}T00:00:00Z`))) return null;
  return shift(s, 0) === s && s <= today ? s : null;
};

const label = (day: string): string => {
  const t = new Date(`${day}T00:00:00Z`);
  return `${t.getUTCMonth() + 1}월 ${t.getUTCDate()}일 (${WEEK[t.getUTCDay()]})`;
};

const safeDecode = (s: string): string => {
  try { return decodeURIComponent(s); } catch { return s; }
};

/** 막대 한 줄씩 그리는 목록 */
function Rows({ rows, empty }: { rows: Row[]; empty: string }) {
  if (rows.length === 0) return <p>{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <>
      {rows.map((r) => (
        <div key={r.key} className="hr-sx-row">
          <b>{r.name}</b>
          <span className="t"><i style={{ width: `${(r.value / max) * 100}%` }} /></span>
          <em>{r.sub}</em>
        </div>
      ))}
    </>
  );
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; own?: string; day?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  const sp = await searchParams;
  const n = RANGES.find((x) => String(x) === sp.d) ?? 30;
  const own = sp.own === '1';
  const kst = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const day = validDay(sp.day, kst);

  const href = (o: { day?: string; d?: number; own?: boolean } = {}) => {
    const p = new URLSearchParams({ d: String(o.d ?? n) });
    if (o.day) p.set('day', o.day);
    if (o.own ?? own) p.set('own', '1');
    return `/hr-admin/stats?${p.toString()}`;
  };

  const head = (
    <>
      <h1>방문 통계</h1>
      <p className="hr-lead">
        날짜별 방문, 유입 경로, 기기 비율, 문의·채널 클릭, 단가표에서 어떤 분야와 항목을 눌러 봤는지 보여 줍니다.
        날짜를 누르면 그날 하루만 자세히 볼 수 있습니다.
        실제 배포 주소에서의 방문만 기록되고, 로컬 개발과 미리보기 배포는 기록되지 않습니다.
      </p>
    </>
  );

  const toolbar = (
    <>
      <div className="hr-sx-bar">
        {RANGES.map((x) => (
          <Link key={x} href={href({ d: x })} className={!day && x === n ? 'on' : undefined}>최근 {x}일</Link>
        ))}
        <Link href={href({ day: day ?? undefined, own: !own })} className={own ? 'on' : undefined}>
          {own ? '내 활동 포함해서 보는 중 (누르면 제외)' : '내 활동 제외하고 보는 중 (누르면 포함)'}
        </Link>
      </div>
      <form method="get" action="/hr-admin/stats" className="hr-sx-pick">
        <input type="hidden" name="d" defaultValue={n} />
        {own && <input type="hidden" name="own" defaultValue="1" />}
        <label>
          날짜 선택
          <input type="date" name="day" defaultValue={day ?? ''} max={kst} required />
        </label>
        <button type="submit">하루 보기</button>
      </form>
      <OwnerToggle />
    </>
  );

  const fail = (msg: string) => (
    <div className="hr-pn-body">
      {head}
      <p role="alert" className="hr-flash bad">{msg}</p>
    </div>
  );

  const db = adminDb();

  /* ───────── 하루 보기 ───────── */
  if (day) {
    const [dv, g] = await Promise.all([
      db.rpc('stat_day', { p_day: day, p_owner: own }),
      db.from('part_groups').select('id, name'),
    ]);
    if (dv.error || !dv.data) {
      return fail(`하루 통계를 불러오지 못했습니다${dv.error ? `: ${dv.error.message}` : ''}. Supabase에서 stat_day 함수를 만들었는지 확인하세요.`);
    }
    const d = dv.data as DayData;
    const pages = d.pages ?? [];
    const groups = d.groups ?? [];
    const names = new Map((g.data ?? []).map((x) => [x.id as string, txt(x.name) || (x.id as string)]));
    const maxView = Math.max(1, ...pages.map((x) => x.views));
    const maxClick = Math.max(1, ...groups.map((x) => x.clicks));
    const prev = shift(day, -1);
    const next = shift(day, 1);
    const top = pages[0];

    return (
      <div className="hr-pn-body">
        {head}
        {toolbar}

        <div className="hr-sx-bar">
          <Link href={href({ day: prev })}>← 전날</Link>
          {next <= kst ? <Link href={href({ day: next })}>다음날 →</Link> : <span className="off">다음날 →</span>}
          <Link href={href({})}>최근 {n}일로 돌아가기</Link>
        </div>

        <h2 className="hr-h2">{label(day)}{day === kst && ' · 오늘 (집계 중)'}</h2>

        <div className="hr-sx-cards">
          <div className="hr-sx-card"><small>페이지 조회수</small><b>{Number(d.views).toLocaleString('ko-KR')}</b></div>
          <div className="hr-sx-card"><small>방문자 (브라우저 기준)</small><b>{Number(d.visitors).toLocaleString('ko-KR')}</b></div>
          <div className="hr-sx-card">
            <small>가장 많이 본 페이지</small>
            <b>{top ? (PAGE_NAME[top.path] ?? top.path) : '-'}</b>
          </div>
        </div>

        <h2 className="hr-h2">페이지별 조회수</h2>
        {pages.length === 0 && <p>이 날은 기록이 없습니다.</p>}
        {pages.map((x) => (
          <div key={x.path} className="hr-sx-row">
            <b>{PAGE_NAME[x.path] ?? x.path}</b>
            <span className="t"><i style={{ width: `${(x.views / maxView) * 100}%` }} /></span>
            <em>{x.views}회</em>
          </div>
        ))}

        <h2 className="hr-h2">단가표 분야별 관심</h2>
        <p className="hr-lead">
          분야 탭을 눌러서 바꾼 횟수입니다. 첫 번째 분야는 들어오면 자동으로 보이므로, 실제로 본 횟수는 이 숫자보다 많습니다.
        </p>
        {groups.length === 0 && <p>이 날은 분야 탭을 누른 기록이 없습니다.</p>}
        {groups.map((x) => (
          <div key={x.id} className="hr-sx-row">
            <b>{names.get(x.id) ?? x.id}</b>
            <span className="t"><i style={{ width: `${(x.clicks / maxClick) * 100}%` }} /></span>
            <em>{x.clicks}회 · {x.visitors}명</em>
          </div>
        ))}
      </div>
    );
  }

  /* ───────── 기간 요약 ───────── */
  const [ov, g, r, ex, ri, wk] = await Promise.all([
    db.rpc('stat_overview', { p_days: n, p_owner: own }),
    db.from('part_groups').select('id, name').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('rate_items').select('group_id'),
    db.rpc('stat_extra', { p_days: n, p_owner: own }),
    db.from('rate_items').select('id, name'),
    db.from('works').select('id, title'),
  ]);

  if (ov.error || !ov.data) {
    return fail(`통계를 불러오지 못했습니다${ov.error ? `: ${ov.error.message}` : ''}. Supabase에서 통계용 SQL을 실행했는지 확인하세요.`);
  }

  const o = ov.data as Overview;
  const e = ex.error ? null : ((ex.data as Extra | null) ?? null);

  // 방문이 없는 날도 0으로 채워서 날짜가 끊기지 않게 합니다. (한국 시간 기준)
  const base = Date.parse(`${kst}T00:00:00Z`);
  const days = Array.from({ length: n }, (_, i) => new Date(base - (n - 1 - i) * 864e5).toISOString().slice(0, 10));
  const byDay = new Map(o.daily.map((x) => [x.day, x]));
  const series = days.map((d) => ({ d, views: byDay.get(d)?.views ?? 0, visitors: byDay.get(d)?.visitors ?? 0 }));
  const peak = Math.max(0, ...series.map((s) => s.views));
  const scale = Math.max(1, peak);

  // 단가표에 실제로 보이는 분야만, 눌린 횟수가 많은 순서로 보여 줍니다.
  const used = new Set((r.data ?? []).map((x) => x.group_id as string));
  const clicks = new Map(o.groups.map((x) => [x.id, x]));
  const groupRows = (g.data ?? [])
    .filter((x) => used.has(x.id as string))
    .map((x) => ({
      name: txt(x.name) || (x.id as string),
      clicks: clicks.get(x.id as string)?.clicks ?? 0,
      visitors: clicks.get(x.id as string)?.visitors ?? 0,
    }))
    .sort((a, b) => b.clicks - a.clicks);
  const maxClick = Math.max(1, ...groupRows.map((x) => x.clicks));

  // 직전 기간과 비교
  const delta = (cur: number, prev: number) => {
    if (!prev) return { text: `직전 ${n}일 기록 없음`, cls: '' };
    const p = Math.round(((cur - prev) / prev) * 100);
    if (p === 0) return { text: `직전 ${n}일과 같음 (${prev})`, cls: '' };
    return { text: `직전 ${n}일 대비 ${p > 0 ? '▲' : '▼'} ${Math.abs(p)}% (${prev})`, cls: p > 0 ? 'up' : 'down' };
  };
  const dViews = e ? delta(o.total_views, e.prev_views) : null;
  const dVisitors = e ? delta(o.total_visitors, e.prev_visitors) : null;

  // 기기 비율
  const devList = e?.devices ?? [];
  const devTotal = Math.max(1, devList.reduce((s, x) => s + x.views, 0));
  const devRows: Row[] = devList.map((x) => ({
    key: x.d,
    name: x.d === 'm' ? '모바일 (좁은 화면)' : x.d === 'd' ? 'PC · 넓은 화면' : '구분 전 기록',
    value: x.views,
    sub: `${Math.round((x.views / devTotal) * 100)}% · ${x.views}회 · ${x.visitors}명`,
  }));

  // 유입 경로
  const refRows: Row[] = (e?.refs ?? []).map((x) => ({
    key: x.ref,
    name: x.ref === '(direct)' ? '직접 접속 · 앱 (링크 정보 없음)' : x.ref,
    value: x.sessions,
    sub: `${x.sessions}회 · ${x.visitors}명`,
  }));

  // 문의 · 채널 클릭
  const clickList = e?.clicks ?? [];
  const contactRows: Row[] = clickList
    .flatMap((c): Row[] => {
      const m = /^(contact|ch):(.+)$/.exec(c.label);
      if (!m) return [];
      const name =
        m[1] === 'contact'
          ? m[2] === 'go' ? '문의 바로가기 버튼' : '문의 영역의 외부 링크'
          : `채널 · ${PLATFORMS.find((p) => p.key === m[2])?.label ?? m[2]}`;
      return [{ key: c.label, name, value: c.clicks, sub: `${c.clicks}회 · ${c.visitors}명` }];
    })
    .sort((a, b) => b.value - a.value);

  // 단가표 항목 (팝업 열람 · 문의)
  const rateName = new Map((ri.data ?? []).map((x) => [String(x.id), txt(x.name) || String(x.id)]));
  const rateAgg = new Map<string, { open: number; ask: number }>();
  for (const c of clickList) {
    const m = /^(rate|ask):(.+)$/.exec(c.label);
    if (!m) continue;
    const cur = rateAgg.get(m[2]) ?? { open: 0, ask: 0 };
    if (m[1] === 'rate') cur.open += c.clicks;
    else cur.ask += c.clicks;
    rateAgg.set(m[2], cur);
  }
  const rateRows: Row[] = [...rateAgg.entries()]
    .sort((a, b) => b[1].open + b[1].ask - (a[1].open + a[1].ask))
    .slice(0, 12)
    .map(([id, v]) => ({
      key: id,
      name: rateName.get(id) ?? id,
      value: v.open,
      sub: `열람 ${v.open}회 · 문의 ${v.ask}회`,
    }));

  // 인기 작품
  const workName = new Map((wk.data ?? []).map((x) => [String(x.id), txt(x.title) || String(x.id)]));
  const workRows: Row[] = clickList
    .flatMap((c): Row[] => {
      const m = /^work:(.+)$/.exec(c.label);
      if (!m) return [];
      const id = safeDecode(m[1]);
      return [{ key: c.label, name: workName.get(id) ?? workName.get(m[1]) ?? id, value: c.clicks, sub: `${c.clicks}회 · ${c.visitors}명` }];
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const csvHref = `/hr-admin/stats/csv?d=${n}${own ? '&own=1' : ''}`;

  return (
    <div className="hr-pn-body">
      {head}
      {toolbar}
      <p><a className="hr-sx-csv" href={csvHref}>CSV 내려받기 (최근 {n}일)</a></p>

      <div className="hr-sx-cards">
        <div className="hr-sx-card">
          <small>페이지 조회수</small>
          <b>{o.total_views.toLocaleString('ko-KR')}</b>
          {dViews && <em className={`dl ${dViews.cls}`}>{dViews.text}</em>}
        </div>
        <div className="hr-sx-card">
          <small>방문자 (브라우저 기준)</small>
          <b>{o.total_visitors.toLocaleString('ko-KR')}</b>
          {dVisitors && <em className={`dl ${dVisitors.cls}`}>{dVisitors.text}</em>}
        </div>
        <div className="hr-sx-card"><small>하루 최고 조회수</small><b>{peak.toLocaleString('ko-KR')}</b></div>
      </div>
      {e && <p className="hr-sx-note">직전 기간 기록이 일부만 쌓여 있으면 비교 수치가 실제보다 낮게 나올 수 있습니다.</p>}
      {ex.error && (
        <p role="alert" className="hr-flash bad">
          추가 통계(유입·기기·클릭)를 불러오지 못했습니다: {ex.error.message}. Supabase에서 stat_extra 함수를 만들었는지 확인하세요.
        </p>
      )}

      <h2 className="hr-h2">날짜별 조회수</h2>
      <div className="hr-sx-chart" role="group" aria-label="날짜별 페이지 조회수 (막대를 누르면 그날 보기)">
        {series.map((s) => (
          <Link
            key={s.d}
            href={href({ day: s.d })}
            title={`${label(s.d)} · 조회 ${s.views} · 방문자 ${s.visitors}`}
            aria-label={`${label(s.d)} 조회 ${s.views}회`}
          >
            <i style={{ height: `${(s.views / scale) * 100}%` }} />
          </Link>
        ))}
      </div>
      <div className="hr-sx-axis"><span>{days[0].slice(5)}</span><span>{days[days.length - 1].slice(5)}</span></div>

      <div className="hr-sx-list">
        <table className="hr-tbl">
          <thead><tr><th>날짜 (누르면 하루 보기)</th><th>조회수</th><th>방문자</th></tr></thead>
          <tbody>
            {series.slice().reverse().map((s) => (
              <tr key={s.d}>
                <td><Link href={href({ day: s.d })}>{label(s.d)}</Link>{s.d === kst && ' · 오늘'}</td>
                <td>{s.views}</td>
                <td>{s.visitors}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="hr-h2">단가표 분야별 관심</h2>
      <p className="hr-lead">
        분야 탭을 눌러서 바꾼 횟수입니다. 첫 번째 분야는 들어오면 자동으로 보이므로, 실제로 본 횟수는 이 숫자보다 많습니다.
      </p>
      {groupRows.length === 0 && <p>표시할 분야가 없습니다.</p>}
      {groupRows.map((x) => (
        <div key={x.name} className="hr-sx-row">
          <b>{x.name}</b>
          <span className="t"><i style={{ width: `${(x.clicks / maxClick) * 100}%` }} /></span>
          <em>{x.clicks}회 · {x.visitors}명</em>
        </div>
      ))}

      <h2 className="hr-h2">단가표 항목별 관심</h2>
      <p className="hr-lead">
        카드의 &quot;마감 옵션·총 금액 보기&quot;를 연 횟수와, 그 팝업에서 &quot;이 작업으로 문의&quot;를 누른 횟수입니다. 팝업이 없는 항목은 집계되지 않습니다.
      </p>
      <Rows rows={rateRows} empty="아직 기록이 없습니다." />

      <h2 className="hr-h2">인기 작품</h2>
      <p className="hr-lead">포트폴리오·홈에서 작품 카드를 눌러 연 횟수입니다. 상위 10개만 보여 줍니다.</p>
      <Rows rows={workRows} empty="아직 기록이 없습니다." />

      <h2 className="hr-h2">문의 · 채널 클릭</h2>
      <Rows rows={contactRows} empty="아직 기록이 없습니다." />

      <h2 className="hr-h2">어디서 들어왔나</h2>
      <p className="hr-lead">탭을 연 뒤 첫 방문만 셉니다. 링크에 ?utm_source=이름 을 붙이면 그 이름으로 구분됩니다.</p>
      <Rows rows={refRows} empty="아직 기록이 없습니다." />

      <h2 className="hr-h2">모바일 · PC 비율</h2>
      <Rows rows={devRows} empty="아직 기록이 없습니다." />

      <h2 className="hr-h2">페이지별 조회수</h2>
      {o.pages.length === 0 && <p>아직 기록이 없습니다.</p>}
      {o.pages.map((x) => (
        <div key={x.path} className="hr-sx-row">
          <b>{PAGE_NAME[x.path] ?? x.path}</b>
          <span className="t"><i style={{ width: `${(x.views / Math.max(1, o.pages[0].views)) * 100}%` }} /></span>
          <em>{x.views}회</em>
        </div>
      ))}
    </div>
  );
}
