import React, { useState, useRef, useEffect } from "react";
import {
  Send, Loader2, Target, Package, ListOrdered, ShieldCheck,
  Clock, MapPin, RotateCcw, Copy, Check, CalendarDays, Eye, Heart,
  ChevronDown, LogOut,
} from "lucide-react";
import { supabase, supabaseReady } from "./src/supabaseClient.js";

const EMPTY_THREADS = { play: [], daily: [], obs: [], note: [], adapt: [], counsel: [] };
const PENDING_PLAN_KEY = "mint_pending_plan";
const PLAN_RANK = { free: 0, pro: 1, max: 2 }; // 요금제 등급(높을수록 상위)
const GEMINI_MODEL = "gemini-3.1-flash-lite"; // AI 문서 생성 모델
// Supabase user → 앱에서 쓰는 형태로 변환
const mapUser = (u) => ({
  id: u.id,
  email: u.email,
  name: u.user_metadata?.name || u.user_metadata?.full_name || (u.email ? u.email.split("@")[0] : "선생님"),
});

const DOMAINS = [
  { key: "신체운동·건강", color: "#FF9AA2", emoji: "🤸" },
  { key: "의사소통", color: "#FFC074", emoji: "💬" },
  { key: "사회관계", color: "#8FCDF2", emoji: "🤝" },
  { key: "예술경험", color: "#C9A7E8", emoji: "🎨" },
  { key: "자연탐구", color: "#93D9B0", emoji: "🌱" },
];
const DOMAIN_COLOR = Object.fromEntries(DOMAINS.map((d) => [d.key, d.color]));
const dEmoji = (k) => DOMAINS.find((x) => x.key === k)?.emoji || "•";
const arr = (x) => (Array.isArray(x) ? x : x == null || x === "" ? [] : [x]);

// 주차 선택값("2024-W27") → 월~토 날짜와 "○월 ○주" 라벨
function weekInfo(weekStr) {
  if (!weekStr || !/^\d{4}-W\d{2}$/.test(weekStr)) return null;
  const [y, wRaw] = weekStr.split("-W");
  const year = +y, week = +wRaw;
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const day = simple.getUTCDay();
  const monday = new Date(simple);
  if (day <= 4) monday.setUTCDate(simple.getUTCDate() - day + 1);
  else monday.setUTCDate(simple.getUTCDate() + 8 - day);
  const dows = ["일", "월", "화", "수", "목", "금", "토"];
  const days = [];
  for (let i = 0; i < 6; i++) {
    const dt = new Date(monday); dt.setUTCDate(monday.getUTCDate() + i);
    days.push(`${dt.getUTCMonth() + 1}/${dt.getUTCDate()}(${dows[dt.getUTCDay()]})`);
  }
  const mm = monday.getUTCMonth() + 1;
  const weekOfMonth = Math.ceil(monday.getUTCDate() / 7);
  return { label: `${year}년 ${mm}월 ${weekOfMonth}주`, days };
}

// 관찰 월("2022-01") → "2022년 1월 1일 ~ 1월 31일"
function monthRange(mStr) {
  if (!mStr || !/^\d{4}-\d{2}$/.test(mStr)) return null;
  const [y, m] = mStr.split("-").map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${y}년 ${m}월 1일 ~ ${m}월 ${last}일`;
}

// 적응 시작일 → 연속 평일 N개 ["3/4(월)", ...]
function adaptDays(startStr, n) {
  if (!startStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr)) return null;
  const [y, m, d] = startStr.split("-").map(Number);
  const dows = ["일", "월", "화", "수", "목", "금", "토"];
  const dates = [];
  const dt = new Date(Date.UTC(y, m - 1, d));
  while (dates.length < n) {
    const dow = dt.getUTCDay();
    if (dow !== 0 && dow !== 6) dates.push(`${dt.getUTCMonth() + 1}/${dt.getUTCDate()}(${dows[dow]})`);
    dt.setUTCDate(dt.getUTCDate() + 1);
  }
  return dates;
}

const AGES = ["만 0세", "만 1세", "만 2세", "만 3세", "만 4세", "만 5세", "혼합연령"];
const PLACES = ["실내", "실외", "교실 책상", "유희실"];
const DURATIONS = ["10분", "20분", "30분", "40분+"];
const METHODS = ["방문", "전화", "화상", "기타"];

const MODES = [
  { key: "play", label: "놀이 활동", emoji: "🖍️" },
  { key: "daily", label: "보육일지", emoji: "📔" },
  { key: "obs", label: "관찰일지", emoji: "🔎" },
  { key: "note", label: "알림장", emoji: "💌" },
  { key: "adapt", label: "신입원아 적응일지", emoji: "🐣" },
  { key: "counsel", label: "학부모 상담일지", emoji: "🗣️" },
];

const STARTERS = {
  play: ["🌧️ 비 오는 날 실내 놀이", "✨ 준비물 없이 바로 하기", "💛 감정 표현 놀이", "🍂 가을 자연물 미술"],
};

// 플랜별로 열리는 문서 종류 수 (MODES 앞에서부터)
const PLAN_DOCS = { free: 1, pro: 3, max: 6 };
const PLANS = [
  {
    key: "free", name: "무료", price: "₩0", period: "",
    tagline: "가볍게 시작해요",
    features: ["문서 1종 이용 (놀이 활동)", "생성 무제한", "복사해서 바로 사용"],
    cta: "무료로 시작",
  },
  {
    key: "pro", name: "프로", price: "₩49,900", period: "/년", highlight: true,
    tagline: "자주 쓰는 선생님께",
    features: ["문서 3종 이용", "생성 무제한", "우선 처리 · 새 기능 우선 제공"],
    cta: "프로 구독하기",
  },
  {
    key: "max", name: "맥스", price: "₩79,900", period: "/년",
    tagline: "모든 서류를 한 번에",
    features: ["문서 6종 전체 이용", "생성 무제한", "우선 처리 · 새 기능 우선 제공", "문서 보관함 (예정)"],
    cta: "맥스 구독하기",
  },
];

// 마스코트 (민트 별)
function Mascot({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <ellipse cx="50" cy="92" rx="26" ry="5" fill="#000" opacity="0.06" />
      <path d="M50 8 L58 30 L82 30 L63 45 L70 70 L50 55 L30 70 L37 45 L18 30 L42 30 Z"
        fill="#7FD8C4" stroke="#4FBFA3" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="42" cy="44" r="3.4" fill="#2E4A42" />
      <circle cx="58" cy="44" r="3.4" fill="#2E4A42" />
      <circle cx="43.2" cy="42.8" r="1.1" fill="#fff" />
      <circle cx="59.2" cy="42.8" r="1.1" fill="#fff" />
      <circle cx="36" cy="50" r="3.6" fill="#FF9AA2" opacity="0.65" />
      <circle cx="64" cy="50" r="3.6" fill="#FF9AA2" opacity="0.65" />
      <path d="M45 51 Q50 56 55 51" stroke="#2E4A42" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// 모드별 설정
const CFG = {
  play: {
    btn: "놀이 추천받기",
    free: '"더 쉽게", "조용한 버전으로"처럼 이어 말해요',
    system: `당신은 한국 어린이집·유치원의 보육 전문가입니다. 현직 보육교사가 현장에서 바로 쓸 놀이·활동 아이디어를 제안합니다.
- 표준보육과정(영아)·2019 개정 누리과정(유아) 기반, 아이 주도·놀이 중심. 연령 발달과 안전 최우선.
- 기본 활동 1개, 요청 시 최대 2개. 진행방법 4~6단계, 따뜻한 말투.
반드시 아래 JSON "하나만" 출력(설명·마크다운·코드펜스 금지):
{"reply":"1~2문장 다정한 안내","activities":[{"title":"","age":"","place":"","duration":"","domains":["신체운동·건강|의사소통|사회관계|예술경험|자연탐구"],"goal":"","materials":[""],"steps":[""],"extension":"","safety":""}]}`,
    user: (f, free) =>
      `[설정] 연령:${f.age} · 장소:${f.place} · 시간:${f.duration}${f.domains.length ? " · 영역:" + f.domains.join(",") : ""}${f.theme ? " · 주제:" + f.theme : ""}${f.materials ? " · 준비물:" + f.materials : ""}\n[요청] ${free || "활동 아이디어 추천해줘"}`,
    label: () => "활동 아이디어 추천",
  },
  daily: {
    btn: "주간 보육일지 만들기",
    free: '"요일별 평가 자세히", "일과 내용 보강"처럼 다듬어요',
    tokens: 3200,
    system: `당신은 한국 어린이집 보육 전문가입니다. 교사의 주간 메모를 바탕으로, 실제 어린이집 양식에 맞는 '주간 보육일지'를 작성합니다.
- 대상 연령(영아/유아) 발달과 놀이중심·아이 주도 관점. 정중한 존댓말. 각 항목은 간결하게(대부분 1문장).
- schedule(하루 일과)에는 아래 시간대 행을 순서대로 모두 포함하고, 각 content는 해당 연령 발달에 맞는 1문장으로 작성:
  등원 및 통합보육(07:30~09:00), 오전간식 및 배변활동(09:00~09:40), 기본생활습관(""), 정리정돈 및 배변활동(10:40~10:50), 배변활동 및 손 씻기(11:30~11:40), 점심식사·이 닦기(11:40~12:30), 낮잠준비 및 낮잠(12:30~14:30), 오후간식 및 배변활동(14:30~15:00), 오후 실내놀이 및 하원(15:00~16:00), 연장반 보육 및 귀가(16:00~19:30).
- areas(오전 실내놀이 09:40~10:40)는 영역별(신체 / 언어 / 감각·탐색 / 안전) 놀이. outdoor는 실외놀이(10:50~11:30).
- days(실행 놀이 평가 및 지원계획)는 메모에 있는 요일만, 관찰 장면 + 교사 지원을 2~3문장으로.
- week은 설정 [주간]의 라벨을 그대로 사용하고, days의 날짜·요일도 설정 [주간]에 제시된 날짜만 사용합니다(임의로 계산하지 않음).
반드시 아래 JSON "하나만" 출력(설명·마크다운·코드펜스 금지):
{"reply":"1문장 안내","daily":{"week":"","klass":"","age":"","theme":"","nextTheme":"","schedule":[{"time":"07:30~09:00","name":"등원 및 통합보육","content":""}],"areas":[{"area":"신체","content":""},{"area":"언어","content":""},{"area":"감각·탐색","content":""},{"area":"안전","content":""}],"outdoor":"","days":[{"day":"7/8(월)","record":""}],"weekEval":"주간 보육 평가","safety":"안전교육(감염병예방·비상대응훈련)","special":"반 운영 특이사항"}}`,
    user: (f, free) => {
      const wi = weekInfo(f.dailyWeek);
      const weekLine = wi ? `주간:${wi.label} (${wi.days.join(", ")})` : "주간:미기재";
      return `[설정] ${weekLine} · 반:${f.klass || "우리반"} · 연령:${f.age} · 주제:${f.dailyTheme || "미정"}${f.dailyNext ? " · 다음주제:" + f.dailyNext : ""}${f.dailySafety ? " · 안전교육:" + f.dailySafety : ""}\n[이번 주 놀이·활동·있었던 일 메모] ${f.dailyMemo || "(메모 없음 — 주제에 맞춰 예시로 작성)"}\n[요청] ${free || "위 내용으로 주간 보육일지를 작성해줘"}`;
    },
    label: () => "주간 보육일지 작성",
  },
  obs: {
    btn: "관찰일지 만들기",
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
    user: (f, free) => {
      const mr = monthRange(f.obsPeriod);
      const periodLine = mr ? `관찰기간:${mr}` : (f.obsPeriod ? `관찰기간:${f.obsPeriod}` : "관찰기간:미기재");
      return `[설정] 아동:${f.child || "○○"} · 성별:${f.gender || "미기재"} · 생년월일/월령:${f.birth || "미기재"} · ${periodLine} · 기록자:${f.recorder || "미기재"} · 연령:${f.age}\n[관찰 메모] ${f.memo || "(메모 없음 — 연령·영역에 맞춰 예시로 작성)"}\n[요청] ${free || "위 메모로 관찰기록을 작성해줘"}`;
    },
    label: () => "관찰일지 작성",
  },
  note: {
    btn: "알림장 만들기",
    free: '"더 짧게", "더 따뜻하게"처럼 다듬어요',
    system: `당신은 다정한 보육교사입니다. 학부모에게 보낼 알림장(가정통신)을 작성합니다.
- 따뜻하고 친근하되 정중한 존댓말. 아이를 애정 있게, 오늘 일을 구체적·긍정적으로(4~7문장).
- 필요 시 가정 연계 당부를 부드럽게.
반드시 아래 JSON "하나만" 출력(설명·마크다운·코드펜스 금지):
{"reply":"1문장 안내","note":{"message":"학부모에게 그대로 보낼 알림장 본문","homeTip":"가정 연계 한 줄(없으면 빈 문자열)"}}`,
    user: (f, free) =>
      `[설정] 아동:${f.child || "○○"} · 연령:${f.age}\n[오늘 활동/하이라이트] ${f.todayHi || "오늘 하루 일과"}${f.mood ? "\n[아이 모습/기분] " + f.mood : ""}${f.homeNote ? "\n[가정 당부] " + f.homeNote : ""}\n[요청] ${free || "위 내용으로 알림장을 작성해줘"}`,
    label: () => "알림장 작성",
  },
  adapt: {
    btn: "적응일지 만들기",
    free: '"2일차 자세히", "종합 의견 보강"처럼 다듬어요',
    tokens: 2200,
    system: `당신은 한국 영유아 보육 전문가입니다. 교사의 메모를 바탕으로 실제 어린이집 양식의 '신입원아 적응일지'를 작성합니다.
- 적응 일차(1일차, 2일차 …)별로 그날의 적응 모습을 관찰내용(record)으로 서술합니다. 등·하원 및 분리, 놀이·활동 참여, 기본생활(식사·수면·배변), 또래·교사 관계를 자연스럽게 녹여 3~4문장.
- 각 일차에 날짜(date), 등원(arrive)·하원/귀가(leave) 시간, 적응정도(level: 양호/보통/미흡), 건강·투약(health, 없으면 "-"), 비고(note, 예: 시간연장, 없으면 빈 문자열)를 포함.
- 날짜(date)는 설정 [적응일차]에 제시된 날짜를 순서대로 사용(임의 계산 금지). 등·하원 시간은 설정값이 있으면 사용. 메모에 나타난 일차만 작성.
- 마지막에 종합 의견 및 적응 계획(summary). 따뜻하되 정중한 존댓말.
반드시 아래 JSON "하나만" 출력(설명·마크다운·코드펜스 금지):
{"reply":"1문장 안내","adapt":{"child":"","age":"","klass":"","birth":"","period":"적응기간","days":[{"day":"1일차","date":"","arrive":"","leave":"","level":"양호","health":"-","note":"","record":""}],"summary":"종합 의견 및 적응 계획"}}`,
    user: (f, free) => {
      const ds = adaptDays(f.adaptStart, 5);
      const dayLine = ds ? `적응일차:${ds.join(", ")}` : "적응일차:미기재";
      const timeLine = (f.arriveTime || f.leaveTime) ? ` · 등원:${f.arriveTime || "-"} · 하원:${f.leaveTime || "-"}` : "";
      return `[설정] 아동:${f.child || "○○"} · 연령:${f.age}${f.klass ? " · 반:" + f.klass : ""}${f.adaptBirth ? " · 생년월일:" + f.adaptBirth : ""} · ${dayLine}${timeLine}\n[적응 모습 메모] ${f.adaptMemo || "(메모 없음 — 예시로 작성)"}\n[요청] ${free || "위 내용으로 신입원아 적응일지를 작성해줘"}`;
    },
    label: () => "적응일지 작성",
  },
  counsel: {
    btn: "상담일지 만들기",
    free: '"자연탐구 영역 추가", "종합의견 보강"처럼 다듬어요',
    tokens: 2400,
    system: `당신은 다정하고 전문적인 보육교사입니다. 학기 학부모 상담을 위해 아동의 현행수준을 발달 영역별로 정리한 '학부모 상담일지'를 작성합니다.
- 발달 영역(기본생활/신체운동·건강/의사소통/사회관계/예술경험/자연탐구)별로 아이의 현행수준을 관찰에 근거해 2~4문장으로 서술(content). 메모에 나타난 영역 위주로, 부족하면 연령 발달에 맞춰 자연스럽게.
- parentNote(부모 의견): 학부모가 상담하고 싶어 하는 내용·질문이 메모에 있으면 정리(없으면 빈 문자열).
- summary(면담내용 및 종합의견): 상담 전체를 아우르는 종합 의견.
- 학부모에게 전하는 따뜻하고 정중한 존댓말. 아이를 긍정적으로 묘사하되 사실 기반.
반드시 아래 JSON "하나만" 출력(설명·마크다운·코드펜스 금지):
{"reply":"1문장 안내","counsel":{"child":"","klass":"","birth":"","guardian":"","teacher":"","date":"","method":"","domains":[{"area":"기본생활","content":""},{"area":"신체운동·건강","content":""},{"area":"의사소통","content":""},{"area":"사회관계","content":""},{"area":"예술경험","content":""},{"area":"자연탐구","content":""}],"parentNote":"","summary":""}}`,
    user: (f, free) =>
      `[설정] 원아:${f.child || "○○"} · 반:${f.klass || ""} · 생년월일:${f.counselBirth || "미기재"} · 연령:${f.age} · 보호자:${f.guardian || "미기재"} · 면담교사:${f.teacher || "미기재"} · 면담일:${f.date || "미기재"} · 면담형태:${f.counselMethod || "방문"}\n[상담 메모] ${f.counselMemo || "(메모 없음 — 연령·영역에 맞춰 예시로 작성)"}\n[요청] ${free || "위 내용으로 학부모 상담일지를 작성해줘"}`,
    label: () => "상담일지 작성",
  },
};

export default function MintSsaem() {
  const [mode, setMode] = useState("play");
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState("landing");   // landing | auth | app
  const [plan, setPlan] = useState("free");        // free | pro | max
  const [showPricing, setShowPricing] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // login | signup
  const [pendingPlan, setPendingPlan] = useState("free"); // 로그인 후 적용할 플랜
  const [user, setUser] = useState(null);            // 로그인한 사용자
  const [form, setForm] = useState({
    age: "만 3세", domains: [], place: "실내", duration: "20분", theme: "", materials: "",
    child: "", klass: "", date: "", setting: "", memo: "",
    todayHi: "", mood: "", homeNote: "", month: "", planTheme: "",
    dailyMemo: "", dailyNotes: "", weather: "",
    dailyWeek: "", dailyTheme: "", dailyNext: "", dailySafety: "",
    adaptDay: "", adaptMemo: "",
    adaptStart: "", arriveTime: "", leaveTime: "", adaptBirth: "",
    counselMethod: "방문", counselMemo: "", guardian: "", teacher: "", counselBirth: "",
    gender: "여", birth: "", recorder: "", obsPeriod: "",
  });
  const setF = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const toggleDomain = (k) =>
    setForm((f) => ({ ...f, domains: f.domains.includes(k) ? f.domains.filter((x) => x !== k) : [...f.domains, k] }));

  const [threads, setThreads] = useState({ play: [], daily: [], obs: [], note: [], adapt: [], counsel: [] });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scroller = useRef(null);
  const messages = threads[mode];
  const cur = MODES.find((m) => m.key === mode);
  const allowedCount = PLAN_DOCS[plan] || 1;
  const isLocked = (key) => MODES.findIndex((m) => m.key === key) >= allowedCount;

  useEffect(() => {
    // 결과 영역이 페이지 흐름으로 늘어나므로, 새 메시지를 페이지 스크롤로 보이게 함
    scroller.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages, loading]);

  // 저장된 문서를 DB에서 불러와 메뉴별 대화로 복원
  async function loadDocs(userId) {
    if (!supabase) return;
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true });
    if (error || !data) return;
    const next = { play: [], daily: [], obs: [], note: [], adapt: [], counsel: [] };
    for (const d of data) {
      if (!next[d.kind]) continue;
      if (d.user_text) next[d.kind].push({ role: "user", text: d.user_text });
      next[d.kind].push({ role: "bot", kind: d.kind, text: d.payload?.reply || "완성했어요!", payload: d.payload });
    }
    setThreads(next);
  }

  // Supabase 세션 감지 — 로그인/OAuth 복귀 시 앱으로 진입
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(mapUser(session.user));
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          loadDocs(session.user.id);
          loadProfile(session.user);   // 요금제/마지막 접속 동기화 + 추적
        }
        if (event === "SIGNED_IN") setView("app");
      } else {
        setUser(null);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 회원 프로필(요금제)을 서버에서 읽고, 마지막 접속 시각을 기록해 추적
  async function loadProfile(sessionUser) {
    if (!supabase || !sessionUser) return;
    // 랜딩에서 고른 대기 플랜(가입 직후 적용용)
    let pend = "free";
    try { pend = localStorage.getItem(PENDING_PLAN_KEY) || "free"; } catch {}
    try { localStorage.removeItem(PENDING_PLAN_KEY); } catch {}

    const { data } = await supabase
      .from("profiles").select("plan, name").eq("id", sessionUser.id).maybeSingle();
    const serverPlan = data?.plan || "free";
    // 서버 플랜과 대기 플랜 중 상위 등급을 적용
    const effective = (PLAN_RANK[pend] || 0) > (PLAN_RANK[serverPlan] || 0) ? pend : serverPlan;
    setPlan(effective);

    // 프로필 갱신(마지막 접속 + 확정 플랜). 트리거가 못 만든 경우도 upsert 로 보강.
    try {
      await supabase.from("profiles").upsert({
        id: sessionUser.id,
        email: sessionUser.email,
        name: mapUser(sessionUser).name,
        plan: effective,
        last_seen_at: new Date().toISOString(),
      }, { onConflict: "id" });
    } catch { /* 프로필 동기화 실패는 조용히 무시 */ }
  }

  // 요금제 변경을 서버 프로필에 저장(추적)
  async function savePlan(nextPlan) {
    setPlan(nextPlan);
    if (!supabase || !user) return;
    try {
      await supabase.from("profiles").upsert({
        id: user.id, plan: nextPlan, last_seen_at: new Date().toISOString(),
      }, { onConflict: "id" });
    } catch { /* 무시 */ }
  }

  // 생성된 문서를 DB에 저장
  async function saveDocument(kind, userText, formSnapshot, payload) {
    if (!supabase || !user) return;
    try {
      await supabase.from("documents").insert({
        user_id: user.id, kind, user_text: userText, form: formSnapshot, payload,
      });
    } catch { /* 저장 실패는 조용히 무시 (화면 흐름 유지) */ }
  }

  async function logout() {
    try { await supabase?.auth.signOut(); } catch {}
    setUser(null);
    setThreads(EMPTY_THREADS);
    setView("landing");
  }

  async function send(rawText) {
    if (loading) return;
    if (isLocked(mode)) { setShowPaywall(true); return; }
    const cfg = CFG[mode];
    const free = (rawText ?? input).trim();
    const display = free || cfg.label();
    const next = [...threads[mode], { role: "user", text: display }];
    setThreads((t) => ({ ...t, [mode]: next }));
    setInput("");
    setLoading(true);

    // Gemini 대화 형식: role 은 "user" / "model", 내용은 parts[].text
    const history = next.map((m) => {
      if (m.role === "user") return { role: "user", text: m.text };
      return { role: "model", text: JSON.stringify(m.payload || {}).slice(0, 900) };
    });
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].role === "user") { history[i] = { role: "user", text: cfg.user(form, free) }; break; }
    }
    const contents = history.map((m) => ({ role: m.role, parts: [{ text: m.text }] }));

    try {
      // 콜론(:generateContent)이 URL 에 있으면 Vercel 라우팅이 실패하므로,
      // 경로는 /api/gemini 로 고정하고 모델은 body 로 전달 → 함수가 서버에서 조립
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          systemInstruction: { parts: [{ text: cfg.system }] },
          contents,
          generationConfig: {
            maxOutputTokens: cfg.tokens || 1400,
            responseMimeType: "application/json", // JSON 형식으로 강제 → 파싱 안정화
            thinkingConfig: { thinkingBudget: 0 }, // 사고(thinking) 비활성화(속도·토큰 절약)
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error?.message || "api error");
      const text = (data.candidates?.[0]?.content?.parts || []).map((b) => b.text || "").join("").trim();
      const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      let p = null;
      try { p = JSON.parse(clean); } catch { const mm = clean.match(/\{[\s\S]*\}/); if (mm) p = JSON.parse(mm[0]); }
      const bot = p
        ? { role: "bot", kind: mode, text: p.reply || "완성했어요!", payload: p }
        : { role: "bot", kind: mode, text: clean || "잠시 후 다시 시도해 주세요." };
      setThreads((t) => ({ ...t, [mode]: [...t[mode], bot] }));
      if (p) saveDocument(mode, display, form, p); // 생성 성공 시 DB 저장
    } catch {
      setThreads((t) => ({ ...t, [mode]: [...t[mode], { role: "bot", kind: mode, text: "연결에 문제가 생겼어요. 잠시 후 다시 보내주세요. 🥲" }] }));
    } finally {
      setLoading(false);
    }
  }

  const reset = () => setThreads((t) => ({ ...t, [mode]: [] }));
  const choosePlan = (key) => { savePlan(key); setShowPricing(false); setShowPaywall(false); setView("app"); };
  // 랜딩의 시작/요금제 버튼 → 로그인 페이지로. 선택한 플랜은 로그인 후 적용.
  // 이미 로그인돼 있으면 바로 앱으로.
  const goAuth = (key = "free", m = "login") => {
    try { localStorage.setItem(PENDING_PLAN_KEY, key); } catch {}
    setPendingPlan(key); setShowPricing(false); setShowPaywall(false);
    if (user) { savePlan(key); setView("app"); return; }
    setAuthMode(m); setView("auth");
  };

  if (view === "landing") {
    return (
      <>
        <Landing onStart={() => goAuth("free")} onOpenPricing={() => setShowPricing(true)} onChoose={(key) => goAuth(key)} />
        {showPricing && <PricingModal plan={plan} onChoose={(key) => goAuth(key)} onClose={() => setShowPricing(false)} />}
      </>
    );
  }

  if (view === "auth") {
    return (
      <AuthPage
        mode={authMode}
        setMode={setAuthMode}
        onHome={() => setView("landing")}
      />
    );
  }

  return (
    <>
    <div style={styles.wrap}>
      <style>{css}</style>

      <header style={styles.header}>
        <button style={styles.brandBtn} onClick={() => setView("landing")} title="홈으로 이동">
          <span style={styles.logoMark}><Mascot size={38} /></span>
          <div style={{ textAlign: "left" }}>
            <div style={styles.title}>민트쌤</div>
            <div style={styles.subtitle}>놀이부터 서류까지, 같이 해요 🌿</div>
          </div>
        </button>
        <div style={styles.headRight}>
          {plan === "max" ? (
            <span style={styles.planPro}>✨ 맥스</span>
          ) : (
            <button style={styles.planFree} onClick={() => setShowPricing(true)}>
              {plan === "pro" ? "프로" : "무료"} · 업그레이드
            </button>
          )}
          {messages.length > 0 && (
            <button style={styles.resetBtn} onClick={reset} title="이 메뉴 새로 시작">
              <RotateCcw size={14} /> 새로
            </button>
          )}
          {user && (
            <button style={styles.resetBtn} onClick={logout} title="로그아웃">
              <LogOut size={14} /> 로그아웃
            </button>
          )}
        </div>
      </header>

      {/* 모드 드롭다운 */}
      <div style={styles.modeBar}>
        {menuOpen && <button style={styles.backdrop} onClick={() => setMenuOpen(false)} aria-label="닫기" />}
        <div style={{ position: "relative", zIndex: 30 }}>
          <button style={styles.dropdown} onClick={() => setMenuOpen((o) => !o)}>
            <span style={styles.dropLabel}><span style={{ fontSize: 16 }}>{cur.emoji}</span> {cur.label}</span>
            <ChevronDown size={18} style={{ transition: "transform .15s", transform: menuOpen ? "rotate(180deg)" : "none", color: "#7A9A90" }} />
          </button>
          {menuOpen && (
            <div style={styles.menu}>
              {MODES.map((m) => {
                const on = mode === m.key;
                const locked = isLocked(m.key);
                const needPlan = MODES.findIndex((x) => x.key === m.key) < 3 ? "프로" : "맥스";
                return (
                  <button key={m.key}
                    onClick={() => { setMenuOpen(false); if (locked) setShowPaywall(true); else setMode(m.key); }}
                    style={{ ...styles.menuItem, ...(on ? styles.menuItemOn : {}), ...(locked ? { color: "#A9C3B9" } : {}) }}>
                    <span style={{ fontSize: 15, opacity: locked ? 0.5 : 1 }}>{m.emoji}</span>
                    <span>{m.label}</span>
                    {locked
                      ? <span style={styles.lockTag}>🔒 {needPlan}</span>
                      : on ? <Check size={15} style={{ marginLeft: "auto", color: "#2E9E86" }} /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 모드별 입력 패널 */}
      <section style={styles.panel}>
        {mode === "play" && <PlayPanel form={form} setF={setF} toggleDomain={toggleDomain} />}
        {mode === "daily" && <DailyPanel form={form} setF={setF} />}
        {mode === "obs" && <ObsPanel form={form} setF={setF} />}
        {mode === "note" && <NotePanel form={form} setF={setF} />}
        {mode === "adapt" && <AdaptPanel form={form} setF={setF} />}
        {mode === "counsel" && <CounselPanel form={form} setF={setF} />}
        <button style={styles.genBtn} onClick={() => send("")} disabled={loading}>
          {loading ? <Loader2 size={16} className="spin" /> : <span>✏️</span>} {CFG[mode].btn}
        </button>
      </section>

      <main ref={scroller} style={styles.thread}>
        {messages.length === 0 && <EmptyState mode={mode} onPick={send} />}
        {messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} style={styles.userBubble}>{m.text}</div>
          ) : (
            <div key={i} style={styles.botBlock}>
              <div style={styles.botRow}>
                <span style={styles.botFace}><Mascot size={30} /></span>
                <div style={styles.botText}>{m.text}</div>
              </div>
              {m.payload && <Card kind={m.kind} p={m.payload} />}
            </div>
          )
        )}
        {loading && (
          <div style={styles.loading}>
            <span style={styles.botFace}><Mascot size={30} /></span>
            <span style={styles.bubbleLoad}>
              만드는 중<span className="dot d1">.</span><span className="dot d2">.</span><span className="dot d3">.</span>
            </span>
          </div>
        )}
      </main>

      <footer style={styles.inputBar}>
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={CFG[mode].free} style={styles.input} />
        <button style={styles.sendBtn} onClick={() => send()} disabled={loading}>
          {loading ? <Loader2 size={19} className="spin" /> : <Send size={19} />}
        </button>
      </footer>
    </div>
    {showPricing && <PricingModal plan={plan} onChoose={choosePlan} onClose={() => setShowPricing(false)} />}
    {showPaywall && <PaywallModal onOpenPricing={() => { setShowPaywall(false); setShowPricing(true); }} onClose={() => setShowPaywall(false)} />}
    </>
  );
}

/* ---------- 랜딩 / 구독 ---------- */
function Landing({ onStart, onOpenPricing, onChoose }) {
  return (
    <div style={styles.landing}>
      <style>{css}</style>
      <nav style={styles.landNav}>
        <div style={styles.brand}>
          <span style={styles.logoMarkSm}><Mascot size={30} /></span>
          <div style={styles.title}>민트쌤</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.navGhost} onClick={onOpenPricing}>요금제</button>
          <button style={styles.navCta} onClick={onStart}>시작하기</button>
        </div>
      </nav>

      <section style={styles.hero}>
        <div style={styles.heroMascot}><Mascot size={104} /></div>
        <h1 style={styles.heroTitle}>보육교사의 하루,<br />민트쌤이 함께해요</h1>
        <p style={styles.heroSub}>놀이 아이디어부터 관찰일지·알림장·상담일지까지.<br />간단한 메모만 적으면, 제출용 문서로 정리해 드려요.</p>
        <div style={styles.heroCtas}>
          <button style={styles.ctaPrimary} onClick={onStart}>무료로 시작하기</button>
          <button style={styles.ctaGhost} onClick={onOpenPricing}>요금제 보기</button>
        </div>
        <div style={styles.heroNote}>가입 없이 무료 체험 · 신용카드 불필요</div>
      </section>

      <section style={styles.featWrap}>
        <div style={styles.sectionTitle}>이런 걸 만들어 드려요</div>
        <div style={styles.featGrid}>
          {MODES.map((m) => (
            <div key={m.key} style={styles.featCard}>
              <span style={{ fontSize: 24 }}>{m.emoji}</span>
              <span style={styles.featLabel}>{m.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section style={styles.priceWrap}>
        <div style={styles.sectionTitle}>요금제</div>
        <PlanCards onChoose={onChoose} />
        <div style={styles.demoNote}>* 데모 미리보기입니다. 실제 결제는 연결되어 있지 않아요.</div>
      </section>

      <footer style={styles.landFoot}>민트쌤 · 보육교사를 위한 AI 도우미</footer>
    </div>
  );
}

function PlanCards({ plan, onChoose }) {
  return (
    <div style={styles.planGrid}>
      {PLANS.map((pl) => {
        const paid = pl.key !== "free";
        const active = plan === pl.key;
        return (
          <div key={pl.key} style={{ ...styles.planCard, ...(pl.highlight ? styles.planCardHi : {}) }}>
            {pl.highlight && <span style={styles.planTag}>추천</span>}
            <div style={styles.planName}>{pl.name}</div>
            <div style={styles.planPrice}><span style={styles.planPriceNum}>{pl.price}</span><span style={styles.planPricePer}>{pl.period}</span></div>
            <div style={styles.planTagline}>{pl.tagline}</div>
            <div style={styles.planFeats}>
              {pl.features.map((f, i) => (
                <div key={i} style={styles.planFeat}><Check size={14} style={{ color: "#2E9E86", flexShrink: 0 }} /> {f}</div>
              ))}
            </div>
            <button
              style={paid ? styles.planCtaPro : styles.planCtaFree}
              onClick={() => onChoose(pl.key)}
              disabled={active}>
              {active ? "이용 중" : pl.cta}
            </button>
          </div>
        );
      })}
    </div>
  );
}

/* ---------- 로그인 / 회원가입 (Supabase) ---------- */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 256 256" aria-hidden>
      <path fill="#000000" d="M128 36C70.56 36 24 72.89 24 118.4c0 29.4 19.48 55.2 48.77 69.73-1.61 5.7-10.34 35.7-10.69 38.06 0 0-.21 1.79.95 2.47 1.16.68 2.52.15 2.52.15 3.3-.46 38.25-25.01 44.3-29.28 5.83.82 11.83 1.25 17.85 1.25 57.44 0 104-36.89 104-82.4S185.44 36 128 36z" />
    </svg>
  );
}

function AuthPage({ mode, setMode, onHome }) {
  const isSignup = mode === "signup";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = (m) => { setErr(""); setInfo(""); setPw(""); setPw2(""); setMode(m); };

  async function submit(e) {
    e?.preventDefault?.();
    setErr(""); setInfo("");
    if (!supabaseReady) { setErr("Supabase 설정이 필요해요. .env 에 URL/anon 키를 넣어주세요."); return; }
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) { setErr("올바른 이메일을 입력해 주세요."); return; }
    if (pw.length < 6) { setErr("비밀번호는 6자 이상이어야 해요."); return; }

    setBusy(true);
    try {
      if (isSignup) {
        if (!name.trim()) { setErr("이름(닉네임)을 입력해 주세요."); return; }
        if (pw !== pw2) { setErr("비밀번호가 서로 달라요."); return; }
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password: pw,
          options: { data: { name: name.trim() }, emailRedirectTo: window.location.origin },
        });
        if (error) { setErr(translateAuthError(error.message)); return; }
        // 이메일 확인이 켜져 있으면 세션이 없음 → 안내. 꺼져 있으면 세션 생성 → 리스너가 앱으로 진입.
        if (!data.session) setInfo("확인 메일을 보냈어요. 메일의 링크를 눌러 가입을 완료해 주세요. 📩");
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email: mail, password: pw });
      if (error) { setErr(translateAuthError(error.message)); return; }
      // 성공 시 onAuthStateChange(SIGNED_IN) 가 앱 진입 처리
    } finally {
      setBusy(false);
    }
  }

  async function social(provider) {
    setErr(""); setInfo("");
    if (!supabaseReady) { setErr("Supabase 설정이 필요해요. .env 에 URL/anon 키를 넣어주세요."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin },
    });
    if (error) { setBusy(false); setErr(translateAuthError(error.message)); }
    // 정상 시 공급자 페이지로 리다이렉트됨
  }

  return (
    <div style={styles.landing}>
      <style>{css}</style>
      <nav style={styles.landNav}>
        <button style={styles.brandBtn} onClick={onHome} title="홈으로 이동">
          <span style={styles.logoMarkSm}><Mascot size={30} /></span>
          <div style={styles.title}>민트쌤</div>
        </button>
      </nav>

      <section style={styles.authWrap}>
        <div style={styles.authCard}>
          <div style={styles.modalMascot}><Mascot size={54} /></div>
          <div style={styles.authTitle}>{isSignup ? "회원가입" : "로그인"}</div>
          <div style={styles.authSub}>
            {isSignup ? "간단히 가입하고 민트쌤을 시작해요 🌿" : "다시 오셨네요! 반가워요 🌿"}
          </div>

          {!supabaseReady && (
            <div style={styles.authError}>
              Supabase 설정이 아직 안 됐어요.<br />.env 에 URL과 anon 키를 넣고 다시 실행해 주세요.
            </div>
          )}

          <form style={styles.authForm} onSubmit={submit}>
            {isSignup && (
              <div style={styles.authField}>
                <label style={styles.authLabel}>이름 · 닉네임</label>
                <input style={styles.authInput} value={name} onChange={(e) => setName(e.target.value)}
                  placeholder="민트쌤" autoComplete="name" />
              </div>
            )}
            <div style={styles.authField}>
              <label style={styles.authLabel}>이메일</label>
              <input style={styles.authInput} type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@example.com" autoComplete="email" />
            </div>
            <div style={styles.authField}>
              <label style={styles.authLabel}>비밀번호</label>
              <input style={styles.authInput} type="password" value={pw} onChange={(e) => setPw(e.target.value)}
                placeholder="6자 이상" autoComplete={isSignup ? "new-password" : "current-password"} />
            </div>
            {isSignup && (
              <div style={styles.authField}>
                <label style={styles.authLabel}>비밀번호 확인</label>
                <input style={styles.authInput} type="password" value={pw2} onChange={(e) => setPw2(e.target.value)}
                  placeholder="한 번 더 입력" autoComplete="new-password" />
              </div>
            )}

            {err && <div style={styles.authError}>{err}</div>}
            {info && <div style={styles.authInfo}>{info}</div>}

            <button type="submit" style={styles.authSubmit} disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : (isSignup ? "가입하고 시작하기" : "로그인")}
            </button>
          </form>

          {/* 소셜 간편 로그인 */}
          <div style={styles.orRow}>
            <span style={styles.orLine} /><span style={styles.orText}>또는 간편 로그인</span><span style={styles.orLine} />
          </div>
          <button style={styles.kakaoBtn} onClick={() => social("kakao")} disabled={busy}>
            <KakaoIcon /> 카카오로 시작하기
          </button>
          <button style={styles.googleBtn} onClick={() => social("google")} disabled={busy}>
            <GoogleIcon /> 구글로 시작하기
          </button>

          <div style={styles.authDivider}>
            {isSignup ? "이미 계정이 있으신가요?" : "아직 회원이 아니신가요?"}
          </div>
          <button style={styles.authToggle}
            onClick={() => switchMode(isSignup ? "login" : "signup")} disabled={busy}>
            {isSignup ? "로그인하러 가기" : "회원가입"}
          </button>
        </div>
      </section>
    </div>
  );
}

// Supabase 인증 에러 메시지를 한국어로 순화
function translateAuthError(msg = "") {
  const m = msg.toLowerCase();
  if (m.includes("invalid login")) return "이메일 또는 비밀번호가 올바르지 않아요.";
  if (m.includes("already registered") || m.includes("already exists")) return "이미 가입된 이메일이에요. 로그인해 주세요.";
  if (m.includes("email not confirmed")) return "이메일 확인이 필요해요. 받은 메일의 링크를 눌러주세요.";
  if (m.includes("password")) return "비밀번호를 확인해 주세요. (6자 이상)";
  if (m.includes("provider is not enabled")) return "이 소셜 로그인은 아직 Supabase에서 활성화되지 않았어요.";
  return msg || "문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
}

function ModalShell({ children, onClose }) {
  return (
    <div style={styles.overlay} onClick={onClose}>
      <style>{css}</style>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.modalClose} onClick={onClose} aria-label="닫기">✕</button>
        {children}
      </div>
    </div>
  );
}

function PricingModal({ plan, onChoose, onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={styles.modalMascot}><Mascot size={54} /></div>
      <div style={styles.modalTitle}>요금제를 선택하세요</div>
      <div style={styles.modalSub}>필요할 때 언제든 바꿀 수 있어요.</div>
      <PlanCards plan={plan} onChoose={onChoose} />
      <div style={styles.demoNote}>* 데모 — 유료 플랜을 누르면 결제 없이 바로 이용 상태로 전환돼요.</div>
    </ModalShell>
  );
}

function PaywallModal({ onOpenPricing, onClose }) {
  return (
    <ModalShell onClose={onClose}>
      <div style={styles.modalMascot}><Mascot size={54} /></div>
      <div style={styles.modalTitle}>더 많은 문서를 열어보세요</div>
      <div style={styles.modalSub}>이 문서는 상위 요금제에서 이용할 수 있어요.<br />프로는 3종, 맥스는 6종 문서를 전체 이용할 수 있어요.</div>
      <div style={styles.paywallFeats}>
        <div style={styles.planFeat}><Check size={14} style={{ color: "#2E9E86" }} /> 프로 · 문서 3종 이용</div>
        <div style={styles.planFeat}><Check size={14} style={{ color: "#2E9E86" }} /> 맥스 · 문서 6종 전체 이용</div>
        <div style={styles.planFeat}><Check size={14} style={{ color: "#2E9E86" }} /> 생성 무제한 · 새 기능 우선</div>
      </div>
      <button style={styles.ctaPrimary} onClick={onOpenPricing}>요금제 보기</button>
      <button style={styles.textBtn} onClick={onClose}>다음에 할게요</button>
    </ModalShell>
  );
}

/* ---------- 입력 공통 (드롭다운) ---------- */
function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return { open, setOpen, ref };
}

// 단일 선택 드롭다운 (연령·장소·시간·상담방법)
function Chips({ items, value, onPick, placeholder }) {
  const { open, setOpen, ref } = useDropdown();
  return (
    <div ref={ref} style={styles.selWrap}>
      <div style={{ position: "relative" }}>
        <button type="button" style={styles.selBtn} onClick={() => setOpen((o) => !o)}>
          <span style={styles.selValue(!!value)}>{value || placeholder || "선택"}</span>
          <ChevronDown size={16} style={{ flexShrink: 0, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none", color: "#7A9A90" }} />
        </button>
        {open && (
          <div style={styles.selMenu}>
            {items.map((it) => (
              <button type="button" key={it} onClick={() => { onPick(it); setOpen(false); }}
                style={{ ...styles.selItem, ...(value === it ? styles.selItemOn : {}) }}>
                <span>{it}</span>
                {value === it && <Check size={14} style={{ marginLeft: "auto", color: "#2E9E86" }} />}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// 다중 선택 드롭다운 (누리과정 영역)
function DomainChips({ value, toggle }) {
  const { open, setOpen, ref } = useDropdown();
  const label = value.length ? `${value.length}개 영역 선택됨` : "영역 선택 (여러 개 가능)";
  return (
    <div ref={ref} style={styles.selWrap}>
      <div style={{ position: "relative" }}>
        <button type="button" style={styles.selBtn} onClick={() => setOpen((o) => !o)}>
          <span style={styles.selValue(value.length > 0)}>{label}</span>
          <ChevronDown size={16} style={{ flexShrink: 0, transition: "transform .15s", transform: open ? "rotate(180deg)" : "none", color: "#7A9A90" }} />
        </button>
        {open && (
          <div style={styles.selMenu}>
            {DOMAINS.map((d) => {
              const on = value.includes(d.key);
              return (
                <button type="button" key={d.key} onClick={() => toggle(d.key)}
                  style={{ ...styles.selItem, ...(on ? styles.selItemOn : {}) }}>
                  <span style={{ width: 11, height: 11, borderRadius: 3, background: d.color, display: "inline-block", transform: "rotate(12deg)", flexShrink: 0 }} />
                  <span>{d.emoji} {d.key}</span>
                  {on && <Check size={14} style={{ marginLeft: "auto", color: "#2E9E86" }} />}
                </button>
              );
            })}
          </div>
        )}
      </div>
      {value.length > 0 && (
        <div style={styles.selChips}>
          {value.map((k) => (
            <span key={k} style={{ ...styles.selChip, background: (DOMAIN_COLOR[k] || "#ccc") + "33", color: "#5c6b64" }}>{dEmoji(k)} {k}</span>
          ))}
        </div>
      )}
    </div>
  );
}
const Lbl = ({ children }) => <span style={styles.rowLabel}>{children}</span>;

// 날짜 선택기 (달력)
function DateField({ value, onChange, label, type = "date", text }) {
  const emoji = type === "week" ? "🗓️" : type === "month" ? "📆" : type === "time" ? "🕘" : "📅";
  return (
    <div style={styles.dateWrap}>
      <span style={{ fontSize: 13, flexShrink: 0 }}>{emoji}</span>
      {text && <span style={styles.dateText}>{text}</span>}
      <input type={type} aria-label={label} value={value || ""}
        onChange={(e) => onChange(e.target.value)} style={styles.dateInput} />
    </div>
  );
}

function PlayPanel({ form, setF, toggleDomain }) {
  return (
    <>
      <div style={styles.row}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      <div style={styles.row}><Lbl>🖍️ 영역</Lbl><DomainChips value={form.domains} toggle={toggleDomain} /></div>
      <div style={styles.rowSplit}>
        <div style={styles.miniRow}><Lbl>📍 장소</Lbl><Chips items={PLACES} value={form.place} onPick={(v) => setF("place", v)} /></div>
        <div style={styles.miniRow}><Lbl>⏰ 시간</Lbl><Chips items={DURATIONS} value={form.duration} onPick={(v) => setF("duration", v)} /></div>
      </div>
      <div style={styles.rowSplit}>
        <input value={form.theme} onChange={(e) => setF("theme", e.target.value)} placeholder="🎈 주제 (예: 봄, 공룡)" style={styles.field} />
        <input value={form.materials} onChange={(e) => setF("materials", e.target.value)} placeholder="🧸 준비물 (예: 색종이)" style={styles.field} />
      </div>
    </>
  );
}
function DailyPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <DateField type="week" value={form.dailyWeek} onChange={(v) => setF("dailyWeek", v)} label="주차 선택" />
        <input value={form.klass} onChange={(e) => setF("klass", e.target.value)} placeholder="🏫 반 (예: 0세반)" style={styles.field} />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <div style={styles.rowSplit}>
        <input value={form.dailyTheme} onChange={(e) => setF("dailyTheme", e.target.value)} placeholder="🌱 주제 (예: 느끼며 놀이해요)" style={styles.field} />
        <input value={form.dailyNext} onChange={(e) => setF("dailyNext", e.target.value)} placeholder="🔜 다음 주제 (선택)" style={styles.field} />
      </div>
      <textarea value={form.dailyMemo} onChange={(e) => setF("dailyMemo", e.target.value)}
        placeholder="✍️ 이번 주 놀이·활동·있었던 일 — 요일별로 어떤 놀이를 했고 아이들이 어땠는지 적어주세요. 거칠어도 괜찮아요." style={styles.textarea} />
      <input value={form.dailySafety} onChange={(e) => setF("dailySafety", e.target.value)} placeholder="🛟 안전교육 주제 (예: 여름 감염병 예방)" style={{ ...styles.field, width: "100%" }} />
    </>
  );
}
function ObsPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 아동 (이니셜·별명)" style={styles.field} />
        <div style={styles.miniRow}><Lbl>성별</Lbl><Chips items={["여", "남"]} value={form.gender} onPick={(v) => setF("gender", v)} /></div>
      </div>
      <div style={styles.rowSplit}>
        <input value={form.birth} onChange={(e) => setF("birth", e.target.value)} placeholder="🎂 생년월일·월령 (예: 2020.2.20 / 23개월)" style={styles.field} />
        <input value={form.recorder} onChange={(e) => setF("recorder", e.target.value)} placeholder="✍️ 기록자 (선택)" style={styles.field} />
      </div>
      <div style={styles.rowSplit}>
        <DateField type="month" value={form.obsPeriod} onChange={(v) => setF("obsPeriod", v)} label="관찰 월" />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <textarea value={form.memo} onChange={(e) => setF("memo", e.target.value)}
        placeholder="✍️ 관찰 메모 — 이번 기간에 아이가 한 말·행동을 영역 구분 없이 편하게 적어주세요. 앱이 발달 영역별로 정리해 드려요." style={styles.textarea} />
    </>
  );
}
function NotePanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 아동 (이니셜·별명)" style={styles.field} />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <textarea value={form.todayHi} onChange={(e) => setF("todayHi", e.target.value)}
        placeholder="🌟 오늘 활동·하이라이트 (예: 모래놀이에서 친구와 케이크 만들기)" style={styles.textarea} />
      <div style={styles.rowSplit}>
        <input value={form.mood} onChange={(e) => setF("mood", e.target.value)} placeholder="😊 아이 모습·기분" style={styles.field} />
        <input value={form.homeNote} onChange={(e) => setF("homeNote", e.target.value)} placeholder="🏠 가정 당부 (선택)" style={styles.field} />
      </div>
    </>
  );
}
function AdaptPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 아동 (이니셜·별명)" style={styles.field} />
        <input value={form.klass} onChange={(e) => setF("klass", e.target.value)} placeholder="🏫 반" style={styles.field} />
      </div>
      <div style={styles.rowSplit}>
        <DateField type="date" text="생년월일" value={form.adaptBirth} onChange={(v) => setF("adaptBirth", v)} label="생년월일" />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <div style={styles.rowSplit}>
        <DateField text="적응 시작일" value={form.adaptStart} onChange={(v) => setF("adaptStart", v)} label="적응 시작일" />
        <DateField type="time" text="등원" value={form.arriveTime} onChange={(v) => setF("arriveTime", v)} label="등원 시간" />
        <DateField type="time" text="하원" value={form.leaveTime} onChange={(v) => setF("leaveTime", v)} label="하원 시간" />
      </div>
      <textarea value={form.adaptMemo} onChange={(e) => setF("adaptMemo", e.target.value)}
        placeholder="✍️ 적응 모습 메모 — 일차별로 등·하원, 분리, 놀이 참여, 식사·수면, 친구·교사와의 모습을 적어주세요." style={styles.textarea} />
    </>
  );
}
function CounselPanel({ form, setF }) {
  return (
    <>
      <div style={styles.rowSplit}>
        <input value={form.child} onChange={(e) => setF("child", e.target.value)} placeholder="🧒 원아명" style={styles.field} />
        <input value={form.klass} onChange={(e) => setF("klass", e.target.value)} placeholder="🏫 반" style={styles.field} />
      </div>
      <div style={styles.rowSplit}>
        <DateField type="date" text="생년월일" value={form.counselBirth} onChange={(v) => setF("counselBirth", v)} label="생년월일" />
        <div style={styles.miniRow}><Lbl>👶 연령</Lbl><Chips items={AGES} value={form.age} onPick={(v) => setF("age", v)} variant="age" /></div>
      </div>
      <div style={styles.rowSplit}>
        <input value={form.guardian} onChange={(e) => setF("guardian", e.target.value)} placeholder="👪 보호자명 (예: ○○ 모)" style={styles.field} />
        <input value={form.teacher} onChange={(e) => setF("teacher", e.target.value)} placeholder="✍️ 면담교사" style={styles.field} />
      </div>
      <div style={styles.rowSplit}>
        <DateField text="면담일" value={form.date} onChange={(v) => setF("date", v)} label="면담일" />
        <div style={styles.miniRow}><Lbl>💬 형태</Lbl><Chips items={METHODS} value={form.counselMethod} onPick={(v) => setF("counselMethod", v)} /></div>
      </div>
      <textarea value={form.counselMemo} onChange={(e) => setF("counselMemo", e.target.value)}
        placeholder="✍️ 상담 메모 — 아이의 기본생활·놀이·친구관계·언어·신체 등 현재 모습과 학부모가 궁금해하는 점을 편하게 적어주세요." style={styles.textarea} />
    </>
  );
}
/* ---------- 빈 화면 ---------- */
function EmptyState({ mode, onPick }) {
  const copy = {
    play: { t: "오늘은 어떤 놀이를 해볼까요?", d: "연령·영역을 고르고 만들거나, 아래를 눌러 시작해요!" },
    daily: { t: "주간 보육일지를 만들어 드려요", d: "주제와 이번 주 놀이를 적으면\n영역별 놀이·요일별 평가까지 정리해 드려요." },
    obs: { t: "영유아 관찰기록을 만들어 드려요", d: "이번 기간 아이의 말·행동을 적으면\n발달 영역별로 정리해 드려요." },
    note: { t: "알림장을 만들어 드려요", d: "오늘 있었던 일만 적으면\n학부모님께 보낼 따뜻한 글로 바꿔드려요." },
    adapt: { t: "신입원아 적응일지를 만들어 드려요", d: "적응 시작일과 일차별 모습을 적으면\n원장님 제출용으로 정리해 드려요." },
    counsel: { t: "학부모 상담일지를 만들어 드려요", d: "아이의 현재 모습을 적으면\n영역별 현행수준으로 정리해 드려요." },
  }[mode];
  return (
    <div style={styles.empty}>
      <div style={styles.emptyMascot}><Mascot size={88} /></div>
      <div style={styles.emptyTitle}>{copy.t}</div>
      <div style={styles.emptyDesc}>{copy.d.split("\n").map((l, i) => <div key={i}>{l}</div>)}</div>
      {mode === "play" && (
        <div style={styles.starters}>
          {STARTERS.play.map((s) => (
            <button key={s} style={styles.starter} onClick={() => onPick(s.replace(/^[^\s]+\s/, ""))}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 복사 버튼 ---------- */
function CopyBtn({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button style={{ ...styles.copyBtn, ...(done ? styles.copyDone : {}) }}
      onClick={async () => { try { await navigator.clipboard.writeText(text); } catch {} setDone(true); setTimeout(() => setDone(false), 1500); }}>
      {done ? <><Check size={13} /> 복사됨</> : <><Copy size={13} /> 복사</>}
    </button>
  );
}

/* ---------- 카드 라우터 ---------- */
function Card({ kind, p }) {
  if (kind === "play") return <>{arr(p.activities).map((a, i) => <ActivityCard key={i} a={a} />)}</>;
  if (kind === "daily" && p.daily) return <DailyCard d={p.daily} />;
  if (kind === "obs" && p.observation) return <ObsCard o={p.observation} />;
  if (kind === "note" && p.note) return <NoteCard n={p.note} />;
  if (kind === "adapt" && p.adapt) return <AdaptCard a={p.adapt} />;
  if (kind === "counsel" && p.counsel) return <CounselCard c={p.counsel} />;
  return null;
}

function CardShell({ stripe, title, badge, copy, children, foot }) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardBar, background: stripe }} />
      <div style={styles.cardInner}>
        <div style={styles.docHead}>
          <div>
            {badge && <span style={styles.docBadge}>{badge}</span>}
            <h3 style={styles.cardTitle}>{title}</h3>
          </div>
          <CopyBtn text={copy} />
        </div>
        {children}
        {foot && <div style={styles.footnote}>📝 {foot}</div>}
      </div>
    </div>
  );
}

function Sec({ icon, label, children, tint }) {
  return (
    <div style={styles.section}>
      <div style={{ ...styles.sectionHead, background: tint }}>{icon} {label}</div>
      <div style={{ paddingLeft: 2 }}>{children}</div>
    </div>
  );
}

// 일반 문서 카드 (일과/서술형 섹션)
function DocCard({ stripe, title, badge, foot, meta = [], sections = [], copy }) {
  return (
    <CardShell stripe={stripe} title={title} badge={badge} copy={copy} foot={foot}>
      {meta.length > 0 && (
        <div style={styles.meta}>
          {meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}
        </div>
      )}
      {sections.map((s, i) =>
        s.value ? (
          <Sec key={i} icon={<span style={{ fontSize: 14 }}>{s.icon}</span>} label={s.label} tint={s.tint}>
            <p style={styles.body}>{s.value}</p>
          </Sec>
        ) : null
      )}
    </CardShell>
  );
}

function ActivityCard({ a }) {
  const stripe = arr(a.domains).map((d) => DOMAIN_COLOR[d]).filter(Boolean)[0] || "#45C4A8";
  const copy =
    `[놀이활동] ${a.title}\n대상:${a.age} · 장소:${a.place} · 시간:${a.duration}\n목표:${a.goal}\n준비물:${arr(a.materials).join(", ")}\n진행:\n${arr(a.steps).map((s, i) => `${i + 1}. ${s}`).join("\n")}${a.extension ? `\n확장:${a.extension}` : ""}${a.safety ? `\n안전:${a.safety}` : ""}`;
  return (
    <CardShell stripe={stripe} title={a.title} copy={copy}
      badge={<span style={styles.tagRow2}>{arr(a.domains).map((d) => <span key={d} style={{ ...styles.tag, background: (DOMAIN_COLOR[d] || "#aaa") + "33", color: "#5c6b64" }}>{dEmoji(d)} {d}</span>)}</span>}>
      <div style={styles.meta}>
        {a.age && <span style={styles.metaItem}>👶 {a.age}</span>}
        {a.place && <span style={styles.metaItem}><MapPin size={12} /> {a.place}</span>}
        {a.duration && <span style={styles.metaItem}><Clock size={12} /> {a.duration}</span>}
      </div>
      {a.goal && <Sec icon={<Target size={14} />} label="목표" tint="#FFEFD6"><p style={styles.body}>{a.goal}</p></Sec>}
      {arr(a.materials).length > 0 && <Sec icon={<Package size={14} />} label="준비물" tint="#E8F6EE"><div style={styles.matWrap}>{arr(a.materials).map((m, i) => <span key={i} style={styles.matChip}>{m}</span>)}</div></Sec>}
      {arr(a.steps).length > 0 && <Sec icon={<ListOrdered size={14} />} label="이렇게 놀아요" tint="#E5F7F0"><ol style={styles.steps}>{arr(a.steps).map((s, i) => <li key={i} style={styles.step}><span style={{ ...styles.stepNum, background: stripe }}>{i + 1}</span><span>{s}</span></li>)}</ol></Sec>}
      {a.extension && <Sec icon={<span style={{ fontSize: 14 }}>✨</span>} label="이렇게 더!" tint="#EDE8FA"><p style={styles.body}>{a.extension}</p></Sec>}
      {a.safety && <div style={styles.safety}><ShieldCheck size={14} /> <span>{a.safety}</span></div>}
    </CardShell>
  );
}

function ObsCard({ o }) {
  const meta = [o.gender && `${o.gender}`, o.birth && `🎂 ${o.birth}`, o.period && `🗓️ ${o.period}`, o.recorder && `✍️ ${o.recorder}`].filter(Boolean);
  const areas = arr(o.areas);
  const copy =
    `[영유아 관찰기록] ${o.child || ""} (${o.gender || ""})\n생년월일/월령: ${o.birth || ""}   관찰기간: ${o.period || ""}   기록자: ${o.recorder || ""}\n\n` +
    areas.map((a) => `■ ${a.area || ""}${a.datePlace ? " (" + a.datePlace + ")" : ""}\n[관찰] ${a.record || ""}${a.interpretation ? "\n[해석] " + a.interpretation : ""}`).join("\n\n") +
    `\n\n■ 종합 해석(비고)\n${o.summary || ""}`;
  return (
    <CardShell stripe="#8FCDF2" title={`${o.child || "영유아"} 관찰기록`} badge="원장님 제출용" copy={copy}
      foot="제출 전 아동 정보·관찰기간과 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}
      {areas.map((a, i) => (
        <div key={i} style={styles.obsArea}>
          <div style={styles.obsAreaHead}><span style={styles.obsTag}>{a.area}</span></div>
          {a.datePlace && (
            <div style={styles.obsField}>
              <span style={styles.obsFieldLabel}>관찰 일시 및 장소</span>
              <p style={styles.obsFieldVal}>{a.datePlace}</p>
            </div>
          )}
          {a.record && (
            <div style={styles.obsField}>
              <span style={styles.obsFieldLabel}>관찰 상황</span>
              <p style={styles.obsFieldVal}>{a.record}</p>
            </div>
          )}
          {a.interpretation && (
            <div style={styles.obsField}>
              <span style={styles.obsFieldLabel}>해석 및 평가</span>
              <div style={styles.obsInterp}>{a.interpretation}</div>
            </div>
          )}
        </div>
      ))}
      {o.summary && <Sec icon={<span style={{ fontSize: 14 }}>🧠</span>} label="종합 해석 (비고)" tint="#EDE8FA"><p style={styles.body}>{o.summary}</p></Sec>}
    </CardShell>
  );
}

function NoteCard({ n }) {
  const copy = `${n.message || ""}${n.homeTip ? `\n\n💛 ${n.homeTip}` : ""}`;
  return (
    <CardShell stripe="#FF9E7D" title="오늘의 알림장" badge="학부모님께" copy={copy}>
      <div style={styles.noteBody}>{n.message}</div>
      {n.homeTip && <div style={styles.homeTip}>💛 {n.homeTip}</div>}
    </CardShell>
  );
}

function DailyCard({ d }) {
  const meta = [d.klass && `🏫 ${d.klass}`, d.age && `👶 ${d.age}`, d.theme && `🌱 ${d.theme}`, d.nextTheme && `🔜 다음: ${d.nextTheme}`].filter(Boolean);
  const sched = arr(d.schedule);
  const areas = arr(d.areas);
  const days = arr(d.days);
  const copy =
    `[주간 보육일지] ${d.week || ""}  ${d.klass || ""} ${d.age || ""}\n주제: ${d.theme || ""}${d.nextTheme ? "  (다음: " + d.nextTheme + ")" : ""}\n\n■ 하루 일과\n` +
    sched.map((s) => `· ${s.name}${s.time ? " (" + s.time + ")" : ""}: ${s.content || ""}`).join("\n") +
    `\n· 오전 실내놀이 (09:40~10:40)\n` + areas.map((a) => `  - ${a.area}: ${a.content}`).join("\n") +
    `\n· 실외놀이 (10:50~11:30): ${d.outdoor || ""}\n\n■ 실행 놀이 평가 및 지원계획\n` +
    days.map((x) => `· ${x.day}\n  ${x.record}`).join("\n") +
    `\n\n■ 주간 보육 평가\n${d.weekEval || ""}\n\n■ 안전교육\n${d.safety || ""}${d.special ? "\n\n■ 반 운영 특이사항\n" + d.special : ""}`;
  return (
    <CardShell stripe="#59C7B0" title={`${d.week || ""} 보육일지`} badge="주간 보육일지" copy={copy}
      foot="제출 전 양식(주제·요일·일과)에 맞춰 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}

      {sched.length > 0 && (
        <Sec icon={<span style={{ fontSize: 14 }}>🕒</span>} label="하루 일과" tint="#FFF3E0">
          <div style={styles.schedList}>
            {sched.map((s, i) => (
              <div key={i} style={styles.schedRow}>
                <div style={styles.schedTop}><span style={styles.schedName}>{s.name}</span>{s.time && <span style={styles.schedTime}>{s.time}</span>}</div>
                {s.content && <div style={styles.schedContent}>{s.content}</div>}
              </div>
            ))}
          </div>
        </Sec>
      )}

      {areas.length > 0 && (
        <Sec icon={<span style={{ fontSize: 14 }}>🧩</span>} label="오전 실내놀이 (영역별)" tint="#E5F7F0">
          <div style={styles.weeks}>
            {areas.map((a, i) => (
              <div key={i} style={styles.week}>
                <div style={styles.weekHead}><span style={styles.weekTag}>{a.area}</span></div>
                <p style={styles.body}>{a.content}</p>
              </div>
            ))}
          </div>
        </Sec>
      )}
      {d.outdoor && <Sec icon={<span style={{ fontSize: 14 }}>🌳</span>} label="실외놀이" tint="#E7F2FB"><p style={styles.body}>{d.outdoor}</p></Sec>}

      {days.length > 0 && (
        <Sec icon={<span style={{ fontSize: 14 }}>📝</span>} label="실행 놀이 평가 및 지원계획" tint="#FDEBF1">
          <div style={styles.weeks}>
            {days.map((x, i) => (
              <div key={i} style={styles.week}>
                <div style={styles.weekHead}><span style={styles.weekTag}>{x.day}</span></div>
                <p style={styles.body}>{x.record}</p>
              </div>
            ))}
          </div>
        </Sec>
      )}
      {d.weekEval && <Sec icon={<span style={{ fontSize: 14 }}>📊</span>} label="주간 보육 평가" tint="#EDE8FA"><p style={styles.body}>{d.weekEval}</p></Sec>}
      {d.special && <Sec icon={<span style={{ fontSize: 14 }}>📌</span>} label="반 운영 특이사항" tint="#F1F9F5"><p style={styles.body}>{d.special}</p></Sec>}
      {d.safety && <div style={styles.safety}><ShieldCheck size={14} /> <span>{d.safety}</span></div>}
    </CardShell>
  );
}

function AdaptCard({ a }) {
  const meta = [a.age && `👶 ${a.age}`, a.klass && `🏫 ${a.klass}`, a.birth && `🎂 ${a.birth}`, a.period && `🗓️ ${a.period}`].filter(Boolean);
  const days = arr(a.days);
  const copy =
    `[신입원아 적응일지] ${a.child || ""} (${a.age || ""})${a.klass ? "  " + a.klass : ""}\n생년월일: ${a.birth || ""}   적응기간: ${a.period || ""}\n\n` +
    days.map((x) => `■ ${x.day || ""}${x.date ? " (" + x.date + ")" : ""}${x.level ? " · 적응정도:" + x.level : ""}${x.note ? " · 비고:" + x.note : ""}\n등원 ${x.arrive || "-"} / 하원 ${x.leave || "-"}${x.health && x.health !== "-" ? " / 건강·투약 " + x.health : ""}\n${x.record || ""}`).join("\n\n") +
    `\n\n■ 종합 의견 및 적응 계획\n${a.summary || ""}`;
  return (
    <CardShell stripe="#C9A7E8" title={`${a.child || "신입원아"} 적응일지`} badge="원장님 제출용" copy={copy}
      foot="제출 전 아동 정보·일차별 날짜와 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}
      {days.map((x, i) => (
        <div key={i} style={styles.adaptDay}>
          <div style={styles.adaptDayHead}>
            <span style={styles.adaptTag}>{x.day}</span>
            {x.date && <span style={styles.obsDate}>{x.date}</span>}
            {x.level && <span style={styles.levelTag(x.level)}>{x.level}</span>}
            {x.note && <span style={styles.adaptNote}>비고 · {x.note}</span>}
          </div>
          {(x.arrive || x.leave || (x.health && x.health !== "-")) && (
            <div style={styles.adaptTime}>
              🕘 등원 {x.arrive || "-"} · 하원 {x.leave || "-"}
              {x.health && x.health !== "-" ? ` · 💊 ${x.health}` : ""}
            </div>
          )}
          {x.record && <p style={styles.body}>{x.record}</p>}
        </div>
      ))}
      {a.summary && <Sec icon={<span style={{ fontSize: 14 }}>🌱</span>} label="종합 의견 및 적응 계획" tint="#EDE8FA"><p style={styles.body}>{a.summary}</p></Sec>}
    </CardShell>
  );
}

function CounselCard({ c }) {
  const meta = [c.klass && `🏫 ${c.klass}`, c.age && `👶 ${c.age}`, c.birth && `🎂 ${c.birth}`, c.date && `📅 ${c.date}`, c.method && `💬 ${c.method}`, c.guardian && `👪 ${c.guardian}`, c.teacher && `✍️ ${c.teacher}`].filter(Boolean);
  const domains = arr(c.domains);
  const copy =
    `[학부모 상담일지] ${c.child || ""}${c.klass ? "  " + c.klass : ""}\n생년월일: ${c.birth || ""}   면담일: ${c.date || ""}   형태: ${c.method || ""}   보호자: ${c.guardian || ""}   교사: ${c.teacher || ""}\n\n[현행수준]\n` +
    domains.map((d) => `■ ${d.area || ""}\n${d.content || ""}`).join("\n\n") +
    (c.parentNote ? `\n\n■ 부모 의견\n${c.parentNote}` : "") +
    `\n\n■ 면담내용 및 종합의견\n${c.summary || ""}`;
  return (
    <CardShell stripe="#FFC074" title={`${c.child || "원아"} 상담일지`} badge="학부모 상담" copy={copy}
      foot="제출 전 원아 정보·면담 정보와 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}
      {domains.map((d, i) => (
        <div key={i} style={styles.cnslArea}>
          <div style={styles.obsAreaHead}><span style={styles.cnslTag}>{d.area}</span></div>
          {d.content && <p style={styles.body}>{d.content}</p>}
        </div>
      ))}
      {c.parentNote && <Sec icon={<span style={{ fontSize: 14 }}>🗣️</span>} label="부모 의견" tint="#E7F2FB"><p style={styles.body}>{c.parentNote}</p></Sec>}
      {c.summary && <Sec icon={<span style={{ fontSize: 14 }}>📋</span>} label="면담내용 및 종합의견" tint="#EDE8FA"><p style={styles.body}>{c.summary}</p></Sec>}
    </CardShell>
  );
}

const INK = "#2E4A42";
const PAPER = "#EAF7F1";
const MINT = "#45C4A8";
const MINT_STRONG = "#2FA88C";
const SH = "#D6EFE6";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Jua&display=swap');
  .spin { animation: spin 0.9s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
  * { box-sizing: border-box; }
  ::placeholder { color: #A9C3B9; }
  button { font-family: inherit; cursor: pointer; transition: transform .12s ease; }
  button:active { transform: scale(0.96); }
  button:disabled { opacity: .6; cursor: default; }
  input, textarea { font-family: inherit; }
  textarea { resize: vertical; }
  input[type="date"]::-webkit-calendar-picker-indicator,
  input[type="week"]::-webkit-calendar-picker-indicator,
  input[type="time"]::-webkit-calendar-picker-indicator,
  input[type="month"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.55; }
  input[type="date"]::-webkit-datetime-edit,
  input[type="week"]::-webkit-datetime-edit,
  input[type="time"]::-webkit-datetime-edit,
  input[type="month"]::-webkit-datetime-edit { color: #2E4A42; }
  .dot { animation: blink 1.2s infinite; } .d2 { animation-delay: .2s; } .d3 { animation-delay: .4s; }
  @keyframes blink { 0%,100% { opacity: .2; } 50% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .spin,.dot { animation: none; } button { transition: none; } }
`;

const DISPLAY = `"Jua","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`;
const BODY = `"Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif`;

const styles = {
  wrap: {
    fontFamily: BODY, color: INK, background: PAPER, minHeight: "100vh",
    display: "flex", flexDirection: "column", maxWidth: 760, margin: "0 auto",
    backgroundImage: "radial-gradient(#CDEBDF 1.2px, transparent 1.2px)", backgroundSize: "22px 22px",
  },
  header: { position: "relative", zIndex: 40, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 18px 8px" },
  brand: { display: "flex", alignItems: "center", gap: 11 },
  brandBtn: { display: "flex", alignItems: "center", gap: 11, background: "transparent", border: "none", padding: 0, cursor: "pointer" },
  logoMark: { width: 52, height: 52, borderRadius: 18, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 4px 0 #CDEBDF" },
  title: { fontSize: 23, fontFamily: DISPLAY, color: "#2E9E86", lineHeight: 1 },
  subtitle: { fontSize: 12.5, color: "#7A9A90", marginTop: 3 },
  resetBtn: { display: "flex", alignItems: "center", gap: 5, fontSize: 13, color: "#7A9A90", background: "#fff", border: "none", borderRadius: 999, padding: "8px 13px", boxShadow: `0 3px 0 ${SH}` },

  modeBar: { position: "relative", padding: "4px 16px 10px" },
  backdrop: { position: "fixed", inset: 0, background: "transparent", border: "none", zIndex: 20, padding: 0 },
  dropdown: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 15, fontWeight: 800, color: INK, background: "#fff", border: "none", borderRadius: 16, padding: "13px 16px", boxShadow: `0 3px 0 ${SH}` },
  dropLabel: { display: "inline-flex", alignItems: "center", gap: 8 },
  menu: { position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, background: "#fff", borderRadius: 16, boxShadow: "0 12px 34px rgba(46,74,66,0.20)", padding: 6, display: "flex", flexDirection: "column", gap: 2, maxHeight: 340, overflowY: "auto" },
  menuItem: { display: "flex", alignItems: "center", gap: 9, width: "100%", fontSize: 14, fontWeight: 700, color: "#5A6B64", background: "transparent", border: "none", borderRadius: 12, padding: "11px 12px", textAlign: "left" },
  menuItemOn: { background: "#E5F7F0", color: "#1F6B5A" },
  lockTag: { marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#B08900", background: "#FFF3D1", padding: "3px 8px", borderRadius: 999 },

  panel: { padding: "8px 16px 14px" },
  row: { display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 10, flexWrap: "wrap" },
  rowSplit: { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 10 },
  miniRow: { display: "flex", alignItems: "flex-start", gap: 10, flex: "1 1 220px" },
  rowLabel: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: "#7A9A90", minWidth: 50, paddingTop: 7, whiteSpace: "nowrap" },
  chips: { display: "flex", flexWrap: "wrap", gap: 7 },
  chip: { fontSize: 12.5, padding: "7px 13px", borderRadius: 999, border: "none", background: "#fff", color: "#6f8079", boxShadow: `0 2px 0 ${SH}` },
  chipOn: { background: "#B7EBDD", color: "#1F6B5A", fontWeight: 700, boxShadow: "0 2px 0 #7FD4BE" },
  chipOnDark: { background: "#2E9E86", color: "#fff", fontWeight: 700, boxShadow: "0 2px 0 #227A69" },
  crayon: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 700, padding: "7px 13px", borderRadius: 999, border: "2px solid" },
  selWrap: { flex: "1 1 160px", minWidth: 140, display: "flex", flexDirection: "column", gap: 7 },
  selBtn: { width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13.5, fontWeight: 700, color: INK, background: "#fff", border: "none", borderRadius: 14, padding: "10px 14px", boxShadow: `0 2px 0 ${SH}` },
  selValue: (filled) => ({ color: filled ? INK : "#A9C3B9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }),
  selMenu: { position: "absolute", top: "100%", left: 0, right: 0, marginTop: 6, background: "#fff", borderRadius: 14, boxShadow: "0 12px 30px rgba(46,74,66,0.20)", padding: 6, display: "flex", flexDirection: "column", gap: 2, maxHeight: 244, overflowY: "auto", zIndex: 40 },
  selItem: { display: "flex", alignItems: "center", gap: 8, width: "100%", fontSize: 13.5, fontWeight: 600, color: "#5A6B64", background: "transparent", border: "none", borderRadius: 10, padding: "9px 11px", textAlign: "left" },
  selItemOn: { background: "#E5F7F0", color: "#1F6B5A", fontWeight: 700 },
  selChips: { display: "flex", flexWrap: "wrap", gap: 6 },
  selChip: { fontSize: 11.5, fontWeight: 700, padding: "4px 9px", borderRadius: 999 },
  dateWrap: { flex: "1 1 150px", display: "flex", alignItems: "center", gap: 6, padding: "11px 14px", borderRadius: 16, background: "#fff", boxShadow: `0 2px 0 ${SH}` },
  dateInput: { flex: 1, minWidth: 0, border: "none", background: "transparent", outline: "none", fontFamily: "inherit", fontSize: 13.5, color: INK },
  dateText: { fontSize: 12.5, color: "#7A9A90", fontWeight: 700, flexShrink: 0 },
  field: { flex: "1 1 150px", fontSize: 13.5, padding: "11px 15px", borderRadius: 16, border: "none", background: "#fff", color: INK, outline: "none", boxShadow: `0 2px 0 ${SH}` },
  textarea: { width: "100%", minHeight: 78, fontSize: 13.5, lineHeight: 1.55, padding: "12px 15px", borderRadius: 16, border: "none", background: "#fff", color: INK, outline: "none", boxShadow: `0 2px 0 ${SH}`, marginBottom: 10 },
  genBtn: { width: "100%", marginTop: 4, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 16, padding: "13px", boxShadow: `0 4px 0 ${MINT_STRONG}` },

  thread: { flex: "1 0 auto", overflowY: "visible", padding: "6px 16px 18px", display: "flex", flexDirection: "column", gap: 14 },
  empty: { textAlign: "center", margin: "auto", maxWidth: 430 },
  emptyMascot: { display: "flex", justifyContent: "center", marginBottom: 6 },
  emptyTitle: { fontSize: 20, fontFamily: DISPLAY, color: "#2E9E86" },
  emptyDesc: { fontSize: 13.5, color: "#7A9A90", marginTop: 8, lineHeight: 1.7 },
  starters: { display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", marginTop: 18 },
  starter: { fontSize: 13, padding: "9px 15px", borderRadius: 999, border: "none", background: "#fff", color: "#5c6b64", boxShadow: `0 3px 0 ${SH}` },

  userBubble: { alignSelf: "flex-end", maxWidth: "82%", background: "#8FDCC9", color: "#1B5346", padding: "11px 15px", borderRadius: "20px 20px 6px 20px", fontSize: 14, lineHeight: 1.5, fontWeight: 500, boxShadow: "0 3px 0 #63C9AF" },
  botBlock: { alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 10 },
  botRow: { display: "flex", gap: 8, alignItems: "flex-start" },
  botFace: { flexShrink: 0, width: 38, height: 38, borderRadius: 14, background: "#fff", display: "grid", placeItems: "center", boxShadow: `0 2px 0 ${SH}` },
  botText: { fontSize: 14, color: "#4A5B54", lineHeight: 1.55, background: "#fff", padding: "10px 14px", borderRadius: "6px 18px 18px 18px", boxShadow: `0 2px 0 ${SH}`, maxWidth: "84%" },

  card: { background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: `0 4px 0 ${SH}, 0 10px 28px rgba(69,196,168,0.12)` },
  cardBar: { height: 7, width: "100%" },
  cardInner: { padding: "15px 18px 18px" },
  docHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8 },
  docBadge: { display: "inline-block", fontSize: 11, fontWeight: 800, color: "#2E9E86", background: "#E5F7F0", padding: "3px 9px", borderRadius: 999, marginBottom: 6 },
  cardTitle: { margin: 0, fontSize: 18, fontFamily: DISPLAY, color: "#2E4A42", lineHeight: 1.3 },
  copyBtn: { flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 700, color: "#6f8079", background: "#EEF7F3", border: "none", borderRadius: 999, padding: "7px 12px" },
  copyDone: { background: "#CFF0E4", color: "#1F6B5A" },
  tagRow2: { display: "flex", flexWrap: "wrap", gap: 6 },
  tag: { fontSize: 11.5, fontWeight: 700, padding: "4px 10px", borderRadius: 999 },
  meta: { display: "flex", flexWrap: "wrap", gap: 12, paddingBottom: 13, marginBottom: 4, borderBottom: "2px dotted #DDEEE6" },
  metaItem: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, color: "#7A9A90", fontWeight: 600 },
  section: { marginTop: 13 },
  sectionHead: { display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 800, color: "#5E7168", marginBottom: 8, padding: "4px 11px", borderRadius: 999 },
  body: { margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#48564F" },
  matWrap: { display: "flex", flexWrap: "wrap", gap: 6 },
  matChip: { fontSize: 12.5, padding: "5px 11px", borderRadius: 999, background: "#EEF7F3", color: "#4A5B54" },
  steps: { listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 },
  step: { display: "flex", gap: 10, fontSize: 13.5, lineHeight: 1.55, color: "#48564F", alignItems: "flex-start" },
  stepNum: { flexShrink: 0, width: 23, height: 23, borderRadius: 999, color: "#fff", fontSize: 12.5, fontWeight: 800, display: "grid", placeItems: "center", marginTop: 1 },
  safety: { display: "flex", alignItems: "center", gap: 7, marginTop: 15, padding: "10px 13px", background: "#FFF3E0", borderRadius: 14, fontSize: 12.5, color: "#C97B2C", fontWeight: 600 },

  noteBody: { fontSize: 14, lineHeight: 1.75, color: "#48564F", whiteSpace: "pre-wrap", background: "#FFF6F1", padding: "14px 16px", borderRadius: 16 },
  homeTip: { marginTop: 10, fontSize: 13, color: "#B5651D", background: "#FFF3E0", padding: "10px 13px", borderRadius: 14, fontWeight: 600 },

  planTheme: { fontSize: 13.5, fontWeight: 700, color: "#1F6B5A", background: "#E5F7F0", padding: "8px 13px", borderRadius: 999, display: "inline-block", marginBottom: 6 },
  weeks: { display: "flex", flexDirection: "column", gap: 10 },
  week: { background: "#F5FBF8", borderRadius: 14, padding: "11px 13px" },
  weekHead: { display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 800, color: "#2E4A42", marginBottom: 6 },
  weekTag: { fontSize: 11.5, fontWeight: 800, color: "#1F6B5A", background: "#CDEEDD", padding: "3px 9px", borderRadius: 999 },
  weekList: { margin: 0, paddingLeft: 18 },
  weekItem: { fontSize: 13, lineHeight: 1.65, color: "#48564F" },
  schedList: { display: "flex", flexDirection: "column", gap: 7 },
  schedRow: { padding: "9px 12px", background: "#F5FBF8", borderRadius: 12 },
  schedTop: { display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  schedName: { fontSize: 13, fontWeight: 800, color: "#2E4A42" },
  schedTime: { fontSize: 11, color: "#8AA79D", fontWeight: 700 },
  schedContent: { fontSize: 12.5, color: "#48564F", lineHeight: 1.5, marginTop: 3 },
  obsArea: { marginTop: 12, background: "#F7FBFE", borderRadius: 14, padding: "12px 14px" },
  obsAreaHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 7, flexWrap: "wrap" },
  obsTag: { fontSize: 11.5, fontWeight: 800, color: "#2C6FA6", background: "#DCEBF8", padding: "3px 10px", borderRadius: 999 },
  obsDate: { fontSize: 11.5, color: "#8AA79D", fontWeight: 700 },
  obsField: { marginTop: 9 },
  obsFieldLabel: { display: "block", fontSize: 11, fontWeight: 800, color: "#2C6FA6", marginBottom: 4 },
  obsFieldVal: { margin: 0, fontSize: 13, lineHeight: 1.55, color: "#48564F" },
  obsInterp: { fontSize: 13, color: "#2C5A8C", background: "#EAF2FB", borderRadius: 10, padding: "9px 12px", lineHeight: 1.55, fontWeight: 500 },
  adaptDay: { marginTop: 12, background: "#FBF7FE", borderRadius: 14, padding: "12px 14px" },
  adaptDayHead: { display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" },
  adaptTag: { fontSize: 11.5, fontWeight: 800, color: "#7B4F9E", background: "#EADDF7", padding: "3px 10px", borderRadius: 999 },
  adaptTime: { fontSize: 12, color: "#8AA79D", fontWeight: 600, marginBottom: 6 },
  adaptNote: { fontSize: 11, fontWeight: 700, color: "#7A6B62", background: "#F1ECE6", padding: "3px 9px", borderRadius: 999 },
  cnslArea: { marginTop: 12, background: "#FFFBF3", borderRadius: 14, padding: "12px 14px" },
  cnslTag: { fontSize: 11.5, fontWeight: 800, color: "#9A6B1F", background: "#FDECCB", padding: "3px 10px", borderRadius: 999 },
  levelTag: (lvl) => ({
    fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999,
    ...(lvl === "양호" ? { color: "#1F6B5A", background: "#D8F0E2" }
      : lvl === "미흡" ? { color: "#B23A48", background: "#FBE2E5" }
      : { color: "#B08900", background: "#FFF3D1" }),
  }),

  footnote: { marginTop: 14, fontSize: 11.5, color: "#8AA79D", background: "#F1F9F5", padding: "8px 12px", borderRadius: 12, lineHeight: 1.5 },

  loading: { display: "flex", alignItems: "center", gap: 8 },
  bubbleLoad: { fontSize: 13.5, color: "#7A9A90", background: "#fff", padding: "10px 15px", borderRadius: "6px 18px 18px 18px", boxShadow: `0 2px 0 ${SH}` },

  inputBar: { display: "flex", gap: 9, padding: "12px 14px 16px" },
  input: { flex: 1, fontSize: 14, padding: "13px 17px", borderRadius: 999, border: "none", background: "#fff", color: INK, outline: "none", boxShadow: `0 3px 0 ${SH}` },
  sendBtn: { width: 50, height: 50, borderRadius: 999, border: "none", background: MINT, color: "#fff", display: "grid", placeItems: "center", boxShadow: `0 4px 0 ${MINT_STRONG}`, flexShrink: 0 },

  headRight: { display: "flex", alignItems: "center", gap: 8 },
  planPro: { fontSize: 12.5, fontWeight: 800, color: "#7A5A00", background: "#FFE9A8", padding: "7px 12px", borderRadius: 999, boxShadow: "0 2px 0 #F0D480" },
  planFree: { fontSize: 12, fontWeight: 700, color: "#1F6B5A", background: "#E5F7F0", border: "none", padding: "8px 12px", borderRadius: 999, boxShadow: "0 2px 0 #CDEEDD" },

  landing: { fontFamily: BODY, color: INK, background: PAPER, minHeight: 560, height: "100%", maxHeight: "100vh", overflowY: "auto", maxWidth: 760, margin: "0 auto", backgroundImage: "radial-gradient(#CDEBDF 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" },
  landNav: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", position: "sticky", top: 0, background: "rgba(234,247,241,0.92)", backdropFilter: "blur(6px)", zIndex: 5 },
  logoMarkSm: { width: 44, height: 44, borderRadius: 14, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 3px 0 #CDEBDF" },
  navGhost: { fontSize: 13, fontWeight: 700, color: "#2E9E86", background: "transparent", border: "none", padding: "9px 12px", borderRadius: 999 },
  navCta: { fontSize: 13, fontWeight: 800, color: "#fff", background: MINT, border: "none", padding: "9px 16px", borderRadius: 999, boxShadow: `0 3px 0 ${MINT_STRONG}` },

  authWrap: { display: "flex", justifyContent: "center", padding: "24px 18px 40px" },
  authCard: { width: "100%", maxWidth: 420, background: "#fff", borderRadius: 24, padding: "28px 24px 22px", boxShadow: "0 10px 40px rgba(46,74,66,0.12)", textAlign: "center" },
  authTitle: { fontFamily: DISPLAY, fontSize: 24, color: "#2E4A42", marginTop: 6 },
  authSub: { fontSize: 13.5, color: "#5E7168", marginTop: 6, marginBottom: 18 },
  authForm: { display: "flex", flexDirection: "column", gap: 13, textAlign: "left" },
  authField: { display: "flex", flexDirection: "column", gap: 6 },
  authLabel: { fontSize: 12.5, fontWeight: 700, color: "#5E7168", paddingLeft: 4 },
  authInput: { fontSize: 14.5, padding: "13px 15px", borderRadius: 14, border: "1.5px solid #DCEEE7", background: "#F7FCFA", color: INK, outline: "none" },
  authError: { fontSize: 13, fontWeight: 700, color: "#D9645C", background: "#FCEEED", borderRadius: 12, padding: "10px 12px", textAlign: "center" },
  authSubmit: { marginTop: 4, fontSize: 15, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 16, padding: "14px", boxShadow: `0 4px 0 ${MINT_STRONG}` },
  authDivider: { fontSize: 13, color: "#7A9A90", marginTop: 20, marginBottom: 10 },
  authToggle: { width: "100%", fontSize: 14.5, fontWeight: 800, color: "#1F6B5A", background: "#E5F7F0", border: "none", borderRadius: 14, padding: "13px", boxShadow: "0 3px 0 #CDEEDD" },
  authInfo: { fontSize: 13, fontWeight: 700, color: "#2E7D6B", background: "#E5F7F0", borderRadius: 12, padding: "10px 12px", textAlign: "center", lineHeight: 1.5 },
  orRow: { display: "flex", alignItems: "center", gap: 10, margin: "18px 0 12px" },
  orLine: { flex: 1, height: 1, background: "#DCEEE7" },
  orText: { fontSize: 12, color: "#8AA79D", fontWeight: 700, whiteSpace: "nowrap" },
  kakaoBtn: { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "#191600", background: "#FEE500", border: "none", borderRadius: 14, padding: "13px", marginBottom: 10 },
  googleBtn: { width: "100%", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 14.5, fontWeight: 800, color: "#3C4043", background: "#fff", border: "1.5px solid #DADCE0", borderRadius: 14, padding: "13px" },
  hero: { textAlign: "center", padding: "22px 22px 8px" },
  heroMascot: { display: "flex", justifyContent: "center", marginBottom: 6 },
  heroTitle: { fontFamily: DISPLAY, color: "#2E4A42", fontSize: 29, lineHeight: 1.28, margin: "6px 0 0" },
  heroSub: { fontSize: 14, color: "#5E7168", lineHeight: 1.7, marginTop: 12 },
  heroCtas: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 20 },
  ctaPrimary: { fontSize: 15, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 16, padding: "14px 24px", boxShadow: `0 4px 0 ${MINT_STRONG}`, width: "100%", maxWidth: 300 },
  ctaGhost: { fontSize: 15, fontWeight: 800, color: "#2E9E86", background: "#fff", border: "none", borderRadius: 16, padding: "14px 24px", boxShadow: `0 4px 0 ${SH}`, width: "100%", maxWidth: 300 },
  heroNote: { fontSize: 12, color: "#8AA79D", marginTop: 14 },
  featWrap: { padding: "24px 20px 6px" },
  sectionTitle: { fontFamily: DISPLAY, color: "#2E9E86", fontSize: 19, textAlign: "center", marginBottom: 16 },
  featGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 },
  featCard: { background: "#fff", borderRadius: 16, padding: "16px 12px", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: `0 3px 0 ${SH}` },
  featLabel: { fontSize: 13, fontWeight: 700, color: "#4A5B54", textAlign: "center" },
  priceWrap: { padding: "26px 20px 10px" },
  demoNote: { fontSize: 11.5, color: "#8AA79D", textAlign: "center", marginTop: 14, lineHeight: 1.5 },
  landFoot: { textAlign: "center", fontSize: 12, color: "#8AA79D", padding: "22px 20px 30px" },

  planGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(168px, 1fr))", gap: 12 },
  planCard: { position: "relative", background: "#fff", borderRadius: 20, padding: "20px 18px", boxShadow: `0 4px 0 ${SH}`, display: "flex", flexDirection: "column" },
  planCardHi: { boxShadow: `0 0 0 2px ${MINT}, 0 6px 0 ${MINT_STRONG}` },
  planTag: { position: "absolute", top: -10, right: 16, fontSize: 11, fontWeight: 800, color: "#fff", background: MINT, padding: "4px 11px", borderRadius: 999, boxShadow: `0 2px 0 ${MINT_STRONG}` },
  planName: { fontSize: 15, fontWeight: 800, color: "#2E4A42" },
  planPrice: { display: "flex", alignItems: "baseline", gap: 3, marginTop: 8 },
  planPriceNum: { fontFamily: DISPLAY, fontSize: 26, color: "#2E9E86" },
  planPricePer: { fontSize: 13, color: "#8AA79D", fontWeight: 700 },
  planTagline: { fontSize: 12.5, color: "#7A9A90", marginTop: 6, marginBottom: 14 },
  planFeats: { display: "flex", flexDirection: "column", gap: 9, flex: 1 },
  planFeat: { display: "flex", alignItems: "center", gap: 7, fontSize: 13, color: "#48564F", lineHeight: 1.4 },
  planCtaFree: { marginTop: 16, fontSize: 14, fontWeight: 800, color: "#1F6B5A", background: "#E5F7F0", border: "none", borderRadius: 14, padding: "12px", boxShadow: "0 3px 0 #CDEEDD" },
  planCtaPro: { marginTop: 16, fontSize: 14, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 14, padding: "12px", boxShadow: `0 4px 0 ${MINT_STRONG}` },

  overlay: { position: "fixed", inset: 0, background: "rgba(46,74,66,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 100, overflowY: "auto" },
  modal: { position: "relative", width: "100%", maxWidth: 560, background: PAPER, borderRadius: 24, padding: "26px 22px 22px", boxShadow: "0 20px 60px rgba(0,0,0,0.25)", textAlign: "center", margin: "auto", backgroundImage: "radial-gradient(#CDEBDF 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" },
  modalClose: { position: "absolute", top: 14, right: 16, fontSize: 16, color: "#7A9A90", background: "transparent", border: "none", lineHeight: 1 },
  modalMascot: { display: "flex", justifyContent: "center", marginBottom: 6 },
  modalTitle: { fontFamily: DISPLAY, fontSize: 21, color: "#2E4A42", marginTop: 4 },
  modalSub: { fontSize: 13.5, color: "#5E7168", lineHeight: 1.7, marginTop: 8, marginBottom: 18 },
  paywallFeats: { display: "inline-flex", flexDirection: "column", gap: 8, textAlign: "left", background: "#fff", borderRadius: 16, padding: "14px 18px", margin: "4px auto 18px", boxShadow: `0 3px 0 ${SH}` },
  textBtn: { display: "block", width: "100%", marginTop: 10, fontSize: 13, fontWeight: 700, color: "#7A9A90", background: "transparent", border: "none", padding: "8px" },
};
