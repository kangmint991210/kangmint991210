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
 * ⚠ live 는 "실제로 결제를 받고 있는가" 입니다. 2026-08 Paddle 연결과 함께 true 가 됐습니다.
 *    결제를 잠시 멈추게 되면 false 로 되돌리세요 — 환불 화면이 그 사실을 먼저 알려 줍니다.
 *    processor 는 실제로 쓰는 결제사만 적습니다. 쓰지 않는 곳을 적어 두면
 *    약관 자체가 분쟁거리가 됩니다.
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
  kakao: "https://open.kakao.com/o/pdzyaKHi",   // 카카오톡 오픈채팅
  instagram: "https://www.instagram.com/mintssaem",
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

/**
 * 사업자 정보 — 전자상거래법 제10조가 표시를 요구하는 항목들입니다.
 *
 * ⚠ 아직 받지 못한 값은 빈 문자열로 둡니다. 채운 항목만 화면에 나오고,
 *    빠진 항목은 "아직 채워야 할 것" 안내에 이름이 남습니다.
 *    지어낸 값을 미리 적어 두면 그 자체가 허위 표시가 됩니다.
 */
export const business = {
  name: "벨티보 belltivo",
  owner: "박수빈",
  registrationNo: "218-13-19736",
  address: "경기도 의정부시 평화로 195, 7층 718호(호원동)",
  mailOrderNo: "2025-의정부흥선-0680",  // 통신판매업 신고번호
};

/** 화면에 보여 줄 이름과 순서 (config 를 고치면 약관이 따라옵니다) */
export const BUSINESS_LABELS = [
  ["name", "상호"],
  ["owner", "대표자"],
  ["registrationNo", "사업자등록번호"],
  ["mailOrderNo", "통신판매업 신고번호"],
  ["address", "사업장 주소"],
];

// 법적 고지 시행일 — 약관/방침을 고칠 때 함께 올리세요.
// 네 문서(이용약관·개인정보처리방침·환불 정책·계정 삭제 안내)가 모두 이 값을 씁니다.
export const legalEffectiveDate = "2026년 8월 8일";
