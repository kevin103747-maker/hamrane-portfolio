// src/app/hr-admin/(panel)/quote/actions.ts — 자주 쓰는 입금 계좌 저장·삭제
'use server';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { loadAccounts } from '@/lib/quote-accounts';
import type { SavedAccount } from '@/lib/quote-store';

export type AccountResult = { ok: true; list: SavedAccount[] } | { ok: false; error: string };

const MAX_ACCOUNTS = 20;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '');

export async function saveAccount(input: unknown): Promise<AccountResult> {
  const me = await requireAdmin();
  if (!can(me, 'rates')) return { ok: false, error: '권한이 없어요.' };

  const o = (input ?? {}) as Record<string, unknown>;
  const name = clip(o.name, 30);
  const no = clip(o.no, 40);
  const holder = clip(o.holder, 40);
  if (!name && !no && !holder) return { ok: false, error: '저장할 계좌 정보를 먼저 적어 주세요.' };
  const label = clip(o.label, 30) || [name, holder].filter(Boolean).join(' ');

  const cur = await loadAccounts();
  if (cur.length >= MAX_ACCOUNTS) return { ok: false, error: `계좌는 ${MAX_ACCOUNTS}개까지 저장할 수 있어요. 안 쓰는 계좌를 지워 주세요.` };
  if (cur.some((a) => a.name === name && a.no === no && a.holder === holder)) {
    return { ok: false, error: '같은 계좌가 이미 저장돼 있어요.' };
  }

  const { error } = await adminDb()
    .from('quote_accounts')
    .insert({ label, bank_name: name, account_no: no, holder, sort: cur.length });
  if (error) return { ok: false, error: `저장 실패: ${error.message}` };
  return { ok: true, list: await loadAccounts() };
}

export async function removeAccount(id: unknown): Promise<AccountResult> {
  const me = await requireAdmin();
  if (!can(me, 'rates')) return { ok: false, error: '권한이 없어요.' };
  if (typeof id !== 'string' || !UUID.test(id)) return { ok: false, error: '지울 계좌를 찾지 못했어요.' };

  const { error } = await adminDb().from('quote_accounts').delete().eq('id', id);
  if (error) return { ok: false, error: `삭제 실패: ${error.message}` };
  return { ok: true, list: await loadAccounts() };
}
