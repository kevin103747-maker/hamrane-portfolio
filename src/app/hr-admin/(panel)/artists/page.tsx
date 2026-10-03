// src/app/hr-admin/(panel)/artists/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can } from '@/lib/auth/permissions';
import { tx } from '@/lib/i18n';
import { ARTIST_PAGE_SIZE } from '@/lib/artist-admin';
import { ArtistTable } from '@/components/admin/ArtistTable';
import { saveArtist } from '../actions';

type Row = {
  id: string; name: string; type_ids: string[] | null; use_avatar: boolean | null;
  avatar_url: string | null; show_when_empty: boolean | null; hide_in_strip: boolean | null; link_url: string | null;
};
const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

export default async function ArtistsPage({
  searchParams,
}: { searchParams: Promise<{ edit?: string; err?: string; ok?: string; q?: string; p?: string }> }) {
  const me = await requireAdmin();
  if (!can(me, 'artists')) redirect('/hr-admin');
  const { edit, err, ok, q = '', p = '' } = await searchParams;

  const db = adminDb();
  const [a, t, w] = await Promise.all([
    db.from('artists').select('*').order('sort', { ascending: true }).order('name'),
    db.from('artist_types').select('*').order('sort'),
    db.from('works').select('artist_ids, hidden'),
  ]);
  const artists = (a.data ?? []) as Row[];
  const types = t.data ?? [];
  const cur = edit ? artists.find((x) => x.id === edit) : undefined;

  // 공개된(숨김 아님) 곡 수
  const count = new Map<string, number>();
  for (const x of (w.data ?? []) as { artist_ids: string[] | null; hidden: boolean | null }[]) {
    if (x.hidden) continue;
    for (const id of x.artist_ids ?? []) count.set(id, (count.get(id) ?? 0) + 1);
  }

  // 번호(no)는 전체 목록 기준 순서입니다. 검색해도 번호는 그대로 유지됩니다.
  const indexed = artists.map((x, i) => ({ x, no: i + 1 }));
  const needle = norm(q);
  const found = needle ? indexed.filter(({ x }) => norm(x.name).includes(needle)) : indexed;
  const pages = Math.max(1, Math.ceil(found.length / ARTIST_PAGE_SIZE));
  const page = Math.min(Math.max(parseInt(p, 10) || 1, 1), pages);
  const shown = found.slice((page - 1) * ARTIST_PAGE_SIZE, page * ARTIST_PAGE_SIZE);

  const href = (n: { page?: number; edit?: string }) => {
    const sp = new URLSearchParams();
    if (q) sp.set('q', q);
    if (n.page && n.page > 1) sp.set('p', String(n.page));
    if (n.edit) sp.set('edit', n.edit);
    const s = sp.toString();
    return `/hr-admin/artists${s ? `?${s}` : ''}${n.edit ? '#form' : ''}`;
  };

  // 표 컴포넌트에 넘길 데이터(함수는 넘길 수 없어서 수정 링크도 미리 만들어 둡니다)
  const rowsData = shown.map(({ x }) => ({
    id: x.id,
    name: x.name,
    typeIds: x.type_ids ?? [],
    hide: !!x.hide_in_strip,
    showWhenEmpty: !!x.show_when_empty,
    works: count.get(x.id) ?? 0,
  }));
  const slots = shown.map(({ no }) => no);
  const editLinks = Object.fromEntries(shown.map(({ x }) => [x.id, href({ page, edit: x.id })]));
  const typeOpts = types.map((x) => ({ id: x.id as string, name: tx(x.name) }));
  // 서버 데이터가 바뀌면(이동 버튼·수정 후 등) 표를 새로 만들어 최신 값을 보여 줍니다
  const sig = shown
    .map(({ x, no }) => `${x.id}:${no}:${x.hide_in_strip ? 1 : 0}:${(x.type_ids ?? []).join('+')}`)
    .join('|');

  return (
    <div className="hr-pn-body">
      <h1 className="hr-pn-h">아티스트 관리</h1>
      {ok && <p className="hr-ok">저장했습니다. 배포된 사이트에는 상단의 게시 버튼을 눌러야 반영됩니다.</p>}
      {err && <p className="hr-adm-err">{err}</p>}
      {a.error && <p className="hr-adm-err">목록을 불러오지 못했습니다: {a.error.message}</p>}

      <form id="form" key={cur?.id ?? 'new'} action={saveArtist} className="hr-card hr-f">
        <h2>{cur ? `아티스트 수정 · ${cur.name}` : '새 아티스트 추가'}</h2>
        {cur && <input type="hidden" name="id" value={cur.id} />}
        <label>이름<input name="name" required defaultValue={cur?.name ?? ''} /></label>

        <fieldset>
          <legend>유형</legend>
          <div className="hr-chks">
            {types.map((x) => (
              <label key={x.id} className="hr-chk">
                <input type="checkbox" name="typeIds" value={x.id} defaultChecked={cur?.type_ids?.includes(x.id)} />{tx(x.name)}
              </label>
            ))}
          </div>
        </fieldset>

        <label className="hr-chk"><input type="checkbox" name="useAvatar" defaultChecked={cur?.use_avatar ?? false} />프로필 이미지 사용</label>
        <label>프로필 이미지 파일 올리기(JPG·PNG·WebP, 4MB 이하. 올리면 아래 주소보다 우선합니다)<input type="file" name="avatarFile" accept="image/jpeg,image/png,image/webp" /></label>
        <label>프로필 이미지 주소(선택)<input name="avatarUrl" placeholder="https://..." defaultValue={cur?.avatar_url ?? ''} /></label>
        <label>아티스트 링크(유튜브·방송국 등, 선택 — 팝업에서 이름을 누르면 이동합니다)<input name="linkUrl" placeholder="https://www.youtube.com/@..." defaultValue={cur?.link_url ?? ''} /></label>
        <label className="hr-chk"><input type="checkbox" name="showWhenEmpty" defaultChecked={cur?.show_when_empty ?? false} />작업물이 없어도 포트폴리오 아티스트 칸에 표시</label>
        <label className="hr-chk"><input type="checkbox" name="hideInStrip" defaultChecked={cur?.hide_in_strip ?? false} />포트폴리오 아티스트 칸에서 숨기기 (곡이 있어도 숨김. 곡 카드의 이름 표시와 곡 목록에는 영향 없음)</label>
        {!cur && <p className="hr-adm-sub">새 아티스트는 목록 맨 뒤에 추가됩니다. 순서는 아래 목록에서 바꿀 수 있습니다.</p>}

        <div className="hr-row">
          <button type="submit" className="hr-adm-btn">저장</button>
          {cur && <Link href={href({ page })} className="hr-link">새로 추가하기로 돌아가기</Link>}
        </div>
      </form>

      <div className="hr-card">
        <h2>등록된 아티스트 ({found.length}{found.length !== artists.length ? ` / 전체 ${artists.length}` : ''})</h2>
        <p className="hr-adm-sub">이 순서가 포트폴리오 &quot;Artists&quot; 칸의 표시 순서입니다. 바꾼 뒤에는 상단의 게시 버튼을 눌러야 사이트에 반영됩니다.</p>

        <form method="get" action="/hr-admin/artists" className="hr-search">
          <input type="search" name="q" defaultValue={q} placeholder="이름 검색" />
          <button type="submit" className="hr-adm-btn">검색</button>
          {q && <Link href="/hr-admin/artists" className="hr-link">검색 해제</Link>}
        </form>

        {shown.length === 0 ? <p>{artists.length ? '검색 결과가 없습니다.' : '아직 없습니다.'}</p> : (
          <ArtistTable
            key={sig}
            rows={rowsData}
            slots={slots}
            total={artists.length}
            types={typeOpts}
            editLinks={editLinks}
            editingId={cur?.id}
            q={q}
            page={page}
          />
        )}

        {pages > 1 && (
          <div className="hr-row hr-pager">
            {page > 1 && <Link href={href({ page: page - 1 })} className="hr-link">← 이전</Link>}
            <span>{page} / {pages}</span>
            {page < pages && <Link href={href({ page: page + 1 })} className="hr-link">다음 →</Link>}
          </div>
        )}
      </div>
    </div>
  );
}
