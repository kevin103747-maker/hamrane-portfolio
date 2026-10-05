// src/app/hr-admin/(panel)/rates/packages/page.tsx — 패키지 관리
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { DiscountFields } from '@/components/admin/DiscountFields';
import { ExtrasEditor, type Extra } from '@/components/admin/ExtrasEditor';
import { Section, Help, Flash } from '@/components/admin/Section';
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
    db.from('rate_items').select('id, group_id, name, price').order('sort', { ascending: true }),
    db.from('packages').select('*').order('sort', { ascending: true }),
  ]);
  const groups = g.data ?? [];
  const items = r.data ?? [];
  const pkgs = p.data ?? [];
  const cur = edit ? pkgs.find((x) => x.id === edit) : undefined;
  const picked: string[] = cur?.item_ids ?? [];
  const qtyMap = (cur?.qty ?? {}) as Record<string, number>;
  const priceMap = (cur?.prices ?? {}) as Record<string, string>;
  const extras: Extra[] = ((cur?.extras ?? []) as Partial<Extra>[]).map((e) => ({
    name: e.name ?? '', group: e.group ?? '', who: e.who ?? '', price: e.price ?? '',
  }));
  const nameOf = (id: string) => txt(items.find((x) => x.id === id)?.name) || id;

  return (
    <div className="hr-pn-body">
      <h1>패키지</h1>
      <p className="hr-lead">단가표 아래에 나오는 구성 예시입니다. 이름은 의뢰자가 할 법한 말로 적으세요.</p>
      <Help>
        <p>
          <b>이름</b>은 사이트에서 질문형 카드의 문장이 됩니다. 예: &quot;오리지널 밴드곡이 만들고싶어요!&quot;
        </p>
        <p>
          <b>합계는 직접 입력</b>합니다. 항목을 체크하거나 단가를 바꿔도 합계는 자동으로 바뀌지 않습니다.
          단가표에 있는 상품은 체크하고 수량을 정하고, 다른 작업자의 몫처럼 내 단가표에 없는 상품은 &quot;협업·외부 상품&quot;에 직접 적습니다.
        </p>
        <p>
          <b>항목별 금액</b>은 팝업에 그대로 나옵니다. &quot;개당 금액&quot;을 비우면 단가표의 정가가 쓰이고(칸의 흐린 숫자),
          입력하면 이 패키지에서만 그 금액이 적용됩니다. 항목 금액의 합이 합계와 다르면 차이가 &quot;패키지 할인&quot;으로 표시됩니다.
        </p>
      </Help>

      <Flash ok={ok} err={err} />

      <form key={cur?.id ?? 'new'} id="form" action={savePackage} className="hr-card hr-f">
        <h2>{cur ? `패키지 수정 · ${txt(cur.name)}` : '새 패키지 추가'}</h2>
        {cur && <input type="hidden" name="id" value={cur.id} />}

        <div className="hr-row">
          <label>
            이름 (사이트에 보이는 질문 문장)
            <input name="name" defaultValue={txt(cur?.name)} placeholder="오리지널 밴드곡이 만들고싶어요!" required />
          </label>
          <label>
            태그
            <input name="tag" defaultValue={cur?.tag ?? ''} placeholder="ORIGINAL" required />
          </label>
        </div>
        <div className="hr-row">
          <label>
            합계 (정가, 숫자만 · 직접 입력)
            <input name="total" inputMode="numeric" defaultValue={cur?.total ?? ''} required />
          </label>
          <label>
            번호
            <input name="num" defaultValue={cur?.num ?? String(pkgs.length + 1).padStart(2, '0')} required />
          </label>
          <label>
            순서 (비우면 맨 끝)
            <input type="number" name="sort" defaultValue={cur?.sort ?? ''} />
          </label>
        </div>
        <label>
          설명 (팝업 안에 보임)
          <input name="desc" defaultValue={txt(cur?.descr)} />
        </label>

        <Section open title="포함할 상품" badge={`${picked.length}개 선택`} hint="체크하고 수량·개당 금액을 정합니다 (금액을 비우면 단가표 금액)">
          {groups.map((grp) => {
            const rows = items.filter((x) => x.group_id === grp.id);
            if (!rows.length) return null;
            const n = rows.filter((x) => picked.includes(x.id)).length;
            return (
              <Section
                key={grp.id}
                open={n > 0}
                title={`${grp.num} ${txt(grp.name)}`}
                badge={n ? `${n}개 선택` : `${rows.length}개 중`}
              >
                <div className="hr-chks">
                  {rows.map((x) => (
                    <div key={x.id} className="hr-pkq">
                      <label className="hr-chk">
                        <input type="checkbox" name="itemIds" value={x.id} defaultChecked={picked.includes(x.id)} />
                        {txt(x.name)}
                      </label>
                      <label className="hr-pkq-n">
                        수량
                        <input type="number" name={`qty_${x.id}`} min={1} max={99} defaultValue={qtyMap[x.id] ?? 1} />
                      </label>
                      <label className="hr-pkq-n">
                        개당 금액
                        <input
                          name={`price_${x.id}`}
                          inputMode="numeric"
                          placeholder={String(x.price)}
                          defaultValue={priceMap[x.id] ?? ''}
                        />
                      </label>
                    </div>
                  ))}
                </div>
              </Section>
            );
          })}
        </Section>

        <Section
          open={extras.length > 0}
          title="협업·외부 상품"
          badge={`${extras.length}개`}
          hint="내 단가표에 없는 다른 작업자의 몫"
        >
          <ExtrasEditor initial={extras} max={12} />
        </Section>

        <Section
          open={!!(cur?.discount as Disc)?.on}
          title="이 패키지 할인 (선택)"
          badge={(cur?.discount as Disc)?.on ? '켜짐' : '꺼짐'}
        >
          <DiscountFields d={cur?.discount as Disc} />
        </Section>

        <div className="hr-act">
          {cur && <Link href="/hr-admin/rates/packages">수정 취소</Link>}
          <button type="submit">{cur ? '수정 저장' : '추가'}</button>
        </div>
      </form>

      <section className="hr-card">
        <h2>등록된 패키지 ({pkgs.length})</h2>
        {pkgs.length === 0 && <p>패키지가 없습니다.</p>}
        {pkgs.map((x) => {
          const q = (x.qty ?? {}) as Record<string, number>;
          const ex = (x.extras ?? []) as { name: string }[];
          return (
            <div key={x.id} className="hr-rt-row">
              <div>
                <b>EX {x.num} · {txt(x.name)} · {x.tag}</b>
                <small>
                  {x.total}원 · {(x.item_ids as string[]).map((id) => `${nameOf(id)}${q[id] > 1 ? ` ×${q[id]}` : ''}`).join(', ')}
                  {ex.length ? ` · 협업 ${ex.length}개(${ex.map((e) => e.name).join(', ')})` : ''}
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
          );
        })}
      </section>
    </div>
  );
}
