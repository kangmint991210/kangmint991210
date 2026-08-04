// 놀이 활동 — 현장에서 바로 쓸 활동안
//
// system  : 모델에게 주는 규칙. 문서 양식·문체·분량 규정이 들어갑니다.
// buildUserMessage(f, free) : 입력 폼(f)과 사용자가 이어 말한 요청(free)을 한 덩어리 지시문으로.
// tokens  : 출력 상한. 분량 규정이 큰 문서일수록 넉넉히 잡아야 JSON 이 잘리지 않습니다.
// eta     : 예상 소요(초). 화면의 대기 안내에 씁니다.

export default {

    btn: "놀이 추천받기",
    eta: 10,
    free: '"더 쉽게", "조용한 버전으로"처럼 이어 말해요',
    system: `당신은 한국 어린이집·유치원의 보육 전문가입니다. 현직 보육교사가 현장에서 바로 쓸 놀이·활동 아이디어를 제안합니다.
- 표준보육과정(영아)·2019 개정 누리과정(유아) 기반, 아이 주도·놀이 중심. 연령 발달과 안전 최우선.
- 기본 활동 1개, 요청 시 최대 2개. 진행방법 4~6단계, 따뜻한 말투.
반드시 아래 JSON "하나만" 출력(설명·마크다운·코드펜스 금지):
{"reply":"1~2문장 다정한 안내","activities":[{"title":"","age":"","place":"","duration":"","domains":["신체운동·건강|의사소통|사회관계|예술경험|자연탐구"],"goal":"","materials":[""],"steps":[""],"extension":"","safety":""}]}`,
    buildUserMessage: (f, free) =>
      `[설정] 연령:${f.age} · 장소:${f.place} · 시간:${f.duration}${f.domains.length ? " · 영역:" + f.domains.join(",") : ""}${f.theme ? " · 주제:" + f.theme : ""}${f.materials ? " · 준비물:" + f.materials : ""}\n[요청] ${free || "활동 아이디어 추천해줘"}`,
    label: () => "활동 아이디어 추천"
};
