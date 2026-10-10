// src/lib/quote-accounts.ts — 자주 쓰는 입금 계좌 목록 읽기 (서버 전용)
import 'server-only';
import { adminDb } from '@/lib/auth/admin-db';
import type { SavedAccount } from '@/lib/quote-store';

/** 실패하거나 테이블이 아직 없으면 빈 목록을 돌려줍니다. (페이지가 깨지지 않게) */
export async function loadAccounts(): Promise<SavedAccount[]> {
  const { data, error } = await adminDb()
    .from('quote_accounts')
    .select('id, label, bank_name, account_no, holder')
    .order('sort', { ascending: true })
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    id: String(r.id),
    label: String(r.label ?? ''),
    name: String(r.bank_name ?? ''),
    no: String(r.account_no ?? ''),
    holder: String(r.holder ?? ''),
  }));
}
