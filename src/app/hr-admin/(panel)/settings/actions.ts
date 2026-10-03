// src/app/hr-admin/(panel)/settings/actions.ts — 사이트 설정(채널 링크, 연락처, 공지, 제목·설명, 홈 문구) 저장
'use server';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can, logEdit } from '@/lib/auth/permissions';
import { uploadImage } from '@/lib/auth/upload';

const BACK = '/hr-admin/settings';
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();
const oneLine = (fd: FormData, k: string) => str(fd, k).replace(/\s+/g, ' ');

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

// [폼 이름, 화면 이름, 최대 글자 수]
const TEXT_FIELDS = [
  ['seoTitle', '사이트 제목', 60],
  ['seoDescription', '사이트 설명', 160],
  ['shareTitle', '공유 제목', 60],
  ['shareDescription', '공유 설명', 160],
  ['introEyebrow', '홈 직함 줄', 40],
  ['introRoles', '홈 소개 한 줄', 60],
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

  // 제목·설명·홈 문구: 한 줄로 정리하고 글자 수를 확인합니다. 비우면 기본 문구가 쓰입니다.
  const t: Record<string, string> = {};
  for (const [key, label, max] of TEXT_FIELDS) {
    t[key] = oneLine(fd, key);
    if (t[key].length > max) fail(`${label}은(는) ${max}자 이내로 입력해 주세요. (현재 ${t[key].length}자)`);
  }
  const seo = {
    title: t.seoTitle,
    description: t.seoDescription,
    shareTitle: t.shareTitle,
    shareDescription: t.shareDescription,
  };
  const intro = { eyebrow: t.introEyebrow, roles: t.introRoles };

  const profileUp = await uploadImage(fd.get('profileFile'), 'site');
  if (profileUp.error) fail(profileUp.error);
  const profileReset = fd.get('profileReset') === 'on';

  const db = adminDb();
  const { data: rows } = await db
    .from('site_settings')
    .select('key, value')
    .in('key', ['links', 'notice', 'seo', 'intro']);
  const oldLinks = rows?.find((r) => r.key === 'links')?.value ?? {};
  const oldNotice = rows?.find((r) => r.key === 'notice')?.value;
  const oldSeo = rows?.find((r) => r.key === 'seo')?.value;
  const oldIntro = rows?.find((r) => r.key === 'intro')?.value;

  // 기존 값(icons 등)을 보존하고 입력한 항목만 덮어씁니다.
  const links = { ...oldLinks, ...v, discordId, email, ...(profileUp.url ? { profileUrl: profileUp.url } : {}) };
  if (profileReset && !profileUp.url) delete links.profileUrl;
  const base = oldNotice && typeof oldNotice === 'object' ? oldNotice : {};
  const noticeValue = { ...base, ko: notice };

  // 한 번에 저장해서, 일부만 저장되는 일을 막습니다.
  const saved = await db.from('site_settings').upsert(
    [
      { key: 'links', value: links },
      { key: 'notice', value: noticeValue },
      { key: 'seo', value: seo },
      { key: 'intro', value: intro },
    ],
    { onConflict: 'key' },
  );
  if (saved.error) fail(`저장 실패: ${saved.error.message}`);

  await logEdit(me, 'update', 'site_settings', 'links', oldLinks, links);
  await logEdit(me, 'update', 'site_settings', 'notice', oldNotice ?? null, noticeValue);
  await logEdit(me, 'update', 'site_settings', 'seo', oldSeo ?? null, seo);
  await logEdit(me, 'update', 'site_settings', 'intro', oldIntro ?? null, intro);
  redirect(`${BACK}?ok=1`);
}
