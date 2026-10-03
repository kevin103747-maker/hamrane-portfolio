// src/app/hr-admin/(panel)/settings/page.tsx — 사이트 설정
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { getSiteData } from '@/lib/site-data';
import { saveSettings } from './actions';

// 문자열 또는 { ko: "..." } 형태 모두 글자로 바꿉니다.
const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  const { ok, err } = await searchParams;
  const { links, notice } = await getSiteData();

  return (
    <div className="hr-pn-body">
      <h1>사이트 설정</h1>
      <p>채널 링크, 연락처, 단가표 안내 문구를 바꿉니다. 비워 둔 채널 아이콘은 홈에서 흐리게 표시되고 눌러도 이동하지 않습니다.</p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 대시보드의 &quot;게시&quot;를 눌러야 반영됩니다.</p>}
      {err && <p role="alert">{err}</p>}

      <form action={saveSettings} className="hr-card hr-f">
        <fieldset>
          <legend>홈 프로필 사진</legend>
          {links.profileUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={links.profileUrl} alt="현재 프로필 사진" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 12 }} />
            </>
          )}
          <label>
            사진 파일 올리기 (JPG·PNG·WebP, 4MB 이하. 얼굴이 가운데 오는 정사각형에 가까운 사진을 권장합니다)
            <input type="file" name="profileFile" accept="image/jpeg,image/png,image/webp" />
          </label>
          <label className="hr-chk">
            <input type="checkbox" name="profileReset" /> 기본 사진(character.png)으로 되돌리기
          </label>
        </fieldset>

        <fieldset>
          <legend>채널 링크 (홈 화면 아이콘)</legend>
          <label>유튜브<input name="youtube" defaultValue={links.youtube} placeholder="https://youtube.com/@..." /></label>
          <label>SOOP<input name="soop" defaultValue={links.soop} placeholder="https://ch.sooplive.co.kr/..." /></label>
          <label>X<input name="x" defaultValue={links.x} placeholder="https://x.com/..." /></label>
          <label>
            디스코드 프로필 링크 (홈 아이콘과 문의 카드에 같이 쓰입니다)
            <input name="discordServer" defaultValue={links.discordServer || links.discordUrl} placeholder="https://discord.com/users/숫자ID" />
          </label>
        </fieldset>

        <fieldset>
          <legend>문의 연락처</legend>
          <label>디스코드 ID (화면에 글자로 표시되는 사용자 이름)<input name="discordId" defaultValue={links.discordId} /></label>
          <label>이메일<input name="email" type="email" defaultValue={links.email} /></label>
          <label>크루 주소<input name="crewUrl" defaultValue={links.crewUrl} placeholder="https://x.com/..." /></label>
        </fieldset>

        <fieldset>
          <legend>단가표 안내 문구</legend>
          <label>
            공지
            <textarea name="notice" rows={4} defaultValue={txt(notice)} />
          </label>
        </fieldset>

        <div className="hr-act">
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
