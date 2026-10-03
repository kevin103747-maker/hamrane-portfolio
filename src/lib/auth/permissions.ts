// src/lib/auth/permissions.ts — 메뉴 권한 확인과 수정이력 기록
import 'server-only';
import { adminDb } from './admin-db';
import type { Admin } from './guard';

/** 마스터는 모두 허용, 하위 관리자는 permissions에 해당 키가 true일 때만 허용 */
export const can = (a: Admin, key: string) => a.role === 'master' || a.permissions?.[key] === true;

/** 마스터 외 관리자의 작업만 기록합니다. */
export async function logEdit(
  a: Admin, action: string, table: string, targetId: string, before: unknown, after: unknown,
) {
  if (a.role === 'master') return;
  const { error } = await adminDb().from('edit_log').insert({
    actor_id: a.discordId, actor_name: a.name, action,
    target_table: table, target_id: targetId, before: before ?? null, after: after ?? null,
  });
  if (error) console.error('[edit_log] 기록 실패:', error.message);
}
