// 이 서비스가 만들어 주는 문서의 종류와, 각 문서가 요구하는 입력을 정의합니다.
// 화면·프롬프트·요금제가 모두 이 정의를 참조하므로, 문서를 추가하려면 여기부터 고치면 됩니다.

/** 문서 종류. 배열 순서 = 화면 메뉴 순서 (요금제와는 무관 — plans.js 가 따로 정합니다) */
export const MODES = [
  // emoji 는 메뉴·보관함처럼 글자 사이에 섞이는 자리에,
  // tint 는 랜딩 타일의 바탕색 (순백보다 포근합니다),
  // color/color2 는 랜딩의 아이콘 마크 그라디언트에 씁니다 (features/landing/DocGlyphs.jsx).
  // 12개가 한눈에 구분되도록 색상환을 고루 나눠 씁니다.
  { key: "play", label: "놀이 활동", emoji: "🖍️", color: "#5FD8BE", color2: "#2A9E86", tint: "#E9FAF5" },
  { key: "daily", label: "보육일지", emoji: "📔", color: "#63D0C0", color2: "#1E8F94", tint: "#E6F9F6" },
  { key: "obs", label: "관찰일지", emoji: "🔎", color: "#7CC4F5", color2: "#3B7FD4", tint: "#EAF4FE" },
  { key: "note", label: "알림장", emoji: "💌", color: "#FFAE86", color2: "#F4694F", tint: "#FFF0E9" },
  { key: "adapt", label: "신입원아 적응일지", emoji: "🐣", color: "#F5C98E", color2: "#D79046", tint: "#FFF4E6" },
  { key: "counsel", label: "학부모 상담일지", emoji: "🗣️", color: "#FFCB73", color2: "#F09322", tint: "#FFF5E4" },
  { key: "life", label: "생활기록부", emoji: "📗", color: "#93E0AE", color2: "#3FA96C", tint: "#EAFAF0" },
  { key: "assess", label: "발달평가 총평", emoji: "📊", color: "#8FB6F5", color2: "#4759D6", tint: "#EDF2FE" },
  { key: "monthly", label: "월간 평가", emoji: "🗓️", color: "#6FD5E4", color2: "#2A9FC4", tint: "#E7F8FB" },
  { key: "safety", label: "안전교육일지", emoji: "🛟", color: "#FFC06B", color2: "#EF7A3D", tint: "#FFF3E4" },
  { key: "trip", label: "견학 계획안", emoji: "🚌", color: "#A8A6F5", color2: "#6C5CE0", tint: "#EFEEFE" },
  { key: "event", label: "행사 계획안", emoji: "🎪", color: "#F9A8C8", color2: "#E05A96", tint: "#FEEDF4" },
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
  assess: { title: "발달평가 총평을 만들어 드려요", desc: "영역별 관찰을 적으면\n표준보육과정·누리과정에 근거한 80줄 총평으로 정리해 드려요." },
  monthly: { title: "월간 평가를 만들어 드려요", desc: "이번 달 주제와 놀이 흐름을 적으면\n놀이 중심 월간 평가서로 정리해 드려요." },
  safety: { title: "안전교육일지를 만들어 드려요", desc: "주제와 활동만 적으면\n보육일지에 그대로 넣을 '안전교육 실행 및 평가'를 써 드려요." },
  trip: { title: "견학 계획안을 만들어 드려요", desc: "장소와 견학 내용을 적으면\n목표부터 사후 활동·평가까지 한 장으로 만들어 드려요." },
  event: { title: "행사 계획안을 만들어 드려요", desc: "행사 내용과 예산을 적으면\n진행 시나리오·역할 분담·안전 관리까지 짜 드려요." },
};

/** 어린이집에서 다루는 안전교육 주제 (직접 입력도 됩니다) */
export const SAFETY_TOPICS = [
  "교통안전", "실종·유괴 예방", "성폭력·아동학대 예방", "감염병 예방",
  "약물 오·남용 예방", "재난대비(화재·지진)", "시설·놀이 안전", "응급처치",
];

/** 견학 계획안의 '견학 활동' 단계 — 프롬프트·카드·내보내기가 함께 봅니다 */
export const TRIP_STEPS = [
  { key: "check", label: "견학 전 준비 사항 확인", count: 3 },
  { key: "move", label: "장소로 이동", count: 2 },
  { key: "onsite", label: "현장 체험", count: 5 },
  { key: "back", label: "복귀", count: 3 },
];

/** 행사 계획안의 항목과 순서 — 결과 표의 행이 됩니다 */
export const EVENT_ROWS = [
  ["name", "행사명"], ["date", "행사일시"], ["group", "연령 및 인원"], ["teachers", "교사 수"],
  ["place", "장소"], ["goals", "행사 목표"], ["participants", "참여 인원"], ["materials", "준비물"],
  ["budget", "소요비용"], ["prepare", "사전 준비(세부계획)"], ["preActivity", "사전 활동"],
  ["order", "진행순서(조 편성)"], ["scenario", "행사 내용(상세 시나리오)"],
  ["roles", "행사 활동 (교사 역할·시간·활동명·세부내용·준비물)"],
  ["safety", "안전 관리"], ["parents", "부모 안내 및 연계"], ["duty", "역할분담"],
  ["review", "활동 평가"], ["overall", "행사 전체 평가"], ["ideas", "추후 개선 및 확장 아이디어"],
];

/**
 * 생활기록부의 항목과 순서. 연령과 상관없이 8개 고정입니다.
 * (프롬프트의 JSON · 결과 카드 · 내보내기가 모두 이 목록을 씁니다)
 */
export const LIFE_AREAS = [
  "수면", "배변", "식사", "신체운동", "사회관계", "의사소통", "자연탐구", "예술경험",
];

/**
 * 발달평가 총평의 영역. 입력칸 · 프롬프트 · 결과 카드 · 내보내기가 모두 이 표를 봅니다.
 *
 * input 은 교사가 적을 때 쓰는 이름(신체활동), label 은 결과 문서에 쓰는 교육과정 영역명
 * (신체운동·건강)입니다. 둘이 달라서 한쪽만 고치면 어긋나므로 여기서 짝지어 둡니다.
 */
export const ASSESS_AREAS = [
  { key: "physical", form: "assessPhysical", input: "신체활동", label: "신체운동·건강", emoji: "🏃",
    hint: "걷기·뛰기·계단 오르기·공놀이·소근육 활동 등" },
  { key: "comm", form: "assessComm", input: "의사소통", label: "의사소통", emoji: "💬",
    hint: "단어·문장 사용, 교사·친구와 대화, 표현 등" },
  { key: "social", form: "assessSocial", input: "사회관계", label: "사회관계", emoji: "🤝",
    hint: "또래와 놀이, 교사와 애착, 감정 표현 등" },
  { key: "art", form: "assessArt", input: "예술경험", label: "예술경험", emoji: "🎨",
    hint: "음악, 미술, 역할놀이 등" },
  { key: "nature", form: "assessNature", input: "자연탐구", label: "자연탐구", emoji: "🌱",
    hint: "곤충 관찰, 물·모래놀이, 블록, 퍼즐 등" },
  { key: "habit", form: "assessHabit", input: "생활습관", label: "기본생활습관", emoji: "🍚",
    hint: "식사, 낮잠, 배변, 손 씻기, 정리정돈 등" },
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
  // 여섯 영역을 모두 받는 이유 — 비워 두면 그 영역의 관찰을 AI 가 통째로 지어냅니다.
  // 원장님·부모님께 가는 문서라 지어낸 관찰이 섞이면 안 됩니다.
  assess: [["age", "연령"], ...ASSESS_AREAS.map((a) => [a.form, a.input])],
  monthly: [
    ["monTheme", "보육 주제"], ["age", "연령"], ["monPlay", "중심 놀이"],
    ["monExpand", "자발적으로 확장된 놀이"], ["monSupport", "교사 지원 내용"],
    ["monParent", "부모면담 내용"], ["monNext", "다음 달 확장 놀이"],
  ],
  safety: [["age", "연령"], ["safetyTopic", "안전교육 주제"], ["safetySub", "소주제 및 활동내용"]],
  trip: [["tripPlace", "장소"], ["age", "연령"], ["tripCount", "아동 수"], ["tripContent", "견학 내용"]],
  event: [
    ["evName", "행사명"], ["evChildren", "연령 및 인원"], ["evTeachers", "교사 수"],
    ["evContent", "행사 내용"], ["evBudget", "예산"],
  ],
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
  assessPeriod: "",
  ...Object.fromEntries(ASSESS_AREAS.map((a) => [a.form, ""])),
  monTheme: "", monMonth: "", monPlay: "", monExpand: "", monSupport: "", monParent: "", monNext: "",
  safetyTopic: "교통안전", safetySub: "",
  tripPlace: "", tripCount: "", tripContent: "", tripTransport: "", tripDate: "",
  evName: "", evChildren: "", evTeachers: "", evContent: "", evBudget: "", evParents: "참여", evDate: "",
});

/** 문서 종류별 빈 대화 목록 */
export const createEmptyThreads = () =>
  Object.fromEntries(MODE_KEYS.map((k) => [k, []]));
