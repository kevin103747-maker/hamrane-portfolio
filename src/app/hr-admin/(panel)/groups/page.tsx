// src/app/hr-admin/(panel)/groups/page.tsx — 분야·파트 관리
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { ConfirmButton } from '@/components/admin/ConfirmButton';
import { saveGroup, removeGroup, moveGroup, savePart, removePart, movePart } from './actions';

// 문자열 또는 { ko: "..." } 형태 모두 글자로 바꿉니다.
const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  const { ok, err } = await searchParams;

  const db = adminDb();
  const [g, p, w, r] = await Promise.all([
    db.from('part_groups').select('*').order('sort').order('id'),
    db.from('parts').select('*').order('sort').order('id'),
    db.from('works').select('part_ids'),
    db.from('rate_items').select('group_id'),
  ]);
  const groups = g.data ?? [];
  const parts = p.data ?? [];

  // 곡이 파트를 몇 번 쓰는지, 분야에 단가 항목이 몇 개 있는지
  const partUse = new Map<string, number>();
  for (const x of w.data ?? []) for (const id of (x.part_ids ?? []) as string[]) partUse.set(id, (partUse.get(id) ?? 0) + 1);
  const rateUse = new Map<string, number>();
  for (const x of r.data ?? []) rateUse.set(x.group_id, (rateUse.get(x.group_id) ?? 0) + 1);

  return (
    <div className="hr-pn-body">
      <h1 className="hr-pn-h">분야·파트 관리</h1>
      <p className="hr-adm-sub">
        포트폴리오의 분야 탭과 단가표의 분류가 여기 순서대로 나옵니다. 번호(01, 02…)는 순서에 따라 자동으로 매겨집니다.
        단가표에는 단가 항목이 하나라도 있는 분야만 보입니다. 바꾼 내용은 상단의 &quot;사이트에 게시&quot; 버튼을 눌러야 공개 사이트에 반영됩니다.
      </p>
      {ok === 'removed' && <p className="hr-ok">삭제했습니다.</p>}
      {err && <p className="hr-adm-err">{err}</p>}
      {(g.error || p.error) && <p className="hr-adm-err">불러오지 못했습니다: {(g.error ?? p.error)?.message}</p>}

      {groups.map((gr, gi) => {
        const mine = parts.filter((x) => x.group_id === gr.id);
        const rn = rateUse.get(gr.id) ?? 0;
        return (
          <section key={gr.id} id={gr.id} className="hr-card hr-gcard">
            <div className="hr-ghead">
              <span className="hr-gno">{String(gi + 1).padStart(2, '0')}</span>
              <div className="hr-gtools">
                <form action={moveGroup}>
                  <input type="hidden" name="id" value={gr.id} />
                  <input type="hidden" name="dir" value="up" />
                  <button type="submit" disabled={gi === 0} aria-label="분야를 위로">▲</button>
                </form>
                <form action={moveGroup}>
                  <input type="hidden" name="id" value={gr.id} />
                  <input type="hidden" name="dir" value="down" />
                  <button type="submit" disabled={gi === groups.length - 1} aria-label="분야를 아래로">▼</button>
                </form>
              </div>
              {ok === gr.id && <span className="hr-inline-ok" role="status">저장했습니다</span>}
            </div>

            <form action={saveGroup} className="hr-f">
              <input type="hidden" name="id" value={gr.id} />
              <label>분야 이름<input name="name" required maxLength={30} defaultValue={txt(gr.name)} /></label>
              <label>영문 부제 (단가표 제목 옆에 작게 표시, 비워도 됨)<input name="en" maxLength={40} defaultValue={gr.en ?? ''} /></label>
              <label>설명 (단가표에서 제목 아래에 표시)<textarea name="descr" rows={2} maxLength={120} defaultValue={txt(gr.descr)} /></label>
              <div className="hr-row"><button type="submit" className="hr-adm-btn">분야 저장</button></div>
            </form>

            <h3>파트</h3>
            {mine.length === 0 && <p className="hr-adm-sub">이 분야에 파트가 없습니다.</p>}
            <ul className="hr-plist">
              {mine.map((pt, pi) => {
                const n = partUse.get(pt.id) ?? 0;
                return (
                  <li key={pt.id}>
                    <form action={savePart} className="hr-prow">
                      <input type="hidden" name="id" value={pt.id} />
                      <input type="hidden" name="groupId" value={gr.id} />
                      <input name="name" required maxLength={30} defaultValue={txt(pt.name)} aria-label="파트 이름" />
                      <button type="submit">저장</button>
                    </form>
                    <span className="hr-use">{n ? `곡 ${n}개에서 사용` : '사용 중인 곡 없음'}</span>
                    <div className="hr-ptools">
                      <form action={movePart}>
                        <input type="hidden" name="id" value={pt.id} />
                        <input type="hidden" name="dir" value="up" />
                        <button type="submit" disabled={pi === 0} aria-label="파트를 위로">▲</button>
                      </form>
                      <form action={movePart}>
                        <input type="hidden" name="id" value={pt.id} />
                        <input type="hidden" name="dir" value="down" />
                        <button type="submit" disabled={pi === mine.length - 1} aria-label="파트를 아래로">▼</button>
                      </form>
                      <form action={removePart}>
                        <input type="hidden" name="id" value={pt.id} />
                        <ConfirmButton className="hr-del" message={`'${txt(pt.name)}' 파트를 삭제할까요?`}>삭제</ConfirmButton>
                      </form>
                    </div>
                  </li>
                );
              })}
            </ul>

            <form action={savePart} className="hr-prow">
              <input type="hidden" name="groupId" value={gr.id} />
              <input name="name" required maxLength={30} placeholder="새 파트 이름" aria-label="새 파트 이름" />
              <button type="submit">파트 추가</button>
            </form>

            <div className="hr-gdel">
              <small className="hr-use">
                {rn ? `단가 항목 ${rn}개 사용 중 · ` : ''}파트와 단가 항목이 없어야 삭제할 수 있습니다.
              </small>
              <form action={removeGroup}>
                <input type="hidden" name="id" value={gr.id} />
                <ConfirmButton className="hr-del" message={`'${txt(gr.name)}' 분야를 삭제할까요?`}>분야 삭제</ConfirmButton>
              </form>
            </div>
          </section>
        );
      })}

      <section id="new" className="hr-card hr-gcard">
        <h2>새 분야 추가</h2>
        <p className="hr-adm-sub">맨 아래에 추가됩니다. 위치는 추가한 뒤 ▲▼로 옮기세요.</p>
        <form action={saveGroup} className="hr-f">
          <label>분야 이름<input name="name" required maxLength={30} placeholder="예: 샘플링" /></label>
          <label>영문 부제 (비워도 됨)<input name="en" maxLength={40} placeholder="예: Sampling" /></label>
          <label>설명<textarea name="descr" rows={2} maxLength={120} /></label>
          <div className="hr-row"><button type="submit" className="hr-adm-btn">분야 추가</button></div>
        </form>
      </section>
    </div>
  );
}
