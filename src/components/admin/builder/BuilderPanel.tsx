// src/components/admin/builder/BuilderPanel.tsx — 우측 편집 패널과 폴더 선택창
'use client';
import { useState, useTransition, type FormEvent, type ReactNode } from 'react';
import { savePackageBuilder, saveFolderFields } from '@/app/hr-admin/(panel)/rates/builder/actions';
import { PackageFormFields } from '@/components/admin/PackageFormFields';
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
  pkg, isNew, slotFolderId, groups, items, pkgCount, onClose, onSaved, onToast,
}: {
  pkg: BuilderPkg | null;
  isNew: boolean;
  slotFolderId: string | null;
  groups: BuilderGroup[];
  items: BuilderItem[];
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
      <PackageFormFields cur={pkg} groups={groups} items={items} pkgCount={pkgCount} />
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

/* ---------- 패널 껍데기 ---------- */
export function EditPanel({ children }: { children: ReactNode }) {
  return <aside className="hr-bld-panel">{children}</aside>;
}
