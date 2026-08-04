// 신입원아 적응일지 — 일차별 적응 기록
//
// system  : 모델에게 주는 규칙. 문서 양식·문체·분량 규정이 들어갑니다.
// buildUserMessage(f, free) : 입력 폼(f)과 사용자가 이어 말한 요청(free)을 한 덩어리 지시문으로.
// tokens  : 출력 상한. 분량 규정이 큰 문서일수록 넉넉히 잡아야 JSON 이 잘리지 않습니다.
// eta     : 예상 소요(초). 화면의 대기 안내에 씁니다.

import { weekdaysFrom } from "../lib/korean-date.js";
export default {

    btn: "적응일지 만들기",
    eta: 20,
    free: '"2일차 자세히", "종합 의견 보강"처럼 다듬어요',
    tokens: 2200,
    system: `당신은 한국 영유아 보육 전문가입니다. 교사의 메모를 바탕으로 실제 어린이집 양식의 '신입원아 적응일지'를 작성합니다.
- 적응 일차(1일차, 2일차 …)별로 그날의 적응 모습을 관찰내용(record)으로 서술합니다. 등·하원 및 분리, 놀이·활동 참여, 기본생활(식사·수면·배변), 또래·교사 관계를 자연스럽게 녹여 3~4문장.
- 각 일차에 날짜(date), 등원(arrive)·하원/귀가(leave) 시간, 적응정도(level: 양호/보통/미흡), 건강·투약(health, 없으면 "-"), 비고(note, 예: 시간연장, 없으면 빈 문자열)를 포함.
- 날짜(date)는 설정 [적응일차]에 제시된 날짜를 순서대로 사용(임의 계산 금지). 등·하원 시간은 설정값이 있으면 사용. 메모에 나타난 일차만 작성.
- 마지막에 종합 의견 및 적응 계획(summary). 따뜻하되 정중한 존댓말.
반드시 아래 JSON "하나만" 출력(설명·마크다운·코드펜스 금지):
{"reply":"1문장 안내","adapt":{"child":"","age":"","klass":"","birth":"","period":"적응기간","days":[{"day":"1일차","date":"","arrive":"","leave":"","level":"양호","health":"-","note":"","record":""}],"summary":"종합 의견 및 적응 계획"}}`,
    buildUserMessage: (f, free) => {
      const ds = weekdaysFrom(f.adaptStart, 5);
      const dayLine = ds ? `적응일차:${ds.join(", ")}` : "적응일차:미기재";
      const timeLine = (f.arriveTime || f.leaveTime) ? ` · 등원:${f.arriveTime || "-"} · 하원:${f.leaveTime || "-"}` : "";
      return `[설정] 아동:${f.child || "○○"} · 연령:${f.age}${f.klass ? " · 반:" + f.klass : ""}${f.adaptBirth ? " · 생년월일:" + f.adaptBirth : ""} · ${dayLine}${timeLine}\n[적응 모습 메모] ${f.adaptMemo || "(메모 없음 — 예시로 작성)"}\n[요청] ${free || "위 내용으로 신입원아 적응일지를 작성해줘"}`;
    },
    label: () => "적응일지 작성"
};
