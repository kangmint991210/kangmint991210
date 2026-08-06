// 이 서비스가 만들어 주는 문서의 종류와, 각 문서가 요구하는 입력을 정의합니다.
// 화면·프롬프트·요금제가 모두 이 정의를 참조하므로, 문서를 추가하려면 여기부터 고치면 됩니다.

/** 문서 종류. 배열 순서 = 화면 메뉴 순서 (요금제와는 무관 — plans.js 가 따로 정합니다) */
export const MODES = [
  { key: "play", label: "놀이 활동", emoji: "🖍️" },
  { key: "daily", label: "보육일지", emoji: "📔" },
  { key: "obs", label: "관찰일지", emoji: "🔎" },
  { key: "note", label: "알림장", emoji: "💌" },
  { key: "adapt", label: "신입원아 적응일지", emoji: "🐣" },
  { key: "counsel", label: "학부모 상담일지", emoji: "🗣️" },
  { key: "life", label: "생활기록부", emoji: "📗" },
];

export const MODE_KEYS = MODES.map((m) => m.key);
export const DEFAULT_MODE = MODES[0].key;

/**
 * 새로고침 뒤 되살릴 문서 종류.
 * 저장소에는 옛 버전의 키나 손으로 고친 값이 들어 있을 수 있어, 아는 값일 때만 씁니다.
 */
export const restoreMode = (saved) => (MODE_KEYS.includes(saved) ? saved : DEFAULT_MODE);
export const modeOf = (key) => MODES.find((m) => m.key === key);
export const labelOf = (key) => modeOf(key)?.label || "문서";

/** 누리과정·표준보육과정 영역 (색은 결과 카드의 띠·태그에 씁니다) */
export const DOMAINS = [
  { key: "신체운동·건강", color: "#FF9AA2", emoji: "🤸" },
  { key: "의사소통", color: "#FFC074", emoji: "💬" },
  { key: "사회관계", color: "#8FCDF2", emoji: "🤝" },
  { key: "예술경험", color: "#C9A7E8", emoji: "🎨" },
  { key: "자연탐구", color: "#93D9B0", emoji: "🌱" },
];
export const DOMAIN_COLOR = Object.fromEntries(DOMAINS.map((d) => [d.key, d.color]));
export const domainEmoji = (key) => DOMAINS.find((d) => d.key === key)?.emoji || "•";

/** 입력 폼의 선택지 */
export const AGES = ["만 0세", "만 1세", "만 2세", "만 3세", "만 4세", "만 5세", "혼합연령"];
export const PLACES = ["실내", "실외", "교실 책상", "유희실"];
export const DURATIONS = ["10분", "20분", "30분", "40분+"];
export const COUNSEL_METHODS = ["방문", "전화", "화상", "기타"];

/** 놀이 활동 화면에서만 쓰는 빠른 시작 문구 */
export const STARTERS = {
  play: ["🌧️ 비 오는 날 실내 놀이", "✨ 준비물 없이 바로 하기", "💛 감정 표현 놀이", "🍂 가을 자연물 미술"],
};

/** 결과가 아직 없을 때 보여줄 안내 문구 */
export const EMPTY_COPY = {
  play: { title: "오늘은 어떤 놀이를 해볼까요?", desc: "연령·영역을 고르고 만들거나, 아래를 눌러 시작해요!" },
  daily: { title: "주간 보육일지를 만들어 드려요", desc: "주제와 이번 주 놀이를 적으면\n영역별 놀이·요일별 평가까지 정리해 드려요." },
  obs: { title: "영유아 관찰기록을 만들어 드려요", desc: "이번 기간 아이의 말·행동을 적으면\n발달 영역별로 정리해 드려요." },
  note: { title: "알림장을 만들어 드려요", desc: "오늘 있었던 일만 적으면\n학부모님께 보낼 따뜻한 글로 바꿔드려요." },
  adapt: { title: "신입원아 적응일지를 만들어 드려요", desc: "적응 시작일과 일차별 모습을 적으면\n원장님 제출용으로 정리해 드려요." },
  counsel: { title: "학부모 상담일지를 만들어 드려요", desc: "아이의 현재 모습을 적으면\n영역별 현행수준으로 정리해 드려요." },
  life: { title: "생활기록부를 만들어 드려요", desc: "연령과 아이의 특징만 적으면\n8개 항목을 상·중·하로 정리해 드려요." },
};

/**
 * 생활기록부의 항목과 순서. 연령과 상관없이 8개 고정입니다.
 * (프롬프트의 JSON · 결과 카드 · 내보내기가 모두 이 목록을 씁니다)
 */
export const LIFE_AREAS = [
  "수면", "배변", "식사", "신체운동", "사회관계", "의사소통", "자연탐구", "예술경험",
];

/** 생활기록부의 수준 — 키 · 화면 표시 · 결과 카드의 색 */
export const LIFE_LEVELS = [
  { key: "high", label: "상", color: "#2E9E86", tint: "#E5F7F0" },
  { key: "mid", label: "중", color: "#C97B2C", tint: "#FFF3E0" },
  { key: "low", label: "하", color: "#5B7FB0", tint: "#EAF2FB" },
];

/**
 * 생성 전에 반드시 채워야 하는 입력.
 * 비워 두면 AI 가 날짜·아이 정보를 지어내므로, 화면에서 버튼을 막고 이유를 알려 줍니다.
 */
export const REQUIRED_FIELDS = {
  play: [],
  daily: [["dailyWeek", "주차"], ["dailyMemo", "이번 주 놀이·활동 메모"]],
  obs: [["child", "아동(이니셜)"], ["obsPeriod", "관찰 월"], ["memo", "관찰 메모"]],
  note: [["child", "아동(이니셜)"], ["todayHi", "오늘 활동·하이라이트"]],
  adapt: [["child", "아동(이니셜)"], ["adaptStart", "적응 시작일"], ["adaptMemo", "적응 모습 메모"]],
  counsel: [["child", "원아명"], ["counselMemo", "상담 메모"]],
  life: [["age", "연령"], ["lifeMemo", "아이의 특징"]],
};

/** 아직 채워지지 않은 필수 입력의 "사람이 읽는 이름" 목록 */
export const missingFields = (mode, form) =>
  (REQUIRED_FIELDS[mode] || [])
    .filter(([key]) => !String(form?.[key] || "").trim())
    .map(([, label]) => label);

/** 입력 폼의 초기값 (문서 6종이 한 벌의 폼을 나눠 씁니다) */
export const createEmptyForm = () => ({
  age: "만 3세", domains: [], place: "실내", duration: "20분", theme: "", materials: "",
  child: "", klass: "", date: "", setting: "", memo: "",
  todayHi: "", mood: "", homeNote: "", month: "", planTheme: "",
  dailyMemo: "", dailyNotes: "", weather: "",
  dailyWeek: "", dailyTheme: "", dailyNext: "", dailySafety: "",
  adaptDay: "", adaptMemo: "",
  adaptStart: "", arriveTime: "", leaveTime: "", adaptBirth: "",
  counselMethod: "방문", counselMemo: "", guardian: "", teacher: "", counselBirth: "",
  gender: "여", birth: "", recorder: "", obsPeriod: "",
  lifeMemo: "", lifeDate: "",
});

/** 문서 종류별 빈 대화 목록 */
export const createEmptyThreads = () =>
  Object.fromEntries(MODE_KEYS.map((k) => [k, []]));
