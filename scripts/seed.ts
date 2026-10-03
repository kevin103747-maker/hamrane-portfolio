// scripts/seed.ts — sample-data.ts의 "뼈대 데이터"를 Supabase에 입력합니다. 여러 번 실행해도 안전합니다.
import { createClient } from '@supabase/supabase-js';
import { SAMPLE } from '../src/lib/sample-data';

// true로 바꾸면 샘플 곡/아티스트/단가표(가짜 데이터)도 함께 넣습니다. 기본값은 뼈대만.
const INCLUDE_SAMPLE_CONTENT = false;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SECRET_KEY;
if (!url || !key) {
  console.error('✗ .env.local에 NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SECRET_KEY가 없습니다.');
  process.exit(1);
}
const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function put(table: string, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const { error } = await sb.from(table).upsert(rows);
  if (error) {
    console.error(`✗ ${table}: ${error.message}`);
    process.exit(1);
  }
  console.log(`✓ ${table}: ${rows.length}개`);
}

async function main() {
  const S = SAMPLE;
  await put('part_groups', S.groups.map((x, i) => ({ id: x.id, num: x.no, name: x.name, en: x.en, descr: x.desc, sort: i })));
  await put('parts', S.parts.map((x, i) => ({ id: x.id, group_id: x.groupId, name: x.name, sort: i })));
  await put('usage_types', S.usageTypes.map((x, i) => ({ id: x.id, name: x.name, sort: i })));
  await put('artist_types', S.artistTypes.map((x, i) => ({ id: x.id, name: x.name, sort: i })));
  await put('site_settings', [
    { key: 'notice', value: S.notice },
    { key: 'links', value: S.links },
  ]);

  if (INCLUDE_SAMPLE_CONTENT) {
    await put('artists', S.artists.map((x, i) => ({
      id: x.id, name: x.name, type_ids: x.typeIds, use_avatar: x.useAvatar,
      avatar_url: x.avatarUrl ?? null, show_when_empty: x.showWhenEmpty, sort: i,
    })));
    await put('works', S.works.map((x, i) => ({
      id: x.id, title: x.title, youtube_id: x.youtubeId, work_date: x.date, duration: x.duration,
      thumb_url: x.thumbUrl ?? null, artist_ids: x.artistIds, usage_ids: x.usageIds,
      part_ids: x.partIds, hidden: x.hidden ?? false, feat: x.feat ?? null, sort: i,
    })));
    await put('rate_items', S.rateItems.map((x, i) => ({
      id: x.id, group_id: x.groupId, name: x.name, descr: x.desc, price: x.price,
      unit: x.unit, tag: x.tag ?? null, discount: x.discount ?? null, sort: i,
    })));
    await put('packages', S.packages.map((x, i) => ({
      id: x.id, num: x.no, tag: x.tag, name: x.name, descr: x.desc, item_ids: x.itemIds,
      total: x.total, discount: x.discount ?? null, sort: i,
    })));
    await sb.from('index_queue').delete().neq('id', 0);
    await put('index_queue', S.indexQueue.map((x, i) => ({
      work_id: x.workId, label_part_id: x.labelPartId ?? null, part_count: x.partCount ?? null, sort: i,
    })));
  }
  console.log('완료');
}

main();
