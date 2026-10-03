// src/lib/auth/admin-db.ts — Secret key 연결. 서버 코드 안에서만 import 가능 (브라우저로 넘어가면 빌드 에러)
import 'server-only';
import { createClient } from '@supabase/supabase-js';

export function adminDb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error('.env.local에 SUPABASE_SECRET_KEY가 없습니다.');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
