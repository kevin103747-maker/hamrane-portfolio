// src/app/hr-admin/(panel)/artists/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can } from '@/lib/auth/permissions';
import { tx } from '@/lib/i18n';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { saveArtist, removeArtist } from '../actions';

export default async function ArtistsPage({ searchParams }: { searchParams: Promise<{ edit?: string; err?: string; ok?: string }> }) {
  const me = await requireAdmin();
  if (!can(me, 'artists')) redirect('/hr-admin');
  const { edit, err, ok } = await searchParams;

  const db = adminDb();
  const [a, t] = await Promise.all([
    db.from('artists').select('*').order('created_at' as never, { ascending: true }).order('name'),
    db.from('artist_types').select('*').order('sort'),
  ]);
  const artists = a.data ?? [];
  const types = t.data ?? [];
  const cur = edit ? artists.find((x) => x.id === edit) : undefined;
  const typeName = (id: string) => { const f = types.find((x) => x.id === id); return f ? tx(f.name) : ''; };

  return (
    <div className="hr-pn-body">
      <h1 className="hr-pn-h">아티스트 관리</h1>
      {ok && <p className="hr-ok">저장했습니다. 배포된 사이트에는 대시보드에서 게시해야 반영됩니다.</p>}
      {err && <p className="hr-adm-err">{err}</p>}
      {a.error && <p className="hr-adm-err">목록을 불러오지 못했습니다: {a.error.message}</p>}

      <form key={cur?.id ?? 'new'} action={saveArtist} className="hr-card hr-f">
        <h2>{cur ? '아티스트 수정' : '새 아티스트 추가'}</h2>
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
        <label className="hr-chk"><input type="checkbox" name="showWhenEmpty" defaultChecked={cur?.show_when_empty ?? false} />작업물이 없어도 목록에 표시</label>

        <div className="hr-row">
          <button type="submit" className="hr-adm-btn">저장</button>
          {cur && <Link href="/hr-admin/artists" className="hr-link">새로 추가하기로 돌아가기</Link>}
        </div>
      </form>

      <div className="hr-card">
        <h2>등록된 아티스트 ({artists.length})</h2>
        {artists.length === 0 ? <p>아직 없습니다.</p> : (
          <table className="hr-tbl">
            <thead><tr><th>이름</th><th>유형</th><th></th></tr></thead>
            <tbody>
              {artists.map((x) => (
                <tr key={x.id}>
                  <td>{x.name}</td>
                  <td>{(x.type_ids ?? []).map(typeName).filter(Boolean).join(', ') || '-'}</td>
                  <td className="hr-act">
                    <Link href={`/hr-admin/artists?edit=${x.id}`}>수정</Link>
                    <form action={removeArtist}>
                      <input type="hidden" name="id" value={x.id} />
                      <ConfirmButton className="hr-del" message={`'${x.name}' 아티스트를 삭제할까요? 연결된 곡에서도 빠집니다.`}>삭제</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
