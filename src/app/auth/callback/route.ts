// src/app/auth/callback/route.ts — Discord 로그인 후 돌아오는 곳
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}/hr-admin`);
  }
  return NextResponse.redirect(`${origin}/hr-admin/login?error=1`);
}
