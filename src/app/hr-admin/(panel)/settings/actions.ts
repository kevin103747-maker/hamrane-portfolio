// src/app/hr-admin/(panel)/settings/actions.ts — 사이트 설정(채널 링크, 연락처, 공지) 저장
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { uploadImage } from '@/lib/auth/upload';

const BACK = '/hr-admin/settings';
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

function fail(msg: string): never {
  redirect(`${BACK}?err=${encodeURIComponent(msg)}`);
}

const URL_FIELDS = [
  ['youtube', '유튜브'],
  ['soop', 'SOOP'],
  ['x', 'X'],
  ['discordServer', '디스코드 프로필 링크'],
  ['crewUrl', '크루 주소'],
] as const;

export async function saveSettings(fd: FormData) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');

  const v: Record<string, string> = {};
  for (const [key, label] of URL_FIELDS) {
    v[key] = str(fd, key);
    if (v[key] && !/^https?:\/\//.test(v[key])) fail(`${label} 주소는 http:// 또는 https://로 시작해야 합니다.`);
  }
  // 홈 아이콘(discordServer)과 문의 카드(discordUrl)가 같은 프로필 링크를 씁니다.
  v.discordUrl = v.discordServer;

  const discordId = str(fd, 'discordId');
  const email = str(fd, 'email');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail('이메일 형식이 올바르지 않습니다.');
  const notice = str(fd, 'notice');
  const profileUp = await uploadImage(fd.get('profileFile'), 'site');
  if (profileUp.error) fail(profileUp.error);
  const profileReset = fd.get('profileReset') === 'on';

  const db = adminDb();
  const { data: rows } = await db.from('site_settings').select('key, value').in('key', ['links', 'notice']);
  const oldLinks = rows?.find((r) => r.key === 'links')?.value ?? {};
  const oldNotice = rows?.find((r) => r.key === 'notice')?.value;

  // 기존 값(icons 등)을 보존하고 입력한 항목만 덮어씁니다.
  const links = { ...oldLinks, ...v, discordId, email, ...(profileUp.url ? { profileUrl: profileUp.url } : {}) };
  if (profileReset && !profileUp.url) delete links.profileUrl;
  const base = oldNotice && typeof oldNotice === 'object' ? oldNotice : {};
  const noticeValue = { ...base, ko: notice };

  const a = await db.from('site_settings').upsert({ key: 'links', value: links }, { onConflict: 'key' });
  if (a.error) fail(`저장 실패: ${a.error.message}`);
  const b = await db.from('site_settings').upsert({ key: 'notice', value: noticeValue }, { onConflict: 'key' });
  if (b.error) fail(`저장 실패: ${b.error.message}`);

  await logEdit(me, 'update', 'site_settings', 'links', oldLinks, links);
  await logEdit(me, 'update', 'site_settings', 'notice', oldNotice ?? null, noticeValue);
  redirect(`${BACK}?ok=1`);
}
