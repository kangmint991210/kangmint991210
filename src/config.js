// 서비스 전역 설정 — 코드 곳곳에 흩어지기 쉬운 값을 한곳에 모읍니다.
// 브랜드 문구·연락처·모델명처럼 "바뀔 수 있는 값"은 반드시 여기를 거쳐 쓰세요.

export const brand = {
  name: "민트쌤",
  tagline: "놀이부터 서류까지, 같이 해요 🌿",
  description: "보육교사를 위한 AI 도우미",
};

export const contact = {
  // 약관·개인정보처리방침·환불·계정삭제 안내가 모두 이 값을 씁니다
  email: "totomi1999@naver.com",
  privacyOfficer: "박수빈",
};

/**
 * 환불 정책의 숫자와 결제 정보.
 *
 * ⚠ live 는 "실제로 결제를 받고 있는가" 입니다. 아직 베타라 false 이고,
 *    환불 화면에 그 사실을 먼저 알려 줍니다. 정식 결제를 붙일 때
 *    processor 를 적고 live 를 true 로 바꾸세요.
 *    쓰지 않는 결제사를 미리 적어 두면 약관 자체가 분쟁거리가 됩니다.
 */
export const refund = {
  live: true,
  processor: "Paddle.com Market Limited (Merchant of Record)",
  fullDays: 3,        // 이 기간 안에 미사용이면 전액 환불
  partialDays: 14,    // 이 기간까지는 정당한 사유가 있을 때 환불
  cycle: "월 자동 갱신",
};

/**
 * 소셜 채널 주소. 모든 화면 하단에 아이콘으로 나갑니다.
 *
 * ⚠ 비워 두면 아이콘은 보이되 눌러도 아무 일도 일어나지 않고 "준비 중" 으로 표시됩니다.
 *    계정을 만드셨으면 아래에 주소를 채워 주세요. 채우는 즉시 링크가 열립니다.
 *    (없는 주소를 미리 적어 두면 방문자가 오류 페이지를 보게 되므로 비워 둡니다)
 */
export const social = {
  kakao: "",       // 카카오톡 채널 (예: https://pf.kakao.com/_xxxxxxx)
  instagram: "",   // 예: https://instagram.com/계정명
  facebook: "",    // 예: https://facebook.com/페이지명
  x: "",           // 예: https://x.com/계정명
};

/**
 * 결제(Paddle).
 *
 * ⚠ 여기 값은 브라우저에 그대로 나갑니다. 공개돼도 되는 것만 둡니다.
 *    · token    — 결제창 전용 공개 토큰 (결제를 "요청"만 할 수 있음)
 *    · 가격 ID  — 상품 식별자일 뿐, 이걸로 돈을 움직일 수 없음
 *    API 키와 웹훅 서명 키는 절대 여기 두지 마세요. 서버 전용입니다(Vercel 환경변수).
 *
 * ⚠ 비어 있으면 결제 버튼이 "준비 중"으로 바뀝니다 — 눌러도 아무 일이 없는 것보다 낫습니다.
 */
export const paddle = {
  token: import.meta.env?.VITE_PADDLE_TOKEN || "",
  prices: {
    basic: import.meta.env?.VITE_PADDLE_PRICE_BASIC || "",
    pro: import.meta.env?.VITE_PADDLE_PRICE_PRO || "",
  },
};

export const ai = {
  model: "gemini-3.1-flash-lite",
  endpoint: "/api/gemini",
  // 문서별로 CFG.tokens 가 없을 때 쓰는 기본 상한
  defaultMaxTokens: 1400,
  // 문서별로 CFG.eta 가 없을 때 쓰는 예상 소요(초)
  defaultEta: 15,
  // 사고(thinking) 기본값. 0 이면 끔 — 대부분의 문서는 이 편이 빠르고 저렴합니다.
  defaultThinkingBudget: 0,
};

export const trial = {
  // 가입 없이 만들어 볼 수 있는 문서 수
  limit: 1,
};

// 법적 고지 시행일 — 약관/방침을 고칠 때 함께 올리세요
export const legalEffectiveDate = "2026년 3월 1일";
