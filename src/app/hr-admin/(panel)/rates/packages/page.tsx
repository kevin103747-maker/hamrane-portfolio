// src/app/hr-admin/(panel)/rates/packages/page.tsx — 패키지 관리
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { PackageFormFields, type PackageFormWork } from '@/components/admin/PackageFormFields';
import { Section, Help, Flash } from '@/components/admin/Section';
import { savePackage, removePackage } from '../actions';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');
const en = (v: unknown): string => (v as { en?: string } | null)?.en ?? '';
type Disc = { on?: boolean; rate?: number; price?: string; endDate?: string } | null;
const todayKst = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

type Folder = { id: string; parent_id: string | null; name: { ko: string; en?: string }; sort: number };

// 폴더 트리에서 인덴트 레이블 생성
function folderPath(folder: Folder, all: Folder[]): string {
  const parts: string[] = [txt(folder.name)];
  let pid = folder.parent_id;
  while (pid) {
    const parent = all.find((x) => x.id === pid);
    if (!parent) break;
    parts.unshift(txt(parent.name));
    pid = parent.parent_id;
  }
  return parts.join(' › ');
}

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
  const [g, r, p, f, w, a] = await Promise.all([
    db.from('part_groups').select('id, num, name').order('sort', { ascending: true }),
    db.from('rate_items').select('id, group_id, name, price, unit').order('sort', { ascending: true }),
    db.from('packages').select('*').order('sort', { ascending: true }),
    db.from('price_folders').select('*').order('sort', { ascending: true }),
    db.from('works').select('id, title, artist_ids, hidden').order('work_date', { ascending: false }),
    db.from('artists').select('id, name'),
  ]);
  const groups = g.data ?? [];
  const items = r.data ?? [];
  const pkgs = p.data ?? [];
  const folders = f.data ?? [];
  const artistName = new Map<string, string>((a.data ?? []).map((x) => [x.id as string, x.name as string]));
  const works: PackageFormWork[] = (w.data ?? []).map((x) => ({
    id: x.id as string,
    title: x.title as string,
    artist: ((x.artist_ids as string[] | null) ?? []).map((i) => artistName.get(i)).filter(Boolean).join(', '),
    hidden: !!x.hidden,
  }));
  const cur = edit ? pkgs.find((x) => x.id === edit) : undefined;
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
          입력하면 이 패키지에서만 그 금액이 적용되고, 0을 적으면 사이트에 &quot;무료&quot;로 나옵니다.
          항목 금액의 합이 합계와 다르면 차이가 &quot;패키지 할인&quot;으로 표시됩니다.
        </p>
        <p>
          <b>수량은 예시</b>를 체크하면 팝업에 &quot;예시 8트랙&quot;처럼 표시되고 &quot;곡마다 수량이 달라질 수 있다&quot;는 안내가 붙습니다.
          튠처럼 곡마다 개수가 달라지는 항목에 쓰세요. 이때 수량 칸에는 예시로 보여줄 개수를 넣습니다.
        </p>
      </Help>

      <Flash ok={ok} err={err} />

      <form key={cur?.id ?? 'new'} id="form" action={savePackage} className="hr-card hr-f">
        <h2>{cur ? `패키지 수정 · ${txt(cur.name)}` : '새 패키지 추가'}</h2>
        <PackageFormFields cur={cur} groups={groups} items={items} pkgCount={pkgs.length} folders={folders as Folder[]} works={works} />

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
          const folder = x.folder_id ? (folders as Folder[]).find((f) => f.id === x.folder_id) : undefined;
          const folderPathStr = folder ? folderPath(folder, folders as Folder[]) : '폴더 미지정';
          return (
            <div key={x.id} className="hr-rt-row">
              <div>
                <b>EX {x.num} · {txt(x.name)} · {x.tag}</b>
                <small>
                  {folderPathStr} · {x.total}원 · {(x.item_ids as string[]).map((id) => `${nameOf(id)}${q[id] > 1 ? ` ×${q[id]}` : ''}`).join(', ')}
                  {ex.length ? ` · 협업 ${ex.length}개(${ex.map((e) => e.name).join(', ')})` : ''}
                  {x.discount ? ` · ${discLabel(x.discount as Disc)}` : ''}
                  {en(x.name) ? '' : ' · EN 미입력'}
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
