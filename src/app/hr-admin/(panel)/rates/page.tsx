// src/app/hr-admin/(panel)/rates/page.tsx — 단가 항목 관리
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { DiscountFields } from '@/components/admin/DiscountFields';
import { Section, Help, Flash } from '@/components/admin/Section';
import { saveRate, removeRate, moveRate } from './actions';

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
  searchParams: Promise<{ ok?: string; err?: string; edit?: string; g?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const { ok, err, edit, g: openGroup } = await searchParams;

  const db = adminDb();
  const [g, r] = await Promise.all([
    db.from('part_groups').select('id, num, name').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('rate_items').select('*').order('sort', { ascending: true }).order('id', { ascending: true }),
  ]);
  const groups = g.data ?? [];
  const items = r.data ?? [];
  const cur = edit ? items.find((x) => x.id === edit) : undefined;
  const hasOptional = !!(cur?.descr || cur?.tag || cur?.sort);

  return (
    <div className="hr-pn-body">
      <h1>단가표</h1>
      <p className="hr-lead">
        파트별 기본 단가입니다. 구성 예시는 <Link href="/hr-admin/rates/packages">패키지</Link>, 소요 기간은{' '}
        <Link href="/hr-admin/turnaround">소요·마감</Link>, 수량·묶음 할인은{' '}
        <Link href="/hr-admin/discounts">할인 규칙</Link>에서 관리합니다.
      </p>
      <Help title="이 화면에서 하는 일">
        <p>
          위쪽 폼에서 항목을 추가하거나 수정하고, 아래 목록에서 분야별로 확인합니다.
          항목 순서는 목록의 ▲▼ 버튼으로 바꿉니다. 같은 분야 안에서만 움직이며, 누르는 즉시 저장됩니다.
          이벤트 할인은 이 항목 하나에만 붙는 기간 한정 할인입니다. 여러 곡이나 여러 분야에 걸리는 할인은 &quot;할인 규칙&quot;에서 정합니다.
        </p>
      </Help>

      <Flash ok={ok} err={err} />

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
        <div className="hr-row">
          <label>
            가격 (숫자만, 원 단위)
            <input name="price" inputMode="numeric" defaultValue={cur?.price ?? ''} placeholder="150000" required />
          </label>
          <label>
            단위
            <input name="unit" defaultValue={txt(cur?.unit)} placeholder="곡당" required />
          </label>
        </div>

        <Section open={hasOptional} title="설명 · 태그 · 순서 (선택)">
          <label>
            설명
            <input name="desc" defaultValue={txt(cur?.descr)} />
          </label>
          <div className="hr-row">
            <label>
              태그
              <input name="tag" defaultValue={cur?.tag ?? ''} />
            </label>
            <label>
              순서 (보통 비워 두세요. 새 항목은 맨 끝에 들어가고, 순서는 아래 목록의 ▲▼로 바꿉니다)
              <input type="number" name="sort" defaultValue={cur?.sort ?? ''} />
            </label>
          </div>
        </Section>

        <Section
          open={!!(cur?.discount as Disc)?.on}
          title="이벤트 할인 (선택)"
          badge={(cur?.discount as Disc)?.on ? '켜짐' : '꺼짐'}
        >
          <DiscountFields d={cur?.discount as Disc} />
        </Section>

        <div className="hr-act">
          {cur && <Link href="/hr-admin/rates">수정 취소</Link>}
          <button type="submit">{cur ? '수정 저장' : '추가'}</button>
        </div>
      </form>

      <h2 className="hr-h2">등록된 항목 ({items.length})</h2>
      {groups.map((grp, gi) => {
        const rows = items.filter((x) => x.group_id === grp.id);
        return (
          <Section
            key={grp.id}
            open={gi === 0 || cur?.group_id === grp.id || openGroup === grp.id}
            title={`${grp.num} ${txt(grp.name)}`}
            badge={`${rows.length}개`}
          >
            {rows.length === 0 && <p>항목이 없습니다.</p>}
            {rows.map((x, ri) => (
              <div key={x.id} id={`row-${x.id}`} className="hr-rt-row">
                <div>
                  <b>{txt(x.name)}{x.tag ? ` · ${x.tag}` : ''}</b>
                  <small>
                    {x.price}원 / {txt(x.unit)}
                    {x.discount ? ` · ${discLabel(x.discount as Disc)}` : ''}
                  </small>
                </div>
                <div className="hr-rt-tools">
                  <div className="hr-ptools">
                    <form action={moveRate}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="dir" value="up" />
                      <button type="submit" disabled={ri === 0} aria-label="항목을 위로">▲</button>
                    </form>
                    <form action={moveRate}>
                      <input type="hidden" name="id" value={x.id} />
                      <input type="hidden" name="dir" value="down" />
                      <button type="submit" disabled={ri === rows.length - 1} aria-label="항목을 아래로">▼</button>
                    </form>
                  </div>
                  <Link href={`/hr-admin/rates?edit=${encodeURIComponent(x.id)}#form`}>수정</Link>
                  <form action={removeRate}>
                    <input type="hidden" name="id" value={x.id} />
                    <label><input type="checkbox" required /> 삭제 확인</label>
                    <button type="submit">삭제</button>
                  </form>
                </div>
              </div>
            ))}
          </Section>
        );
      })}
    </div>
  );
}
