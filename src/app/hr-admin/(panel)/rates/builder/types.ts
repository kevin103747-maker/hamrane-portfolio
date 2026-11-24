// src/app/hr-admin/(panel)/rates/builder/types.ts — 단가 빌더 어드민 전용 타입
import type { PackageFormCur } from '@/components/admin/PackageFormFields';

export type BuilderFolder = {
  id: string;
  parent_id: string | null;
  name: unknown;
  descr: unknown;
  question?: unknown;
  sort: number | null;
  hidden: boolean | null;
};

export type BuilderSlot = {
  id: string;
  folder_id: string | null;
  package_id: string;
  sort: number | null;
  created_at?: string;
};

export type BuilderPkg = PackageFormCur & { id: string };

export type BuilderGroup = { id: string; num: unknown; name: unknown };
export type BuilderItem = { id: string; group_id: string; name: unknown; price: unknown; unit: unknown };

export type BuilderResult = { ok: true } | { ok: false; error: string };
export type BuilderResultData<T> = { ok: true; data: T } | { ok: false; error: string };
