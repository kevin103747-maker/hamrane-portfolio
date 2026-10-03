// src/lib/auth/browser.ts — 브라우저(로그인 버튼, 2단계 인증 화면)에서 쓰는 클라이언트
import { createBrowserClient } from '@supabase/ssr';

export const createBrowser = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!);
