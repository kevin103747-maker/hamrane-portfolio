// src/app/hr-admin/(panel)/drops/actions.ts — 무료 배포 저장·파일 처리
'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { DROP_BUCKET, DROP_LIMITS as L, SLUG_RE } from '@/lib/drops';

const BACK = '/hr-admin/drops';
const MAX_FILE = 50 * 1024 * 1024; // 버킷 한도와 같게 맞춥니다.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Kind = 'mp3' | 'wav';
type Res = { ok: true } | { ok: false; msg: string };

async function guard() {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  return me;
}

const isKind = (k: unknown): k is Kind => k === 'mp3' || k === 'wav';

/** 유튜브 주소나 11자리 ID에서 ID만 꺼냅니다. 형식이 틀리면 null. 빈 값은 ''. */
function ytId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return '';
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

const oneLine = (v: FormDataEntryValue | null) => String(v ?? '').replace(/\s+/g, ' ').trim();
const multiLine = (v: FormDataEntryValue | null) => String(v ?? '').replace(/\r\n/g, '\n').trim();

export async function saveDrop(fd: FormData) {
  const me = await guard();
  const id = String(fd.get('id') ?? '');
  const fail = (msg: string): never =>
    redirect(`${BACK}?${id ? `edit=${id}&` : ''}err=${encodeURIComponent(msg)}#form`);

  const title = oneLine(fd.get('title'));
  const subtitle = oneLine(fd.get('subtitle'));
  const description = multiLine(fd.get('description'));
  const terms = multiLine(fd.get('terms'));
  if (!title) fail('제목을 입력해 주세요.');
  if (title.length > L.title) fail(`제목은 ${L.title}자 이내로 입력해 주세요.`);
  if (subtitle.length > L.subtitle) fail(`한 줄 소개는 ${L.subtitle}자 이내로 입력해 주세요.`);
  if (description.length > L.description) fail(`소개 글은 ${L.description}자 이내로 입력해 주세요.`);
  if (terms.length > L.terms) fail(`이용 안내는 ${L.terms}자 이내로 입력해 주세요.`);

  const yt = ytId(String(fd.get('youtube') ?? ''));
  if (yt === null) fail('유튜브 주소 또는 영상 ID(11자리) 형식이 아닙니다.');

  const endsRaw = String(fd.get('endsOn') ?? '').trim();
  if (endsRaw && !/^\d{4}-\d{2}-\d{2}$/.test(endsRaw)) fail('종료일 형식이 올바르지 않습니다.');

  const values = {
    title, subtitle, description, terms,
    youtube_id: yt ?? '',
    published: fd.get('published') === 'on',
    ends_on: endsRaw || null,
    updated_at: new Date().toISOString(),
  };

  const db = adminDb();

  if (id) {
    if (!UUID_RE.test(id)) fail('잘못된 요청입니다.');
    const { data: old } = await db.from('drops').select('*').eq('id', id).maybeSingle();
    if (!old) fail('수정할 배포를 찾지 못했습니다.');
    const { error } = await db.from('drops').update(values).eq('id', id);
    if (error) fail(`저장 실패: ${error.message}`);
    await logEdit(me, 'update', 'drops', id, old, values);
    revalidatePath(`/dl/${String(old?.slug ?? '')}`);
    redirect(`${BACK}?edit=${id}&ok=1#form`);
  }

  const slug = String(fd.get('slug') ?? '').trim().toLowerCase();
  if (!SLUG_RE.test(slug)) fail('주소는 영문 소문자·숫자·하이픈만, 2~41자로 입력해 주세요. (첫 글자는 하이픈 불가)');
  const { data, error } = await db.from('drops').insert({ slug, ...values }).select('id').single();
  if (error) fail(error.code === '23505' ? '이미 쓰고 있는 주소입니다.' : `저장 실패: ${error.message}`);
  const newId = String(data?.id ?? '');
  await logEdit(me, 'create', 'drops', newId, null, { slug, ...values });
  redirect(`${BACK}?edit=${newId}&ok=1#form`);
}

/** 브라우저가 Supabase로 직접 올릴 수 있는 일회용 주소를 만듭니다. 파일 자체는 이 함수를 지나지 않습니다. */
export async function prepareUpload(input: {
  id: string; kind: Kind; size: number; fileName: string;
}): Promise<{ ok: true; path: string; token: string } | { ok: false; msg: string }> {
  await guard();
  const { id, kind, size, fileName } = input;
  if (!UUID_RE.test(id) || !isKind(kind)) return { ok: false, msg: '잘못된 요청입니다.' };
  if (!Number.isFinite(size) || size <= 0) return { ok: false, msg: '빈 파일은 올릴 수 없습니다.' };
  if (size > MAX_FILE) return { ok: false, msg: `파일은 ${MAX_FILE / 1048576}MB 이하만 올릴 수 있습니다.` };
  if (!fileName.toLowerCase().endsWith(`.${kind}`)) return { ok: false, msg: `.${kind} 파일을 골라 주세요.` };

  const db = adminDb();
  const { data: row } = await db.from('drops').select('id').eq('id', id).maybeSingle();
  if (!row) return { ok: false, msg: '배포를 찾지 못했습니다.' };

  // 항상 새 경로(덮어쓰면 CDN에 옛 파일이 남을 수 있음)
  const path = `${id}/${kind}-${Date.now().toString(36)}.${kind}`;
  const { data, error } = await db.storage.from(DROP_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return { ok: false, msg: `업로드 준비 실패: ${error?.message ?? '알 수 없는 오류'}` };
  return { ok: true, path, token: data.token };
}

/** 파일 앞부분 16바이트만 읽어 옵니다. */
async function head(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url, { headers: { Range: 'bytes=0-15' }, cache: 'no-store' });
    if (!res.ok || !res.body) return null;
    const reader = res.body.getReader();
    const got: number[] = [];
    while (got.length < 16) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      for (const b of value) got.push(b);
    }
    await reader.cancel();
    return Uint8Array.from(got.slice(0, 16));
  } catch {
    return null;
  }
}

const isMp3 = (b: Uint8Array) =>
  (b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0);
const isWav = (b: Uint8Array) =>
  b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
  b[8] === 0x57 && b[9] === 0x41 && b[10] === 0x56 && b[11] === 0x45;

/** 업로드가 끝난 파일을 검사하고 배포에 연결합니다. */
export async function attachFile(input: { id: string; kind: Kind; path: string }): Promise<Res> {
  const me = await guard();
  const { id, kind, path } = input;
  if (!UUID_RE.test(id) || !isKind(kind)) return { ok: false, msg: '잘못된 요청입니다.' };
  if (!new RegExp(`^${id}/${kind}-[a-z0-9]+\\.${kind}$`).test(path)) return { ok: false, msg: '잘못된 파일 경로입니다.' };

  const db = adminDb();
  const bucket = db.storage.from(DROP_BUCKET);
  const name = path.slice(id.length + 1);

  const { data: files } = await bucket.list(id, { limit: 100 });
  const f = files?.find((x) => x.name === name);
  if (!f) return { ok: false, msg: '올린 파일을 찾지 못했어요. 다시 올려 주세요.' };

  const size = Number((f.metadata as Record<string, unknown> | null)?.size) || 0;
  const drop = async (msg: string): Promise<Res> => {
    await bucket.remove([path]);
    return { ok: false, msg };
  };
  if (!size || size > MAX_FILE) return drop(`파일은 ${MAX_FILE / 1048576}MB 이하만 올릴 수 있습니다.`);

  const first = await head(bucket.getPublicUrl(path).data.publicUrl);
  if (!first) return drop('파일 형식을 확인하지 못했어요. 다시 올려 주세요.');
  if (kind === 'mp3' ? !isMp3(first) : !isWav(first)) {
    return drop(`${kind.toUpperCase()} 형식의 파일이 아닙니다. 파일을 확인해 주세요.`);
  }

  const col = `${kind}_path`;
  const { data: old } = await db.from('drops').select('*').eq('id', id).maybeSingle();
  if (!old) return drop('배포를 찾지 못했습니다.');
  const { error } = await db
    .from('drops')
    .update({ [col]: path, [`${kind}_size`]: size, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return drop(`저장 실패: ${error.message}`);

  const prev = String(old[col] ?? '');
  if (prev && prev !== path) await bucket.remove([prev]);
  await logEdit(me, 'upload', 'drops', id, { [col]: prev }, { [col]: path });
  revalidatePath(`/dl/${String(old.slug ?? '')}`);
  return { ok: true };
}

export async function removeFile(input: { id: string; kind: Kind }): Promise<Res> {
  const me = await guard();
  const { id, kind } = input;
  if (!UUID_RE.test(id) || !isKind(kind)) return { ok: false, msg: '잘못된 요청입니다.' };
  const db = adminDb();
  const { data: old } = await db.from('drops').select('*').eq('id', id).maybeSingle();
  if (!old) return { ok: false, msg: '배포를 찾지 못했습니다.' };
  const col = `${kind}_path`;
  const prev = String(old[col] ?? '');
  const { error } = await db
    .from('drops')
    .update({ [col]: '', [`${kind}_size`]: 0, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { ok: false, msg: `저장 실패: ${error.message}` };
  if (prev) await db.storage.from(DROP_BUCKET).remove([prev]);
  await logEdit(me, 'remove-file', 'drops', id, { [col]: prev }, { [col]: '' });
  revalidatePath(`/dl/${String(old.slug ?? '')}`);
  return { ok: true };
}

export async function removeDrop(fd: FormData) {
  const me = await guard();
  const id = String(fd.get('id') ?? '');
  if (!UUID_RE.test(id)) redirect(`${BACK}?err=${encodeURIComponent('잘못된 요청입니다.')}`);
  const db = adminDb();
  const { data: old } = await db.from('drops').select('*').eq('id', id).maybeSingle();
  if (!old) redirect(BACK);

  const bucket = db.storage.from(DROP_BUCKET);
  const { data: files } = await bucket.list(id, { limit: 100 });
  if (files?.length) await bucket.remove(files.map((x) => `${id}/${x.name}`));

  const { error } = await db.from('drops').delete().eq('id', id);
  if (error) redirect(`${BACK}?err=${encodeURIComponent(`삭제 실패: ${error.message}`)}`);
  await logEdit(me, 'delete', 'drops', id, old, null);
  revalidatePath(`/dl/${String(old?.slug ?? '')}`);
  redirect(`${BACK}?ok=1`);
}
