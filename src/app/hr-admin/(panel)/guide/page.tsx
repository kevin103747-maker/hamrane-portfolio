// src/app/hr-admin/(panel)/guide/page.tsx — 의뢰 안내 문구 수정
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
      <h1>의뢰 안내 문구</h1>
      <p>
        단가 페이지의 안심 문구·진행 순서·자주 묻는 질문과, 모든 페이지 하단 문의 영역의 안내를 고칩니다.
        내용을 비우거나 항목을 모두 삭제하면 사이트에서 그 부분이 표시되지 않습니다.
        실제로 지킬 수 있는 조건만 적어 주세요.
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
          <legend>처음 의뢰 안내 (단가 페이지 맨 위 박스)</legend>
          <CountedField name="ftTitle" label="제목" defaultValue={g.firstTime.title} soft={20} max={L.ftTitle} />
          <CountedField name="ftBody" label="본문" defaultValue={g.firstTime.body} soft={120} max={L.ftBody} rows={2} />
        </fieldset>

        <fieldset>
          <legend>의뢰 진행 순서 (단가 페이지, 최대 {L.stepMax}단계)</legend>
          <ListEditor
            initial={g.steps}
            max={L.stepMax}
            itemLabel="단계"
            addLabel="+ 단계 추가"
            emptyNote="진행 순서가 없으면 단가 페이지에서 이 영역이 표시되지 않습니다."
            fields={[
              { key: 'title', name: 'stepTitle', label: '제목', max: L.stepTitle },
              { key: 'desc', name: 'stepDesc', label: '설명', max: L.stepDesc, rows: 2 },
              {
                key: 'note', name: 'stepNote', label: '덧붙임 한 줄 (선택. 비우면 표시 안 함)', max: L.stepNote,
                placeholder: '예) 견적 확인까지 비용은 들지 않습니다',
              },
            ]}
          />
        </fieldset>

        <fieldset>
          <legend>자주 묻는 질문 (단가 페이지 맨 아래, 최대 {L.faqMax}개)</legend>
          <ListEditor
            initial={g.faq}
            max={L.faqMax}
            itemLabel="질문"
            addLabel="+ 질문 추가"
            emptyNote="질문이 없으면 단가 페이지에서 이 영역이 표시되지 않습니다."
            fields={[
              { key: 'q', name: 'faqQ', label: '질문', max: L.faqQ, placeholder: '예) 수정은 몇 번까지 가능한가요?' },
              { key: 'a', name: 'faqA', label: '답변 (줄바꿈 가능)', max: L.faqA, rows: 4, placeholder: '실제 조건을 적어 주세요' },
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
