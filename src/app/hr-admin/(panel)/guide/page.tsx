// src/app/hr-admin/(panel)/guide/page.tsx — 의뢰 가이드 문구 수정
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/guard';
import { can } from '@/lib/auth/permissions';
import { getGuideSettings } from '@/lib/guide-settings';
import { GUIDE_LIMITS as L } from '@/lib/guide';
import { CountedField } from '@/components/admin/CountedField';
import { ListEditor } from '@/components/admin/ListEditor';
import { saveGuide } from './actions';

export default async function GuidePage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const me = await requireAdmin();
  if (!can(me, 'settings')) redirect('/hr-admin');
  const { ok, err } = await searchParams;
  const g = await getGuideSettings();

  return (
    <div className="hr-pn-body">
      <h1>의뢰 가이드 문구</h1>
      <p>
        의뢰 가이드 페이지(/guide)의 인사말·진행 순서·가격 조율·안심 포인트·자주 묻는 질문과,
        모든 페이지 하단 문의 영역의 안내를 고칩니다.
        내용을 비우거나 항목을 모두 삭제하면 사이트에서 그 부분이 표시되지 않습니다.
        실제로 지킬 수 있는 조건만 적어 주세요.
      </p>
      <p>
        English 칸은 영어 화면(/en/guide)에 쓰입니다. 비워 두면 그 칸만 한국어로 나오고,
        한국어 칸을 먼저 채워야 합니다. 영어는 한국어 글자 수 제한의 2배까지 쓸 수 있습니다.
        하단 문의 영역은 영어 칸이 아직 없어서, 영어 화면에서 첫 문장과 답변 시간 안내는 보이지 않고
        요청 문구와 항목은 기본 영어 문구로 나옵니다.
      </p>

      {ok && (
        <p role="status">
          {ok === 'reset'
            ? '기본 문구로 되돌렸습니다. 공개 사이트에는 상단의 "사이트에 게시" 버튼을 눌러야 반영됩니다.'
            : '저장했습니다. 공개 사이트에는 상단의 "사이트에 게시" 버튼을 눌러야 반영됩니다.'}
        </p>
      )}
      {err && <p role="alert">{err}</p>}

      <form action={saveGuide} className="hr-card hr-f">
        <fieldset>
          <legend>페이지 맨 위 인사말 (의뢰 가이드 제목과 소개)</legend>
          <CountedField name="ftTitle" label="제목" defaultValue={g.firstTime.title} soft={20} max={L.ftTitle} />
          <CountedField name="ftBody" label="소개 문장" defaultValue={g.firstTime.body} soft={200} max={L.ftBody} rows={3} />
          <CountedField
            name="ftTitleEn" label="English 제목 (비우면 한국어로 표시)" defaultValue={g.firstTime.titleEn ?? ''}
            soft={L.ftTitle} max={L.ftTitle * 2}
          />
          <CountedField
            name="ftBodyEn" label="English 소개 문장 (비우면 한국어로 표시)" defaultValue={g.firstTime.bodyEn ?? ''}
            soft={300} max={L.ftBody * 2} rows={3}
          />
        </fieldset>

        <fieldset>
          <legend>의뢰 진행 순서 (최대 {L.stepMax}단계)</legend>
          <ListEditor
            initial={g.steps}
            max={L.stepMax}
            itemLabel="단계"
            addLabel="+ 단계 추가"
            emptyNote="진행 순서가 없으면 가이드 페이지에서 이 영역이 표시되지 않습니다."
            fields={[
              { key: 'title', name: 'stepTitle', label: '제목', max: L.stepTitle },
              { key: 'desc', name: 'stepDesc', label: '설명', max: L.stepDesc, rows: 3 },
              {
                key: 'note', name: 'stepNote', label: '덧붙임 한 줄 (선택. 비우면 표시 안 함)', max: L.stepNote,
                placeholder: '예) 견적 확인까지 비용은 들지 않습니다',
              },
              { key: 'titleEn', name: 'stepTitleEn', label: 'English 제목 (비우면 한국어로 표시)', max: L.stepTitle * 2 },
              { key: 'descEn', name: 'stepDescEn', label: 'English 설명 (비우면 한국어로 표시)', max: L.stepDesc * 2, rows: 3 },
              { key: 'noteEn', name: 'stepNoteEn', label: 'English 덧붙임 한 줄 (비우면 한국어로 표시)', max: L.stepNote * 2 },
            ]}
          />
        </fieldset>

        <fieldset>
          <legend>가격 조율 안내 (제목과 본문 모두 비우면 표시 안 함)</legend>
          <CountedField name="ptTitle" label="제목" defaultValue={g.priceTalk.title} soft={30} max={L.ptTitle} />
          <CountedField
            name="ptBody" label="본문 (줄바꿈 가능)" defaultValue={g.priceTalk.body} soft={500} max={L.ptBody} rows={5}
          />
          <CountedField
            name="ptTitleEn" label="English 제목 (비우면 한국어로 표시)" defaultValue={g.priceTalk.titleEn ?? ''}
            soft={L.ptTitle} max={L.ptTitle * 2}
          />
          <CountedField
            name="ptBodyEn" label="English 본문 (줄바꿈 가능. 비우면 한국어로 표시)" defaultValue={g.priceTalk.bodyEn ?? ''}
            soft={800} max={L.ptBody * 2} rows={5}
          />
        </fieldset>

        <fieldset>
          <legend>안심 포인트 카드 (최대 {L.assureMax}개)</legend>
          <ListEditor
            initial={g.assure}
            max={L.assureMax}
            itemLabel="카드"
            addLabel="+ 카드 추가"
            emptyNote="카드가 없으면 가이드 페이지에서 이 영역이 표시되지 않습니다."
            fields={[
              { key: 'title', name: 'assureTitle', label: '제목', max: L.assureTitle, placeholder: '예) 문의만으로 확정되지 않아요' },
              { key: 'desc', name: 'assureDesc', label: '설명', max: L.assureDesc, rows: 3, placeholder: '실제로 지킬 수 있는 내용만 적어 주세요' },
              { key: 'titleEn', name: 'assureTitleEn', label: 'English 제목 (비우면 한국어로 표시)', max: L.assureTitle * 2 },
              { key: 'descEn', name: 'assureDescEn', label: 'English 설명 (비우면 한국어로 표시)', max: L.assureDesc * 2, rows: 3 },
            ]}
          />
        </fieldset>

        <fieldset>
          <legend>자주 묻는 질문 (최대 {L.faqMax}개)</legend>
          <ListEditor
            initial={g.faq}
            max={L.faqMax}
            itemLabel="질문"
            addLabel="+ 질문 추가"
            emptyNote="질문이 없으면 가이드 페이지에서 이 영역이 표시되지 않습니다."
            fields={[
              { key: 'q', name: 'faqQ', label: '질문', max: L.faqQ, placeholder: '예) 수정은 몇 번까지 가능한가요?' },
              { key: 'a', name: 'faqA', label: '답변 (줄바꿈 가능)', max: L.faqA, rows: 4, placeholder: '실제 조건을 적어 주세요' },
              { key: 'qEn', name: 'faqQEn', label: 'English 질문 (비우면 한국어로 표시)', max: L.faqQ * 2 },
              { key: 'aEn', name: 'faqAEn', label: 'English 답변 (줄바꿈 가능. 비우면 한국어로 표시)', max: L.faqA * 2, rows: 4 },
            ]}
          />
        </fieldset>

        <fieldset>
          <legend>문의 영역 안내 (모든 페이지 하단)</legend>
          <CountedField
            name="contactLead" label="첫 문장 (굵게 표시. 비우면 표시 안 함)" defaultValue={g.contact.lead}
            placeholder="예) 문의만으로 의뢰가 확정되지 않습니다." soft={60} max={L.lead}
          />
          <CountedField
            name="contactReply" label="답변 시간 안내 (비우면 표시 안 함)" defaultValue={g.contact.reply}
            placeholder="예) 보통 평일 기준 1~2일 안에 답변드립니다." soft={60} max={L.reply}
          />
          <CountedField
            name="contactAsk" label="문의 요청 문구 (비우면 표시 안 함)" defaultValue={g.contact.ask} soft={60} max={L.ask}
          />
          <label>
            문의 때 알려 달라고 안내할 항목 (한 줄에 하나, 최대 {L.fieldMax}개. 모두 지우면 항목과 &quot;문의 양식 복사&quot; 버튼이 사라집니다)
            <textarea name="contactFields" rows={7} defaultValue={g.contact.fields.join('\n')} />
          </label>
        </fieldset>

        <fieldset>
          <legend>기본 문구로 되돌리기</legend>
          <label className="hr-chk">
            <input type="checkbox" name="reset" /> 체크하고 저장하면 위에서 고친 내용을 모두 버리고 처음 기본 문구로 되돌립니다
          </label>
        </fieldset>

        <div className="hr-act">
          <button type="submit">저장</button>
        </div>
      </form>
    </div>
  );
}
