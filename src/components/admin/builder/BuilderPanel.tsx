// src/components/admin/builder/BuilderPanel.tsx — 우측 편집 패널과 폴더 선택창
'use client';
import { useEffect, useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { savePackageBuilder, saveFolderFields, savePriceUi } from '@/app/hr-admin/(panel)/rates/builder/actions';
import { PackageFormFields, type PackageFormWork } from '@/components/admin/PackageFormFields';
import { FolderFormFields } from '@/components/admin/FolderFormFields';
import type {
  BuilderFolder, BuilderPkg, BuilderGroup, BuilderItem,
} from '@/app/hr-admin/(panel)/rates/builder/types';
import { txt } from './cards';

/* ---------- 폴더 선택창 (이동… / 다른 폴더에도 추가) ---------- */
export function FolderPicker({
  folders, title, hint, validate, onPick, onCancel,
}: {
  folders: BuilderFolder[];
  title: string;
  hint?: string;
  /** folderId(null=최상위)를 받아 불가 사유 문자열 또는 null */
  validate?: (folderId: string | null) => string | null;
  onPick: (folderId: string | null) => void;
  onCancel: () => void;
}) {
  const [sel, setSel] = useState('');
  const childMap = new Map<string | null, BuilderFolder[]>();
  for (const f of folders) {
    const pid = f.parent_id ?? null;
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid)!.push(f);
  }
  for (const list of childMap.values()) list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id.localeCompare(b.id));

  const options: { id: string | null; label: string; reason: string | null }[] = [
    { id: null, label: '최상위', reason: validate?.(null) ?? null },
  ];
  const walk = (pid: string | null, depth: number) => {
    for (const f of childMap.get(pid) ?? []) {
      options.push({ id: f.id, label: `${'　'.repeat(depth)}${txt(f.name)}`, reason: validate?.(f.id) ?? null });
      walk(f.id, depth + 1);
    }
  };
  walk(null, 0);

  return (
    <div className="hr-bld-picker-back" onClick={onCancel}>
      <div className="hr-bld-picker" role="dialog" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {hint ? <p>{hint}</p> : null}
        <div className="hr-bld-picker-list">
          {options.map((o) => (
            <label key={o.id ?? '__root'} className={`hr-bld-picker-opt${o.reason ? ' disabled' : ''}`}>
              <input
                type="radio"
                name="pickFolder"
                value={o.id ?? ''}
                checked={sel === (o.id ?? '')}
                disabled={!!o.reason}
                onChange={() => setSel(o.id ?? '')}
              />
              <span>{o.label}{o.reason ? <small> — {o.reason}</small> : null}</span>
            </label>
          ))}
        </div>
        <div className="hr-act">
          <button type="button" onClick={onCancel}>취소</button>
          <button type="button" className="primary" onClick={() => onPick(sel === '' ? null : sel)}>이동</button>
        </div>
      </div>
    </div>
  );
}

/* ---------- 패키지 편집 폼 ---------- */
export function PackageEditForm({
  pkg, isNew, slotFolderId, groups, items, works, pkgCount, onClose, onSaved, onToast,
}: {
  pkg: BuilderPkg | null;
  isNew: boolean;
  slotFolderId: string | null;
  groups: BuilderGroup[];
  items: BuilderItem[];
  works: PackageFormWork[];
  pkgCount: number;
  onClose: () => void;
  onSaved: (pkg: Record<string, unknown>, slot: { id: string; folder_id: string | null; package_id: string; sort: number } | null) => void;
  onToast: (msg: string) => void;
}) {
  const [pending, start] = useTransition();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await savePackageBuilder(fd);
      if (r.ok) {
        onSaved(r.data.pkg, r.data.slot);
        onToast('저장했습니다.');
      } else {
        onToast(r.error);
      }
    });
  };
  return (
    <form className="hr-card hr-f hr-bld-form" onSubmit={submit}>
      <h2>{isNew ? '새 패키지' : `패키지 수정 · ${txt(pkg?.name)}`}</h2>
      {isNew && <input type="hidden" name="slotFolderId" value={slotFolderId ?? ''} />}
      <PackageFormFields cur={pkg} groups={groups} items={items} pkgCount={pkgCount} works={works} />
      <div className="hr-act">
        <button type="button" onClick={onClose}>닫기</button>
        <button type="submit" disabled={pending}>{isNew ? '추가' : '수정 저장'}</button>
      </div>
    </form>
  );
}

/* ---------- 폴더 편집 폼 ---------- */
export function FolderEditForm({
  folder, onClose, onSaved, onToast,
}: {
  folder: BuilderFolder;
  onClose: () => void;
  onSaved: (folder: Record<string, unknown>) => void;
  onToast: (msg: string) => void;
}) {
  const [pending, start] = useTransition();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await saveFolderFields(fd);
      if (r.ok) {
        onSaved(r.data);
        onToast('저장했습니다.');
      } else {
        onToast(r.error);
      }
    });
  };
  return (
    <form className="hr-card hr-f hr-bld-form" onSubmit={submit}>
      <h2>폴더 수정 · {txt(folder.name)}</h2>
      <FolderFormFields cur={folder} />
      <div className="hr-act">
        <button type="button" onClick={onClose}>닫기</button>
        <button type="submit" disabled={pending}>수정 저장</button>
      </div>
    </form>
  );
}

/* ---------- 공개 단가 화면 최상위 질문 (빌더 최상위에서만 표시) ---------- */
export function PriceUiForm({
  cur, onToast,
}: {
  cur: { ko: string; en: string };
  onToast: (msg: string) => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const r = await savePriceUi(fd);
      if (r.ok) {
        onToast('저장했습니다.');
        router.refresh();
      } else {
        onToast(r.error);
      }
    });
  };
  return (
    <form className="hr-card hr-f hr-bld-priceui" onSubmit={submit}>
      <h2>최상위 질문</h2>
      <p>공개 단가 화면 맨 위(폴더 밖)에서 보여지는 질문입니다. 비우면 기본 문구가 나옵니다.</p>
      <div className="hr-row">
        <label>
          질문 (한국어)
          <input name="question" defaultValue={cur.ko} maxLength={40} />
        </label>
        <label>
          질문 (영어)
          <input name="questionEn" defaultValue={cur.en} maxLength={80} />
        </label>
      </div>
      <div className="hr-act">
        <button type="submit" disabled={pending}>저장</button>
      </div>
    </form>
  );
}

/* ---------- 단가 항목 요약 (읽기 전용) ---------- */
export function ItemEditForm({
  item, group, slotId, onClose, onRemove,
}: {
  item: BuilderItem;
  group: string;
  slotId?: string;
  onClose: () => void;
  onRemove?: () => void;
}) {
  const price = String(item.price ?? '').trim();
  const unit = txt(item.unit);
  const disc = item.discount as { on?: boolean; price?: string } | null | undefined;
  const hasDisc = !!disc && (disc.on === true || !!disc.price);
  return (
    <div className="hr-card hr-bld-form hr-bld-iteminfo">
      <h2>단가 항목 · {txt(item.name)}</h2>
      <dl>
        <div><dt>분야</dt><dd>{group || '—'}</dd></div>
        <div><dt>단가</dt><dd>{price ? `${price}원` : '별도 협의'}</dd></div>
        <div><dt>단위</dt><dd>{unit || '—'}</dd></div>
        <div><dt>이벤트 할인</dt><dd>{hasDisc ? '있음' : '없음'}</dd></div>
      </dl>
      <p className="hr-sub">가격·이름 등 내용은 단가표에서 수정합니다.</p>
      <div className="hr-act">
        {slotId && onRemove ? (
          <button type="button" className="hr-del" onClick={onRemove}>여기서 빼기</button>
        ) : null}
        <a className="hr-link" href="/hr-admin/rates">단가표에서 수정 →</a>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}

/* ---------- 서랍 껍데기 (카드·폴더를 누르면 오른쪽에서 열리는 편집 창) ---------- */
export function EditPanel({
  title, focusKey, onClose, children,
}: {
  title: string;
  /** 열려 있는 항목이 바뀌면 첫 입력칸으로 포커스를 다시 옮깁니다. */
  focusKey: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    ref.current
      ?.querySelector<HTMLElement>('input:not([type="hidden"]), select, textarea')
      ?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [focusKey]);

  return (
    <div className="hr-bd-back" onClick={() => closeRef.current()}>
      <aside
        ref={ref}
        className="hr-bd-drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="hr-bd-head">
          <h2>{title}</h2>
          <button type="button" className="hr-bd-x" aria-label="닫기" onClick={() => closeRef.current()}>✕</button>
        </header>
        <div className="hr-bd-body">{children}</div>
      </aside>
    </div>
  );
}
