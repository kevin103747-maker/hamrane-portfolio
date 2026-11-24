// src/components/admin/builder/cards.tsx — 빌더 카드(폴더·패키지·보관함·추가)와 카드 메뉴
'use client';
import { useState, type MouseEvent } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { BuilderFolder, BuilderSlot, BuilderPkg, BuilderItem } from '@/app/hr-admin/(panel)/rates/builder/types';

export const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

/** 단가 항목 카드·보관함에 공통으로 쓰는 보조 줄: "50,000원 · 트랙당" */
export const itemSub = (item: BuilderItem): string => {
  const price = String(item.price ?? '').trim();
  const unit = txt(item.unit);
  const head = price ? `${price}원` : '별도 협의';
  return unit ? `${head} · ${unit}` : head;
};

export type CardNode =
  | { kind: 'folder'; folder: BuilderFolder }
  | { kind: 'slot'; slot: BuilderSlot; pkg: BuilderPkg }
  | { kind: 'itemslot'; slot: BuilderSlot; item: BuilderItem; group: string };

export type MenuAction = { label: string; danger?: boolean; onClick: (el: HTMLElement | null) => void } | 'sep';

function CardMenu({ actions }: { actions: MenuAction[] }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="hr-bld-menuwrap">
      <button
        type="button"
        className="hr-bld-menubtn"
        aria-label="카드 메뉴"
        aria-expanded={open}
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        ⋯
      </button>
      {open && (
        <>
          <span className="hr-bld-menuback" onClick={() => setOpen(false)} />
          <span className="hr-bld-menu" role="menu">
            {actions.map((a, i) =>
              a === 'sep' ? <span key={i} className="hr-bld-menu-sep" /> : (
                <button
                  key={i}
                  type="button"
                  role="menuitem"
                  className={a.danger ? 'danger' : undefined}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    a.onClick((e.currentTarget as HTMLElement).closest('.hr-bld-card, .hr-bld-vaultcard'));
                  }}
                >
                  {a.label}
                </button>
              ),
            )}
          </span>
        </>
      )}
    </span>
  );
}

function NudgeButtons({ canPrev, canNext, onNudge }: { canPrev: boolean; canNext: boolean; onNudge: (dir: -1 | 1) => void }) {
  return (
    <span className="hr-bld-nudge">
      <button type="button" disabled={!canPrev} aria-label="한 칸 앞으로" title="한 칸 앞으로"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onNudge(-1); }}>◀</button>
      <button type="button" disabled={!canNext} aria-label="한 칸 뒤로" title="한 칸 뒤로"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); onNudge(1); }}>▶</button>
    </span>
  );
}

export function LevelCard({
  node, index, count, shortcut, menuActions, onOpen, onNudge, suppressed,
}: {
  node: CardNode;
  index: number;
  count: number;
  shortcut?: boolean;
  menuActions: MenuAction[];
  onOpen: (el: HTMLElement) => void;
  onNudge: (dir: -1 | 1) => void;
  suppressed: () => boolean;
}) {
  const sid = node.kind === 'folder' ? `f:${node.folder.id}` : `s:${node.slot.id}`;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: sid,
    data: { kind: node.kind === 'folder' ? 'folder' : 'slot', refId: node.kind === 'folder' ? node.folder.id : node.slot.id },
  });
  // 폴더 카드의 위쪽(아이콘+이름) 영역은 "이 폴더로 이동" 놓기 자리입니다.
  const enterId = node.kind === 'folder' ? `into:${node.folder.id}:card` : `none:${sid}`;
  const enter = useDroppable({ id: enterId });
  const over = node.kind === 'folder' && enter.isOver;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  // 폴더 카드: 위쪽 이름 영역은 "이 폴더로 이동" 놓기 자리, 아래쪽은 순서 바꾸기 자리입니다.
  const body = node.kind === 'folder' ? (
    <>
      <div ref={enter.setNodeRef} title="이 폴더로 이동하려면 여기 놓으세요" className={`hr-bld-enter${over ? ' over' : ''}`}>
        <span className="hr-bld-enter-row">
          <span className="hr-bld-kind folder" aria-hidden="true">›</span>
          <b className="hr-bld-name">{txt(node.folder.name)}</b>
          {node.folder.hidden ? <span className="hr-bld-badge">숨김</span> : null}
        </span>
      </div>
      <small className="hr-bld-sub">{txt(node.folder.descr) || '폴더'}</small>
    </>
  ) : node.kind === 'itemslot' ? (
    <>
      <span className="hr-bld-kind item" aria-hidden="true">≡</span>
      <b className="hr-bld-name">{txt(node.item.name)}</b>
      <span className="hr-bld-tags">
        {node.group ? <span className="hr-bld-badge">{node.group}</span> : null}
        {shortcut ? <span className="hr-bld-badge copy" title="같은 항목이 다른 폴더에도 있습니다">⧉</span> : null}
      </span>
      <small className="hr-bld-sub">{itemSub(node.item)}</small>
    </>
  ) : (
    <>
      <span className="hr-bld-kind pkg" aria-hidden="true">●</span>
      <b className="hr-bld-name">{txt(node.pkg.name)}</b>
      <span className="hr-bld-tags">
        {node.pkg.tag ? <span className="hr-bld-badge">{String(node.pkg.tag)}</span> : null}
        {shortcut ? <span className="hr-bld-badge copy" title="같은 패키지가 다른 폴더에도 있습니다">⧉</span> : null}
      </span>
      <small className="hr-bld-sub">
        {node.pkg.num ? `EX ${String(node.pkg.num)} · ` : ''}{String(node.pkg.total ?? '')}원
      </small>
    </>
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`hr-bld-card ${node.kind}`}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      aria-label={node.kind === 'folder' ? `폴더 ${txt(node.folder.name)}` : node.kind === 'itemslot' ? `단가 항목 ${txt(node.item.name)}` : `패키지 ${txt(node.pkg.name)}`}
      onClick={(e) => { if (!suppressed()) onOpen(e.currentTarget); }}
    >
      {body}
      <span className="hr-bld-tools">
        <NudgeButtons canPrev={index > 0} canNext={index < count - 1} onNudge={onNudge} />
        <CardMenu actions={menuActions} />
      </span>
    </div>
  );
}

export function AddCard({ label, onClick, disabled }: { label: string; onClick: (e: MouseEvent<HTMLButtonElement>) => void; disabled?: boolean }) {
  return (
    <button type="button" className="hr-bld-card add" disabled={disabled} onClick={onClick}>
      <span className="hr-bld-addplus">+</span>
      {label}
    </button>
  );
}

export function VaultCard({
  pkg, menuActions, onOpen, suppressed,
}: {
  pkg: BuilderPkg;
  menuActions: MenuAction[];
  onOpen: (el: HTMLElement) => void;
  suppressed: () => boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `vault:${pkg.id}`,
    data: { kind: 'vault', pkgId: pkg.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="hr-bld-vaultcard"
      style={{ transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      role="button"
      tabIndex={0}
      onClick={(e) => { if (!suppressed()) onOpen(e.currentTarget); }}
    >
      <span className="hr-bld-kind pkg" aria-hidden="true">●</span>
      <span className="hr-bld-name">{txt(pkg.name)}</span>
      {pkg.tag ? <span className="hr-bld-badge">{String(pkg.tag)}</span> : null}
      <CardMenu actions={menuActions} />
    </div>
  );
}

/** 보관함의 단가 항목 카드. 패키지 VaultCard와 같은 드래그·메뉴 규칙입니다. */
export function VaultItemCard({
  item, group, menuActions, onOpen, suppressed,
}: {
  item: BuilderItem;
  group: string;
  menuActions: MenuAction[];
  onOpen: (el: HTMLElement) => void;
  suppressed: () => boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `vaulti:${item.id}`,
    data: { kind: 'vault-item', itemId: item.id },
  });
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className="hr-bld-vaultcard"
      style={{ transform: CSS.Transform.toString(transform), opacity: isDragging ? 0.4 : 1 }}
      role="button"
      tabIndex={0}
      onClick={(e) => { if (!suppressed()) onOpen(e.currentTarget); }}
    >
      <span className="hr-bld-kind item" aria-hidden="true">≡</span>
      <span className="hr-bld-name">{txt(item.name)}</span>
      {group ? <span className="hr-bld-badge">{group}</span> : null}
      <CardMenu actions={menuActions} />
    </div>
  );
}
