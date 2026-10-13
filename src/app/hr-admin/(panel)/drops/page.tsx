// src/app/hr-admin/(panel)/drops/page.tsx — 무료 배포(이벤트 다운로드 페이지) 관리
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can } from '@/lib/auth/permissions';
import { DROP_BUCKET, DROP_LIMITS as L, fmtSize, fromRow, isLive } from '@/lib/drops';
import { CountedField } from '@/components/admin/CountedField';
import { DropUploader } from '@/components/admin/DropUploader';
import { DropActions } from '@/components/admin/DropActions';
import { saveDrop } from './actions';

export default async function DropsPage({
  searchParams,
}: { searchParams: Promise<{ edit?: string; ok?: string; err?: string }> }) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  const { edit, ok, err } = await searchParams;

  const { data, error } = await adminDb().from('drops').select('*').order('created_at', { ascending: false });
  const drops = ((data ?? []) as Record<string, unknown>[]).map(fromRow);
  const cur = edit ? drops.find((d) => d.id === edit) : undefined;

  const state = (d: (typeof drops)[number]) =>
    !d.published ? '비공개' : isLive(d) ? '공개 중' : '종료됨';

  return (
    <div className="hr-pn-body">
      <h1 className="hr-pn-h">무료 배포</h1>
      <p className="hr-adm-sub">
        이벤트용 BGM 다운로드 페이지입니다. 일반 사이트 어디에서도 링크되지 않고, 여기서 복사한 주소를 아는 사람만 들어옵니다.
        저장하면 바로 반영되며 &quot;사이트에 게시&quot; 버튼은 필요 없습니다. (공개 페이지는 캐시 때문에 최대 1분 늦게 바뀔 수 있어요.)
      </p>
      {ok && <p className="hr-ok">저장했습니다.</p>}
      {err && <p className="hr-adm-err">{err}</p>}
      {error && <p className="hr-adm-err">목록을 불러오지 못했습니다: {error.message}</p>}

      <form id="form" key={cur?.id ?? 'new'} action={saveDrop} className="hr-card hr-f">
        <h2>{cur ? `수정 · ${cur.title}` : '새 배포 만들기'}</h2>
        {cur && <input type="hidden" name="id" value={cur.id} />}

        {cur ? (
          <p className="hr-adm-sub">주소: /dl/{cur.slug} (이미 뿌린 링크가 끊기지 않도록 만든 뒤에는 바꿀 수 없어요.)</p>
        ) : (
          <label>
            주소 (영문 소문자·숫자·하이픈, 2~41자)
            <input name="slug" required pattern="[a-z0-9][a-z0-9\-]{1,40}" placeholder="예) spring-event" />
            <small>공개 주소는 /dl/ 뒤에 이 값이 붙습니다.</small>
          </label>
        )}

        <CountedField name="title" label="제목" defaultValue={cur?.title ?? ''} soft={30} max={L.title} />
        <CountedField name="subtitle" label="한 줄 소개 (제목 아래, 링크 미리보기에도 쓰임)" defaultValue={cur?.subtitle ?? ''} soft={40} max={L.subtitle} />
        <CountedField name="description" label="소개 글 (영상 아래)" defaultValue={cur?.description ?? ''} soft={300} max={L.description} rows={4} />
        <CountedField name="terms" label="이용 안내 (출처 표기 조건 등)" defaultValue={cur?.terms ?? ''} soft={300} max={L.terms} rows={4} />
        <label>
          유튜브 주소 또는 영상 ID (미리듣기)
          <input name="youtube" defaultValue={cur?.youtubeId ?? ''} placeholder="https://youtu.be/..." />
        </label>
        <label>
          종료일 (선택, 이 날까지 열려 있고 다음 날부터 404)
          <input type="date" name="endsOn" defaultValue={cur?.endsOn ?? ''} />
        </label>
        <label className="hr-chk">
          <input type="checkbox" name="published" defaultChecked={cur?.published ?? false} />
          공개 (끄면 주소를 알아도 방문자에게는 404)
        </label>

        <div className="hr-row">
          <button type="submit" className="hr-adm-btn">저장</button>
          {cur && <Link href="/hr-admin/drops" className="hr-link">새로 만들기로 돌아가기</Link>}
        </div>
      </form>

      {cur && (
        <div className="hr-card">
          <h2>음원 파일</h2>
          <p className="hr-adm-sub">
            MP3와 WAV를 각각 올립니다. 한 파일은 50MB 이하여야 하고, 올린 직후 서버가 진짜 MP3/WAV인지 검사합니다.
            파일은 이 화면에서 바로 저장소로 올라가므로 위의 저장 버튼과는 따로 반영됩니다.
          </p>
          <div className="hr-drop-ups">
            <DropUploader id={cur.id} kind="mp3" bucket={DROP_BUCKET} hasFile={!!cur.mp3Path} sizeLabel={fmtSize(cur.mp3Size)} />
            <DropUploader id={cur.id} kind="wav" bucket={DROP_BUCKET} hasFile={!!cur.wavPath} sizeLabel={fmtSize(cur.wavSize)} />
          </div>
        </div>
      )}

      <div className="hr-card">
        <h2>만든 배포 ({drops.length})</h2>
        {drops.length === 0 && <p>아직 없습니다.</p>}
        {drops.map((d) => (
          <div key={d.id} className="hr-drop-row">
            <div>
              <b>{d.title}</b>
              <span className={`hr-drop-state ${isLive(d) ? 'on' : ''}`}>{state(d)}</span>
              <small>
                /dl/{d.slug} · MP3 {d.mp3Path ? '있음' : '없음'} · WAV {d.wavPath ? '있음' : '없음'}
                {d.endsOn ? ` · ~${d.endsOn}` : ''}
              </small>
            </div>
            <div className="hr-row">
              <Link href={`/hr-admin/drops?edit=${d.id}#form`} className="hr-link">수정</Link>
              <a href={`/hr-admin/drop-preview/${d.id}`} target="_blank" rel="noopener noreferrer" className="hr-link">미리보기</a>
              {isLive(d) && <a href={`/dl/${d.slug}`} target="_blank" rel="noopener noreferrer" className="hr-link">페이지 열기</a>}
              <DropActions id={d.id} slug={d.slug} title={d.title} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
