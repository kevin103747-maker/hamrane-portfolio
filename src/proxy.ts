// src/proxy.ts — 관리자 경로에서만 로그인 세션을 갱신합니다. 공개 페이지에는 쿠키를 붙이지 않습니다.
import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );
  await supabase.auth.getClaims();
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

// 경로를 바꾸려면 아래 값도 같이 바꿔야 합니다.
export const config = { matcher: ['/hr-admin/:path*', '/auth/:path*'] };
