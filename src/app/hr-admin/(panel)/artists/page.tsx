// src/app/hr-admin/(panel)/artists/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can } from '@/lib/auth/permissions';
import { tx } from '@/lib/i18n';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { ARTIST_PAGE_SIZE } from '@/lib/artist-admin';
import { saveArtist, removeArtist, moveArtist } from '../actions';

type Row = {
  id: string; name: string; type_ids: string[] | null; use_avatar: boolean | null;
  avatar_url: string | null; show_when_empty: boolean | null; hide_in_strip: boolean | null;
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
  const typeName = (id: string) => { const f = types.find((x) => x.id === id); return f ? tx(f.name) : ''; };

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
        <p className="hr-adm-sub">이 순서가 포트폴리오 &quot;Artists&quot; 칸의 표시 순서입니다. 순서를 바꾼 뒤에는 상단의 게시 버튼을 눌러야 사이트에 반영됩니다.</p>

        <form method="get" action="/hr-admin/artists" className="hr-search">
          <input type="search" name="q" defaultValue={q} placeholder="이름 검색" />
          <button type="submit" className="hr-adm-btn">검색</button>
          {q && <Link href="/hr-admin/artists" className="hr-link">검색 해제</Link>}
        </form>

        {shown.length === 0 ? <p>{artists.length ? '검색 결과가 없습니다.' : '아직 없습니다.'}</p> : (
          <table className="hr-tbl">
            <thead><tr><th>순서</th><th>이름</th><th>유형</th><th>곡</th><th>칸 표시</th><th></th></tr></thead>
            <tbody>
              {shown.map(({ x, no }) => {
                const n = count.get(x.id) ?? 0;
                const status = x.hide_in_strip ? '숨김' : (n > 0 || x.show_when_empty) ? '표시' : '곡 없어서 안 보임';
                return (
                  <tr key={x.id} id={`a-${x.id}`}>
                    <td>{no}</td>
                    <td>{x.name}</td>
                    <td>{(x.type_ids ?? []).map(typeName).filter(Boolean).join(', ') || '-'}</td>
                    <td>{n}</td>
                    <td>{status}</td>
                    <td className="hr-act">
                      <form action={moveArtist} className="hr-mv">
                        <input type="hidden" name="id" value={x.id} />
                        <input type="hidden" name="q" value={q} />
                        <input type="hidden" name="p" value={String(page)} />
                        <button type="submit" name="mode" value="top" disabled={no === 1} title="맨 위로">⤒</button>
                        <button type="submit" name="mode" value="up" disabled={no === 1} title="한 칸 위로">↑</button>
                        <button type="submit" name="mode" value="down" disabled={no === artists.length} title="한 칸 아래로">↓</button>
                      </form>
                      <form action={moveArtist} className="hr-mv">
                        <input type="hidden" name="id" value={x.id} />
                        <input type="hidden" name="q" value={q} />
                        <input type="hidden" name="p" value={String(page)} />
                        <input type="hidden" name="mode" value="to" />
                        <input type="number" name="pos" min={1} max={artists.length} required placeholder={String(no)} aria-label={`${x.name} 이동할 순서`} />
                        <button type="submit">이동</button>
                      </form>
                      <Link href={href({ page, edit: x.id })}>수정</Link>
                      <form action={removeArtist}>
                        <input type="hidden" name="id" value={x.id} />
                        <ConfirmButton className="hr-del" message={`'${x.name}' 아티스트를 삭제할까요? 연결된 곡에서도 빠집니다.`}>삭제</ConfirmButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
