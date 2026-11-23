// src/components/admin/builder/BuilderTree.tsx — 좌측 폴더 구조 트리 (클릭 이동 + 놓기 대상)
'use client';
import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { BuilderFolder } from '@/app/hr-admin/(panel)/rates/builder/types';
import { txt } from './cards';

function TreeRow({
  folderId, label, depth, hidden, hasChildren, open, onToggle, onNavigate, current,
}: {
  folderId: string | null;
  label: string;
  depth: number;
  hidden?: boolean;
  hasChildren: boolean;
  open: boolean;
  onToggle: () => void;
  onNavigate: () => void;
  current: boolean;
}) {
  const zone = folderId ?? 'root';
  const drop = useDroppable({ id: `into:${zone}:tree` });
  return (
    <div
      ref={drop.setNodeRef}
      className={`hr-bld-treeitem${current ? ' current' : ''}${drop.isOver ? ' over' : ''}`}
      style={{ paddingLeft: 4 + depth * 14 }}
    >
      {hasChildren ? (
        <button type="button" className="hr-bld-tree-toggle" onClick={onToggle} aria-label={open ? '접기' : '펼치기'}>
          {open ? '▾' : '▸'}
        </button>
      ) : (
        <span className="hr-bld-tree-toggle spacer" />
      )}
      <button type="button" className="hr-bld-tree-name" onClick={onNavigate}>
        {label}
        {hidden ? <em className="hr-bld-badge">숨김</em> : null}
      </button>
    </div>
  );
}

export function BuilderTree({
  folders, currentId, onNavigate,
}: {
  folders: BuilderFolder[];
  currentId: string | null;
  onNavigate: (id: string | null) => void;
}) {
  const [closed, setClosed] = useState<Set<string>>(new Set());
  const childFolders = new Map<string | null, BuilderFolder[]>();
  for (const f of folders) {
    const pid = f.parent_id ?? null;
    if (!childFolders.has(pid)) childFolders.set(pid, []);
    childFolders.get(pid)!.push(f);
  }
  for (const list of childFolders.values()) list.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0) || a.id.localeCompare(b.id));

  const toggle = (id: string) =>
    setClosed((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });

  const render = (pid: string | null, depth: number): React.ReactNode => {
    const kids = childFolders.get(pid) ?? [];
    return kids.map((f) => {
      const open = !closed.has(f.id);
      const hasKids = (childFolders.get(f.id) ?? []).length > 0;
      return (
        <div key={f.id}>
          <TreeRow
            folderId={f.id}
            label={txt(f.name)}
            depth={depth}
            hidden={!!f.hidden}
            hasChildren={hasKids}
            open={open}
            onToggle={() => toggle(f.id)}
            onNavigate={() => onNavigate(f.id)}
            current={currentId === f.id}
          />
          {open && hasKids ? render(f.id, depth + 1) : null}
        </div>
      );
    });
  };

  const rootKids = childFolders.get(null) ?? [];
  return (
    <nav className="hr-bld-tree" aria-label="폴더 구조">
      <TreeRow
        folderId={null}
        label="최상위"
        depth={0}
        hasChildren={rootKids.length > 0}
        open={!closed.has('__root')}
        onToggle={() => toggle('__root')}
        onNavigate={() => onNavigate(null)}
        current={currentId === null}
      />
      {!closed.has('__root') ? render(null, 1) : null}
    </nav>
  );
}
