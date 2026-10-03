// src/lib/types.ts
import type { Text } from './i18n';

export type Group = { id: string; no: string; name: Text; en: string; desc: Text };
export type Part = { id: string; groupId: string; name: Text };
export type Tag = { id: string; name: Text };
export type Artist = { id: string; name: string; typeIds: string[]; useAvatar: boolean; avatarUrl?: string; showWhenEmpty: boolean };
export type Feat = { default?: string; groups?: string[]; parts?: string[] }; // default = 핀 라벨로 쓸 partId
export type Work = {
  id: string; title: string; youtubeId: string; date: string; duration: string; thumbUrl?: string;
 artistIds: string[]; usageIds: string[]; partIds: string[]; mainPartId?: string; hidden?: boolean; feat?: Feat;
};
export type Discount = { on: boolean; rate?: number; price?: string; endDate?: string }; // endDate: YYYY-MM-DD (KST)
export type RateItem = { id: string; groupId: string; name: Text; desc: Text; price: string; unit: Text; tag?: string; discount?: Discount };
export type Pkg = { id: string; no: string; tag: string; name: Text; desc: Text; itemIds: string[]; total: string; discount?: Discount };
export type QueueItem = { workId: string; labelPartId?: string; partCount?: number };
export type Links = {
  youtube: string; soop: string; x: string; discordServer: string; discordUrl: string;
  discordId: string; email: string; crewUrl: string; profileUrl?: string;
  icons?: Partial<Record<'youtube' | 'soop' | 'x' | 'discord', string>>;
};
export type SiteData = {
  groups: Group[]; parts: Part[]; usageTypes: Tag[]; artistTypes: Tag[]; artists: Artist[]; works: Work[];
  rateItems: RateItem[]; packages: Pkg[]; notice: Text; links: Links; indexQueue: QueueItem[];
};
