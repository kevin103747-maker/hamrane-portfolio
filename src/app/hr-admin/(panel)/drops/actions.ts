// src/app/hr-admin/(panel)/drops/actions.ts — 무료 배포 저장·삭제 (음원은 Cloudflare R2에 있고, 여기서는 파일 이름만 기록합니다)
'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { DROP_LIMITS as L, SLUG_RE, fileUrl } from '@/lib/drops';

const BACK = '/hr-admin/drops';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type Ext = 'mp3' | 'wav';

async function guard() {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  return me;
}

/** 유튜브 주소나 11자리 ID에서 ID만 꺼냅니다. 형식이 틀리면 null. 빈 값은 ''. */
function ytId(raw: string): string | null {
  const s = raw.trim();
  if (!s) return '';
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([\w-]{11})/);
  return m ? m[1] : null;
}

/** R2에 올린 파일 이름 검사. 빈 값은 ''. 형식이 틀리면 null. */
function fileName(raw: string, ext: Ext): string | null {
  const s = raw.trim();
  if (!s) return '';
  if (s.length > 200 || s.startsWith('/') || s.includes('..') || s.includes('\\') || /[\r\n\t?#%]/.test(s)) return null;
  return s.toLowerCase().endsWith(`.${ext}`) ? s : null;
}

/** R2(Worker)에 파일이 실제로 있는지 확인하고 용량(바이트)을 돌려줍니다. 못 찾으면 null. */
async function checkFile(name: string): Promise<number | null> {
  try {
    const res = await fetch(fileUrl(name), { method: 'HEAD', cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    return Number(res.headers.get('content-length')) || 0;
  } catch {
    return null;
  }
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

  const db = adminDb();
  if (id && !UUID_RE.test(id)) fail('잘못된 요청입니다.');
  const { data: old } = id
    ? await db.from('drops').select('*').eq('id', id).maybeSingle()
    : { data: null };
  if (id && !old) fail('수정할 배포를 찾지 못했습니다.');

  // MP3·WAV: 파일 이름을 R2에서 확인하고 용량을 읽어 옵니다. 이름이 그대로면 다시 확인하지 않습니다.
  const file: Record<Ext, { path: string; size: number }> = {
    mp3: { path: '', size: 0 },
    wav: { path: '', size: 0 },
  };
  for (const ext of ['mp3', 'wav'] as const) {
    const parsed = fileName(String(fd.get(ext) ?? ''), ext);
    if (parsed === null) fail(`${ext.toUpperCase()} 파일 이름이 올바르지 않아요. R2에 올린 이름 그대로, .${ext}로 끝나게 적어 주세요.`);
    const name = parsed ?? '';
    if (!name) continue;
    if (old && String(old[`${ext}_path`] ?? '') === name) {
      file[ext] = { path: name, size: Number(old[`${ext}_size`]) || 0 };
      continue;
    }
    if (!process.env.DROP_FILES_BASE) fail('서버에 DROP_FILES_BASE 설정이 없어요. Vercel과 .env.local에 추가한 뒤 다시 시도해 주세요.');
    const bytes = await checkFile(name);
    if (bytes === null) fail(`${ext.toUpperCase()} 파일을 R2에서 찾지 못했어요. 파일 이름(띄어쓰기·대소문자 포함)을 확인해 주세요.`);
    file[ext] = { path: name, size: bytes ?? 0 };
  }

  const values = {
    title, subtitle, description, terms,
    youtube_id: yt ?? '',
    mp3_path: file.mp3.path, mp3_size: file.mp3.size,
    wav_path: file.wav.path, wav_size: file.wav.size,
    published: fd.get('published') === 'on',
    ends_on: endsRaw || null,
    updated_at: new Date().toISOString(),
  };

  if (id) {
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

export async function removeDrop(fd: FormData) {
  const me = await guard();
  const id = String(fd.get('id') ?? '');
  if (!UUID_RE.test(id)) redirect(`${BACK}?err=${encodeURIComponent('잘못된 요청입니다.')}`);
  const db = adminDb();
  const { data: old } = await db.from('drops').select('*').eq('id', id).maybeSingle();
  if (!old) redirect(BACK);

  const { error } = await db.from('drops').delete().eq('id', id);
  if (error) redirect(`${BACK}?err=${encodeURIComponent(`삭제 실패: ${error.message}`)}`);
  await logEdit(me, 'delete', 'drops', id, old, null);
  revalidatePath(`/dl/${String(old?.slug ?? '')}`);
  redirect(`${BACK}?ok=1`);
}
