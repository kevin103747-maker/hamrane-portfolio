// src/app/hr-admin/(panel)/works/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can } from '@/lib/auth/permissions';
import { tx } from '@/lib/i18n';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { ArtistPicker } from '@/components/admin/ArtistPicker';
import { WorkBasics } from '@/components/admin/WorkBasics';
import { saveWork, removeWork } from '../actions';

type FeatValue = { default?: string; groups?: string[]; parts?: string[] };
type WorkRow = {
  id: string; title: string; youtube_id: string | null; thumb_url: string | null; work_date: string | null;
  artist_ids: string[] | null; usage_ids: string[] | null; part_ids: string[] | null;
  main_part_id: string | null; feat: FeatValue | null; hidden: boolean | null;
};

/** 저장된 "2026.09.15" → 달력 입력값 "2026-09-15". 예전 월 단위 값("2026.09")은 1일로 채웁니다. */
const toInputDate = (v?: string | null) => {
  const m = (v ?? '').match(/^(\d{4})[.-](\d{2})(?:[.-](\d{2}))?$/);
  return m ? `${m[1]}-${m[2]}-${m[3] ?? '01'}` : '';
};

const hasFeat = (f: FeatValue | null) => !!f && !!(f.default || f.groups?.length || f.parts?.length);
const thumbOf = (x: WorkRow) =>
  x.thumb_url || (x.youtube_id ? `https://i.ytimg.com/vi/${x.youtube_id}/mqdefault.jpg` : '');

const FILTERS = [
  ['', '전체'],
  ['hidden', '숨김'],
  ['home', '홈 대표'],
  ['feat', '포트폴리오 대표'],
] as const;

export default async function WorksPage({
  searchParams,
}: { searchParams: Promise<{ edit?: string; copy?: string; err?: string; ok?: string; q?: string; f?: string; na?: string }> }) {
  const me = await requireAdmin();
  if (!can(me, 'works')) redirect('/hr-admin');
  const { edit, copy, err, ok, na, q = '', f = '' } = await searchParams;

  const db = adminDb();
  const [w, a, u, g, p, iq] = await Promise.all([
    db.from('works').select('*').order('work_date', { ascending: false }).order('created_at', { ascending: false }),
    db.from('artists').select('id, name').order('sort').order('name'),
    db.from('usage_types').select('*').order('sort'),
    db.from('part_groups').select('*').order('sort'),
    db.from('parts').select('*').order('sort'),
    db.from('index_queue').select('work_id'),
  ]);
  const works = (w.data ?? []) as WorkRow[];
  const artists = a.data ?? [];
  const usage = u.data ?? [];
  const groups = g.data ?? [];
  const parts = p.data ?? [];
  const homeIds = new Set((iq.data ?? []).map((r: { work_id: string }) => r.work_id));
  const cur = edit ? works.find((x) => x.id === edit) : undefined;
  // 새 곡을 "이전 곡 설정 이어받기"로 열었을 때, 아티스트·용도·파트를 가져올 곡
  const base = cur ?? (copy ? works.find((x) => x.id === copy) : undefined);
  const isCopy = !cur && !!base;
  const artistName = (id: string) => artists.find((x: { id: string; name: string }) => x.id === id)?.name ?? '';
  const feat = (cur?.feat ?? {}) as FeatValue;
  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10); // 한국 시간 오늘

  // 검색·필터 (제목, 아티스트 이름)
  const needle = q.trim().toLowerCase();
  const shown = works.filter((x) => {
    if (needle) {
      const hay = `${x.title} ${(x.artist_ids ?? []).map(artistName).join(' ')}`.toLowerCase();
      if (!hay.includes(needle)) return false;
    }
    if (f === 'hidden') return !!x.hidden;
    if (f === 'home') return homeIds.has(x.id);
    if (f === 'feat') return hasFeat(x.feat);
    return true;
  });

  // 목록에서 수정/설정 복사로 갈 때 검색 조건을 유지하고, 폼 위치(#form)로 이동합니다.
  const rowHref = (key: 'edit' | 'copy', id: string) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (f) sp.set('f', f);
    sp.set(key, id);
    return `/hr-admin/works?${sp.toString()}#form`;
  };

  // 분야별로 묶은 파트 선택지(강조 파트·대표작 라벨 선택에 같이 씁니다)
  const partOptions = groups.map((gr: { id: string; name: unknown }) => (
    <optgroup key={gr.id} label={tx(gr.name as never)}>
      {parts.filter((x: { group_id: string }) => x.group_id === gr.id).map((x: { id: string; name: unknown }) => (
        <option key={x.id} value={x.id}>{tx(x.name as never)}</option>
      ))}
    </optgroup>
  ));

  return (
    <div className="hr-pn-body">
      <h1 className="hr-pn-h">곡 관리</h1>
      {ok && <p className="hr-ok">저장했습니다. 공개 사이트에 반영하려면 상단의 &quot;사이트에 게시&quot; 버튼을 누르세요.</p>}
      {ok && na && (
        <p className="hr-ok">
          새 아티스트 {na}명도 함께 추가했습니다. 유형·프로필 이미지는 <Link href="/hr-admin/artists">아티스트 관리</Link>에서 설정하세요.
        </p>
      )}
      {err && <p className="hr-adm-err">{err}</p>}
      {w.error && <p className="hr-adm-err">목록을 불러오지 못했습니다: {w.error.message}</p>}

      <form id="form" key={cur?.id ?? `new-${copy ?? ''}`} action={saveWork} className="hr-card hr-f">
        <h2>{cur ? `곡 수정 · ${cur.title}` : isCopy ? '새 곡 추가 (이전 곡 설정 이어받기)' : '새 곡 추가'}</h2>
        {isCopy && base && (
          <p className="hr-adm-sub">
            「{base.title}」의 아티스트·용도·참여 파트를 그대로 가져왔습니다. YouTube 링크를 붙여넣고 다른 점만 고친 뒤 저장하세요.
          </p>
        )}
        {cur && <input type="hidden" name="id" value={cur.id} />}

        <WorkBasics
          title={cur?.title ?? ''}
          youtube={cur?.youtube_id ?? ''}
          date={cur ? toInputDate(cur.work_date) : today}
        />

        <fieldset>
          <legend>아티스트</legend>
          <ArtistPicker artists={artists} initial={base?.artist_ids ?? []} />
        </fieldset>

        <fieldset>
          <legend>용도</legend>
          <div className="hr-chks">
            {usage.map((x: { id: string; name: unknown }) => (
              <label key={x.id} className="hr-chk">
                <input type="checkbox" name="usageIds" value={x.id} defaultChecked={base?.usage_ids?.includes(x.id)} />{tx(x.name as never)}
              </label>
            ))}
          </div>
        </fieldset>

        <details className="hr-fold" open>
          <summary>참여 파트 · 카드 강조 파트</summary>
          {groups.map((gr: { id: string; name: unknown }) => (
            <div key={gr.id} className="hr-grp">
              <b>{tx(gr.name as never)}</b>
              <div className="hr-chks">
                {parts.filter((x: { group_id: string }) => x.group_id === gr.id).map((x: { id: string; name: unknown }) => (
                  <label key={x.id} className="hr-chk">
                    <input type="checkbox" name="partIds" value={x.id} defaultChecked={base?.part_ids?.includes(x.id)} />{tx(x.name as never)}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <label>
            곡 카드에서 강조할 파트 (선택. 위에서 체크한 파트 중에서 고르세요. 비우면 목록상 가장 앞의 파트가 강조됩니다)
            <select name="mainPartId" defaultValue={base?.main_part_id ?? ''}>
              <option value="">(자동)</option>
              {partOptions}
            </select>
          </label>
        </details>

        <details className="hr-fold" open={!!cur?.thumb_url}>
          <summary>썸네일 직접 지정 (선택 · 비우면 유튜브 썸네일을 씁니다)</summary>
          <label>썸네일 파일 올리기(JPG·PNG·WebP, 4MB 이하. 올리면 아래 주소보다 우선합니다)<input type="file" name="thumbFile" accept="image/jpeg,image/png,image/webp" /></label>
          <label>썸네일 주소<input name="thumb" placeholder="https://..." defaultValue={cur?.thumb_url ?? ''} /></label>
        </details>

        <details className="hr-fold" open={hasFeat(cur?.feat ?? null)}>
          <summary>포트폴리오 대표작 설정 (홈 화면 대표곡과는 별개입니다)</summary>
          <label>
            포트폴리오 &quot;전체&quot; 탭의 대표작으로 표시 (카드 위 라벨에 보일 파트를 고르면 대표작이 됩니다)
            <select name="featDefault" defaultValue={feat.default ?? ''}>
              <option value="">(표시 안 함)</option>
              {partOptions}
            </select>
          </label>
          <div className="hr-grp">
            <b>분야 탭의 대표작으로 표시</b>
            <div className="hr-chks">
              {groups.map((gr: { id: string; name: unknown }) => (
                <label key={gr.id} className="hr-chk">
                  <input type="checkbox" name="featGroups" value={gr.id} defaultChecked={feat.groups?.includes(gr.id)} />{tx(gr.name as never)}
                </label>
              ))}
            </div>
          </div>
          <details>
            <summary>파트 탭별 대표작 지정 (선택)</summary>
            {groups.map((gr: { id: string; name: unknown }) => (
              <div key={gr.id} className="hr-grp">
                <b>{tx(gr.name as never)}</b>
                <div className="hr-chks">
                  {parts.filter((x: { group_id: string }) => x.group_id === gr.id).map((x: { id: string; name: unknown }) => (
                    <label key={x.id} className="hr-chk">
                      <input type="checkbox" name="featParts" value={x.id} defaultChecked={feat.parts?.includes(x.id)} />{tx(x.name as never)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </details>
        </details>

        <label className="hr-chk"><input type="checkbox" name="hidden" defaultChecked={cur?.hidden ?? false} />숨김 (공개 사이트에 표시하지 않음)</label>

        <div className="hr-row hr-savebar">
          <button type="submit" className="hr-adm-btn">저장</button>
          <button type="submit" name="next" value="1" className="hr-adm-btn">저장하고 다음 곡 추가</button>
          {(cur || isCopy) && <Link href="/hr-admin/works" className="hr-link">빈 폼으로 새 곡 추가</Link>}
        </div>
      </form>

      <div className="hr-card">
        <h2>등록된 곡 ({shown.length}{shown.length !== works.length ? ` / 전체 ${works.length}` : ''})</h2>

        <form method="get" action="/hr-admin/works" className="hr-search">
          <input type="search" name="q" defaultValue={q} placeholder="곡 제목 또는 아티스트 이름으로 검색" />
          <select name="f" defaultValue={f}>
            {FILTERS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
          <button type="submit">검색</button>
          {(q || f) && <Link href="/hr-admin/works" className="hr-link">초기화</Link>}
        </form>

        {works.length === 0 ? <p>아직 없습니다.</p> : shown.length === 0 ? <p>조건에 맞는 곡이 없습니다.</p> : (
          <table className="hr-tbl">
            <thead><tr><th></th><th>제목</th><th>공개일</th><th>아티스트</th><th></th></tr></thead>
            <tbody>
              {shown.map((x) => {
                const th = thumbOf(x);
                return (
                  <tr key={x.id} className={x.id === cur?.id ? 'on' : undefined}>
                    <td className="hr-th">
                      {th ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={th} alt="" loading="lazy" width={64} height={36} />
                        </>
                      ) : <span className="hr-th-empty" />}
                    </td>
                    <td>
                      {x.title}
                      <span className="hr-badges">
                        {x.hidden && <span className="hr-badge">숨김</span>}
                        {homeIds.has(x.id) && <span className="hr-badge">홈 대표</span>}
                        {hasFeat(x.feat) && <span className="hr-badge">포트폴리오 대표</span>}
                      </span>
                    </td>
                    <td>{x.work_date || '-'}</td>
                    <td>{(x.artist_ids ?? []).map(artistName).filter(Boolean).join(', ') || '-'}</td>
                    <td className="hr-act">
                      <Link href={rowHref('edit', x.id)}>수정</Link>
                      <Link href={rowHref('copy', x.id)} title="이 곡의 아티스트·용도·파트를 가져와서 새 곡을 추가합니다">이 설정으로 추가</Link>
                      <form action={removeWork}>
                        <input type="hidden" name="id" value={x.id} />
                        <ConfirmButton className="hr-del" message={`'${x.title}' 곡을 삭제할까요?`}>삭제</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
