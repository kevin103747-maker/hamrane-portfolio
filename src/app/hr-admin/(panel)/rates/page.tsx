// src/app/hr-admin/(panel)/rates/page.tsx — 단가 항목 관리
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { DiscountFields } from '@/components/admin/DiscountFields';
import { saveRate, removeRate } from './actions';

// 문자열 또는 { ko: "..." } 형태 모두 글자로 바꿉니다.
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

export default async function RatesPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; edit?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const { ok, err, edit } = await searchParams;

  const db = adminDb();
  const [g, r] = await Promise.all([
    db.from('part_groups').select('id, num, name').order('sort', { ascending: true }),
    db.from('rate_items').select('*').order('sort', { ascending: true }),
  ]);
  const groups = g.data ?? [];
  const items = r.data ?? [];
  const cur = edit ? items.find((x) => x.id === edit) : undefined;

  return (
    <div className="hr-pn-body">
      <h1>단가표</h1>
      <p>파트별 기본 단가입니다. 패키지는 <Link href="/hr-admin/rates/packages">패키지 화면</Link>에서 관리합니다.</p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 상단의 &quot;게시&quot; 버튼을 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form key={cur?.id ?? 'new'} id="form" action={saveRate} className="hr-card hr-f">
        <h2>{cur ? `항목 수정 · ${txt(cur.name)}` : '새 항목 추가'}</h2>
        {cur && <input type="hidden" name="id" value={cur.id} />}

        <div className="hr-row">
          <label>
            분류
            <select name="groupId" defaultValue={cur?.group_id ?? groups[0]?.id ?? ''}>
              {groups.map((x) => (
                <option key={x.id} value={x.id}>{x.num} {txt(x.name)}</option>
              ))}
            </select>
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
            가격 (숫자만, 원 단위)
            <input name="price" inputMode="numeric" defaultValue={cur?.price ?? ''} placeholder="150000" required />
          </label>
          <label>
            단위
            <input name="unit" defaultValue={txt(cur?.unit)} placeholder="곡당" required />
          </label>
          <label>
            태그 (선택)
            <input name="tag" defaultValue={cur?.tag ?? ''} />
          </label>
          <label>
            순서 (비우면 맨 끝)
            <input type="number" name="sort" defaultValue={cur?.sort ?? ''} />
          </label>
        </div>

        <DiscountFields d={cur?.discount as Disc} />

        <div className="hr-act">
          {cur && <Link href="/hr-admin/rates">수정 취소</Link>}
          <button type="submit">{cur ? '수정 저장' : '추가'}</button>
        </div>
      </form>

      {groups.map((grp) => {
        const rows = items.filter((x) => x.group_id === grp.id);
        return (
          <section key={grp.id} className="hr-card">
            <h2>{grp.num} {txt(grp.name)}</h2>
            {rows.length === 0 && <p>항목이 없습니다.</p>}
            {rows.map((x) => (
              <div key={x.id} className="hr-rt-row">
                <div>
                  <b>{txt(x.name)}{x.tag ? ` · ${x.tag}` : ''}</b>
                  <small>
                    {x.price}원 / {txt(x.unit)}
                    {x.discount ? ` · ${discLabel(x.discount as Disc)}` : ''}
                  </small>
                </div>
                <div className="hr-rt-tools">
                  <Link href={`/hr-admin/rates?edit=${encodeURIComponent(x.id)}#form`}>수정</Link>
                  <form action={removeRate}>
                    <input type="hidden" name="id" value={x.id} />
                    <label><input type="checkbox" required /> 삭제 확인</label>
                    <button type="submit">삭제</button>
                  </form>
                </div>
              </div>
            ))}
          </section>
        );
      })}
    </div>
  );
}
