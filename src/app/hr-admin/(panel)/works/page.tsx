// src/app/hr-admin/(panel)/works/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can } from '@/lib/auth/permissions';
import { tx } from '@/lib/i18n';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { saveWork, removeWork } from '../actions';

type FeatValue = { default?: string; groups?: string[]; parts?: string[] };

/** 저장된 "2026.09.15" → 달력 입력값 "2026-09-15". 예전 월 단위 값("2026.09")은 1일로 채웁니다. */
const toInputDate = (v?: string | null) => {
  const m = (v ?? '').match(/^(\d{4})[.-](\d{2})(?:[.-](\d{2}))?$/);
  return m ? `${m[1]}-${m[2]}-${m[3] ?? '01'}` : '';
};

export default async function WorksPage({
  searchParams,
}: { searchParams: Promise<{ edit?: string; err?: string; ok?: string }> }) {
  const me = await requireAdmin();
  if (!can(me, 'works')) redirect('/hr-admin');
  const { edit, err, ok } = await searchParams;

  const db = adminDb();
  const [w, a, u, g, p] = await Promise.all([
    db.from('works').select('*').order('work_date', { ascending: false }).order('created_at', { ascending: false }),
    db.from('artists').select('id, name').order('name'),
    db.from('usage_types').select('*').order('sort'),
    db.from('part_groups').select('*').order('sort'),
    db.from('parts').select('*').order('sort'),
  ]);
  const works = w.data ?? [];
  const artists = a.data ?? [];
  const usage = u.data ?? [];
  const groups = g.data ?? [];
  const parts = p.data ?? [];
  const cur = edit ? works.find((x) => x.id === edit) : undefined;
  const artistName = (id: string) => artists.find((x) => x.id === id)?.name ?? '';
  const feat = (cur?.feat ?? {}) as FeatValue;

  // 분야별로 묶은 파트 선택지(강조 파트·대표작 라벨 선택에 같이 씁니다)
  const partOptions = groups.map((gr) => (
    <optgroup key={gr.id} label={tx(gr.name)}>
      {parts.filter((x) => x.group_id === gr.id).map((x) => (
        <option key={x.id} value={x.id}>{tx(x.name)}</option>
      ))}
    </optgroup>
  ));

  return (
    <div className="hr-pn-body">
      <h1 className="hr-pn-h">곡 관리</h1>
      {ok && <p className="hr-ok">저장했습니다. 배포된 사이트에는 대시보드에서 게시해야 반영됩니다.</p>}
      {err && <p className="hr-adm-err">{err}</p>}
      {w.error && <p className="hr-adm-err">목록을 불러오지 못했습니다: {w.error.message}</p>}

      <form key={cur?.id ?? 'new'} action={saveWork} className="hr-card hr-f">
        <h2>{cur ? '곡 수정' : '새 곡 추가'}</h2>
        {cur && <input type="hidden" name="id" value={cur.id} />}
        <label>제목<input name="title" required defaultValue={cur?.title ?? ''} /></label>
        <label>YouTube 링크 또는 영상 ID<input name="youtube" placeholder="https://youtu.be/..." defaultValue={cur?.youtube_id ?? ''} /></label>
        <label>공개일<input type="date" name="date" defaultValue={toInputDate(cur?.work_date)} /></label>
        <label>썸네일 파일 올리기(JPG·PNG·WebP, 4MB 이하. 올리면 아래 주소보다 우선합니다)<input type="file" name="thumbFile" accept="image/jpeg,image/png,image/webp" /></label>
        <label>썸네일 주소(선택, 비우면 유튜브 썸네일 사용)<input name="thumb" placeholder="https://..." defaultValue={cur?.thumb_url ?? ''} /></label>

        <fieldset>
          <legend>아티스트</legend>
          {artists.length === 0 ? (
            <p className="hr-adm-sub">등록된 아티스트가 없습니다. <Link href="/hr-admin/artists">아티스트 관리</Link>에서 먼저 추가하세요.</p>
          ) : (
            <div className="hr-chks">
              {artists.map((x) => (
                <label key={x.id} className="hr-chk">
                  <input type="checkbox" name="artistIds" value={x.id} defaultChecked={cur?.artist_ids?.includes(x.id)} />{x.name}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>용도</legend>
          <div className="hr-chks">
            {usage.map((x) => (
              <label key={x.id} className="hr-chk">
                <input type="checkbox" name="usageIds" value={x.id} defaultChecked={cur?.usage_ids?.includes(x.id)} />{tx(x.name)}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>참여 파트</legend>
          {groups.map((gr) => (
            <div key={gr.id} className="hr-grp">
              <b>{tx(gr.name)}</b>
              <div className="hr-chks">
                {parts.filter((x) => x.group_id === gr.id).map((x) => (
                  <label key={x.id} className="hr-chk">
                    <input type="checkbox" name="partIds" value={x.id} defaultChecked={cur?.part_ids?.includes(x.id)} />{tx(x.name)}
                  </label>
                ))}
              </div>
            </div>
          ))}
          <label>
            곡 카드에서 강조할 파트 (선택. 위에서 체크한 파트 중에서 고르세요. 비우면 목록상 가장 앞의 파트가 강조됩니다)
            <select name="mainPartId" defaultValue={cur?.main_part_id ?? ''}>
              <option value="">(자동)</option>
              {partOptions}
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>포트폴리오 대표작 (홈 화면 대표곡과는 별개입니다)</legend>
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
              {groups.map((gr) => (
                <label key={gr.id} className="hr-chk">
                  <input type="checkbox" name="featGroups" value={gr.id} defaultChecked={feat.groups?.includes(gr.id)} />{tx(gr.name)}
                </label>
              ))}
            </div>
          </div>
          <details>
            <summary>파트 탭별 대표작 지정 (선택)</summary>
            {groups.map((gr) => (
              <div key={gr.id} className="hr-grp">
                <b>{tx(gr.name)}</b>
                <div className="hr-chks">
                  {parts.filter((x) => x.group_id === gr.id).map((x) => (
                    <label key={x.id} className="hr-chk">
                      <input type="checkbox" name="featParts" value={x.id} defaultChecked={feat.parts?.includes(x.id)} />{tx(x.name)}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </details>
        </fieldset>

        <label className="hr-chk"><input type="checkbox" name="hidden" defaultChecked={cur?.hidden ?? false} />숨김 (공개 사이트에 표시하지 않음)</label>

        <div className="hr-row">
          <button type="submit" className="hr-adm-btn">저장</button>
          {cur && <Link href="/hr-admin/works" className="hr-link">새 곡 추가로 돌아가기</Link>}
        </div>
      </form>

      <div className="hr-card">
        <h2>등록된 곡 ({works.length})</h2>
        {works.length === 0 ? <p>아직 없습니다.</p> : (
          <table className="hr-tbl">
            <thead><tr><th>제목</th><th>공개일</th><th>아티스트</th><th></th></tr></thead>
            <tbody>
              {works.map((x) => (
                <tr key={x.id}>
                  <td>{x.title}{x.hidden && <span className="hr-badge">숨김</span>}</td>
                  <td>{x.work_date || '-'}</td>
                  <td>{(x.artist_ids ?? []).map(artistName).filter(Boolean).join(', ') || '-'}</td>
                  <td className="hr-act">
                    <Link href={`/hr-admin/works?edit=${x.id}`}>수정</Link>
                    <form action={removeWork}>
                      <input type="hidden" name="id" value={x.id} />
                      <ConfirmButton className="hr-del" message={`'${x.title}' 곡을 삭제할까요?`}>삭제</ConfirmButton>
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
