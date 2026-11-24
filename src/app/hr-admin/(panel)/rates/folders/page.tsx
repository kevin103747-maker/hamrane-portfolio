// src/app/hr-admin/(panel)/rates/folders/page.tsx — 단가 폴더 관리
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { Section, Help, Flash } from '@/components/admin/Section';
import { FolderFormFields } from '@/components/admin/FolderFormFields';
import { saveFolder, removeFolder, moveFolder } from './actions';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');
const en = (v: unknown): string => (v as { en?: string } | null)?.en ?? '';

type Folder = {
  id: string; parent_id: string | null; name: { ko: string; en?: string };
  descr: { ko: string; en?: string }; question?: { ko?: string; en?: string } | null;
  sort: number; hidden: boolean;
};

export default async function FoldersPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; edit?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const { ok, err, edit } = await searchParams;

  const db = adminDb();
  const [f, p] = await Promise.all([
    db.from('price_folders').select('*').order('sort', { ascending: true }),
    db.from('packages').select('id, folder_id'),
  ]);
  const folders = (f.data ?? []) as Folder[];
  const packages = p.data ?? [];
  const cur = edit ? folders.find((x) => x.id === edit) : undefined;

  // 트리 구조 계산
  const childMap = new Map<string | null, Folder[]>();
  for (const folder of folders) {
    const pid = folder.parent_id ?? null;
    if (!childMap.has(pid)) childMap.set(pid, []);
    childMap.get(pid)!.push(folder);
  }

  // 패키지 수 계산
  const pkgCountByFolder = new Map<string, number>();
  for (const pkg of packages) {
    const fid = pkg.folder_id;
    if (fid) pkgCountByFolder.set(fid, (pkgCountByFolder.get(fid) ?? 0) + 1);
  }

  // 인덴트 레이블 생성 (예: "오리지널곡 › 밴드곡")
  function buildPath(folder: Folder): string {
    const parts: string[] = [txt(folder.name)];
    let pid = folder.parent_id;
    while (pid) {
      const parent = folders.find((x) => x.id === pid);
      if (!parent) break;
      parts.unshift(txt(parent.name));
      pid = parent.parent_id;
    }
    return parts.join(' › ');
  }

  // 트리 행 생성 (깊이 우선)
  function renderTree(parentId: string | null, depth: number = 0): React.ReactNode[] {
    const rows: React.ReactNode[] = [];
    const children = childMap.get(parentId) ?? [];
    for (const folder of children) {
      const indent = depth * 16;
      const pkgCount = pkgCountByFolder.get(folder.id) ?? 0;
      const childCount = (childMap.get(folder.id) ?? []).length;
      rows.push(
        <div key={folder.id} id={`row-${folder.id}`} className="hr-rt-row" style={{ paddingLeft: `${indent}px` }}>
          <div>
            <b>{txt(folder.name)}</b>
            {en(folder.name) && <small> / {en(folder.name)}</small>}
            {folder.hidden && <span className="hr-badge">숨김</span>}
            <small>
              {txt(folder.descr) && ` · ${txt(folder.descr)}`}
              {pkgCount > 0 && ` · 패키지 ${pkgCount}개`}
              {childCount > 0 && ` · 하위 폴더 ${childCount}개`}
            </small>
          </div>
          <div className="hr-rt-tools">
            <form action={moveFolder}>
              <input type="hidden" name="id" value={folder.id} />
              <input type="hidden" name="dir" value="up" />
              <button type="submit" disabled={depth === 0 && children.indexOf(folder) === 0}>↑</button>
            </form>
            <form action={moveFolder}>
              <input type="hidden" name="id" value={folder.id} />
              <input type="hidden" name="dir" value="down" />
              <button type="submit" disabled={children.indexOf(folder) === children.length - 1}>↓</button>
            </form>
            <Link href={`/hr-admin/rates/folders?edit=${encodeURIComponent(folder.id)}#form`}>수정</Link>
            <form action={removeFolder}>
              <input type="hidden" name="id" value={folder.id} />
              <label><input type="checkbox" required /> 삭제 확인</label>
              <button type="submit">삭제</button>
            </form>
          </div>
        </div>,
      );
      rows.push(...renderTree(folder.id, depth + 1));
    }
    return rows;
  }

  // 부모 선택 옵션 생성 (인덴트)
  function parentOptions(currentId?: string): React.ReactNode[] {
    const opts: React.ReactNode[] = [<option value="">폴더 없음 (최상위)</option>];
    function addOptions(pid: string | null, depth: number = 0) {
      const children = childMap.get(pid) ?? [];
      for (const folder of children) {
        if (folder.id === currentId) continue; // 자기 자신은 선택 불가
        const label = '  '.repeat(depth) + txt(folder.name);
        opts.push(<option key={folder.id} value={folder.id}>{label}</option>);
        addOptions(folder.id, depth + 1);
      }
    }
    addOptions(null);
    return opts;
  }

  return (
    <div className="hr-pn-body">
      <h1>단가 폴더</h1>
      <p className="hr-lead">단가표의 폴더 구조를 관리합니다. (예: 오리지널곡 › 밴드곡 › packages)</p>
      <Help>
        <p>
          <b>폴더 구조</b>는 중첩할 수 있습니다. 최대 4레벨까지 가능하고, 한 폴더에 최대 12개의 하위 폴더를 넣을 수 있습니다.
        </p>
        <p>
          <b>패키지는 폴더에 넣어야</b> 공개 화면에 나옵니다 (개편 완료 후). 폴더가 없는 패키지는 미지정으로 표시됩니다.
        </p>
        <p>
          <b>숨김</b> 체크밭스를 켜면 공개 화면에서 이 폴더와 그 하위 내용이 보이지 않습니다.
        </p>
      </Help>

      <Flash ok={ok} err={err} />

      <form key={cur?.id ?? 'new'} id="form" action={saveFolder} className="hr-card hr-f">
        <h2>{cur ? `폴더 수정 · ${txt(cur.name)}` : '새 폴더 추가'}</h2>

        <label>
          상위 폴더
          <select name="parentId" defaultValue={cur?.parent_id ?? ''}>
            {parentOptions(cur?.id)}
          </select>
        </label>

        <FolderFormFields cur={cur} />

        <div className="hr-act">
          {cur && <Link href="/hr-admin/rates/folders">수정 취소</Link>}
          <button type="submit">{cur ? '수정 저장' : '추가'}</button>
        </div>
      </form>

      <section className="hr-card">
        <h2>등록된 폴더 ({folders.length})</h2>
        {folders.length === 0 && <p>폴더가 없습니다.</p>}
        {renderTree(null)}
      </section>
    </div>
  );
}
