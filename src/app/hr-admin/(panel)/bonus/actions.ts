// src/app/hr-admin/(panel)/bonus/actions.ts — 서비스 혜택 저장
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { BONUS_LIMITS, ytId, type BonusSettings } from '@/lib/bonus';

const BACK = '/hr-admin/bonus';

function fail(msg: string): never {
  redirect(`${BACK}?err=${encodeURIComponent(msg)}`);
}

const one = (fd: FormData, k: string) => String(fd.get(k) ?? '').replace(/\s+/g, ' ').trim();
const lines = (fd: FormData, k: string) =>
  String(fd.get(k) ?? '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);

export async function saveBonus(fd: FormData) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const db = adminDb();

  const on = fd.get('on') === 'on';
  const title = one(fd, 'title');
  const line = one(fd, 'line');
  const detail = String(fd.get('detail') ?? '').trim();

  if (on && !title) fail('혜택을 켜려면 혜택 이름을 입력하세요.');
  if (title.length > BONUS_LIMITS.title) fail(`혜택 이름은 ${BONUS_LIMITS.title}자 이하로 입력하세요.`);
  if (line.length > BONUS_LIMITS.line) fail(`한 줄 문구는 ${BONUS_LIMITS.line}자 이하로 입력하세요.`);
  if (detail.length > BONUS_LIMITS.detail) fail(`설명은 ${BONUS_LIMITS.detail}자 이하로 입력하세요.`);

  const conditions = lines(fd, 'conditions');
  if (conditions.length > BONUS_LIMITS.conditions) fail(`조건은 ${BONUS_LIMITS.conditions}줄까지 입력할 수 있습니다.`);
  if (conditions.some((c) => c.length > BONUS_LIMITS.condLen)) fail(`조건 한 줄은 ${BONUS_LIMITS.condLen}자 이하로 입력하세요.`);

  const rawVideos = lines(fd, 'videos');
  if (rawVideos.length > BONUS_LIMITS.videos) fail(`예시 영상은 ${BONUS_LIMITS.videos}개까지 넣을 수 있습니다.`);
  const videos: string[] = [];
  for (const v of rawVideos) {
    const id = ytId(v);
    if (!id) fail(`유튜브 주소를 알아볼 수 없습니다: ${v}`);
    videos.push(id);
  }

  // 존재하는 단가 항목만 제외 목록에 넣습니다.
  const rs = await db.from('rate_items').select('id');
  const excluded = (rs.data ?? []).map((x) => x.id as string).filter((id) => fd.get(`ex_${id}`) === 'on');

  const value: BonusSettings = { on, title, line, detail, conditions, videos, excluded };
  const { data: old } = await db.from('site_settings').select('value').eq('key', 'bonus').maybeSingle();
  const saved = await db.from('site_settings').upsert({ key: 'bonus', value }, { onConflict: 'key' });
  if (saved.error) fail(`저장 실패: ${saved.error.message}`);

  await logEdit(me, 'update', 'site_settings', 'bonus', old?.value ?? null, value);
  redirect(`${BACK}?ok=1`);
}
