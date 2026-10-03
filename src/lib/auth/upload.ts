// src/lib/auth/upload.ts — 관리자 이미지 업로드 (서버 전용)
import 'server-only';
import { adminDb } from './admin-db';

const BUCKET = 'site-images';
const MAX = 4 * 1024 * 1024; // 4MB

type Kind = { mime: string; ext: string };

/** 파일 앞부분 바이트로 실제 형식을 확인합니다. */
function sniff(b: Uint8Array): Kind | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return { mime: 'image/png', ext: 'png' };
  if (
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  ) return { mime: 'image/webp', ext: 'webp' };
  return null;
}

/** 파일이 없으면 {} 를 돌려줍니다(업로드 안 함). 성공하면 { url }, 실패하면 { error }. */
export async function uploadImage(
  file: FormDataEntryValue | null,
  folder: 'works' | 'artists' | 'site',
): Promise<{ url?: string; error?: string }> {
  if (!(file instanceof File) || file.size === 0) return {};
  if (file.size > MAX) return { error: '이미지는 4MB 이하만 올릴 수 있습니다.' };

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniff(bytes);
  if (!kind) return { error: 'JPG, PNG, WebP 형식의 이미지만 올릴 수 있습니다.' };

  // 항상 새 경로에 올립니다(덮어쓰면 CDN에 옛 이미지가 남을 수 있음).
  const path = `${folder}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${kind.ext}`;
  const db = adminDb();
  const { error } = await db.storage.from(BUCKET).upload(path, bytes, {
    contentType: kind.mime,
    cacheControl: '31536000',
    upsert: false,
  });
  if (error) return { error: `이미지 업로드 실패: ${error.message}` };

  return { url: db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl };
}
