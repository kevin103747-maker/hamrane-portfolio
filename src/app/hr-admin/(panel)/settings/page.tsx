// src/app/hr-admin/(panel)/settings/page.tsx — 사이트 설정
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { getSiteData } from '@/lib/site-data';
import { getPageSettings } from '@/lib/page-settings';
import { CountedField } from '@/components/admin/CountedField';
import { saveSettings } from './actions';
import { getSocialOrder } from '@/lib/social-settings';
import { PLATFORMS } from '@/lib/social';
import { SocialEditor } from '@/components/admin/SocialEditor';


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
  const { seo, intro } = await getPageSettings();
  const socialOrder = await getSocialOrder();
  const socialValues = Object.fromEntries(
    PLATFORMS.map((p) => [p.field, p.field === 'discordServer' ? links.discordServer || links.discordUrl : (links[p.field] ?? '')]),
  ) as Record<string, string>;


  return (
    <div className="hr-pn-body">
      <h1>사이트 설정</h1>
      <p>채널 링크, 연락처, 단가표 안내 문구, 사이트 제목·설명, 홈 소개 문구를 바꿉니다. 주소를 비운 채널은 홈에서 표시되지 않습니다.</p>

      {ok && <p role="status">저장했습니다. 공개 사이트에는 상단의 &quot;게시&quot; 버튼을 눌러야 반영됩니다.</p>}
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
          <legend>홈 화면 문구</legend>
          <CountedField
            name="introEyebrow"
            label="직함 줄 (이름 위의 작은 글자. 비우면 기본 문구)"
            defaultValue={intro.eyebrow}
            soft={30}
            max={40}
          />
          <CountedField
            name="introRoles"
            label="소개 한 줄 (이름 아래. 비우면 기본 문구)"
            defaultValue={intro.roles}
            soft={40}
            max={60}
          />
        </fieldset>

        <fieldset>
          <legend>검색 결과 · 브라우저 탭</legend>
          <CountedField
            name="seoTitle"
            label="사이트 제목 (브라우저 탭과 검색 결과의 제목. 비우면 기본 문구)"
            defaultValue={seo.title}
            soft={40}
            max={60}
          />
          <CountedField
            name="seoDescription"
            label="사이트 설명 (검색 결과 제목 아래에 나오는 문장. 비우면 기본 문구)"
            defaultValue={seo.description}
            soft={120}
            max={160}
            rows={3}
          />
        </fieldset>

        <fieldset>
          <legend>링크 공유 미리보기 (디스코드 · X 등)</legend>
          <CountedField
            name="shareTitle"
            label="공유 제목 (비우면 위의 사이트 제목 사용)"
            defaultValue={seo.shareTitle}
            placeholder={seo.title}
            soft={40}
            max={60}
          />
          <CountedField
            name="shareDescription"
            label="공유 설명 (비우면 위의 사이트 설명 사용)"
            defaultValue={seo.shareDescription}
            placeholder={seo.description}
            soft={120}
            max={160}
            rows={3}
          />
        </fieldset>

        <fieldset>
          <legend>채널 링크 (홈 화면 아이콘 · 위/아래 버튼으로 순서 변경)</legend>
          <SocialEditor initialOrder={socialOrder} values={socialValues} />
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
