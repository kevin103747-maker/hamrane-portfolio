// src/app/hr-admin/actions.ts
'use server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/auth/server';

export async function signOut() {
  const sb = await createClient();
  await sb.auth.signOut();
  redirect('/hr-admin/login');
}
