// src/app/hr-admin/(panel)/rates/packages/page.tsx — 패키지 관리
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { DiscountFields } from '@/components/admin/DiscountFields';
import { savePackage, removePackage } from '../actions';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

type Disc = { on?: boolean; rate?: number; price?: string; endDate?: string } | null;
const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

function discLabel(d: Disc) {
  if (!d) return '';
  if (!d.on) return '할인 꺼짐';
  if (d.endDate && d.endDate < todayKst()) return `할인 종료됨 (${d.endDate})`;
  return `할인 ${d.price ?? ''}원${d.rate ? ` (-${d.rate}%)` : ''}${d.endDate ? ` · ${d.endDate}까지` : ''}`;
}

export default async function PackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; edit?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const { ok, err, edit } = await searchParams;

  const db = adminDb();
  const [g, r, p] = await Promise.all([
    db.from('part_groups').select('id, num, name').order('sort', { ascending: true }),
    db.from('rate_items').select('id, group_id, name').order('sort', { ascending: true }),
    db.from('packages').select('*').order('sort', { ascending: true }),
  ]);
  const groups = g.data ?? [];
  const items = r.data ?? [];
  const pkgs = p.data ?? [];
  const cur = edit ? pkgs.find((x) => x.id === edit) : undefined;
  const picked: string[] = cur?.item_ids ?? [];
  const nameOf = (id: string) => txt(items.find((x) => x.id === id)?.name) || id;

  return (
    <div className="hr-pn-body">
      <h1>패키지</h1>
      <p>단가표 아래에 나오는 구성 예시입니다. 합계는 직접 입력합니다. 항목은 단가표에 있는 것 중에서 고릅니다. 항목 가격을 바꿔도 합계는 자동으로 바뀌지 않습니다.</p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 대시보드의 &quot;게시&quot;를 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form key={cur?.id ?? 'new'} id="form" action={savePackage} className="hr-card hr-f">
        <h2>{cur ? `패키지 수정 · ${txt(cur.name)}` : '새 패키지 추가'}</h2>
        {cur && <input type="hidden" name="id" value={cur.id} />}

        <div className="hr-row">
          <label>
            번호
            <input name="num" defaultValue={cur?.num ?? String(pkgs.length + 1).padStart(2, '0')} required />
          </label>
          <label>
            태그
            <input name="tag" defaultValue={cur?.tag ?? ''} placeholder="ORIGINAL" required />
          </label>
          <label>
            이름
            <input name="name" defaultValue={txt(cur?.name)} required />
          </label>
        </div>
        <label>
          설명
          <input name="desc" defaultValue={txt(cur?.descr)} />
        </label>
        <div className="hr-row">
          <label>
            합계 (정가, 숫자만)
            <input name="total" inputMode="numeric" defaultValue={cur?.total ?? ''} required />
          </label>
          <label>
            순서 (비우면 맨 끝)
            <input type="number" name="sort" defaultValue={cur?.sort ?? ''} />
          </label>
        </div>

        {groups.map((grp) => {
          const rows = items.filter((x) => x.group_id === grp.id);
          if (!rows.length) return null;
          return (
            <fieldset key={grp.id}>
              <legend>{grp.num} {txt(grp.name)}</legend>
              <div className="hr-chks">
                {rows.map((x) => (
                  <label key={x.id} className="hr-chk">
                    <input type="checkbox" name="itemIds" value={x.id} defaultChecked={picked.includes(x.id)} />
                    {txt(x.name)}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}

        <DiscountFields d={cur?.discount as Disc} />

        <div className="hr-act">
          {cur && <Link href="/hr-admin/rates/packages">수정 취소</Link>}
          <button type="submit">{cur ? '수정 저장' : '추가'}</button>
        </div>
      </form>

      <section className="hr-card">
        <h2>등록된 패키지</h2>
        {pkgs.length === 0 && <p>패키지가 없습니다.</p>}
        {pkgs.map((x) => (
          <div key={x.id} className="hr-rt-row">
            <div>
              <b>EX {x.num} · {txt(x.name)} · {x.tag}</b>
              <small>
                {x.total}원 · {(x.item_ids as string[]).map(nameOf).join(', ')}
                {x.discount ? ` · ${discLabel(x.discount as Disc)}` : ''}
              </small>
            </div>
            <div className="hr-rt-tools">
              <Link href={`/hr-admin/rates/packages?edit=${encodeURIComponent(x.id)}#form`}>수정</Link>
              <form action={removePackage}>
                <input type="hidden" name="id" value={x.id} />
                <label><input type="checkbox" required /> 삭제 확인</label>
                <button type="submit">삭제</button>
              </form>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
