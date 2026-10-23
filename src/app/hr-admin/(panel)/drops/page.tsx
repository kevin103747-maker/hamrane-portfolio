// src/app/hr-admin/(panel)/drops/page.tsx — 무료 배포(이벤트 다운로드 페이지) 관리
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { adminDb } from '@/lib/auth/admin-db';
import { can } from '@/lib/auth/permissions';
import { DROP_LIMITS as L, fmtSize, fromRow, isLive } from '@/lib/drops';
import { CountedField } from '@/components/admin/CountedField';
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
  const st = await adminDb().rpc('stat_drops', { p_owner: false });
  type DropStat = { slug: string; views: number; visitors: number; mp3: number; wav: number; home: number };
  type DropRef = { slug: string; ref: string; n: number };
  const sd = st.error ? null : (st.data as { drops?: DropStat[]; refs?: DropRef[] } | null);
  const statBy = new Map((sd?.drops ?? []).map((x) => [x.slug, x]));
  const statText = (slug: string) => {
    const s = statBy.get(slug);
    if (!s) return '아직 방문 기록이 없어요';
    const refs = (sd?.refs ?? [])
      .filter((r) => r.slug === slug)
      .slice(0, 4)
      .map((r) => `${r.ref === '(direct)' ? '직접·앱' : r.ref} ${r.n}`)
      .join(', ');
    return `조회 ${s.views} · 방문자 ${s.visitors}명 · MP3 ${s.mp3} · WAV ${s.wav} · 사이트 이동 ${s.home}${refs ? ` · 유입 ${refs}` : ''}`;
  };

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
      {st.error && <p className="hr-adm-err">통계를 불러오지 못했습니다: {st.error.message}. Supabase에서 stat_drops 함수를 만들었는지 확인하세요.</p>}

      <details className="hr-help hr-drop-help">
        <summary>이벤트 올리는 순서 · 도움말</summary>
        <div>
        <h3>1. 음원 파일 준비</h3>
        <ul>
          <li>파일 이름이 받는 사람 컴퓨터에 저장되는 이름이 됩니다. 영문·숫자·하이픈을 권장하고, 한글과 띄어쓰기도 됩니다. (예: Summer-Theme.mp3)</li>
          <li>MP3와 WAV 중 하나만 올려도 됩니다. 같은 곡이면 확장자만 다르게 하면 헷갈리지 않아요.</li>
        </ul>

        <h3>2. Cloudflare R2에 올리기</h3>
        <ol>
          <li>Cloudflare 대시보드 → R2 Object Storage → 만들어 둔 버킷 → Objects → Upload로 파일을 올립니다.</li>
          <li>올린 파일 이름을 그대로 기억해 두세요. 대소문자, 띄어쓰기, 괄호까지 똑같이 적어야 합니다.</li>
          <li>이 버킷에는 공개해도 되는 파일만 두세요. 이름을 아는 사람은 누구나 받을 수 있어요.</li>
        </ol>

        <h3>3. 아래 &quot;새 배포 만들기&quot; 입력</h3>
        <ul>
          <li>주소: 공개 링크의 /dl/ 뒤에 붙는 값입니다. 만든 뒤에는 바꿀 수 없으니 이벤트마다 새로 만드세요.</li>
          <li>제목, 한 줄 소개: 페이지와 카카오톡·디스코드 링크 미리보기에 나옵니다.</li>
          <li>English 칸: 영어 주소(/en/dl/주소)에서 보이는 문구입니다. 비운 칸만 한국어로 대신 나오고, 받기 파일(MP3·WAV)과 유튜브 영상은 한국어·영어 페이지가 같습니다.</li>
          <li>유튜브: 주소를 그대로 붙여 넣으면 됩니다. 미리듣기 영상이 되고, 영상 썸네일이 링크 미리보기 이미지로도 쓰여요.</li>
          <li>종료일(선택): 그날까지 열려 있고 다음 날부터 404가 됩니다.</li>
          <li>MP3·WAV 파일 이름: R2에 올린 이름 그대로 적습니다. 저장할 때 서버가 R2에 있는지 확인하고 용량도 자동으로 읽어요. 비워 두면 &quot;준비 중&quot;으로 보입니다.</li>
          <li>공개: 체크해야 방문자에게 열립니다.</li>
        </ul>

        <h3>4. 확인</h3>
        <ol>
          <li>저장한 뒤 &quot;만든 배포&quot;의 미리보기로 화면을 봅니다. 비공개여도 열립니다.</li>
          <li>공개로 켠 뒤 &quot;페이지 열기&quot;에서 받기를 눌러, 페이지가 바뀌지 않고 바로 저장되는지 봅니다. 가능하면 휴대폰에서도 한 번 받아 보세요.</li>
        </ol>

        <h3>5. 링크 퍼뜨리기 전</h3>
        <ul>
          <li>제목과 소개를 확정하세요. 카카오톡·디스코드 링크 미리보기는 한 번 퍼지면 저장되어 나중에 고쳐도 늦게 바뀝니다.</li>
          <li>&quot;만든 배포&quot;의 &quot;주소 복사&quot;로 링크를 복사하면 됩니다.</li>
        </ul>

        <h3>6. 끝낼 때</h3>
        <ul>
          <li>종료일이 지나거나 비공개로 바꾸면 페이지와 받기 버튼이 404가 됩니다.</li>
          <li>이미 R2 주소를 아는 사람은 계속 받을 수 있어요. 완전히 막으려면 Cloudflare R2에서 파일을 직접 지우세요. 아래 &quot;삭제&quot; 버튼은 R2 파일을 지우지 않습니다.</li>
        </ul>

        <h3>문제가 생기면</h3>
        <ul>
          <li>&quot;R2에서 찾지 못했어요&quot;: 파일 이름의 띄어쓰기, 대소문자, 확장자를 확인하세요. R2 Objects 목록에서 이름을 복사해 붙여 넣으면 정확합니다.</li>
          <li>받기를 눌렀는데 404: 공개 체크, 종료일, 해당 파일 칸이 비어 있지 않은지 확인하세요.</li>
          <li>받기가 저장되지 않고 재생만 됨: Cloudflare Workers에서 calm-butterfly-drops-files의 R2 연결(변수 이름 BUCKET)이 그대로인지 확인하세요.</li>
          <li>&quot;DROP_FILES_BASE&quot; 오류: Vercel 환경 변수가 사라졌거나 값이 바뀌었는지 확인하세요.</li>
          <li>통계가 안 올라감: 본인 기기는 제외되고, 실제 배포(hamrane.com)에서만 기록됩니다.</li>
        </ul>
        </div>
      </details>


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
        <p className="hr-adm-sub">English (선택) · 비워 두면 영어 화면에서 한국어로 표시됩니다.</p>
        <CountedField name="titleEn" label="English title" defaultValue={cur?.titleEn ?? ''} soft={60} max={L.title * 2} />
        <CountedField name="subtitleEn" label="English subtitle" defaultValue={cur?.subtitleEn ?? ''} soft={80} max={L.subtitle * 2} />
        <CountedField name="descriptionEn" label="English description" defaultValue={cur?.descriptionEn ?? ''} soft={600} max={L.description * 2} rows={4} />
        <CountedField name="termsEn" label="English terms of use" defaultValue={cur?.termsEn ?? ''} soft={600} max={L.terms * 2} rows={4} />
        <label>
          유튜브 주소 또는 영상 ID (미리듣기)
          <input name="youtube" defaultValue={cur?.youtubeId ?? ''} placeholder="https://youtu.be/..." />
        </label>
        <label>
          종료일 (선택, 이 날까지 열려 있고 다음 날부터 404)
          <input type="date" name="endsOn" defaultValue={cur?.endsOn ?? ''} />
        </label>
        <label>
          MP3 파일 이름 (Cloudflare R2에 올린 이름 그대로)
          <input name="mp3" defaultValue={cur?.mp3Path ?? ''} placeholder="예) Summer-Theme.mp3" />
        </label>
        <label>
          WAV 파일 이름 (Cloudflare R2에 올린 이름 그대로)
          <input name="wav" defaultValue={cur?.wavPath ?? ''} placeholder="예) Summer-Theme.wav" />
          <small>비워 두면 &quot;준비 중&quot;으로 보입니다. 저장할 때 R2에 실제로 있는지 확인하고 용량도 자동으로 읽어요.</small>
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
                {d.titleEn ? '' : ' · EN 미입력'}
              </small>
              <small>{statText(d.slug)}</small>
            </div>
            <div className="hr-row">
              <Link href={`/hr-admin/drops?edit=${d.id}#form`} className="hr-link">수정</Link>
              <a href={`/hr-admin/drop-preview/${d.id}`} target="_blank" rel="noopener noreferrer" className="hr-link">미리보기</a>
              <a href={`/hr-admin/drop-preview/${d.id}?lang=en`} target="_blank" rel="noopener noreferrer" className="hr-link">EN 미리보기</a>
              {isLive(d) && <a href={`/dl/${d.slug}`} target="_blank" rel="noopener noreferrer" className="hr-link">페이지 열기</a>}
              {isLive(d) && <a href={`/en/dl/${d.slug}`} target="_blank" rel="noopener noreferrer" className="hr-link">EN 페이지 열기</a>}
              <DropActions id={d.id} slug={d.slug} title={d.title} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
