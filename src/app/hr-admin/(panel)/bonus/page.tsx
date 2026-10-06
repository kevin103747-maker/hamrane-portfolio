// src/app/hr-admin/(panel)/bonus/page.tsx — 서비스 혜택(리릭비디오 등) 안내
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { adminDb } from '@/lib/auth/admin-db';
import { Help, Flash } from '@/components/admin/Section';
import { BONUS_LIMITS, parseBonus } from '@/lib/bonus';
import { saveBonus } from './actions';

const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

export default async function BonusPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'rates')) redirect('/hr-admin');
  const { ok, err } = await searchParams;

  const db = adminDb();
  const [g, r, s] = await Promise.all([
    db.from('part_groups').select('id, num, name').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('rate_items').select('id, group_id, name').order('sort', { ascending: true }).order('id', { ascending: true }),
    db.from('site_settings').select('value').eq('key', 'bonus').maybeSingle(),
  ]);
  const items = r.data ?? [];
  const used = new Set(items.map((x) => x.group_id as string));
  const groups = (g.data ?? []).filter((x) => used.has(x.id as string));
  const cur = parseBonus(s.data?.value);
  const excluded = new Set(cur.excluded);

  return (
    <div className="hr-pn-body">
      <h1>서비스 혜택</h1>
      <p className="hr-lead">
        리릭비디오처럼 가격을 깎지 않고 함께 드리는 혜택을 안내합니다. 켜 두면 단가표 맨 위에 한 줄이 나오고,
        모든 분야의 작업에 기본으로 적용됩니다. 빼고 싶은 작업만 아래에서 체크하세요.
      </p>
      <Help title="이 화면에서 하는 일">
        <p>
          단가표 맨 위 한 줄에는 이름과 한 줄 문구가 나옵니다. &quot;예시 보기&quot; 팝업에는 설명, 조건, 예시 영상이 나옵니다.
          예시 영상은 의뢰자에게 게시 동의를 받은 곡만 넣으세요. 제외한 작업의 카드에는 &quot;제외 작업&quot; 문구가 붙습니다.
          나중에 새로 추가하는 작업은 자동으로 포함됩니다.
        </p>
      </Help>

      <Flash ok={ok} err={err} />

      <form action={saveBonus} className="hr-card hr-f">
        <label className="hr-chk">
          <input type="checkbox" name="on" defaultChecked={cur.on} /> 이 혜택을 단가표에 표시
        </label>

        <div className="hr-row">
          <label>
            혜택 이름 (최대 {BONUS_LIMITS.title}자)
            <input name="title" maxLength={BONUS_LIMITS.title} defaultValue={cur.title} />
          </label>
          <label>
            한 줄 문구 (최대 {BONUS_LIMITS.line}자)
            <input name="line" maxLength={BONUS_LIMITS.line} defaultValue={cur.line} />
          </label>
        </div>

        <label>
          팝업 설명 (선택, 최대 {BONUS_LIMITS.detail}자)
          <textarea name="detail" rows={3} maxLength={BONUS_LIMITS.detail} defaultValue={cur.detail} />
        </label>

        <label>
          조건 (선택, 한 줄에 하나, 최대 {BONUS_LIMITS.conditions}줄)
          <textarea
            name="conditions"
            rows={4}
            placeholder={'예: 가사를 함께 보내 주셔야 해요\n예: 수정은 1회까지 가능해요'}
            defaultValue={cur.conditions.join('\n')}
          />
        </label>

        <label>
          예시 영상 (선택, 한 줄에 하나, 최대 {BONUS_LIMITS.videos}개. 유튜브 주소 또는 영상 ID)
          <textarea
            name="videos"
            rows={3}
            placeholder="https://youtu.be/XXXXXXXXXXX"
            defaultValue={cur.videos.map((id) => `https://youtu.be/${id}`).join('\n')}
          />
        </label>

        {groups.map((grp) => {
          const rows = items.filter((x) => x.group_id === grp.id);
          return (
            <fieldset key={grp.id as string} className="hr-tn-item">
              <legend>{grp.num} {txt(grp.name)} · 혜택에서 제외할 작업</legend>
              <div className="hr-chks">
                {rows.map((it) => (
                  <label key={it.id as string} className="hr-chk">
                    <input type="checkbox" name={`ex_${it.id}`} defaultChecked={excluded.has(it.id as string)} />
                    {txt(it.name)}
                  </label>
                ))}
              </div>
            </fieldset>
          );
        })}

        <div className="hr-act">
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
