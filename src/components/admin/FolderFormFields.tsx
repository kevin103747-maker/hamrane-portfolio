// src/components/admin/FolderFormFields.tsx — 폴더 폼의 이름·설명·숨김 입력칸 (기존 폴더 화면과 빌더 편집 패널이 같이 씁니다)
const txt = (v: unknown): string =>
  typeof v === 'string' ? v : ((v as { ko?: string } | null)?.ko ?? '');
const en = (v: unknown): string => (v as { en?: string } | null)?.en ?? '';

export type FolderFormCur = {
  id?: string;
  name?: unknown;
  descr?: unknown;
  hidden?: boolean | null;
  question?: unknown;
};

export function FolderFormFields({ cur }: { cur?: FolderFormCur | null }) {
  return (
    <>
      {cur?.id && <input type="hidden" name="id" value={cur.id} />}

      <div className="hr-row">
        <label>
          이름 (한국어, 필수)
          <input name="name" defaultValue={txt(cur?.name)} maxLength={20} required />
        </label>
        <label>
          이름 (영어, 선택)
          <input name="nameEn" defaultValue={en(cur?.name)} maxLength={40} />
        </label>
      </div>

      <div className="hr-row">
        <label>
          설명 (한국어)
          <input name="desc" defaultValue={txt(cur?.descr)} maxLength={60} />
        </label>
        <label>
          설명 (영어)
          <input name="descEn" defaultValue={en(cur?.descr)} maxLength={120} />
        </label>
      </div>

      <div className="hr-row">
        <label>
          이 폴더 안쪽 단계의 질문 (한국어)
          <input name="question" defaultValue={txt(cur?.question)} maxLength={40} />
        </label>
        <label>
          이 폴더 안쪽 단계의 질문 (영어)
          <input name="questionEn" defaultValue={en(cur?.question)} maxLength={80} />
        </label>
      </div>

      <label className="hr-chk">
        <input type="checkbox" name="hidden" defaultChecked={!!cur?.hidden} />
        숨김 (공개 화면에서 보이지 않음)
      </label>
    </>
  );
}
