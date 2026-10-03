// src/lib/supabase.ts  — 공개 사이트용 "읽기 전용" 연결 (Publishable key)
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export const supabase =
  url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null;
