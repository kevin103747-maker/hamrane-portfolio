// src/app/hr-admin/(panel)/status/page.tsx — 의뢰 상태 · 작업 현황 설정
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { getStatusSettings } from '@/lib/status-settings';
import { STATUS_LABEL, STATUS_LIMITS as L, daysSince } from '@/lib/status';
import { CountedField } from '@/components/admin/CountedField';
import { saveStatus } from './actions';

export default async function StatusPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  const { ok, err } = await searchParams;
  const s = await getStatusSettings();
  const days = s.updatedAt ? daysSince(s.updatedAt) : null;
  const keys = Object.keys(STATUS_LABEL) as (keyof typeof STATUS_LABEL)[];

  return (
    <div className="hr-pn-body">
      <h1>의뢰 상태</h1>
      <p>
        홈 화면 소개 영역과 모든 페이지 하단 문의 영역에 지금 의뢰를 받을 수 있는지 표시합니다.
        저장할 때마다 날짜가 자동으로 기록되어 &quot;10.04 기준&quot;처럼 함께 표시됩니다.
        상황이 바뀌면 이 화면에서 바로 고쳐 주세요.
      </p>

      {s.state && days !== null && (
        <p role="status">
          마지막 수정: {s.updatedAt} ({days}일 전)
          {days >= 14 && ' — 오래 지났습니다. 지금 상태가 사실과 맞는지 확인해 주세요.'}
        </p>
      )}
      {ok && <p role="status">저장했습니다. 공개 사이트에는 상단의 &quot;사이트에 게시&quot; 버튼을 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form action={saveStatus} className="hr-card hr-f">
        <fieldset>
          <legend>현재 의뢰 상태</legend>
          <label>
            상태
            <select name="state" defaultValue={s.state}>
              <option value="">표시 안 함</option>
              {keys.map((k) => <option key={k} value={k}>{STATUS_LABEL[k]}</option>)}
            </select>
          </label>
          <CountedField
            name="note" label="한 줄 메모 (선택. 비우면 표시 안 함)" defaultValue={s.note}
            placeholder="예) 10월 중순부터 새 작업 시작 가능" soft={40} max={L.note}
          />
        </fieldset>

        <fieldset>
          <legend>작업 현황 (홈 화면)</legend>
          <label className="hr-chk">
            <input type="checkbox" name="showStats" defaultChecked={s.showStats} />
            누적 작업 곡 수, 함께한 아티스트 수, 최근 작업 날짜를 홈 화면에 표시
          </label>
        </fieldset>

        <div className="hr-act">
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
