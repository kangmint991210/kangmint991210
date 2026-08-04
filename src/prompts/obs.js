// 영유아 관찰기록 — 발달 영역별 관찰과 해석
//
// system  : 모델에게 주는 규칙. 문서 양식·문체·분량 규정이 들어갑니다.
// buildUserMessage(f, free) : 입력 폼(f)과 사용자가 이어 말한 요청(free)을 한 덩어리 지시문으로.
// tokens  : 출력 상한. 분량 규정이 큰 문서일수록 넉넉히 잡아야 JSON 이 잘리지 않습니다.
// eta     : 예상 소요(초). 화면의 대기 안내에 씁니다.

import { monthRange } from "../lib/korean-date.js";
export default {

    btn: "관찰일지 만들기",
    eta: 20,
    free: '"자연탐구 영역 추가", "해석 보강"처럼 다듬어요',
    tokens: 2200,
    system: `당신은 한국 영유아 보육 전문가입니다. 교사의 관찰 메모를 바탕으로, 실제 어린이집 양식의 '영유아 관찰기록(관찰일지)'을 작성합니다.
- 일정 기간의 관찰을 발달 영역별로 정리합니다.
  · 각 관찰 영역에는 관찰 일시·장소(datePlace), 관찰 상황(record, 사실 서술), 해석·평가(interpretation)를 모두 포함합니다.
  · 대상 영역: 영아(만0~2세)는 표준보육과정 영역(기본생활/신체운동/의사소통/사회관계/예술경험/자연탐구), 유아(만3~5세)는 누리과정 5영역(신체운동·건강/의사소통/사회관계/예술경험/자연탐구)과 기본생활 중 관찰된 영역.
  · 종합 해석은 summary에 작성.
- 관찰내용은 추측 없이 아이의 말·행동을 구체적으로. 정중한 존댓말. 메모에 나타난 영역만 작성.
- datePlace의 날짜는 설정 [관찰기간] 안의 날짜로 자연스럽게 씁니다.
반드시 아래 JSON "하나만" 출력(설명·마크다운·코드펜스 금지):
{"reply":"1문장 안내","observation":{"child":"","gender":"","birth":"","period":"","recorder":"","areas":[{"area":"","datePlace":"","record":"","interpretation":""}],"summary":"비고/종합 해석"}}`,
    buildUserMessage: (f, free) => {
      const mr = monthRange(f.obsPeriod);
      const periodLine = mr ? `관찰기간:${mr}` : (f.obsPeriod ? `관찰기간:${f.obsPeriod}` : "관찰기간:미기재");
      return `[설정] 아동:${f.child || "○○"} · 성별:${f.gender || "미기재"} · 생년월일/월령:${f.birth || "미기재"} · ${periodLine} · 기록자:${f.recorder || "미기재"} · 연령:${f.age}\n[관찰 메모] ${f.memo || "(메모 없음 — 연령·영역에 맞춰 예시로 작성)"}\n[요청] ${free || "위 메모로 관찰기록을 작성해줘"}`;
    },
    label: () => "관찰일지 작성"
};
