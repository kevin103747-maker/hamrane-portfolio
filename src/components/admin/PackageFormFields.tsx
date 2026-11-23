// src/components/admin/PackageFormFields.tsx — 패키지 폼의 입력칸 (기존 패키지 화면과 빌더 편집 패널이 같이 씁니다)
import { DiscountFields } from '@/components/admin/DiscountFields';
import { ExtrasEditor, type Extra } from '@/components/admin/ExtrasEditor';
import { Section } from '@/components/admin/Section';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');
const en = (v: unknown): string => (v as { en?: string } | null)?.en ?? '';

type Disc = { on?: boolean; rate?: number; price?: string; endDate?: string } | null;

export type PackageFormCur = {
  id?: string; num?: string | null; tag?: string | null; name?: unknown; descr?: unknown;
  total?: string | null; total_usd?: string | null; item_ids?: string[] | null;
  qty?: unknown; prices?: unknown; prices_usd?: unknown; est?: unknown;
  extras?: unknown; optional?: unknown; discount?: unknown;
  folder_id?: string | null; sort?: number | null;
};
export type PackageFormGroup = { id: string; num: unknown; name: unknown };
export type PackageFormItem = { id: string; group_id: string; name: unknown; price: unknown; unit: unknown };
export type PackageFormFolder = { id: string; parent_id: string | null; name: unknown; sort?: number | null };

// 폴더 선택 옵션 (들여쓰기 레이블). folders를 넘기지 않으면 폴더 선택칸을 그리지 않습니다.
function folderOptions(all: PackageFormFolder[], currentId?: string): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [{ value: '', label: '폴더 없음' }];
  const childMap = new Map<string | null, PackageFormFolder[]>();
  for (const f of all) {
    const pid = f.parent_id ?? null;
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid)!.push(f);
  }
  const walk = (pid: string | null, depth: number) => {
    for (const f of [...(childMap.get(pid) ?? [])].sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0))) {
      if (f.id === currentId) continue;
      opts.push({ value: f.id, label: `${'  '.repeat(depth)}${txt(f.name)}` });
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);
  return opts;
}

export function PackageFormFields({
  cur, groups, items, pkgCount, folders,
}: {
  cur?: PackageFormCur | null;
  groups: PackageFormGroup[];
  items: PackageFormItem[];
  pkgCount: number;
  folders?: PackageFormFolder[];
}) {
  const picked: string[] = cur?.item_ids ?? [];
  const qtyMap = (cur?.qty ?? {}) as Record<string, number>;
  const priceMap = (cur?.prices ?? {}) as Record<string, string>;
  const estSet = new Set<string>((cur?.est ?? []) as string[]);
  const extras: Extra[] = ((cur?.extras ?? []) as Partial<Extra>[]).map((e) => ({
    name: e.name ?? '', group: e.group ?? '', who: e.who ?? '', price: e.price ?? '', priceUsd: e.priceUsd ?? '',
    nameEn: e.nameEn ?? '', groupEn: e.groupEn ?? '', whoEn: e.whoEn ?? '', optional: e.optional ?? false,
  }));
  const optionalSet = new Set<string>((cur?.optional ?? []) as string[]);
  const pricesUsdMap = (cur?.prices_usd ?? {}) as Record<string, string>;
  const disc = cur?.discount as Disc;

  return (
    <>
      {cur?.id && <input type="hidden" name="id" value={cur.id} />}

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
      <label>
        이름 (영어, 선택 · 비우면 영어 화면에도 한국어가 나옵니다)
        <input name="nameEn" maxLength={120} defaultValue={en(cur?.name)} placeholder="I want to make an original band song!" />
      </label>
      <div className="hr-row">
        <label>
          합계 (정가, 숫자만 · 직접 입력)
          <input name="total" inputMode="numeric" defaultValue={cur?.total ?? ''} required />
        </label>
        <label>
          합계 (USD, 선택)
          <input name="totalUsd" inputMode="numeric" defaultValue={cur?.total_usd ?? ''} />
        </label>
      </div>
      <div className="hr-row">
        <label>
          번호
          <input name="num" defaultValue={cur?.num ?? String(pkgCount + 1).padStart(2, '0')} required />
        </label>
        <label>
          순서 (비우면 맨 끝)
          <input type="number" name="sort" defaultValue={cur?.sort ?? ''} />
        </label>
      </div>
      {folders && (
        <label>
          폴더
          <select name="folderId" defaultValue={cur?.folder_id ?? ''}>
            {folderOptions(folders, cur?.id).map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
      )}
      <label>
        설명 (팝업 안에 보임)
        <input name="desc" defaultValue={txt(cur?.descr)} />
      </label>
      <label>
        설명 (영어, 선택)
        <input name="descEn" maxLength={300} defaultValue={en(cur?.descr)} />
      </label>

      <Section open title="포함할 상품" badge={`${picked.length}개 선택`} hint="체크하고 수량·개당 금액을 정합니다 (금액을 비우면 단가표 금액, 0은 무료)">
        {groups.map((grp) => {
          const rows = items.filter((x) => x.group_id === grp.id);
          if (!rows.length) return null;
          const n = rows.filter((x) => picked.includes(x.id)).length;
          return (
            <Section
              key={grp.id}
              open={n > 0}
              title={`${txt(grp.num)} ${txt(grp.name)}`}
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
                    <label className="hr-pkq-n">
                      개당 금액 (USD, 선택)
                      <input
                        name={`priceUsd_${x.id}`}
                        inputMode="numeric"
                        placeholder="USD"
                        defaultValue={pricesUsdMap[x.id] ?? ''}
                      />
                    </label>
                    <label className="hr-chk hr-pkq-e">
                      <input type="checkbox" name={`est_${x.id}`} defaultChecked={estSet.has(x.id)} />
                      수량은 예시{txt(x.unit) ? ` (${txt(x.unit)})` : ''}
                    </label>
                    <label className="hr-chk hr-pkq-e">
                      <input type="checkbox" name={`opt_${x.id}`} defaultChecked={optionalSet.has(x.id)} />
                      방문자가 끌 수 있음
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
        open={!!disc?.on}
        title="이 패키지 할인 (선택)"
        badge={disc?.on ? '켜짐' : '꺼짐'}
      >
        <DiscountFields d={disc} />
      </Section>
    </>
  );
}
