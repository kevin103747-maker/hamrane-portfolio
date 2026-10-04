// src/app/hr-admin/(panel)/actions.ts — 저장/삭제/게시. 모든 함수는 맨 먼저 서버에서 권한을 확인합니다.
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { uploadImage } from '@/lib/auth/upload';
import { ARTIST_PAGE_SIZE } from '@/lib/artist-admin';
import { normalizeClipUrl } from '@/lib/clip';
import { HOME_FEATURED_MAX } from '@/lib/featured';

async function guard(key: string) {
  const me = await requireAdmin();
  if (!can(me, key)) redirect('/hr-admin');
  return me;
}

const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const list = (fd: FormData, k: string) => fd.getAll(k).map(String).filter(Boolean);
const flag = (fd: FormData, k: string) => fd.get(k) === 'on';
const newId = (p: string) => `${p}-${Date.now().toString(36)}`;

function fail(path: string, msg: string): never {
  redirect(`${path}${path.includes('?') ? '&' : '?'}err=${encodeURIComponent(msg)}`);
}

/** 유튜브 주소 또는 11자리 ID → ID. 빈 값은 '', 해석 불가는 null */
function ytId(v: string) {
  if (!v) return '';
  if (/^[\w-]{11}$/.test(v)) return v;
  const m = v.match(/(?:[?&]v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** 곡 저장 화면에서 새로 입력한 이름들을 아티스트로 만듭니다. 이미 같은 이름이 있으면 그 아티스트를 씁니다. */
async function ensureArtists(
  me: Awaited<ReturnType<typeof guard>>,
  names: string[],
): Promise<{ ids: string[]; added: number; error?: string }> {
  const ids: string[] = [];
  if (!names.length) return { ids, added: 0 };
  const db = adminDb();
  const { data: all, error } = await db.from('artists').select('id, name, sort');
  if (error) return { ids, added: 0, error: error.message };

  const key = (s: string) => s.replace(/\s+/g, '').toLowerCase();
  const byName = new Map<string, string>((all ?? []).map((x): [string, string] => [key(x.name), x.id]));
  let next = Math.max(-1, ...(all ?? []).map((x) => Number(x.sort) || 0)) + 1;
  let added = 0;

  for (const name of names) {
    const hit = byName.get(key(name));
    if (hit) { ids.push(hit); continue; }
    const nid = `${newId('a')}${added.toString(36)}`; // 같은 밀리초에 여러 명을 만들어도 겹치지 않게
    const row = { name, type_ids: [], use_avatar: false, avatar_url: null, show_when_empty: false, sort: next++ };
    const ins = await db.from('artists').insert({ id: nid, ...row });
    if (ins.error) return { ids, added, error: ins.error.message };
    await logEdit(me, 'create', 'artists', nid, null, row);
    byName.set(key(name), nid);
    ids.push(nid);
    added++;
  }
  return { ids, added };
}

/* ---------------- 곡 ---------------- */
const WORKS = '/hr-admin/works';

export async function saveWork(fd: FormData) {
  const me = await guard('works');
  const id = str(fd, 'id');
  const back = id ? `${WORKS}?edit=${encodeURIComponent(id)}` : WORKS;
  let savedId = id;

  const title = str(fd, 'title');
  if (!title) fail(back, '제목을 입력하세요.');
  const youtube = ytId(str(fd, 'youtube'));
  if (youtube === null) fail(back, '유튜브 주소를 해석하지 못했습니다. 영상 주소 전체 또는 11자리 ID를 넣어 주세요.');
  const date = str(fd, 'date');
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) fail(back, '공개일은 연-월-일 형식으로 입력하세요.');
  const thumb = str(fd, 'thumb');
  if (thumb && !/^https?:\/\//.test(thumb)) fail(back, '썸네일 주소는 http:// 또는 https://로 시작해야 합니다.');
  const thumbUp = await uploadImage(fd.get('thumbFile'), 'works');
  if (thumbUp.error) fail(back, thumbUp.error);

  // 카드에서 강조할 파트: 참여 파트에 체크된 항목이어야 합니다.
  const partIds = list(fd, 'partIds');
  const mainPartId = str(fd, 'mainPartId');
  if (mainPartId && !partIds.includes(mainPartId)) {
    fail(back, '강조 파트는 "참여 파트"에서 체크한 항목 중에서 골라 주세요.');
  }

  // 포트폴리오 대표작(홈 대표곡과는 별개): 전체 탭 / 분야 탭 / 파트 탭
  const featDefault = str(fd, 'featDefault');
  const featGroups = list(fd, 'featGroups');
  const featParts = list(fd, 'featParts');
  const feat =
    featDefault || featGroups.length || featParts.length
      ? {
          ...(featDefault ? { default: featDefault } : {}),
          ...(featGroups.length ? { groups: featGroups } : {}),
          ...(featParts.length ? { parts: featParts } : {}),
        }
      : null;

  // 아티스트: 선택한 기존 아티스트 + 이 화면에서 새로 입력한 이름
  const picked = list(fd, 'artistIds');
  const newNames = [...new Set(list(fd, 'newArtistNames').map((n) => n.replace(/\s+/g, ' ').trim()).filter(Boolean))];
  if (newNames.some((n) => n.length > 50)) fail(back, '아티스트 이름은 50자 이하로 입력하세요.');
  if (newNames.length > 20) fail(back, '새 아티스트는 한 번에 20명까지 추가할 수 있습니다.');
  const made = await ensureArtists(me, newNames);
  if (made.error) fail(back, `새 아티스트 추가 실패: ${made.error}`);
  const artistIds = [...new Set([...picked, ...made.ids])];
      
  // 영상 길이는 사용하지 않습니다(입력·표시 없음).
  const clipRaw = str(fd, 'clipUrl');
  const clipUrl = clipRaw ? normalizeClipUrl(clipRaw) : '';
  if (clipRaw && !clipUrl) fail(back, '클립 링크는 https:// 로 시작하는 주소를 넣어 주세요.');
  const row = {
    clip_url: clipUrl || null,
    title, youtube_id: youtube, work_date: date.replace(/-/g, '.'),
    thumb_url: thumbUp.url || thumb || null, artist_ids: artistIds, usage_ids: list(fd, 'usageIds'),
    part_ids: partIds, main_part_id: mainPartId || null, feat, hidden: flag(fd, 'hidden'),
  };
  const db = adminDb();

  if (id) {
    const { data: before } = await db.from('works').select('*').eq('id', id).maybeSingle();
    const { error } = await db.from('works').update(row).eq('id', id);
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'update', 'works', id, before, row);
  } else {
    const nid = newId('w');
    savedId = nid;
    const { error } = await db.from('works').insert({ id: nid, ...row });
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'create', 'works', nid, null, row);
  }
  const naQs = made.added ? `&na=${made.added}` : '';
  if (fd.get('next') === '1') redirect(`${WORKS}?copy=${encodeURIComponent(savedId)}&ok=1${naQs}`);
  redirect(`${WORKS}?edit=${encodeURIComponent(savedId)}&ok=1${naQs}`);
}

export async function removeWork(fd: FormData) {
  const me = await guard('works');
  const id = str(fd, 'id');
  if (!id) redirect(WORKS);
  const db = adminDb();
  const { data: before } = await db.from('works').select('*').eq('id', id).maybeSingle();
  const { error } = await db.from('works').delete().eq('id', id);
  if (error) fail(WORKS, `삭제 실패: ${error.message}`);
  await db.from('index_queue').delete().eq('work_id', id); // 대표곡 목록에서도 제거
  await logEdit(me, 'delete', 'works', id, before, null);
  redirect(`${WORKS}?ok=1`);
}

/* ---------------- 아티스트 ---------------- */
const ARTISTS = '/hr-admin/artists';

export async function saveArtist(fd: FormData) {
  const me = await guard('artists');
  const id = str(fd, 'id');
  const back = id ? `${ARTISTS}?edit=${encodeURIComponent(id)}` : ARTISTS;

  const name = str(fd, 'name');
  if (!name) fail(back, '이름을 입력하세요.');
  const avatar = str(fd, 'avatarUrl');
  if (avatar && !/^https?:\/\//.test(avatar)) fail(back, '이미지 주소는 http:// 또는 https://로 시작해야 합니다.');
  const avatarUp = await uploadImage(fd.get('avatarFile'), 'artists');
  if (avatarUp.error) fail(back, avatarUp.error);

  const linkRaw = str(fd, 'linkUrl');
  const linkUrl = linkRaw ? normalizeClipUrl(linkRaw) : '';
  if (linkRaw && !linkUrl) fail(back, '아티스트 링크는 https:// 로 시작하는 주소를 넣어 주세요.');
  const row = {
    name, type_ids: list(fd, 'typeIds'), use_avatar: flag(fd, 'useAvatar'),
    avatar_url: avatarUp.url || avatar || null, show_when_empty: flag(fd, 'showWhenEmpty'),
    hide_in_strip: flag(fd, 'hideInStrip'),
    link_url: linkUrl || null,
  };
  const db = adminDb();

  if (id) {
    const { data: before } = await db.from('artists').select('*').eq('id', id).maybeSingle();
    const { error } = await db.from('artists').update(row).eq('id', id); // 순서(sort)는 건드리지 않습니다
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'update', 'artists', id, before, row);
  } else {
    const { data: last } = await db.from('artists').select('sort').order('sort', { ascending: false }).limit(1);
    const sort = (last?.length ? Number(last[0].sort) || 0 : -1) + 1; // 새 아티스트는 맨 뒤
    const nid = newId('a');
    const { error } = await db.from('artists').insert({ id: nid, ...row, sort });
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'create', 'artists', nid, null, { ...row, sort });
  }
  redirect(`${ARTISTS}?ok=1`);
}

export async function removeArtist(fd: FormData) {
  const me = await guard('artists');
  const id = str(fd, 'id');
  if (!id) redirect(ARTISTS);
  const db = adminDb();
  const { data: before } = await db.from('artists').select('*').eq('id', id).maybeSingle();
  const { error } = await db.from('artists').delete().eq('id', id);
  if (error) fail(ARTISTS, `삭제 실패: ${error.message}`);
  // 이 아티스트가 달려 있던 곡에서도 제거
  const { data: ws } = await db.from('works').select('id, artist_ids').contains('artist_ids', [id]);
  for (const w of ws ?? []) {
    await db.from('works').update({ artist_ids: w.artist_ids.filter((x: string) => x !== id) }).eq('id', w.id);
  }
  await logEdit(me, 'delete', 'artists', id, before, null);
  redirect(`${ARTISTS}?ok=1`);
}

/** 아티스트 순서 이동: up / down / top / bottom / to(n번째로) */
export async function moveArtist(fd: FormData) {
  const me = await guard('artists');
  const id = str(fd, 'id');
  const mode = str(fd, 'mode');
  const db = adminDb();

  const { data, error } = await db.from('artists').select('id, sort').order('sort', { ascending: true }).order('name', { ascending: true });
  if (error) fail(ARTISTS, `순서를 불러오지 못했습니다: ${error.message}`);
  const order = (data ?? []).map((x) => ({ id: x.id as string, old: Number(x.sort) || 0 }));

  const fromIdx = order.findIndex((x) => x.id === id);
  if (fromIdx < 0) redirect(ARTISTS);

  let to = fromIdx;
  if (mode === 'up') to = fromIdx - 1;
  else if (mode === 'down') to = fromIdx + 1;
  else if (mode === 'top') to = 0;
  else if (mode === 'bottom') to = order.length - 1;
  else if (mode === 'to') {
    const n = parseInt(str(fd, 'pos'), 10);
    if (!Number.isFinite(n)) fail(ARTISTS, '이동할 순서를 숫자로 입력하세요.');
    to = n - 1;
  }
  to = Math.max(0, Math.min(order.length - 1, to));

  if (to !== fromIdx) {
    const [moved] = order.splice(fromIdx, 1);
    order.splice(to, 0, moved);
    const changed = order.map((x, i) => ({ id: x.id, sort: i, old: x.old })).filter((x) => x.sort !== x.old);
    for (let i = 0; i < changed.length; i += 20) {
      const res = await Promise.all(
        changed.slice(i, i + 20).map((x) => db.from('artists').update({ sort: x.sort }).eq('id', x.id)),
      );
      const bad = res.find((r) => r.error);
      if (bad?.error) fail(ARTISTS, `순서 저장 실패: ${bad.error.message}`);
    }
    await logEdit(me, 'update', 'artists', id, { position: fromIdx + 1 }, { position: to + 1 });
  }

  // 검색 중이면 검색 상태 유지, 아니면 옮긴 아티스트가 있는 페이지로 이동
  const q = str(fd, 'q');
  const sp = new URLSearchParams();
  if (q) {
    sp.set('q', q);
    const p = str(fd, 'p');
    if (p && p !== '1') sp.set('p', p);
  } else {
    const pg = Math.floor(to / ARTIST_PAGE_SIZE) + 1;
    if (pg > 1) sp.set('p', String(pg));
  }
  const s = sp.toString();
  redirect(`${ARTISTS}${s ? `?${s}` : ''}#a-${id}`);
}

/* ---------------- 게시 ---------------- */
export async function publishSite() {
  const me = await guard('publish');
  revalidatePath('/', 'layout'); // 공개 사이트 전체를 다음 방문 때 새로 만들도록 표시
  await logEdit(me, 'publish', 'site', '-', null, null);
  redirect('/hr-admin?published=1');
}

/* ---------------- 대표곡(홈 화면) ---------------- */
const FEATURED = '/hr-admin/featured';

export async function saveIndexQueue(fd: FormData) {
  const me = await guard('works');

  const ids = fd.getAll('workId').map(String);
  const labels = fd.getAll('labelPartId').map(String);

  const seen = new Set<string>();
  const slotNo: number[] = []; // 각 행이 화면의 몇 번째 칸이었는지(오류 안내용)
  const rows: { work_id: string; label_part_id: string | null; part_count: null; sort: number }[] = [];
  ids.forEach((workId, i) => {
    if (!workId || seen.has(workId)) return; // 빈 칸과 중복은 건너뜀
    seen.add(workId);
    // 파트 수는 사이트에서 참여 파트 수로 자동 계산하므로 저장하지 않습니다.
    rows.push({ work_id: workId, label_part_id: labels[i] || null, part_count: null, sort: rows.length });
    slotNo.push(i + 1);
  });
  if (rows.length > HOME_FEATURED_MAX) fail(FEATURED, `홈 대표곡은 최대 ${HOME_FEATURED_MAX}곡까지 지정할 수 있습니다.`);

  const db = adminDb();

  if (rows.length) {

    const { data: found } = await db.from('works').select('id, title, hidden, part_ids').in('id', rows.map((r) => r.work_id));
    const byId = new Map<string, { title: string; hidden: boolean; part_ids: string[] | null }>();
    for (const x of found ?? []) byId.set(x.id, x);

    rows.forEach((r, k) => {
      const no = slotNo[k];
      const w = byId.get(r.work_id);
      if (!w) fail(FEATURED, `${no}번째 칸: 존재하지 않는 곡입니다. 새로고침 후 다시 선택하세요.`);
      if (w.hidden) {
        fail(FEATURED, `${no}번째 칸: "${w.title}"은(는) 숨김 상태라 홈 화면에 나오지 않습니다. 곡 관리에서 숨김을 풀거나 다른 곡을 고르세요.`);
      }
      if (r.label_part_id && !(w.part_ids ?? []).includes(r.label_part_id)) {
        fail(FEATURED, `${no}번째 칸: 라벨 파트는 "${w.title}"의 참여 파트 중에서 골라 주세요.`);
      }
    });
  }

  const { data: before } = await db.from('index_queue').select('*').order('sort', { ascending: true });

  const del = await db.from('index_queue').delete().neq('work_id', '');
  if (del.error) fail(FEATURED, `저장 실패: ${del.error.message}`);

  if (rows.length) {
    const ins = await db.from('index_queue').insert(rows);
    if (ins.error) {
      if (before?.length) await db.from('index_queue').insert(before); // 이전 목록 복구
      fail(FEATURED, `저장 실패: ${ins.error.message}`);
    }
  }

  await logEdit(me, 'update', 'index_queue', '-', before, rows);
  redirect(`${FEATURED}?ok=1`);
}


/* ---------------- 게시(상단바 버튼용: 화면 이동 없이 결과만 돌려줍니다) ---------------- */
export async function publishSiteInline(_prev: unknown, _fd: FormData) {
  const me = await guard('publish');
  revalidatePath('/', 'layout');
  await logEdit(me, 'publish', 'site', '-', null, null);
  const at = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(11, 16); // 한국 시간 시:분
  return { ok: true, msg: `게시했습니다 · ${at}` };
}

/* ---------------- 포트폴리오 분야별 대표곡 ---------------- */
const SCOPES = '/hr-admin/featured/scopes';
type FeatValue = { default?: string; groups?: string[]; parts?: string[] };

export async function saveScopeFeatured(fd: FormData) {
  const me = await guard('works');
  const scope = str(fd, 'scope');
  const kind = scope === 'all' ? 'all' : scope.startsWith('g:') ? 'g' : scope.startsWith('p:') ? 'p' : '';
  const target = kind === 'g' || kind === 'p' ? scope.slice(2) : '';
  if (!kind || (kind !== 'all' && !target)) fail(SCOPES, '대표곡을 지정할 범위를 알 수 없습니다.');
  const back = `${SCOPES}?s=${encodeURIComponent(scope)}`;
  const wanted = new Set(list(fd, 'workId'));

  const db = adminDb();
  const [wr, pr, gr] = await Promise.all([
    db.from('works').select('id, title, part_ids, main_part_id, feat'),
    db.from('parts').select('id, group_id'),
    db.from('part_groups').select('id'),
  ]);
  if (wr.error) fail(back, `곡 목록을 불러오지 못했습니다: ${wr.error.message}`);
  const parts = pr.data ?? [];
  if (kind === 'g' && !(gr.data ?? []).some((x) => x.id === target)) fail(SCOPES, '존재하지 않는 분야입니다.');
  if (kind === 'p' && !parts.some((x) => x.id === target)) fail(SCOPES, '존재하지 않는 파트입니다.');
  const groupPartIds = new Set(parts.filter((x) => x.group_id === target).map((x) => x.id as string));

  const known = new Set((wr.data ?? []).map((x) => x.id as string));
  if ([...wanted].some((id) => !known.has(id))) fail(back, '존재하지 않는 곡이 포함되어 있습니다. 새로고침 후 다시 시도하세요.');

  const changes: { id: string; before: FeatValue | null; after: FeatValue | null }[] = [];
  for (const w of wr.data ?? []) {
    const old = (w.feat ?? null) as FeatValue | null;
    const own = (w.part_ids ?? []) as string[];
    const had =
      kind === 'all' ? !!old?.default
        : kind === 'g' ? !!old?.groups?.includes(target)
        : !!old?.parts?.includes(target);
    const want = wanted.has(w.id);
    if (had === want) continue; // 바뀐 곡만 처리(이미 지정된 곡은 그대로 유지)

    const next: FeatValue = { ...(old ?? {}) };
    if (want) {
      if (kind === 'all') {
        // 전체 탭의 핀 라벨은 곡의 강조 파트(없으면 첫 파트)로 자동 지정
        const auto = w.main_part_id && own.includes(w.main_part_id) ? (w.main_part_id as string) : own[0];
        if (!auto) fail(back, `"${w.title}"은(는) 참여 파트가 없어 전체 대표곡으로 지정할 수 없습니다.`);
        next.default = auto;
      } else if (kind === 'g') {
        if (!own.some((id) => groupPartIds.has(id))) fail(back, `"${w.title}"은(는) 이 분야에 참여한 곡이 아닙니다.`);
        next.groups = [...(old?.groups ?? []), target];
      } else {
        if (!own.includes(target)) fail(back, `"${w.title}"은(는) 이 파트에 참여한 곡이 아닙니다.`);
        next.parts = [...(old?.parts ?? []), target];
      }
    } else if (kind === 'all') delete next.default;
    else if (kind === 'g') next.groups = (old?.groups ?? []).filter((x) => x !== target);
    else next.parts = (old?.parts ?? []).filter((x) => x !== target);

    if (!next.groups?.length) delete next.groups;
    if (!next.parts?.length) delete next.parts;
    changes.push({ id: w.id as string, before: old, after: next.default || next.groups || next.parts ? next : null });
  }

  for (let i = 0; i < changes.length; i += 20) {
    const res = await Promise.all(
      changes.slice(i, i + 20).map((c) => db.from('works').update({ feat: c.after }).eq('id', c.id)),
    );
    const bad = res.find((r) => r.error);
    if (bad?.error) fail(back, `저장 실패: ${bad.error.message}`);
  }
  for (const c of changes) await logEdit(me, 'update', 'works', c.id, { feat: c.before }, { feat: c.after });

  redirect(`${back}&ok=${changes.length}`);
}
