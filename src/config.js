// 서비스 전역 설정 — 코드 곳곳에 흩어지기 쉬운 값을 한곳에 모읍니다.
// 브랜드 문구·연락처·모델명처럼 "바뀔 수 있는 값"은 반드시 여기를 거쳐 쓰세요.

export const brand = {
  name: "민트쌤",
  tagline: "놀이부터 서류까지, 같이 해요 🌿",
  description: "보육교사를 위한 AI 도우미",
};

export const contact = {
  // 정식 공개 전 실제 운영 주소로 교체하세요 (약관·개인정보처리방침에서도 이 값을 씁니다)
  email: "help@mintssaem.kr",
};

export const ai = {
  model: "gemini-3.1-flash-lite",
  endpoint: "/api/gemini",
  // 문서별로 CFG.tokens 가 없을 때 쓰는 기본 상한
  defaultMaxTokens: 1400,
  // 문서별로 CFG.eta 가 없을 때 쓰는 예상 소요(초)
  defaultEta: 15,
};

export const trial = {
  // 가입 없이 만들어 볼 수 있는 문서 수
  limit: 1,
};

// 법적 고지 시행일 — 약관/방침을 고칠 때 함께 올리세요
export const legalEffectiveDate = "2026년 3월 1일";
