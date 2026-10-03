// src/app/hr-admin/(panel)/actions.ts — 저장/삭제/게시. 모든 함수는 맨 먼저 서버에서 권한을 확인합니다.
'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { uploadImage } from '@/lib/auth/upload';

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

  // 영상 길이는 사용하지 않습니다(입력·표시 없음).
  const row = {
    title, youtube_id: youtube, work_date: date.replace(/-/g, '.'),
    thumb_url: thumbUp.url || thumb || null, artist_ids: list(fd, 'artistIds'), usage_ids: list(fd, 'usageIds'),
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
  redirect(`${WORKS}?edit=${encodeURIComponent(savedId)}&ok=1`);
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

  const row = {
    name, type_ids: list(fd, 'typeIds'), use_avatar: flag(fd, 'useAvatar'),
    avatar_url: avatarUp.url || avatar || null, show_when_empty: flag(fd, 'showWhenEmpty'),
  };
  const db = adminDb();

  if (id) {
    const { data: before } = await db.from('artists').select('*').eq('id', id).maybeSingle();
    const { error } = await db.from('artists').update(row).eq('id', id);
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'update', 'artists', id, before, row);
  } else {
    const nid = newId('a');
    const { error } = await db.from('artists').insert({ id: nid, ...row });
    if (error) fail(back, `저장 실패: ${error.message}`);
    await logEdit(me, 'create', 'artists', nid, null, row);
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
  const counts = fd.getAll('partCount').map(String);

  const seen = new Set<string>();
  const slotNo: number[] = []; // 각 행이 화면의 몇 번째 칸이었는지(오류 안내용)
  const rows: { work_id: string; label_part_id: string | null; part_count: number | null; sort: number }[] = [];
  ids.forEach((workId, i) => {
    if (!workId || seen.has(workId)) return; // 빈 칸과 중복은 건너뜀
    seen.add(workId);
    const n = parseInt(counts[i] ?? '', 10);
    const label = labels[i] || null;
    rows.push({
      work_id: workId,
      label_part_id: label,
      // 라벨 파트가 없으면 파트 수는 쓰이지 않으므로 저장하지 않습니다.
      part_count: label && Number.isFinite(n) && n > 0 ? n : null,
      sort: rows.length,
    });
    slotNo.push(i + 1);
  });

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
