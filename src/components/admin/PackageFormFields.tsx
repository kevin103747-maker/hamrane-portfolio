// src/components/admin/PackageFormFields.tsx — 패키지 폼의 입력칸 (기존 패키지 화면과 빌더 편집 패널이 같이 씁니다)
'use client';
import { useMemo, useState } from 'react';
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
  folder_id?: string | null; sort?: number | null; work_ids?: string[] | null;
};
export type PackageFormGroup = { id: string; num: unknown; name: unknown };
export type PackageFormItem = { id: string; group_id: string; name: unknown; price: unknown; unit: unknown };
export type PackageFormFolder = { id: string; parent_id: string | null; name: unknown; sort?: number | null };
export type PackageFormWork = { id: string; title: string; artist: string; hidden: boolean };

const SAMPLE_MAX = 3;

/* 샘플 곡 선택: 검색으로 골라 넣고, 위/아래로 순서를 정합니다. workIds hidden input이 순서대로 제출됩니다. */
function SampleWorksPicker({ works, initial }: { works: PackageFormWork[]; initial: string[] }) {
  const [sel, setSel] = useState<string[]>(() => [...new Set(initial)]);
  const [q, setQ] = useState('');
  const byId = useMemo(() => new Map(works.map((w) => [w.id, w])), [works]);
  const ql = q.trim();
  // 숨김 곡은 후보에서 뺍니다. 이미 골라 둔 숨김·삭제된 곡은 목록에 표시해 그대로 둘지 지울지 고를 수 있게 합니다.
  const cands = works.filter((w) => !w.hidden && !sel.includes(w.id) && (!ql || w.title.includes(ql)));
  const full = sel.length >= SAMPLE_MAX;
  const nameOf = (id: string) => {
    const w = byId.get(id);
    if (!w) return '삭제된 곡';
    return `${w.title}${w.artist ? ` · ${w.artist}` : ''}${w.hidden ? ' (숨김)' : ''}`;
  };
  const toggle = (id: string) =>
    setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length < SAMPLE_MAX ? [...s, id] : s));
  const move = (i: number, d: number) =>
    setSel((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const n = [...s];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  return (
    <div>
      {sel.map((id, i) => (
        <div key={id} className="hr-pkq">
          <span className="hr-pkq-n" style={{ flex: 1 }}>{i + 1}. {nameOf(id)}</span>
          <span className="hr-mv">
            <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="위로">↑</button>
            <button type="button" onClick={() => move(i, 1)} disabled={i === sel.length - 1} aria-label="아래로">↓</button>
          </span>
          <button type="button" onClick={() => toggle(id)}>빼기</button>
        </div>
      ))}
      {sel.map((id) => <input key={id} type="hidden" name="workIds" value={id} />)}
      <label>
        곡 검색 (제목)
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="예: 신곡, 콜라보" />
      </label>
      <div className="hr-chks">
        {cands.map((w) => (
          <label key={w.id} className="hr-chk">
            <input type="checkbox" checked={false} onChange={() => toggle(w.id)} disabled={full} />
            {w.title}{w.artist ? ` · ${w.artist}` : ''}
          </label>
        ))}
        {!cands.length && <small>고를 수 있는 곡이 없습니다.</small>}
      </div>
      {full && <small>최대 {SAMPLE_MAX}개까지 연결할 수 있습니다.</small>}
    </div>
  );
}

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
  cur, groups, items, pkgCount, folders, works = [],
}: {
  cur?: PackageFormCur | null;
  groups: PackageFormGroup[];
  items: PackageFormItem[];
  pkgCount: number;
  folders?: PackageFormFolder[];
  works?: PackageFormWork[];
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
        open={(cur?.work_ids?.length ?? 0) > 0}
        title="샘플 곡"
        badge={`${cur?.work_ids?.length ?? 0}/${SAMPLE_MAX}개`}
        hint="공개 패키지 팝업에 '이 구성으로 작업한 곡'으로 나옵니다"
      >
        <SampleWorksPicker works={works} initial={cur?.work_ids ?? []} />
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
