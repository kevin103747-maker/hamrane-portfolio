// src/lib/auth/guard.ts — "누가 들어왔는지" 서버에서 확인하는 문지기
import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './server';
import { adminDb } from './admin-db';

export type Admin = { discordId: string; name: string; role: 'master' | 'admin'; permissions: Record<string, unknown> };

/** 로그인한 사람의 Discord 숫자 ID. 인증 서버가 보증하는 identities 값을 씁니다(사용자가 수정 가능한 user_metadata는 쓰지 않음). */
export async function whoami() {
  const sb = await createClient();
  const { data, error } = await sb.auth.getUser();
  const user = data?.user;
  if (error || !user) return null;
  const idn = user.identities?.find((i) => i.provider === 'discord');
  const d = (idn?.identity_data ?? {}) as Record<string, unknown>;
  const raw = d.provider_id ?? d.sub ?? idn?.id;
  const discordId = typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
  const name = typeof d.full_name === 'string' ? d.full_name : typeof d.name === 'string' ? d.name : '';
  return { discordId, name };
}

/** 허용 목록 확인: 마스터(.env.local) 또는 admin_users 표 */
export async function findAdmin(discordId: string): Promise<Admin | null> {
  if (!/^\d{15,22}$/.test(discordId)) return null;
  const master = (process.env.MASTER_DISCORD_ID ?? '').trim();
  if (master && discordId === master) return { discordId, name: '', role: 'master', permissions: {} };
  const { data } = await adminDb().from('admin_users').select('*').eq('discord_id', discordId).maybeSingle();
  if (!data) return null;
  return { discordId, name: data.display_name ?? '', role: 'admin', permissions: data.permissions ?? {} };
}

export async function isAal2() {
  const sb = await createClient();
  const { data } = await sb.auth.getClaims();
  return (data?.claims as { aal?: string } | undefined)?.aal === 'aal2';
}

/**
 * 로그인 + 허용 목록까지만 확인 (2단계 인증 화면용)
 * cache(): 같은 요청 안에서 레이아웃·페이지·액션이 각각 불러도 확인은 1번만 합니다. (요청이 끝나면 결과는 버려집니다)
 */
export const requireAllowed = cache(async (): Promise<Admin> => {
  const me = await whoami();
  if (!me) redirect('/hr-admin/login');
  const admin = await findAdmin(me.discordId);
  if (!admin) redirect('/hr-admin/denied');
  return { ...admin, name: admin.name || me.name };
});

/** 관리자 화면과 모든 관리자 기능의 입구: 로그인 + 허용 목록 + 2단계 인증 완료 */
export const requireAdmin = cache(async (): Promise<Admin> => {
  // 2단계 인증 확인은 신원 확인과 서로 기다릴 필요가 없어 동시에 합니다.
  // 로그인·허용 목록 실패(login/denied)가 2단계 인증(mfa)보다 먼저 적용되는 순서는 그대로입니다.
  const [admin, aal2] = await Promise.all([requireAllowed(), isAal2()]);
  if (!aal2) redirect('/hr-admin/mfa');
  return admin;
});
