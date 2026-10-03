// src/components/admin/DiscountFields.tsx — 단가 항목·패키지 공용 할인 입력칸
type D = { on?: boolean; rate?: number; price?: string; endDate?: string } | null | undefined;

export function DiscountFields({ d }: { d?: D }) {
  return (
    <fieldset>
      <legend>할인 (선택)</legend>
      <label className="hr-chk">
        <input type="checkbox" name="discOn" defaultChecked={!!d?.on} /> 할인 적용
      </label>
      <div className="hr-row">
        <label>
          할인율 (%)
          <input type="number" name="discRate" min={1} max={99} defaultValue={d?.rate ?? ''} />
        </label>
        <label>
          할인가
          <input name="discPrice" inputMode="numeric" defaultValue={d?.price ?? ''} />
        </label>
        <label>
          종료일 (한국 시간, 그날 끝까지)
          <input type="date" name="discEnd" defaultValue={d?.endDate ?? ''} />
        </label>
      </div>
      <small>할인율만 넣으면 할인가가 100원 단위로 자동 계산되고, 할인가만 넣으면 할인율이 계산됩니다. 종료일을 비우면 기간 제한이 없습니다.</small>
    </fieldset>
  );
}
