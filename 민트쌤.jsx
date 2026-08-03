import React, { useState, useRef, useEffect } from "react";
import {
  Send, Loader2, Target, Package, ListOrdered, ShieldCheck,
  Clock, MapPin, RotateCcw, Copy, Check, CalendarDays, Eye, Heart,
  ChevronDown, LogOut, Download, Trash2, Search, Pencil, RefreshCw, Lock,
} from "lucide-react";
import { supabase, supabaseReady } from "./src/supabaseClient.js";
import { copyDoc, downloadDoc, stripNum } from "./src/export.js";

const EMPTY_THREADS = { play: [], daily: [], obs: [], note: [], adapt: [], counsel: [] };
const PENDING_PLAN_KEY = "mint_pending_plan";
const PENDING_MODE_KEY = "mint_pending_mode";  // OAuth 리다이렉트로 state 가 날아가도 고른 문서를 유지
const GUEST_USED_KEY = "mint_guest_used";      // 비로그인 체험 사용 횟수
const GUEST_DOC_KEY = "mint_guest_doc";        // 체험으로 만든 결과 (로그인하면 계정으로 옮겨줌)
const GUEST_LIMIT = 1;                         // 가입 없이 만들어 볼 수 있는 문서 수
const PLAN_RANK = { free: 0, basic: 1, pro: 2 }; // 요금제 등급(높을수록 상위)
// 구 요금제명 호환. 구 max(6종)는 신 Pro 에 해당합니다.
// 구 pro 와 신 pro 는 이름이 같아 클라이언트에서 구분할 수 없으므로,
// schema.sql 마이그레이션을 돌린 뒤 상태(= 신 Pro)를 기준으로 봅니다.
// 마이그레이션 전이라면 구 pro 회원에게 잠깐 6종이 열리는데, 덜 주는 쪽보다 낫습니다.
const normPlan = (p) => {
  const v = p || "free";
  if (v === "max") return "pro";
  return PLAN_DOCS[v] ? v : "free";
};
const GEMINI_MODEL = "gemini-3.1-flash-lite"; // AI 문서 생성 모델

const ls = {
  get: (k, d = null) => { try { return localStorage.getItem(k) ?? d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
  del: (k) => { try { localStorage.removeItem(k); } catch {} },
};

// 메시지 식별자 — 결과를 직접 고칠 때 "어느 문서인지" 찾는 열쇠
let uidSeq = 0;
const uid = () => `m${++uidSeq}_${Math.random().toString(36).slice(2, 8)}`;

// payload 안의 깊은 값을 불변으로 교체 (인라인 편집용)
// path 예: ["daily","days",0,"playEval"]
function setPath(obj, path, value) {
  if (!path.length) return value;
  const [head, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  copy[head] = setPath(copy[head], rest, value);
  return copy;
}
// Supabase user → 앱에서 쓰는 형태로 변환
// 구글/카카오는 이름·사진을 user_metadata 에, 가입 경로를 app_metadata.provider 에 담아 줍니다.
// 카카오는 이메일 제공 동의를 안 하면 email 이 비어 올 수 있어 모두 널 안전하게 처리.
const mapUser = (u) => ({
  id: u.id,
  email: u.email || u.user_metadata?.email || null,
  name:
    u.user_metadata?.name ||
    u.user_metadata?.full_name ||
    u.user_metadata?.user_name ||
    u.user_metadata?.preferred_username ||
    (u.email ? u.email.split("@")[0] : "선생님"),
  provider: u.app_metadata?.provider || "email",
  avatar: u.user_metadata?.avatar_url || u.user_metadata?.picture || null,
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
const PLAN_DOCS = { free: 1, basic: 3, pro: 6 };
// 플랜별 월 생성 횟수 (서버 api/_guard.js 의 PLAN_QUOTA 와 반드시 같은 값이어야 합니다)
const PLAN_QUOTA = { free: 3, basic: 500, pro: 2000 };
const PLAN_NAME = { free: "무료", basic: "Basic", pro: "Pro" };

// 이 문서를 쓰려면 최소 어떤 플랜이 필요한지 (MODES 순서 기준)
const planForMode = (key) => {
  const i = MODES.findIndex((m) => m.key === key);
  if (i < PLAN_DOCS.free) return "free";
  if (i < PLAN_DOCS.basic) return "basic";
  return "pro";
};
// 그 플랜에서 새로 열리는 문서 이름들 — 페이월에서 "무엇을 얻는지" 구체적으로 보여주기 위함
const docsOfPlan = (planKey) => {
  const from = planKey === "basic" ? PLAN_DOCS.free : PLAN_DOCS.basic;
  const to = PLAN_DOCS[planKey] ?? 0;
  return MODES.slice(from, to).map((m) => m.label);
};

const PLANS = [
  {
    key: "free", name: "무료", price: "₩0", period: "",
    tagline: "먼저 가볍게 써보세요",
    features: ["놀이 활동 1종", "월 3회 생성", "표 서식 그대로 복사"],
    cta: "무료로 시작",
  },
  {
    key: "basic", name: "Basic", price: "₩9,900", period: "/월", highlight: true,
    tagline: "매주 서류를 쓰는 선생님께",
    features: ["문서 3종 (놀이활동 · 보육일지 · 관찰일지)", "월 500회 생성", "워드·한글 파일 내려받기", "문서 보관함 · 결과 직접 수정"],
    cta: "Basic 시작하기",
  },
  {
    key: "pro", name: "Pro", price: "₩19,900", period: "/월",
    tagline: "모든 서류를 한 번에",
    features: ["문서 6종 전체 (알림장 · 적응일지 · 상담일지 포함)", "월 2,000회 생성", "워드·한글 파일 내려받기", "문서 보관함 · 우선 처리"],
    cta: "Pro 시작하기",
  },
];

// 생성 버튼을 누르기 전에 반드시 채워야 하는 값.
// 비어 있으면 AI 가 날짜·아동 정보를 임의로 지어내므로 미리 막습니다.
const REQUIRED = {
  play: [],
  daily: [["dailyWeek", "주차"], ["dailyMemo", "이번 주 놀이·활동 메모"]],
  obs: [["child", "아동(이니셜)"], ["obsPeriod", "관찰 월"], ["memo", "관찰 메모"]],
  note: [["child", "아동(이니셜)"], ["todayHi", "오늘 활동·하이라이트"]],
  adapt: [["child", "아동(이니셜)"], ["adaptStart", "적응 시작일"], ["adaptMemo", "적응 모습 메모"]],
  counsel: [["child", "원아명"], ["counselMemo", "상담 메모"]],
};
const missingFields = (mode, form) =>
  (REQUIRED[mode] || []).filter(([k]) => !String(form[k] || "").trim()).map(([, label]) => label);

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
    eta: 10,
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
    eta: 45,
    free: '"요일별 평가 자세히", "일과 내용 보강"처럼 다듬어요',
    // 요일별 3항목(300자+200자+불릿2 이상) × 6일 + 주간평가 600자 이상.
    // 최소 분량 규정이라 출력이 길어지므로 넉넉하게 — 모자라면 JSON 이 잘려 파싱에 실패함
    tokens: 16000,
    system: `당신은 한국 어린이집 보육 전문가입니다. 교사의 주간 메모를 바탕으로, 실제 어린이집 양식에 맞는 '주간 보육일지'를 작성합니다.
- 대상 연령(영아/유아) 발달과 놀이중심·아이 주도 관점.
★ 문체(가장 중요, 예외 없음): 보육일지 본문의 "모든" 텍스트를 개조식으로 작성합니다.
  적용 대상 — schedule[].content, areas[].content, outdoor, days 의 playEval·supportPlan·reading, weekEval, safety, special 전부.
  개조식 = 명사형으로 끝내거나 '~함 / ~임 / ~하도록 지원함 / ~필요함' 처럼 끊어 쓰는 방식.
  '~습니다 / ~했어요 / ~입니다 / ~해요' 같은 완결 서술형 종결어미는 절대 사용 금지.
  예) (X) 블록을 높이 쌓으며 즐거워했습니다.  (O) 블록을 높이 쌓으며 즐거워함.
  예) (X) 다양한 재료를 준비해 주려고 합니다.  (O) 다양한 재료 준비 및 제공 예정.
  단, JSON 의 reply 필드만은 교사에게 건네는 안내말이므로 예외로 다정한 존댓말 1문장.
- schedule(하루 일과)에는 아래 시간대 행을 순서대로 모두 포함하고, 각 content는 해당 연령 발달에 맞게 한 줄로 작성:
  등원 및 통합보육(07:30~09:00), 오전간식 및 배변활동(09:00~09:40), 기본생활습관(""), 정리정돈 및 배변활동(10:40~10:50), 배변활동 및 손 씻기(11:30~11:40), 점심식사·이 닦기(11:40~12:30), 낮잠준비 및 낮잠(12:30~14:30), 오후간식 및 배변활동(14:30~15:00), 오후 실내놀이 및 하원(15:00~16:00), 연장반 보육 및 귀가(16:00~19:30).
- areas(오전 실내놀이 09:40~10:40)는 영역별(신체 / 언어 / 감각·탐색 / 안전) 놀이. outdoor는 실외놀이(10:50~11:30).
- days(실행 놀이 평가 및 지원계획)는 메모에 있는 요일만 작성하되, 각 요일마다 아래 3개 항목을 모두 채웁니다.
  · playEval — 놀이평가(배움읽기): 그날 관찰된 놀이 장면과 아이의 반응·배움.
    한글 기준 "최소 300자 이상"(공백 포함). 짧게 끝내지 말고, 놀이 장면·또래 상호작용·아이의 말과 행동·읽어낸 배움을
    구체적으로 덧붙여 300자를 반드시 넘길 것.
  · supportPlan — 놀이와 배움지원계획: 이어질 놀이를 위한 교사의 환경 구성·상호작용 지원 계획.
    한글 기준 "최소 200자 이상"(공백 포함). 자료·공간·교사 개입·확장 방향을 나누어 적어 200자를 반드시 넘길 것.
  · reading — 배움읽기: 놀이에서 읽어낸 배움을 누리과정·표준보육과정 관점으로 정리한 문자열 배열.
    "정확히 2개"만 넣고, 각 항목은 한 줄로 최소 30자 이상.
- week은 설정 [주간]의 라벨을 그대로 사용하고, days의 날짜·요일도 설정 [주간]에 제시된 날짜만 사용합니다(임의로 계산하지 않음).
- weekEval(주간 보육 평가)은 한글 기준 "최소 600자 이상"(공백 포함)으로 충분히 길게 작성합니다.
  3~4개 문단으로 나누고, 문단과 문단 사이는 반드시 빈 줄 하나(\\n\\n)로 띄웁니다.
  분량이 길어도 위 ★ 문체 규칙을 그대로 지켜 끝까지 개조식으로 작성합니다.
- 글자 수 규정이 있는 항목은 규정을 채우는 것이 최우선입니다. 분량이 모자라면 내용을 더 구체적으로 풀어 반드시 채웁니다.
반드시 아래 JSON "하나만" 출력(설명·마크다운·코드펜스 금지):
{"reply":"1문장 안내","daily":{"week":"","klass":"","age":"","theme":"","nextTheme":"","schedule":[{"time":"07:30~09:00","name":"등원 및 통합보육","content":""}],"areas":[{"area":"신체","content":""},{"area":"언어","content":""},{"area":"감각·탐색","content":""},{"area":"안전","content":""}],"outdoor":"","days":[{"day":"7/8(월)","playEval":"","supportPlan":"","reading":["",""]}],"weekEval":"주간 보육 평가","safety":"안전교육(감염병예방·비상대응훈련)","special":"반 운영 특이사항"}}`,
    user: (f, free) => {
      const wi = weekInfo(f.dailyWeek);
      const weekLine = wi ? `주간:${wi.label} (${wi.days.join(", ")})` : "주간:미기재";
      return `[설정] ${weekLine} · 반:${f.klass || "우리반"} · 연령:${f.age} · 주제:${f.dailyTheme || "미정"}${f.dailyNext ? " · 다음주제:" + f.dailyNext : ""}${f.dailySafety ? " · 안전교육:" + f.dailySafety : ""}\n[이번 주 놀이·활동·있었던 일 메모] ${f.dailyMemo || "(메모 없음 — 주제에 맞춰 예시로 작성)"}\n[요청] ${free || "위 내용으로 주간 보육일지를 작성해줘"}`;
    },
    label: () => "주간 보육일지 작성",
  },
  obs: {
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
    user: (f, free) => {
      const mr = monthRange(f.obsPeriod);
      const periodLine = mr ? `관찰기간:${mr}` : (f.obsPeriod ? `관찰기간:${f.obsPeriod}` : "관찰기간:미기재");
      return `[설정] 아동:${f.child || "○○"} · 성별:${f.gender || "미기재"} · 생년월일/월령:${f.birth || "미기재"} · ${periodLine} · 기록자:${f.recorder || "미기재"} · 연령:${f.age}\n[관찰 메모] ${f.memo || "(메모 없음 — 연령·영역에 맞춰 예시로 작성)"}\n[요청] ${free || "위 메모로 관찰기록을 작성해줘"}`;
    },
    label: () => "관찰일지 작성",
  },
  note: {
    btn: "알림장 만들기",
    eta: 8,
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
    eta: 22,
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
  const [view, setView] = useState("landing");   // landing | auth | app | legal
  const [legalTab, setLegalTab] = useState("terms"); // terms | privacy
  const [legalFrom, setLegalFrom] = useState("landing"); // 약관을 열기 직전 화면 (돌아갈 곳)
  const [plan, setPlan] = useState("free");        // free | basic | pro
  const [showPricing, setShowPricing] = useState(false);
  const [paywall, setPaywall] = useState(null);    // { need:"basic"|"pro", reason:"lock"|"quota", msg }
  const [signupWall, setSignupWall] = useState(null); // 게스트에게 로그인을 청하는 지점 (문구가 상황마다 다름)
  const [authMode, setAuthMode] = useState("login"); // login | signup
  const [pendingPlan, setPendingPlan] = useState("free"); // 로그인 후 적용할 플랜
  const [user, setUser] = useState(null);            // 로그인한 사용자
  const [isAdmin, setIsAdmin] = useState(false);     // 관리자 — 요금제와 무관하게 6종 전체 개방
  const [usage, setUsage] = useState(0);             // 이번 달 생성 횟수
  const [guestUsed, setGuestUsed] = useState(() => Number(ls.get(GUEST_USED_KEY, "0")) || 0);
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
  const [openDoc, setOpenDoc] = useState({});        // 메뉴별로 펼쳐둔 문서 인덱스
  const [query, setQuery] = useState("");            // 보관함 검색어
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);         // 생성 경과 초 (대기 기대치 관리)
  const scroller = useRef(null);
  const messages = threads[mode];
  const isGuest = !user;
  // 생성 결과를 (요청 → 결과) 묶음 목록으로 만들어 접었다 펼침.
  // openDoc[mode] 가 undefined 면 "가장 최근 문서를 펼친다"는 뜻이고,
  // 사용자가 헤더를 누르면 그 선택(다른 인덱스 또는 null=전부 접기)을 유지.
  const allTurns = toTurns(messages);
  const turns = filterTurns(allTurns, query);
  const docCount = allTurns.filter((t) => t.bot && !t.bot.error).length;
  const lastDocIdx = allTurns.reduce((acc, t, i) => (t.bot ? i : acc), -1);
  const openIdx = openDoc[mode] === undefined ? lastDocIdx : openDoc[mode];
  const cur = MODES.find((m) => m.key === mode);
  const allowedCount = isAdmin ? MODES.length : (PLAN_DOCS[plan] || 1);
  // 게스트 체험은 첫 문서(놀이 활동)만 열어 둡니다.
  const isLocked = (key) =>
    isGuest ? key !== MODES[0].key : MODES.findIndex((m) => m.key === key) >= allowedCount;
  const quota = PLAN_QUOTA[plan] ?? PLAN_QUOTA.free;
  const quotaLeft = isAdmin ? Infinity : Math.max(0, quota - usage);
  const guestLeft = Math.max(0, GUEST_LIMIT - guestUsed);
  const missing = missingFields(mode, form);
  const canGenerate = !loading && missing.length === 0;

  useEffect(() => {
    // 결과 영역이 페이지 흐름으로 늘어나므로, 새 메시지를 페이지 스크롤로 보이게 함
    scroller.current?.lastElementChild?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [messages, loading]);

  // 생성 중 경과 시간 — "얼마나 더 기다려야 하는지" 보여주면 이탈이 크게 줄어듭니다
  useEffect(() => {
    if (!loading) { setElapsed(0); return; }
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [loading]);

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
      if (d.user_text) next[d.kind].push({ role: "user", uid: uid(), text: d.user_text });
      // docId 를 들고 있어야 결과를 고쳤을 때 그 행을 업데이트/삭제할 수 있습니다
      next[d.kind].push({ role: "bot", uid: uid(), docId: d.id, kind: d.kind, text: d.payload?.reply || "완성했어요!", payload: d.payload });
    }
    setThreads(next);
    setOpenDoc({});   // 불러온 문서는 각 메뉴의 최신 것만 펼친 상태로
  }

  // 이번 달 생성 횟수 조회 (usage_events 는 삭제 정책이 없는 append-only 원장)
  async function loadUsage(userId) {
    if (!supabase) return;
    const d = new Date();
    const from = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
    const { count } = await supabase
      .from("usage_events")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", from);
    setUsage(count || 0);
  }

  // 체험으로 만든 문서를 계정으로 옮겨 담기 — 로그인했다고 결과가 사라지면 안 되니까
  async function claimGuestDoc(userId) {
    const raw = ls.get(GUEST_DOC_KEY);
    if (!raw) return;
    ls.del(GUEST_DOC_KEY);
    try {
      const g = JSON.parse(raw);
      await supabase.from("documents").insert({
        user_id: userId, kind: g.kind, user_text: g.userText, form: g.form, payload: g.payload,
      });
    } catch { /* 옮기기 실패해도 로그인 흐름은 막지 않음 */ }
  }

  // Supabase 세션 감지 — 로그인/OAuth 복귀 시 앱으로 진입
  useEffect(() => {
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(mapUser(session.user));
        if (event === "SIGNED_IN" || event === "INITIAL_SESSION") {
          // 체험 결과를 먼저 계정으로 옮긴 뒤 목록을 불러와야 방금 만든 문서가 보입니다
          claimGuestDoc(session.user.id).finally(() => loadDocs(session.user.id));
          loadProfile(session.user);   // 요금제/마지막 접속 동기화 + 추적
          loadAdmin(session.user.id);  // 관리자 여부 확인
          loadUsage(session.user.id);  // 이번 달 사용량
          // OAuth 는 페이지를 떠났다 돌아오므로 state 가 초기화됩니다.
          // 로그인 전에 고른 문서를 여기서 되살려, 엉뚱한 화면으로 떨어지지 않게 합니다.
          const want = ls.get(PENDING_MODE_KEY);
          ls.del(PENDING_MODE_KEY);
          if (want && MODES.some((m) => m.key === want)) setMode(want);
        }
        if (event === "SIGNED_IN") setView("app");
      } else {
        setUser(null);
        setIsAdmin(false);
        setUsage(0);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 체험으로 만든 결과는 새로고침해도 남아 있어야 합니다.
  // (로그인 전에는 DB 에 못 넣으므로 브라우저에 보관해 두었다가 여기서 되살립니다)
  useEffect(() => {
    if (user) return;
    const raw = ls.get(GUEST_DOC_KEY);
    if (!raw) return;
    try {
      const g = JSON.parse(raw);
      if (!EMPTY_THREADS[g.kind]) return;
      setThreads((t) => (t[g.kind].length ? t : {
        ...t,
        [g.kind]: [
          { role: "user", uid: uid(), text: g.userText },
          { role: "bot", uid: uid(), kind: g.kind, text: g.payload?.reply || "완성했어요!", payload: g.payload },
        ],
      }));
    } catch {}
  }, [user]);

  // 로그인 후 첫 진입에서 잠긴 문서를 고른 상태라면, 입력하기 "전에" 알려줍니다.
  // (예전에는 폼을 다 채우고 생성 버튼을 눌러야 페이월이 떠서 노동이 통째로 버려졌습니다)
  const greeted = useRef(false);
  useEffect(() => {
    if (view !== "app" || !user || greeted.current) return;
    greeted.current = true;
    if (isLocked(mode)) {
      const need = planForMode(mode);
      setPaywall({ need, reason: "lock", modeLabel: MODES.find((m) => m.key === mode)?.label });
    }
  }, [view, user, mode]);

  // 관리자 명단(admins)에 있으면 요금제와 상관없이 문서 6종 전부 개방.
  // 테이블이 아직 없거나 조회에 실패하면 조용히 일반 회원으로 취급.
  async function loadAdmin(userId) {
    if (!supabase) return;
    const { data } = await supabase.from("admins").select("id").eq("id", userId).maybeSingle();
    setIsAdmin(!!data);
  }

  // 회원 프로필(요금제·SNS 정보)을 서버와 동기화하고, 마지막 접속 시각을 기록해 추적
  async function loadProfile(sessionUser) {
    if (!supabase || !sessionUser) return;
    // 랜딩에서 고른 대기 플랜(가입 직후 적용용)
    const pend = normPlan(ls.get(PENDING_PLAN_KEY, "free"));
    ls.del(PENDING_PLAN_KEY);

    const { data } = await supabase
      .from("profiles").select("plan, name").eq("id", sessionUser.id).maybeSingle();
    const serverPlan = normPlan(data?.plan);
    // 서버 플랜과 대기 플랜 중 상위 등급을 적용
    const effective = (PLAN_RANK[pend] || 0) > (PLAN_RANK[serverPlan] || 0) ? pend : serverPlan;
    setPlan(effective);

    // 프로필 갱신(마지막 접속 + 확정 플랜 + SNS 정보).
    // DB 트리거가 행을 못 만든 경우(예: 트리거 생성 전에 가입한 회원)도 여기서 보강됩니다.
    const me = mapUser(sessionUser);
    const { error: upErr } = await supabase.from("profiles").upsert({
      id: me.id,
      email: me.email,
      name: me.name,
      provider: me.provider,
      avatar_url: me.avatar,
      plan: effective,
      last_seen_at: new Date().toISOString(),
    }, { onConflict: "id" });
    // 화면 흐름은 막지 않되, 원인을 찾을 수 있게 콘솔에는 남깁니다.
    if (upErr) console.warn("[민트쌤] profiles 저장 실패 — schema.sql 을 실행했는지 확인하세요.", upErr.message);
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

  // 생성된 문서를 DB에 저장하고, 만들어진 행의 id 를 돌려줍니다(이후 수정/삭제에 필요).
  async function saveDocument(kind, userText, formSnapshot, payload) {
    if (!supabase || !user) return null;
    try {
      const { data } = await supabase.from("documents").insert({
        user_id: user.id, kind, user_text: userText, form: formSnapshot, payload,
      }).select("id").single();
      return data?.id || null;
    } catch { return null; } // 저장 실패는 조용히 무시 (화면 흐름 유지)
  }

  // 결과를 앱 안에서 직접 고친 내용을 반영 (화면 + DB)
  async function editField(msgUid, docId, path, value) {
    let updated = null;
    setThreads((t) => ({
      ...t,
      [mode]: t[mode].map((m) => {
        if (m.uid !== msgUid) return m;
        updated = setPath(m.payload, path, value);
        return { ...m, payload: updated };
      }),
    }));
    if (supabase && user && docId && updated) {
      try { await supabase.from("documents").update({ payload: updated }).eq("id", docId); } catch {}
    }
  }

  // 문서 한 건 삭제 (보관함)
  async function deleteDoc(turn) {
    const docId = turn.bot?.docId;
    const uids = [turn.user?.uid, turn.bot?.uid].filter(Boolean);
    setThreads((t) => ({ ...t, [mode]: t[mode].filter((m) => !uids.includes(m.uid)) }));
    setOpenDoc((o) => { const n = { ...o }; delete n[mode]; return n; });
    if (supabase && user && docId) {
      try { await supabase.from("documents").delete().eq("id", docId); } catch {}
    }
  }

  async function logout() {
    try { await supabase?.auth.signOut(); } catch {}
    setUser(null);
    setIsAdmin(false);
    setThreads(EMPTY_THREADS);
    setUsage(0);
    setView("landing");
  }

  async function send(rawText, retryOf) {
    if (loading) return;
    if (isLocked(mode)) {
      // 게스트에게는 "가입하면 열려요", 회원에게는 "이 플랜부터 열려요"
      if (isGuest) setSignupWall({ kind: "lockedDoc", modeLabel: cur.label });
      else setPaywall({ need: planForMode(mode), reason: "lock", modeLabel: cur.label });
      return;
    }
    if (isGuest && guestLeft <= 0) { setSignupWall({ kind: "guestOver" }); return; }
    if (!isGuest && quotaLeft <= 0) {
      setPaywall({ need: plan === "free" ? "basic" : "pro", reason: "quota" });
      return;
    }
    const miss = missingFields(mode, form);
    if (miss.length) return; // 버튼이 이미 비활성 — 방어용

    const cfg = CFG[mode];
    const free = (rawText ?? input).trim();
    const display = free || cfg.label();
    // 재시도는 실패한 말풍선만 걷어내고 같은 요청을 다시 보냅니다(입력은 그대로 유지)
    const base = retryOf
      ? threads[mode].filter((m) => m.uid !== retryOf)
      : threads[mode];
    const next = [...base, { role: "user", uid: uid(), text: display }];
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
      // 로그인 상태면 액세스 토큰을 함께 보내 서버가 요금제 한도를 검증하게 합니다.
      const token = (await supabase?.auth.getSession())?.data?.session?.access_token;
      // 콜론(:generateContent)이 URL 에 있으면 Vercel 라우팅이 실패하므로,
      // 경로는 /api/gemini 로 고정하고 모델은 body 로 전달 → 함수가 서버에서 조립
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          model: GEMINI_MODEL,
          kind: mode,
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
      // 한도 초과는 "실패"가 아니라 안내 — 말풍선 대신 요금제 화면으로 보냅니다
      if (res.status === 429) {
        setThreads((t) => ({ ...t, [mode]: base }));
        if (isGuest) setSignupWall({ kind: "guestOver" });
        else setPaywall({ need: plan === "free" ? "basic" : "pro", reason: "quota", msg: data.error?.message });
        return;
      }
      if (!res.ok || data.error) throw new Error(data.error?.message || "api error");
      const text = (data.candidates?.[0]?.content?.parts || []).map((b) => b.text || "").join("").trim();
      const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
      let p = null;
      try { p = JSON.parse(clean); } catch { const mm = clean.match(/\{[\s\S]*\}/); if (mm) p = JSON.parse(mm[0]); }
      if (!p) throw new Error("parse");   // 깨진 결과를 그대로 보여주지 않고 재시도 경로로 보냄

      const botUid = uid();
      setThreads((t) => ({
        ...t,
        [mode]: [...t[mode], { role: "bot", uid: botUid, kind: mode, text: p.reply || "완성했어요!", payload: p }],
      }));

      if (user) {
        const docId = await saveDocument(mode, display, form, p);
        if (docId) setThreads((t) => ({ ...t, [mode]: t[mode].map((m) => (m.uid === botUid ? { ...m, docId } : m)) }));
        // 서버가 사용량을 못 적은 경우(SERVICE_ROLE 키 미설정)에만 클라이언트가 대신 기록
        if (res.headers.get("X-Usage-Counted") !== "1") {
          try { await supabase.from("usage_events").insert({ user_id: user.id, kind: mode }); } catch {}
        }
        setUsage((n) => n + 1);
      } else {
        // 체험 결과는 브라우저에 임시 보관 → 로그인하면 계정으로 옮겨 담습니다
        const n = guestUsed + 1;
        setGuestUsed(n);
        ls.set(GUEST_USED_KEY, String(n));
        ls.set(GUEST_DOC_KEY, JSON.stringify({ kind: mode, userText: display, form, payload: p }));
      }
    } catch {
      setThreads((t) => ({
        ...t,
        [mode]: [...t[mode], {
          role: "bot", uid: uid(), kind: mode, error: true,
          text: "결과를 받아오지 못했어요. 입력하신 내용은 그대로 있으니 다시 시도해 주세요. 🥲",
        }],
      }));
    } finally {
      setLoading(false);
      // 새로 만든 문서가 펼쳐진 상태로 보이도록 이 메뉴의 선택을 초기화
      setOpenDoc((o) => { const n = { ...o }; delete n[mode]; return n; });
    }
  }

  // 이 메뉴의 문서를 전부 비웁니다. 예전에는 화면만 지우고 DB 는 남아
  // 다음 로그인 때 되살아났기 때문에, 저장본까지 함께 지우고 먼저 확인을 받습니다.
  const reset = async () => {
    const has = messages.length > 0;
    if (!has) return;
    const saved = messages.filter((m) => m.docId).length;
    const ok = window.confirm(
      saved > 0
        ? `이 메뉴에 저장된 문서 ${saved}건이 영구 삭제됩니다. 계속할까요?`
        : "이 메뉴의 결과를 모두 지울까요?"
    );
    if (!ok) return;
    const ids = messages.map((m) => m.docId).filter(Boolean);
    setThreads((t) => ({ ...t, [mode]: [] }));
    setOpenDoc((o) => { const n = { ...o }; delete n[mode]; return n; });
    setQuery("");
    if (supabase && user && ids.length) {
      try { await supabase.from("documents").delete().in("id", ids); } catch {}
    }
  };
  const choosePlan = (key) => { savePlan(key); setShowPricing(false); setPaywall(null); setView("app"); };
  // 약관/방침은 어디서 열었든 원래 있던 화면으로 정확히 돌아가야 흐름이 끊기지 않습니다
  const openLegal = (tab) => { setLegalTab(tab); setLegalFrom(view); setView("legal"); };
  // 요금제 버튼 → 로그인 페이지로. 선택한 플랜은 로그인 후 적용.
  // 이미 로그인돼 있으면 바로 앱으로.
  const goAuth = (key = "free", m = "login") => {
    ls.set(PENDING_PLAN_KEY, key);
    ls.set(PENDING_MODE_KEY, mode);   // OAuth 로 페이지를 떠나도 고른 문서를 잃지 않게
    setPendingPlan(key); setShowPricing(false); setPaywall(null); setSignupWall(null);
    if (user) { savePlan(key); setView("app"); return; }
    setAuthMode(m); setView("auth");
  };

  // 랜딩의 "무료로 시작하기" — 가입 없이 바로 만들어 볼 수 있어야 랜딩의 약속과 맞습니다.
  // 이미 체험을 다 쓴 사람은 그때 가입을 청합니다.
  const startTrial = () => {
    setShowPricing(false);
    if (user) { setView("app"); return; }
    setMode(MODES[0].key);
    // 체험을 이미 다 썼더라도 여기서 가입을 청하지 않습니다.
    // 먼저 만들어 둔 결과를 보게 두고, "한 번 더 만들려 할 때" 청해야 가입 이유가 생깁니다.
    setView("app");
  };

  // 랜딩의 문서 카드 → 그 메뉴를 선택한 채로 앱으로.
  // 잠긴 문서는 "가입/업그레이드가 필요하다"고 여기서 먼저 알려, 입력 노동을 버리지 않게 합니다.
  const goDoc = (key) => {
    setMode(key);
    ls.set(PENDING_MODE_KEY, key);
    setShowPricing(false);
    const locked = user
      ? MODES.findIndex((m) => m.key === key) >= (isAdmin ? MODES.length : PLAN_DOCS[plan] || 1)
      : key !== MODES[0].key;
    setView("app");
    if (!locked) return;
    const label = MODES.find((m) => m.key === key)?.label;
    if (user) setPaywall({ need: planForMode(key), reason: "lock", modeLabel: label });
    else setSignupWall({ kind: "lockedDoc", modeLabel: label });
  };

  if (view === "landing") {
    return (
      <>
        <Landing
          user={user}
          plan={plan}
          onStart={startTrial}
          onOpenPricing={() => setShowPricing(true)}
          onChoose={(key) => (key === "free" && !user ? startTrial() : goAuth(key))}
          onPickDoc={goDoc}
          onLogin={() => { setAuthMode("login"); setView("auth"); }}
          onLegal={openLegal}
          lockOf={(key) => (key === MODES[0].key ? null : planForMode(key))}
        />
        {showPricing && (
          <PricingModal plan={user ? plan : undefined}
            onChoose={(key) => (key === "free" && !user ? startTrial() : goAuth(key))}
            onClose={() => setShowPricing(false)} />
        )}
      </>
    );
  }

  if (view === "auth") {
    return (
      <AuthPage
        mode={authMode}
        setMode={setAuthMode}
        onHome={() => setView("landing")}
        onLegal={openLegal}
      />
    );
  }

  if (view === "legal") {
    return <LegalPage tab={legalTab} setTab={setLegalTab} onHome={() => setView(legalFrom === "legal" ? "landing" : legalFrom)} />;
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
          {isGuest ? (
            <button style={styles.planFree} onClick={() => { setAuthMode("signup"); setView("auth"); }}>
              체험 중 · 가입하기
            </button>
          ) : isAdmin ? (
            <span style={styles.planPro} title="관리자 — 문서 6종 전체 이용">👑 관리자</span>
          ) : plan === "pro" ? (
            <span style={styles.planPro} title={`이번 달 ${usage}/${quota}회 사용`}>✨ Pro</span>
          ) : (
            <button style={styles.planFree} onClick={() => setShowPricing(true)}>
              {PLAN_NAME[plan]} · 업그레이드
            </button>
          )}
          {user && (
            <button style={styles.userChip} onClick={logout} title={`${user.email || user.name} · 눌러서 로그아웃`}>
              {user.avatar
                ? <img src={user.avatar} alt="" style={styles.avatar} referrerPolicy="no-referrer" />
                : <span style={styles.avatarFallback}>{(user.name || "쌤").slice(0, 1)}</span>}
              <span style={styles.userName}>{user.name}</span>
              <LogOut size={13} style={{ color: "#A9C3B9", flexShrink: 0 }} />
            </button>
          )}
        </div>
      </header>

      {/* 남은 횟수 — 한도가 있다는 사실을 소진 직전이 아니라 미리 알려줍니다 */}
      <div style={styles.quotaBar}>
        {isGuest ? (
          <span>
            🌿 가입 없이 <b>{guestLeft}회</b> 더 만들어 볼 수 있어요.
            <button style={styles.linkBtn} onClick={() => { setAuthMode("signup"); setView("auth"); }}>가입하고 저장하기</button>
          </span>
        ) : isAdmin ? (
          <span>👑 관리자 — 문서 6종 · 생성 무제한</span>
        ) : (
          <span>
            이번 달 <b>{usage}</b> / {quota.toLocaleString()}회 사용
            {quotaLeft <= Math.max(1, Math.floor(quota * 0.1)) && (
              <button style={styles.linkBtn} onClick={() => setShowPricing(true)}>요금제 올리기</button>
            )}
          </span>
        )}
      </div>

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
                const needPlan = PLAN_NAME[planForMode(m.key)];
                return (
                  <button key={m.key}
                    onClick={() => {
                      setMenuOpen(false);
                      // 잠긴 문서는 폼을 채우기 "전에" 알려 노동이 버려지지 않게 합니다
                      if (!locked) { setMode(m.key); setQuery(""); return; }
                      if (isGuest) setSignupWall({ kind: "lockedDoc", modeLabel: m.label });
                      else setPaywall({ need: planForMode(m.key), reason: "lock", modeLabel: m.label });
                    }}
                    style={{ ...styles.menuItem, ...(on ? styles.menuItemOn : {}), ...(locked ? { color: "#A9C3B9" } : {}) }}>
                    <span style={{ fontSize: 15, opacity: locked ? 0.5 : 1 }}>{m.emoji}</span>
                    <span>{m.label}</span>
                    {locked
                      ? <span style={styles.lockTag}>🔒 {isGuest ? "가입" : needPlan}</span>
                      : on ? <Check size={15} style={{ marginLeft: "auto", color: "#2E9E86" }} /> : null}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 모드별 입력 패널 — 잠긴 문서는 폼 자체를 열지 않습니다.
          채울 수 있게 두면 다 적고 나서 막히는(= 노동이 통째로 버려지는) 흐름이 되풀이됩니다. */}
      <section style={styles.panel}>
        {isLocked(mode) ? (
          <LockedPanel
            label={cur.label}
            guest={isGuest}
            need={planForMode(mode)}
            onOpen={() => (isGuest
              ? setSignupWall({ kind: "lockedDoc", modeLabel: cur.label })
              : setPaywall({ need: planForMode(mode), reason: "lock", modeLabel: cur.label }))}
            onFallback={() => setMode(MODES[0].key)}
          />
        ) : (
          <>
            <div style={styles.privacyNote}>
              🔒 아이 <b>실명 대신 이니셜·별명</b>을 권해요. 입력하신 내용은 문서를 만드는 데에만 쓰이고, 본인만 볼 수 있어요.
            </div>
            {mode === "play" && <PlayPanel form={form} setF={setF} toggleDomain={toggleDomain} />}
            {mode === "daily" && <DailyPanel form={form} setF={setF} />}
            {mode === "obs" && <ObsPanel form={form} setF={setF} />}
            {mode === "note" && <NotePanel form={form} setF={setF} />}
            {mode === "adapt" && <AdaptPanel form={form} setF={setF} />}
            {mode === "counsel" && <CounselPanel form={form} setF={setF} />}
            <button
              style={{ ...styles.genBtn, ...(canGenerate ? {} : styles.genBtnOff) }}
              onClick={() => send("")}
              disabled={!canGenerate}
              title={missing.length ? `${missing.join(", ")}을(를) 먼저 채워주세요` : CFG[mode].btn}>
              {loading ? <Loader2 size={16} className="spin" /> : <span>✏️</span>} {CFG[mode].btn}
            </button>
            {missing.length > 0 && (
              <div style={styles.needHint}>
                ✏️ <b>{missing.join(" · ")}</b> 을(를) 채우면 만들 수 있어요.
                <span style={styles.needWhy}> 비워 두면 날짜·아이 정보를 지어내서 다시 써야 해요.</span>
              </div>
            )}
          </>
        )}
      </section>

      <main ref={scroller} style={styles.thread}>
        {messages.length === 0 && !isLocked(mode) && (
          <EmptyState mode={mode} onPick={send} disabled={!canGenerate} />
        )}

        {/* 보관함 도구 — 검색창은 문서가 쌓이기 시작할 때만 (한두 건일 땐 방해가 됩니다) */}
        {allTurns.some((t) => t.bot) && (
          <div style={styles.searchRow}>
            {docCount >= 3 ? (
              <>
                <Search size={15} style={{ color: "#A9C3B9", flexShrink: 0 }} />
                <input value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="저장된 문서 검색 (아이 이름·주차·내용)" style={styles.searchInput} />
                {query && <button style={styles.searchClear} onClick={() => setQuery("")}>지우기</button>}
              </>
            ) : (
              <span style={styles.searchCount}>📄 {docCount}건</span>
            )}
            <button style={styles.searchClear} onClick={reset} title="이 메뉴의 문서 모두 삭제">
              <RotateCcw size={13} /> 비우기
            </button>
          </div>
        )}
        {query && turns.length === 0 && (
          <div style={styles.emptySearch}>‘{query}’ 와 맞는 문서가 없어요.</div>
        )}

        {turns.map((t) =>
          // 아직 결과가 안 온 요청(생성 중)은 접지 않고 그대로 노출
          !t.bot ? (
            <div key={t.user.uid} style={styles.userBubble}>{t.user.text}</div>
          ) : (
            <DocTurn
              key={t.bot.uid}
              turn={t}
              no={t.no + 1}
              open={openIdx === t.no}
              guest={isGuest}
              canExport={isAdmin || plan !== "free"}
              onToggle={() => setOpenDoc((o) => ({ ...o, [mode]: openIdx === t.no ? null : t.no }))}
              onEdit={(path, value) => editField(t.bot.uid, t.bot.docId, path, value)}
              onDelete={() => deleteDoc(t)}
              onRetry={() => send("", t.bot.uid)}
              onNeedSignup={(kind) => setSignupWall({ kind })}
              onNeedPlan={() => setPaywall({ need: "basic", reason: "export" })}
            />
          )
        )}
        {loading && <Generating eta={CFG[mode].eta || 15} elapsed={elapsed} />}
      </main>

      {/* 이어 말하기 입력창 — 결과가 있어야 의미가 있어서, 그전에는 안내만 보여줍니다 */}
      {isLocked(mode) ? null : messages.length === 0 ? (
        <footer style={styles.inputHintBar}>
          👆 먼저 위에서 <b>{CFG[mode].btn}</b> 를 눌러 만들어 보세요. 결과가 나오면 여기서 “더 짧게”처럼 다듬을 수 있어요.
        </footer>
      ) : (
        <footer style={styles.inputBar}>
          <input value={input} onChange={(e) => setInput(e.target.value)}
            // 한글 입력은 Enter 로 조합을 확정하므로, 조합 중 Enter 를 전송으로 삼으면 두 번 보내집니다
            onKeyDown={(e) => { if (e.key === "Enter" && !e.nativeEvent.isComposing) send(); }}
            placeholder={CFG[mode].free} style={styles.input} />
          <button style={styles.sendBtn} onClick={() => send()} disabled={loading}>
            {loading ? <Loader2 size={19} className="spin" /> : <Send size={19} />}
          </button>
        </footer>
      )}
    </div>
    {showPricing && <PricingModal plan={plan} onChoose={choosePlan} onClose={() => setShowPricing(false)} />}
    {paywall && (
      <PaywallModal
        info={paywall}
        onOpenPricing={() => { setPaywall(null); setShowPricing(true); }}
        onClose={() => setPaywall(null)}
        onFallback={() => { setPaywall(null); setMode(MODES[0].key); }}
      />
    )}
    {signupWall && (
      <SignupWallModal
        info={signupWall}
        onSignup={() => { setSignupWall(null); setAuthMode("signup"); setView("auth"); }}
        onLogin={() => { setSignupWall(null); setAuthMode("login"); setView("auth"); }}
        onClose={() => setSignupWall(null)}
        onFallback={() => { setSignupWall(null); setMode(MODES[0].key); }}
      />
    )}
    </>
  );
}

/* ---------- 잠긴 문서 안내 ---------- */
// 폼 대신 이 화면을 보여줘서, 다 적고 나서 막히는 일이 아예 생기지 않게 합니다.
function LockedPanel({ label, guest, need, onOpen, onFallback }) {
  return (
    <div style={styles.lockPanel}>
      <span style={styles.lockIcon}><Lock size={22} /></span>
      <div style={styles.lockTitle}>
        {guest ? `${label}는 가입 후에 열려요` : `${label}는 ${PLAN_NAME[need]} 플랜부터예요`}
      </div>
      <div style={styles.lockDesc}>
        {guest
          ? "지금은 놀이 활동을 가입 없이 만들어 보실 수 있어요."
          : `${PLAN_NAME[need]} 플랜을 쓰면 ${docsOfPlan(need).join(" · ")}가 함께 열려요.`}
      </div>
      <button style={styles.lockCta} onClick={onOpen}>
        {guest ? "가입하고 열기" : "요금제 보기"}
      </button>
      <button style={styles.lockGhost} onClick={onFallback}>
        {MODES[0].label} 만들러 가기
      </button>
    </div>
  );
}

/* ---------- 생성 중 (예상 시간 안내) ---------- */
// 보육일지는 30~50초가 걸립니다. "만드는 중…"만 띄우면 멈춘 줄 알고 나가버리므로
// 예상 시간과 경과를 함께 보여 줍니다.
function Generating({ eta, elapsed }) {
  const pct = Math.min(96, Math.round((elapsed / eta) * 100));
  const late = elapsed > eta;
  return (
    <div style={styles.genWrap}>
      <div style={styles.loading}>
        <span style={styles.botFace}><Mascot size={30} /></span>
        <span style={styles.bubbleLoad}>
          만드는 중<span className="dot d1">.</span><span className="dot d2">.</span><span className="dot d3">.</span>
          <span style={styles.genTime}>
            {late ? "조금만 더요! 거의 다 됐어요" : `약 ${eta}초 정도 걸려요 · ${elapsed}초`}
          </span>
        </span>
      </div>
      <div style={styles.genTrack}><div style={{ ...styles.genFill, width: `${pct}%` }} /></div>
    </div>
  );
}

/* ---------- 생성 결과 목록 (접기/펼치기) ---------- */
// 대화 메시지를 (요청, 결과) 한 묶음씩으로 그룹핑.
// send() 가 항상 user → bot 순으로 쌓으므로 짝이 맞고,
// 생성 중이거나 불러온 문서에 요청문이 없는 경우도 각각 처리됨.
function toTurns(messages) {
  const turns = [];
  for (const m of messages) {
    const last = turns[turns.length - 1];
    if (m.role === "user") turns.push({ user: m, bot: null, no: turns.length });
    else if (last && !last.bot) last.bot = m;
    else turns.push({ user: null, bot: m, no: turns.length });
  }
  return turns;
}

// 보관함 검색 — 제목뿐 아니라 본문까지 훑습니다(아이 이름·주차로 찾는 경우가 대부분).
function filterTurns(turns, query) {
  const q = query.trim().toLowerCase();
  if (!q) return turns;
  return turns.filter((t) => {
    if (!t.bot) return false;
    const hay = `${docTitle(t.bot)} ${t.user?.text || ""} ${JSON.stringify(t.bot.payload || "")}`.toLowerCase();
    return hay.includes(q);
  });
}

// 접힌 상태에서 무슨 문서인지 알아볼 수 있게 한 줄 요약
function docTitle(bot) {
  const label = MODES.find((m) => m.key === bot.kind)?.label || "문서";
  const p = bot.payload;
  if (!p) return label;
  let detail = "";
  if (p.daily) detail = p.daily.week || "";
  else if (p.observation) detail = [p.observation.child, p.observation.period].filter(Boolean).join(" · ");
  else if (p.adapt) detail = [p.adapt.child, p.adapt.period].filter(Boolean).join(" · ");
  else if (p.counsel) detail = [p.counsel.child, p.counsel.date].filter(Boolean).join(" · ");
  else if (p.activities) detail = arr(p.activities)[0]?.title || "";
  return detail ? `${label} · ${detail}` : label;
}

function DocTurn({ turn, no, open, guest, canExport, onToggle, onEdit, onDelete, onRetry, onNeedSignup, onNeedPlan }) {
  const { user, bot } = turn;

  // 생성이 실패한 자리 — 결과 대신 재시도 버튼을 둡니다(입력값은 폼에 그대로 남아 있음)
  if (bot.error) {
    return (
      <div style={styles.errorBlock}>
        <div style={styles.botRow}>
          <span style={styles.botFace}><Mascot size={30} /></span>
          <div style={styles.botText}>{bot.text}</div>
        </div>
        <button style={styles.retryBtn} onClick={onRetry}>
          <RefreshCw size={14} /> 다시 시도하기
        </button>
      </div>
    );
  }

  return (
    <div style={styles.turnItem}>
      <div style={{ ...styles.turnHead, ...(open ? styles.turnHeadOpen : {}) }}>
        <button style={styles.turnHeadMain} onClick={onToggle} aria-expanded={open}>
          <span style={styles.turnNo}>{no}</span>
          <span style={styles.turnTitle}>{docTitle(bot)}</span>
          <ChevronDown size={17} style={{
            marginLeft: "auto", flexShrink: 0, color: "#7A9A90",
            transition: "transform .15s", transform: open ? "rotate(180deg)" : "none",
          }} />
        </button>
        <button style={styles.iconBtn} title="이 문서 삭제"
          onClick={() => { if (window.confirm("이 문서를 삭제할까요? 되돌릴 수 없어요.")) onDelete(); }}>
          <Trash2 size={14} />
        </button>
      </div>
      {open && (
        <div style={styles.turnBody}>
          {user && <div style={styles.userBubble}>{user.text}</div>}
          <div style={styles.botBlock}>
            <div style={styles.botRow}>
              <span style={styles.botFace}><Mascot size={30} /></span>
              <div style={styles.botText}>{bot.text}</div>
            </div>
            {bot.payload && (
              <Card kind={bot.kind} p={bot.payload}
                guest={guest} canExport={canExport} onEdit={onEdit}
                onNeedSignup={onNeedSignup} onNeedPlan={onNeedPlan} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 결과 직접 고치기 ---------- */
// AI 가 쓴 문장 중 한 줄만 고치고 싶어서 밖으로 복사해 나가면 다시 돌아오지 않습니다.
// 그래서 카드 안의 모든 서술 필드를 눌러서 바로 고칠 수 있게 했습니다.
function Editable({ value, path, onEdit, style, multiline = true, placeholder = "내용을 적어주세요" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const ref = useRef(null);

  useEffect(() => { if (!editing) setDraft(value ?? ""); }, [value, editing]);
  useEffect(() => {
    if (!editing || !ref.current) return;
    ref.current.focus();
    ref.current.style.height = "auto";
    ref.current.style.height = ref.current.scrollHeight + "px";
  }, [editing]);

  // 편집 기능이 연결되지 않은 곳(랜딩 샘플 등)에서는 그냥 글자로만 보여줍니다
  if (!onEdit) return <p style={style}>{value}</p>;

  const commit = () => { setEditing(false); if (draft !== value) onEdit(path, draft); };

  if (editing) {
    return (
      <div style={styles.editWrap}>
        <textarea ref={ref} value={draft} rows={multiline ? undefined : 1}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); }
            // 줄바꿈이 필요한 본문이라 Enter 는 살리고, 저장은 ⌘/Ctrl+Enter 로
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit();
          }}
          style={styles.editArea} placeholder={placeholder} />
        <div style={styles.editBtns}>
          <button style={styles.editSave} onClick={commit}><Check size={13} /> 저장</button>
          <button style={styles.editCancel} onClick={() => { setDraft(value ?? ""); setEditing(false); }}>취소</button>
        </div>
      </div>
    );
  }

  return (
    <p style={{ ...style, ...styles.editable }} onClick={() => setEditing(true)}
      title="눌러서 고치기" className="editable">
      {value || <span style={{ color: "#A9C3B9" }}>{placeholder}</span>}
      <Pencil size={11} className="pen" style={styles.editPen} />
    </p>
  );
}

/* ---------- 랜딩 / 구독 ---------- */
// 랜딩에 그대로 렌더할 결과 샘플. "뭐가 나오는지" 못 보고 가입을 결정하게 두지 않기 위함.
const SAMPLE_OBS = {
  child: "○○", gender: "여", birth: "2021.5.12 / 47개월",
  period: "2026년 3월 1일 ~ 3월 31일", recorder: "김민트",
  areas: [
    {
      area: "사회관계",
      datePlace: "3월 12일 · 교실 역할놀이 영역",
      record: "친구가 병원놀이를 하는 곳으로 다가가 “나도 같이 해도 돼?” 하고 물어본 뒤, 친구가 고개를 끄덕이자 청진기를 들고 의사 역할을 맡았습니다. 인형을 눕히고 “아프지 마세요, 금방 나아요”라고 말하며 친구와 번갈아 진료하는 모습을 보였습니다.",
      interpretation: "또래에게 먼저 놀이를 제안하고 역할을 나누어 맡으며 협동 놀이에 참여하고 있습니다. 상대의 반응을 기다린 뒤 놀이에 들어가는 모습에서 또래 관계 형성 기술이 자라고 있음을 볼 수 있습니다.",
    },
    {
      area: "의사소통",
      datePlace: "3월 19일 · 교실 언어 영역",
      record: "그림책 『코끼리와 친구들』을 보며 “코끼리가 왜 혼자 있어?”라고 묻고, 교사의 대답을 들은 뒤 “나는 친구가 많아서 안 심심해”라고 자기 경험과 연결해 이야기했습니다.",
      interpretation: "이야기 속 상황을 자신의 경험과 연결지어 표현하고 있으며, 궁금한 점을 문장으로 묻는 등 언어를 통한 상호작용이 활발합니다.",
    },
  ],
  summary: "또래와의 놀이에서 먼저 다가가 제안하고 역할을 나누는 모습이 꾸준히 관찰됩니다. 자신의 생각을 문장으로 표현하는 힘도 함께 자라고 있어, 앞으로는 여러 명이 함께하는 협동 놀이 상황을 더 마련해 주려고 합니다.",
};

function Landing({ user, plan, onStart, onOpenPricing, onChoose, onPickDoc, onLogin, onLegal, lockOf }) {
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
          {!user && <button style={styles.navGhost} onClick={onLogin}>로그인</button>}
          <button style={styles.navCta} onClick={onStart}>
            {user ? "이어서 작업하기" : "무료로 시작"}
          </button>
        </div>
      </nav>

      <section style={styles.hero}>
        <div style={styles.heroMascot}><Mascot size={104} /></div>
        <h1 style={styles.heroTitle}>보육교사의 하루,<br />민트쌤이 함께해요</h1>
        <p style={styles.heroSub}>놀이 아이디어부터 관찰일지·알림장·상담일지까지.<br />간단한 메모만 적으면, 제출용 문서로 정리해 드려요.</p>
        <div style={styles.heroCtas}>
          <button style={styles.ctaPrimary} onClick={onStart}>
            {user ? "이어서 작업하기" : "가입 없이 만들어 보기"}
          </button>
          <button style={styles.ctaGhost} onClick={onOpenPricing}>요금제 보기</button>
        </div>
        <div style={styles.heroNote}>
          {user ? "다시 오셨네요! 하던 작업이 그대로 있어요 🌿" : "회원가입 없이 1건 바로 만들어 볼 수 있어요 · 신용카드 불필요"}
        </div>
      </section>

      <section style={styles.featWrap}>
        <div style={styles.sectionTitle}>이런 걸 만들어 드려요</div>
        <div style={styles.featGrid}>
          {MODES.map((m) => {
            // 어떤 문서가 어떤 플랜인지 여기서 미리 알려야, 가입한 뒤에 막히는 일이 없습니다
            const need = lockOf(m.key);
            return (
              <button key={m.key} className="feat-card" style={styles.featCard}
                onClick={() => onPickDoc(m.key)} title={`${m.label} 만들러 가기`}>
                <span style={{ fontSize: 24 }}>{m.emoji}</span>
                <span style={styles.featLabel}>{m.label}</span>
                {need
                  ? <span style={styles.featLock}><Lock size={9} /> {PLAN_NAME[need]}</span>
                  : <span style={styles.featFree}>무료 체험</span>}
              </button>
            );
          })}
        </div>
      </section>

      {/* 결과물 미리보기 — 무엇이 나오는지 보고 결정할 수 있게 실제 카드를 그대로 보여줍니다 */}
      <section style={styles.sampleWrap}>
        <div style={styles.sectionTitle}>이렇게 나와요</div>
        <div style={styles.sampleSub}>아래는 실제 생성 결과 화면이에요. 표 서식 그대로 한글·워드에 붙일 수 있어요.</div>
        <div style={styles.sampleCard}>
          <ObsCard o={SAMPLE_OBS} />
        </div>
        <button style={styles.sampleCta} onClick={onStart}>나도 만들어 보기</button>
      </section>

      <section style={styles.priceWrap}>
        <div style={styles.sectionTitle}>요금제</div>
        <PlanCards plan={user ? plan : undefined} onChoose={onChoose} />
        <div style={styles.demoNote}>
          * 지금은 베타 기간이라 유료 플랜도 결제 없이 바로 이용 상태로 전환됩니다. 결제는 곧 연결될 예정이에요.
        </div>
      </section>

      <footer style={styles.landFoot}>
        <div>민트쌤 · 보육교사를 위한 AI 도우미</div>
        <div style={styles.footLinks}>
          <button style={styles.footLink} onClick={() => onLegal("terms")}>이용약관</button>
          <span style={styles.footDot}>·</span>
          <button style={styles.footLink} onClick={() => onLegal("privacy")}>개인정보처리방침</button>
          <span style={styles.footDot}>·</span>
          <a style={styles.footLink} href="mailto:help@mintssaem.kr">문의하기</a>
        </div>
      </footer>
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

function AuthPage({ mode, setMode, onHome, onLegal }) {
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

          {isSignup && (
            <div style={styles.authLegal}>
              가입하면 <button style={styles.authLegalLink} onClick={() => onLegal?.("terms")}>이용약관</button> 과{" "}
              <button style={styles.authLegalLink} onClick={() => onLegal?.("privacy")}>개인정보처리방침</button> 에 동의하는 것으로 봅니다.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

/* ---------- 이용약관 · 개인정보처리방침 ---------- */
// 회원가입과 아이 관련 기록을 받는 서비스라 반드시 있어야 하는 문서입니다.
// 실제 사업자 정보(상호·대표자·주소·사업자번호)는 아래 [ ] 자리를 채워 주세요.
function LegalPage({ tab, setTab, onHome }) {
  const TABS = [["terms", "이용약관"], ["privacy", "개인정보처리방침"]];
  return (
    <div style={styles.landing}>
      <style>{css}</style>
      <nav style={styles.landNav}>
        <button style={styles.brandBtn} onClick={onHome} title="돌아가기">
          <span style={styles.logoMarkSm}><Mascot size={30} /></span>
          <div style={styles.title}>민트쌤</div>
        </button>
        <button style={styles.navGhost} onClick={onHome}>돌아가기</button>
      </nav>

      <section style={styles.legalWrap}>
        <div style={styles.legalTabs}>
          {TABS.map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{ ...styles.legalTab, ...(tab === k ? styles.legalTabOn : {}) }}>{label}</button>
          ))}
        </div>

        <div style={styles.legalCard}>
          {tab === "terms" ? (
            <>
              <h2 style={styles.legalH}>이용약관</h2>
              <p style={styles.legalP}>시행일: 2026년 3월 1일</p>

              <h3 style={styles.legalH3}>제1조 (목적)</h3>
              <p style={styles.legalP}>이 약관은 민트쌤(이하 “회사”)이 제공하는 보육 문서 작성 보조 서비스(이하 “서비스”)의 이용과 관련하여 회사와 회원의 권리·의무 및 책임사항을 정함을 목적으로 합니다.</p>

              <h3 style={styles.legalH3}>제2조 (서비스의 내용)</h3>
              <p style={styles.legalP}>회사는 회원이 입력한 메모를 바탕으로 놀이활동안, 보육일지, 관찰일지, 알림장, 적응일지, 상담일지 등의 초안을 생성하는 기능을 제공합니다. 생성된 결과물은 <b>초안</b>이며, 회원은 제출 전 내용의 사실 여부와 적절성을 직접 확인·수정할 책임이 있습니다.</p>

              <h3 style={styles.legalH3}>제3조 (회원가입)</h3>
              <p style={styles.legalP}>회원가입은 이메일 또는 소셜 계정(구글·카카오)으로 할 수 있습니다. 회원은 가입 없이도 일부 기능을 체험할 수 있으나, 결과물 보관·불러오기는 회원에게만 제공됩니다.</p>

              <h3 style={styles.legalH3}>제4조 (요금 및 결제)</h3>
              <p style={styles.legalP}>서비스는 무료 플랜과 유료 플랜(Basic 월 9,900원 / Pro 월 19,900원, 부가세 포함)으로 구성되며, 플랜별로 이용 가능한 문서 종류와 월 생성 횟수가 다릅니다. 월 생성 횟수는 매월 1일 초기화됩니다. 베타 기간에는 결제 없이 유료 플랜 기능을 제공할 수 있으며, 정식 결제 도입 시 사전에 공지합니다.</p>

              <h3 style={styles.legalH3}>제5조 (회원의 의무)</h3>
              <p style={styles.legalP}>회원은 타인의 개인정보를 무단으로 입력하거나, 서비스를 자동화된 방법으로 과도하게 호출하는 등 정상적인 운영을 방해하는 행위를 해서는 안 됩니다. 회사는 이러한 경우 이용을 제한할 수 있습니다.</p>

              <h3 style={styles.legalH3}>제6조 (생성 결과물의 권리)</h3>
              <p style={styles.legalP}>회원이 입력한 내용과 생성된 결과물에 대한 권리는 회원에게 있습니다. 회사는 서비스 제공·품질 개선 목적 외에 결과물을 이용하지 않습니다.</p>

              <h3 style={styles.legalH3}>제7조 (책임의 제한)</h3>
              <p style={styles.legalP}>서비스가 생성한 문서는 AI가 작성한 초안으로 사실과 다를 수 있습니다. 회사는 회원이 결과물을 확인 없이 제출하여 발생한 결과에 대해 책임지지 않습니다.</p>

              <h3 style={styles.legalH3}>제8조 (문의)</h3>
              <p style={styles.legalP}>서비스 이용 관련 문의: <a style={styles.legalLink} href="mailto:help@mintssaem.kr">help@mintssaem.kr</a></p>

              <div style={styles.legalTodo}>
                ※ 정식 공개 전 사업자 정보(상호 · 대표자 · 사업자등록번호 · 주소 · 통신판매업 신고번호)와
                실제 문의 이메일을 채워 주세요. 유료 결제를 붙일 때는 청약철회·환불 조항도 함께 넣어야 합니다.
              </div>
            </>
          ) : (
            <>
              <h2 style={styles.legalH}>개인정보처리방침</h2>
              <p style={styles.legalP}>시행일: 2026년 3월 1일</p>

              <h3 style={styles.legalH3}>1. 수집하는 항목</h3>
              <p style={styles.legalP}>
                · 회원가입: 이메일, 이름(닉네임), 가입 경로(이메일·구글·카카오), 프로필 이미지<br />
                · 서비스 이용: 요금제, 가입일, 마지막 접속일, 생성 횟수<br />
                · 회원이 입력한 문서 내용 및 생성된 결과물
              </p>

              <h3 style={styles.legalH3}>2. 이용 목적</h3>
              <p style={styles.legalP}>회원 식별과 로그인, 문서 생성·보관 기능 제공, 요금제별 이용 한도 관리, 서비스 개선 및 문의 응대에 이용합니다.</p>

              <h3 style={styles.legalH3}>3. 아동 관련 정보에 대한 안내</h3>
              <p style={styles.legalP}>
                본 서비스는 보육교사가 업무 목적으로 작성하는 기록을 다룹니다. 회사는 영유아의 <b>실명 대신 이니셜·별명</b>을 사용할 것을 권고하며,
                입력 화면에도 이를 안내하고 있습니다. 회원이 입력한 내용은 <b>본인 계정으로만</b> 조회할 수 있도록 접근이 제한되어 있습니다(행 수준 보안).
              </p>

              <h3 style={styles.legalH3}>4. 제3자 제공 및 처리위탁</h3>
              <p style={styles.legalP}>
                회사는 개인정보를 제3자에게 판매하지 않습니다. 다만 서비스 제공을 위해 아래 업체에 처리를 위탁합니다.<br />
                · Supabase Inc. — 회원 인증 및 데이터 보관<br />
                · Google LLC (Gemini API) — 문서 생성. 회원이 입력한 메모가 생성 요청에 포함되어 전송됩니다.<br />
                · Vercel Inc. — 서비스 호스팅
              </p>

              <h3 style={styles.legalH3}>5. 보유 및 파기</h3>
              <p style={styles.legalP}>회원 탈퇴 시 회원 정보와 생성된 문서는 지체 없이 삭제됩니다. 회원은 서비스 내에서 문서를 개별 또는 일괄 삭제할 수 있습니다.</p>

              <h3 style={styles.legalH3}>6. 이용자의 권리</h3>
              <p style={styles.legalP}>회원은 언제든지 자신의 개인정보 열람·정정·삭제·처리정지를 요청할 수 있으며, 아래 연락처로 요청하시면 지체 없이 조치합니다.</p>

              <h3 style={styles.legalH3}>7. 개인정보 보호책임자</h3>
              <p style={styles.legalP}>문의: <a style={styles.legalLink} href="mailto:help@mintssaem.kr">help@mintssaem.kr</a></p>

              <div style={styles.legalTodo}>
                ※ 정식 공개 전 개인정보 보호책임자의 성명·직위·연락처와 사업자 정보를 채워 주세요.
                Gemini API 로 입력 내용이 전송되는 점은 반드시 고지해야 하므로 4항을 지우지 마세요.
              </div>
            </>
          )}
        </div>

        <button style={styles.ctaGhost} onClick={onHome}>돌아가기</button>
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
      <div style={styles.demoNote}>* 베타 기간 — 유료 플랜을 누르면 결제 없이 바로 이용 상태로 전환돼요.</div>
    </ModalShell>
  );
}

// 회원에게 뜨는 벽. "3종/6종" 같은 추상적인 숫자 대신
// 그 플랜에서 정확히 어떤 문서가 열리는지 이름으로 보여줍니다.
function PaywallModal({ info, onOpenPricing, onClose, onFallback }) {
  const need = info.need || "basic";
  const opened = docsOfPlan(need);
  const quotaOver = info.reason === "quota";
  const exportWall = info.reason === "export";

  const title = quotaOver ? "이번 달 생성 횟수를 다 썼어요"
    : exportWall ? "파일로 내려받기는 유료 플랜 기능이에요"
    : `${info.modeLabel || "이 문서"}는 ${PLAN_NAME[need]} 플랜부터예요`;

  return (
    <ModalShell onClose={onClose}>
      <div style={styles.modalMascot}><Mascot size={54} /></div>
      <div style={styles.modalTitle}>{title}</div>
      <div style={styles.modalSub}>
        {quotaOver
          ? (info.msg || `요금제를 올리면 바로 이어서 만들 수 있어요.\nBasic 은 월 500회, Pro 는 월 2,000회예요.`)
          : exportWall
            ? "표 복사는 무료 플랜에서도 쓸 수 있어요.\n워드·한글 파일 내려받기는 Basic 부터 열려요."
            : `${PLAN_NAME[need]} 플랜을 쓰면 아래 문서가 함께 열려요.`}
      </div>
      <div style={styles.paywallFeats}>
        {!quotaOver && !exportWall && opened.map((label) => (
          <div key={label} style={styles.planFeat}>
            <Check size={14} style={{ color: "#2E9E86", flexShrink: 0 }} /> {label}
          </div>
        ))}
        <div style={styles.planFeat}>
          <Check size={14} style={{ color: "#2E9E86", flexShrink: 0 }} />
          월 {PLAN_QUOTA[need].toLocaleString()}회 생성
        </div>
        <div style={styles.planFeat}>
          <Check size={14} style={{ color: "#2E9E86", flexShrink: 0 }} /> 워드·한글 파일 내려받기
        </div>
        <div style={styles.planFeat}>
          <Check size={14} style={{ color: "#2E9E86", flexShrink: 0 }} /> 문서 보관함 · 결과 직접 수정
        </div>
      </div>
      <button style={styles.ctaPrimary} onClick={onOpenPricing}>요금제 보기</button>
      {!quotaOver && !exportWall && (
        <button style={styles.textBtn} onClick={onFallback}>
          지금은 무료로 되는 {MODES[0].label} 쓸래요
        </button>
      )}
      <button style={styles.textBtn} onClick={onClose}>다음에 할게요</button>
    </ModalShell>
  );
}

// 체험 중인 게스트에게 뜨는 벽. "가입해야 한다"가 아니라
// "지금까지 만든 걸 저장하려면"으로 말해야 가입 동기가 생깁니다.
function SignupWallModal({ info, onSignup, onLogin, onClose, onFallback }) {
  const copy = {
    guestOver: {
      t: "체험 문서를 다 만들었어요",
      d: "가입하시면 방금 만든 문서가 그대로 저장되고,\n이어서 계속 만들 수 있어요. (무료 · 월 3회)",
    },
    lockedDoc: {
      t: `${info.modeLabel || "이 문서"}는 가입 후에 열려요`,
      d: "가입은 30초면 끝나요. 카카오·구글로 바로 시작할 수 있어요.\n체험으로 만든 문서도 같이 옮겨 드려요.",
    },
    save: {
      t: "저장하려면 가입이 필요해요",
      d: "가입하시면 만든 문서가 계정에 보관되고,\n다음에 들어와도 그대로 남아 있어요.",
    },
    copy: {
      t: "복사하려면 가입이 필요해요",
      d: "가입하시면 표 서식 그대로 복사해서\n한글·워드에 바로 붙일 수 있어요.",
    },
  }[info.kind] || { t: "가입하고 이어서 쓰기", d: "" };

  return (
    <ModalShell onClose={onClose}>
      <div style={styles.modalMascot}><Mascot size={54} /></div>
      <div style={styles.modalTitle}>{copy.t}</div>
      <div style={styles.modalSub}>{copy.d}</div>
      <div style={styles.paywallFeats}>
        <div style={styles.planFeat}><Check size={14} style={{ color: "#2E9E86", flexShrink: 0 }} /> 만든 문서 자동 저장 · 다시 불러오기</div>
        <div style={styles.planFeat}><Check size={14} style={{ color: "#2E9E86", flexShrink: 0 }} /> 결과를 직접 고쳐서 보관</div>
        <div style={styles.planFeat}><Check size={14} style={{ color: "#2E9E86", flexShrink: 0 }} /> 무료로 월 3회 생성</div>
      </div>
      <button style={styles.ctaPrimary} onClick={onSignup}>30초 만에 가입하기</button>
      <button style={styles.textBtn} onClick={onLogin}>이미 계정이 있어요</button>
      {info.kind === "lockedDoc" && (
        <button style={styles.textBtn} onClick={onFallback}>지금은 {MODES[0].label} 체험할래요</button>
      )}
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
function EmptyState({ mode, onPick, disabled }) {
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
            <button key={s} style={styles.starter} disabled={disabled}
              onClick={() => onPick(s.replace(/^[^\s]+\s/, ""))}>{s}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- 내보내기 (표 복사 · 파일 저장) ---------- */
// 표 서식(text/html)까지 클립보드에 넣기 때문에 한글·워드에 그대로 붙습니다.
// 파일 저장은 유료 플랜의 핵심 혜택이라 무료 플랜에서는 요금제 안내로 연결합니다.
function ExportBar({ ctx }) {
  const [done, setDone] = useState("");
  if (!ctx) return null;
  const { kind, payload, guest, canExport, onNeedSignup, onNeedPlan } = ctx;

  const flash = (k) => { setDone(k); setTimeout(() => setDone(""), 1600); };

  const doCopy = async () => {
    if (guest) { onNeedSignup?.("copy"); return; }
    const ok = await copyDoc(kind, payload);
    if (ok) flash("copy");
  };
  const doDownload = () => {
    if (guest) { onNeedSignup?.("save"); return; }
    if (!canExport) { onNeedPlan?.(); return; }
    if (downloadDoc(kind, payload)) flash("dl");
  };

  return (
    <div style={styles.exportBar}>
      <button style={{ ...styles.copyBtn, ...(done === "copy" ? styles.copyDone : {}) }}
        onClick={doCopy} title="표 서식 그대로 복사 — 한글·워드에 붙여넣기">
        {done === "copy" ? <><Check size={13} /> 복사됨</> : <><Copy size={13} /> 표로 복사</>}
      </button>
      <button style={{ ...styles.copyBtn, ...(done === "dl" ? styles.copyDone : {}) }}
        onClick={doDownload} title="워드·한글에서 열리는 파일로 저장">
        {done === "dl" ? <><Check size={13} /> 저장됨</> : <><Download size={13} /> 파일 저장</>}
        {!guest && !canExport && <Lock size={10} style={{ marginLeft: 2, color: "#B08900" }} />}
      </button>
    </div>
  );
}

/* ---------- 카드 라우터 ---------- */
// ctx 를 통해 "이 문서가 누구 것이고, 어떻게 고치고 내보낼 수 있는지"를 카드에 전달합니다.
// 랜딩 샘플처럼 ctx 가 없으면 읽기 전용 카드가 됩니다.
function Card({ kind, p, guest, canExport, onEdit, onNeedSignup, onNeedPlan }) {
  const ctx = (payload) => ({ kind, payload, guest, canExport, onNeedSignup, onNeedPlan, editable: !!onEdit });
  if (kind === "play")
    return <>{arr(p.activities).map((a, i) => (
      <ActivityCard key={i} a={a} base={["activities", i]} onEdit={onEdit} ctx={ctx({ activities: [a] })} />
    ))}</>;
  if (kind === "daily" && p.daily) return <DailyCard d={p.daily} base={["daily"]} onEdit={onEdit} ctx={ctx(p)} />;
  if (kind === "obs" && p.observation) return <ObsCard o={p.observation} base={["observation"]} onEdit={onEdit} ctx={ctx(p)} />;
  if (kind === "note" && p.note) return <NoteCard n={p.note} base={["note"]} onEdit={onEdit} ctx={ctx(p)} />;
  if (kind === "adapt" && p.adapt) return <AdaptCard a={p.adapt} base={["adapt"]} onEdit={onEdit} ctx={ctx(p)} />;
  if (kind === "counsel" && p.counsel) return <CounselCard c={p.counsel} base={["counsel"]} onEdit={onEdit} ctx={ctx(p)} />;
  return null;
}

function CardShell({ stripe, title, badge, ctx, children, foot }) {
  return (
    <div style={styles.card}>
      <div style={{ ...styles.cardBar, background: stripe }} />
      <div style={styles.cardInner}>
        <div style={styles.docHead}>
          <div style={styles.docHeadMain}>
            {badge && <span style={styles.docBadge}>{badge}</span>}
            <h3 style={styles.cardTitle}>{title}</h3>
          </div>
          <ExportBar ctx={ctx} />
        </div>
        {ctx?.editable && (
          <div style={styles.editHint}>✏️ 고치고 싶은 문장을 누르면 바로 수정할 수 있어요.</div>
        )}
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

function ActivityCard({ a, base = [], onEdit, ctx }) {
  const stripe = arr(a.domains).map((d) => DOMAIN_COLOR[d]).filter(Boolean)[0] || "#45C4A8";
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe={stripe} title={a.title} ctx={ctx}
      badge={<span style={styles.tagRow2}>{arr(a.domains).map((d) => <span key={d} style={{ ...styles.tag, background: (DOMAIN_COLOR[d] || "#aaa") + "33", color: "#5c6b64" }}>{dEmoji(d)} {d}</span>)}</span>}>
      <div style={styles.meta}>
        {a.age && <span style={styles.metaItem}>👶 {a.age}</span>}
        {a.place && <span style={styles.metaItem}><MapPin size={12} /> {a.place}</span>}
        {a.duration && <span style={styles.metaItem}><Clock size={12} /> {a.duration}</span>}
      </div>
      {a.goal && <Sec icon={<Target size={14} />} label="목표" tint="#FFEFD6">
        <Editable value={a.goal} path={at("goal")} onEdit={onEdit} style={styles.body} /></Sec>}
      {arr(a.materials).length > 0 && <Sec icon={<Package size={14} />} label="준비물" tint="#E8F6EE"><div style={styles.matWrap}>{arr(a.materials).map((m, i) => <span key={i} style={styles.matChip}>{m}</span>)}</div></Sec>}
      {arr(a.steps).length > 0 && (
        <Sec icon={<ListOrdered size={14} />} label="이렇게 놀아요" tint="#E5F7F0">
          <ol style={styles.steps}>
            {arr(a.steps).map((s, i) => (
              <li key={i} style={styles.step}>
                <span style={{ ...styles.stepNum, background: stripe }}>{i + 1}</span>
                <Editable value={stripNum(s)} path={at("steps", i)} onEdit={onEdit} style={styles.stepText} />
              </li>
            ))}
          </ol>
        </Sec>
      )}
      {a.extension && <Sec icon={<span style={{ fontSize: 14 }}>✨</span>} label="이렇게 더!" tint="#EDE8FA">
        <Editable value={a.extension} path={at("extension")} onEdit={onEdit} style={styles.body} /></Sec>}
      {a.safety && <div style={styles.safety}><ShieldCheck size={14} /> <span>{a.safety}</span></div>}
    </CardShell>
  );
}

function ObsCard({ o, base = [], onEdit, ctx }) {
  const meta = [o.gender && `${o.gender}`, o.birth && `🎂 ${o.birth}`, o.period && `🗓️ ${o.period}`, o.recorder && `✍️ ${o.recorder}`].filter(Boolean);
  const areas = arr(o.areas);
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe="#8FCDF2" title={`${o.child || "영유아"} 관찰기록`} badge="원장님 제출용" ctx={ctx}
      foot="제출 전 아동 정보·관찰기간과 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}
      {areas.map((a, i) => (
        <div key={i} style={styles.obsArea}>
          <div style={styles.obsAreaHead}><span style={styles.obsTag}>{a.area}</span></div>
          {a.datePlace && (
            <div style={styles.obsField}>
              <span style={styles.obsFieldLabel}>관찰 일시 및 장소</span>
              <Editable value={a.datePlace} path={at("areas", i, "datePlace")} onEdit={onEdit} style={styles.obsFieldVal} multiline={false} />
            </div>
          )}
          {a.record && (
            <div style={styles.obsField}>
              <span style={styles.obsFieldLabel}>관찰 상황</span>
              <Editable value={a.record} path={at("areas", i, "record")} onEdit={onEdit} style={styles.obsFieldVal} />
            </div>
          )}
          {a.interpretation && (
            <div style={styles.obsField}>
              <span style={styles.obsFieldLabel}>해석 및 평가</span>
              <Editable value={a.interpretation} path={at("areas", i, "interpretation")} onEdit={onEdit} style={styles.obsInterp} />
            </div>
          )}
        </div>
      ))}
      {o.summary && <Sec icon={<span style={{ fontSize: 14 }}>🧠</span>} label="종합 해석 (비고)" tint="#EDE8FA">
        <Editable value={o.summary} path={at("summary")} onEdit={onEdit} style={styles.body} /></Sec>}
    </CardShell>
  );
}

function NoteCard({ n, base = [], onEdit, ctx }) {
  return (
    <CardShell stripe="#FF9E7D" title="오늘의 알림장" badge="학부모님께" ctx={ctx}>
      <Editable value={n.message} path={[...base, "message"]} onEdit={onEdit} style={styles.noteBody} />
      {n.homeTip && (
        <div style={styles.homeTipWrap}>
          <span style={styles.homeTipIcon}>💛</span>
          <Editable value={n.homeTip} path={[...base, "homeTip"]} onEdit={onEdit} style={styles.homeTip} />
        </div>
      )}
    </CardShell>
  );
}

function DailyCard({ d, base = [], onEdit, ctx }) {
  const meta = [d.klass && `🏫 ${d.klass}`, d.age && `👶 ${d.age}`, d.theme && `🌱 ${d.theme}`, d.nextTheme && `🔜 다음: ${d.nextTheme}`].filter(Boolean);
  const sched = arr(d.schedule);
  const areas = arr(d.areas);
  const days = arr(d.days);
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe="#59C7B0" title={`${d.week || ""} 보육일지`} badge="주간 보육일지" ctx={ctx}
      foot="제출 전 양식(주제·요일·일과)에 맞춰 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}

      {sched.length > 0 && (
        <Sec icon={<span style={{ fontSize: 14 }}>🕒</span>} label="하루 일과" tint="#FFF3E0">
          <div style={styles.schedList}>
            {sched.map((s, i) => (
              <div key={i} style={styles.schedRow}>
                <div style={styles.schedTop}><span style={styles.schedName}>{s.name}</span>{s.time && <span style={styles.schedTime}>{s.time}</span>}</div>
                {s.content && (
                  <Editable value={s.content} path={at("schedule", i, "content")} onEdit={onEdit} style={styles.schedContent} />
                )}
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
                <Editable value={a.content} path={at("areas", i, "content")} onEdit={onEdit} style={styles.body} />
              </div>
            ))}
          </div>
        </Sec>
      )}
      {d.outdoor && <Sec icon={<span style={{ fontSize: 14 }}>🌳</span>} label="실외놀이" tint="#E7F2FB">
        <Editable value={d.outdoor} path={at("outdoor")} onEdit={onEdit} style={styles.body} /></Sec>}

      {days.length > 0 && (
        <Sec icon={<span style={{ fontSize: 14 }}>📝</span>} label="실행 놀이 평가 및 지원계획" tint="#FDEBF1">
          <div style={styles.weeks}>
            {days.map((x, i) => {
              const read = arr(x.reading).filter(Boolean);
              const hasNew = x.playEval || x.supportPlan || read.length > 0;
              return (
                <div key={i} style={styles.week}>
                  <div style={styles.weekHead}><span style={styles.weekTag}>{x.day}</span></div>
                  {x.playEval && (
                    <div style={styles.dayField}>
                      <span style={styles.dayFieldLabel}>놀이평가(배움읽기)</span>
                      <Editable value={x.playEval} path={at("days", i, "playEval")} onEdit={onEdit} style={styles.body} />
                    </div>
                  )}
                  {x.supportPlan && (
                    <div style={styles.dayField}>
                      <span style={styles.dayFieldLabel}>놀이와 배움지원계획</span>
                      <Editable value={x.supportPlan} path={at("days", i, "supportPlan")} onEdit={onEdit} style={styles.body} />
                    </div>
                  )}
                  {read.length > 0 && (
                    <div style={styles.dayField}>
                      <span style={styles.dayFieldLabel}>배움읽기</span>
                      <ul style={styles.readList}>
                        {read.map((r, j) => (
                          <li key={j} style={styles.readItem}>
                            <Editable value={r} path={at("days", i, "reading", j)} onEdit={onEdit} style={styles.readItemText} />
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {/* 이전 버전으로 저장된 문서(record 한 덩어리) 호환 */}
                  {!hasNew && x.record && (
                    <Editable value={x.record} path={at("days", i, "record")} onEdit={onEdit} style={styles.body} />
                  )}
                </div>
              );
            })}
          </div>
        </Sec>
      )}
      {d.weekEval && <Sec icon={<span style={{ fontSize: 14 }}>📊</span>} label="주간 보육 평가" tint="#EDE8FA">
        <Editable value={d.weekEval} path={at("weekEval")} onEdit={onEdit} style={styles.bodyPara} /></Sec>}
      {d.special && <Sec icon={<span style={{ fontSize: 14 }}>📌</span>} label="반 운영 특이사항" tint="#F1F9F5">
        <Editable value={d.special} path={at("special")} onEdit={onEdit} style={styles.body} /></Sec>}
      {d.safety && <div style={styles.safety}><ShieldCheck size={14} /> <span>{d.safety}</span></div>}
    </CardShell>
  );
}

function AdaptCard({ a, base = [], onEdit, ctx }) {
  const meta = [a.age && `👶 ${a.age}`, a.klass && `🏫 ${a.klass}`, a.birth && `🎂 ${a.birth}`, a.period && `🗓️ ${a.period}`].filter(Boolean);
  const days = arr(a.days);
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe="#C9A7E8" title={`${a.child || "신입원아"} 적응일지`} badge="원장님 제출용" ctx={ctx}
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
          {x.record && <Editable value={x.record} path={at("days", i, "record")} onEdit={onEdit} style={styles.body} />}
        </div>
      ))}
      {a.summary && <Sec icon={<span style={{ fontSize: 14 }}>🌱</span>} label="종합 의견 및 적응 계획" tint="#EDE8FA">
        <Editable value={a.summary} path={at("summary")} onEdit={onEdit} style={styles.body} /></Sec>}
    </CardShell>
  );
}

function CounselCard({ c, base = [], onEdit, ctx }) {
  const meta = [c.klass && `🏫 ${c.klass}`, c.age && `👶 ${c.age}`, c.birth && `🎂 ${c.birth}`, c.date && `📅 ${c.date}`, c.method && `💬 ${c.method}`, c.guardian && `👪 ${c.guardian}`, c.teacher && `✍️ ${c.teacher}`].filter(Boolean);
  const domains = arr(c.domains);
  const at = (...k) => [...base, ...k];
  return (
    <CardShell stripe="#FFC074" title={`${c.child || "원아"} 상담일지`} badge="학부모 상담" ctx={ctx}
      foot="제출 전 원아 정보·면담 정보와 내용을 확인·수정해 주세요.">
      {meta.length > 0 && <div style={styles.meta}>{meta.map((m, i) => <span key={i} style={styles.metaItem}>{m}</span>)}</div>}
      {domains.map((d, i) => (
        <div key={i} style={styles.cnslArea}>
          <div style={styles.obsAreaHead}><span style={styles.cnslTag}>{d.area}</span></div>
          {d.content && <Editable value={d.content} path={at("domains", i, "content")} onEdit={onEdit} style={styles.body} />}
        </div>
      ))}
      {c.parentNote && <Sec icon={<span style={{ fontSize: 14 }}>🗣️</span>} label="부모 의견" tint="#E7F2FB">
        <Editable value={c.parentNote} path={at("parentNote")} onEdit={onEdit} style={styles.body} /></Sec>}
      {c.summary && <Sec icon={<span style={{ fontSize: 14 }}>📋</span>} label="면담내용 및 종합의견" tint="#EDE8FA">
        <Editable value={c.summary} path={at("summary")} onEdit={onEdit} style={styles.body} /></Sec>}
    </CardShell>
  );
}

const INK = "#2E4A42";
const PAPER = "#EAF7F1";
const MINT = "#45C4A8";
const MINT_STRONG = "#2FA88C";
const SH = "#D6EFE6";

// 웹폰트는 index.html <head> 에서 미리 불러옵니다.
// (여기에 @import 로 두면 이 <style> 이 붙는 컴포넌트마다 중복 요청되고 첫 화면이 늦게 뜹니다)
const css = `
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
  .feat-card { transition: transform .12s ease, box-shadow .12s ease; }
  .feat-card:hover { transform: translateY(-2px); box-shadow: 0 5px 0 ${MINT}; }
  .feat-card:active { transform: scale(0.96); }
  /* 결과 안에서 고칠 수 있는 문장 — 눌러야 한다는 걸 은근히 알려줌 */
  .editable { cursor: text; border-radius: 8px; transition: background .12s ease; }
  .editable:hover { background: #F1F9F5; box-shadow: 0 0 0 4px #F1F9F5; }
  .editable:hover .pen { opacity: .55; }
  .dot { animation: blink 1.2s infinite; } .d2 { animation-delay: .2s; } .d3 { animation-delay: .4s; }
  @keyframes blink { 0%,100% { opacity: .2; } 50% { opacity: 1; } }
  @media (prefers-reduced-motion: reduce) { .spin,.dot { animation: none; } button { transition: none; } }
`;

const DISPLAY = `"Jua","Apple SD Gothic Neo","Noto Sans KR",system-ui,sans-serif`;
const BODY = `"Pretendard","Apple SD Gothic Neo","Noto Sans KR","Malgun Gothic",system-ui,sans-serif`;

const styles = {
  wrap: {
    fontFamily: BODY, color: INK, background: PAPER, minHeight: "100dvh",
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
  // 생성 결과 목록 — 접힌 상태에서는 헤더 한 줄만 보임
  // 아래 docHead 와 이름이 겹치지 않도록 turn* 접두사 사용(겹치면 뒤에 정의된 쪽이 이김)
  turnItem: { alignSelf: "stretch", background: "#fff", borderRadius: 16, boxShadow: `0 3px 0 ${SH}`, overflow: "hidden" },
  turnHead: { width: "100%", display: "flex", alignItems: "center", gap: 9, background: "transparent", border: "none", padding: "13px 14px", textAlign: "left" },
  turnHeadOpen: { borderBottom: "1px solid #E8F4EE" },
  turnNo: { flexShrink: 0, minWidth: 21, height: 21, display: "grid", placeItems: "center", fontSize: 11.5, fontWeight: 800, color: "#1F6B5A", background: "#CDEEDD", borderRadius: 999 },
  turnTitle: { fontSize: 13.5, fontWeight: 700, color: "#2E4A42", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  turnBody: { display: "flex", flexDirection: "column", gap: 12, padding: "12px 12px 14px" },
  botRow: { display: "flex", gap: 8, alignItems: "flex-start" },
  botFace: { flexShrink: 0, width: 38, height: 38, borderRadius: 14, background: "#fff", display: "grid", placeItems: "center", boxShadow: `0 2px 0 ${SH}` },
  botText: { fontSize: 14, color: "#4A5B54", lineHeight: 1.55, background: "#fff", padding: "10px 14px", borderRadius: "6px 18px 18px 18px", boxShadow: `0 2px 0 ${SH}`, maxWidth: "84%" },

  card: { background: "#fff", borderRadius: 22, overflow: "hidden", boxShadow: `0 4px 0 ${SH}, 0 10px 28px rgba(69,196,168,0.12)` },
  cardBar: { height: 7, width: "100%" },
  cardInner: { padding: "15px 18px 18px" },
  docHead: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10, marginBottom: 8, flexWrap: "wrap" },
  docHeadMain: { flex: "1 1 190px", minWidth: 0 },
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
  // 모델이 문단을 빈 줄(\n\n)로 구분해 주므로 줄바꿈을 그대로 살림
  bodyPara: { margin: 0, fontSize: 13.5, lineHeight: 1.7, color: "#48564F", whiteSpace: "pre-wrap" },
  // 요일별 3항목(놀이평가 / 지원계획 / 배움읽기)
  dayField: { marginTop: 8 },
  dayFieldLabel: { display: "block", fontSize: 11, fontWeight: 800, color: "#1F6B5A", marginBottom: 4 },
  readList: { margin: 0, paddingLeft: 17, display: "flex", flexDirection: "column", gap: 3 },
  readItem: { fontSize: 13.5, lineHeight: 1.6, color: "#48564F" },
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
  // 결과가 없을 때는 "이어 말하기" 입력창 대신 무엇을 먼저 해야 하는지 알려 줍니다
  inputHintBar: { margin: "0 14px 16px", padding: "12px 15px", background: "#F1F9F5", borderRadius: 16, fontSize: 12.5, color: "#5E7168", lineHeight: 1.6, textAlign: "center" },

  /* ── 로그인 사용자 · 사용량 ─────────────────────────── */
  userChip: { display: "inline-flex", alignItems: "center", gap: 6, maxWidth: 150, background: "#fff", border: "none", borderRadius: 999, padding: "5px 11px 5px 5px", boxShadow: `0 3px 0 ${SH}` },
  avatar: { width: 24, height: 24, borderRadius: 999, objectFit: "cover", flexShrink: 0 },
  avatarFallback: { width: 24, height: 24, borderRadius: 999, background: "#CDEEDD", color: "#1F6B5A", fontSize: 12, fontWeight: 800, display: "grid", placeItems: "center", flexShrink: 0 },
  userName: { fontSize: 12.5, fontWeight: 700, color: "#5A6B64", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  quotaBar: { margin: "0 16px 4px", padding: "8px 13px", background: "#fff", borderRadius: 12, fontSize: 12, color: "#5E7168", boxShadow: `0 2px 0 ${SH}`, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" },
  linkBtn: { marginLeft: 6, fontSize: 12, fontWeight: 800, color: "#2E9E86", background: "transparent", border: "none", padding: 0, textDecoration: "underline" },

  /* ── 잠긴 문서 안내 ─────────────────────────────────── */
  lockPanel: { background: "#fff", borderRadius: 20, padding: "26px 20px 20px", textAlign: "center", boxShadow: `0 3px 0 ${SH}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  lockIcon: { width: 46, height: 46, borderRadius: 999, background: "#FFF3D1", color: "#B08900", display: "grid", placeItems: "center" },
  lockTitle: { fontFamily: DISPLAY, fontSize: 18, color: "#2E4A42", marginTop: 2 },
  lockDesc: { fontSize: 13, color: "#7A9A90", lineHeight: 1.65, maxWidth: 340 },
  lockCta: { width: "100%", maxWidth: 280, marginTop: 8, fontSize: 14.5, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 16, padding: "13px", boxShadow: `0 4px 0 ${MINT_STRONG}` },
  lockGhost: { width: "100%", maxWidth: 280, fontSize: 13.5, fontWeight: 700, color: "#1F6B5A", background: "#E5F7F0", border: "none", borderRadius: 14, padding: "11px", boxShadow: "0 3px 0 #CDEEDD" },

  /* ── 입력 안내 ──────────────────────────────────────── */
  privacyNote: { marginBottom: 11, padding: "9px 13px", background: "#F1F9F5", borderRadius: 12, fontSize: 11.5, color: "#5E7168", lineHeight: 1.6 },
  genBtnOff: { background: "#CFE6DD", boxShadow: "0 4px 0 #B6D7CC", color: "#fff" },
  needHint: { marginTop: 9, fontSize: 12, color: "#B08900", background: "#FFF8E1", borderRadius: 12, padding: "9px 13px", lineHeight: 1.6 },
  needWhy: { color: "#A08A4B", fontWeight: 400 },

  /* ── 보관함 검색 ────────────────────────────────────── */
  searchRow: { display: "flex", alignItems: "center", gap: 8, background: "#fff", borderRadius: 14, padding: "8px 12px", boxShadow: `0 2px 0 ${SH}` },
  searchInput: { flex: 1, minWidth: 0, border: "none", outline: "none", background: "transparent", fontSize: 13, color: INK, fontFamily: "inherit" },
  searchClear: { display: "inline-flex", alignItems: "center", gap: 4, flexShrink: 0, fontSize: 11.5, fontWeight: 700, color: "#7A9A90", background: "#EEF7F3", border: "none", borderRadius: 999, padding: "5px 10px" },
  searchCount: { flex: 1, fontSize: 12, fontWeight: 700, color: "#7A9A90" },
  emptySearch: { textAlign: "center", fontSize: 13, color: "#8AA79D", padding: "18px 0" },

  /* ── 생성 중 진행 표시 ──────────────────────────────── */
  genWrap: { display: "flex", flexDirection: "column", gap: 8 },
  genTime: { display: "block", marginTop: 3, fontSize: 11.5, color: "#A9C3B9", fontWeight: 600 },
  genTrack: { height: 5, background: "#DCEEE7", borderRadius: 999, overflow: "hidden", marginLeft: 46 },
  genFill: { height: "100%", background: MINT, borderRadius: 999, transition: "width 1s linear" },

  /* ── 결과 목록 헤더 · 삭제 ──────────────────────────── */
  turnHeadMain: { flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 9, background: "transparent", border: "none", padding: "13px 4px 13px 14px", textAlign: "left" },
  iconBtn: { flexShrink: 0, display: "grid", placeItems: "center", width: 34, height: 34, marginRight: 8, color: "#B7CFC6", background: "transparent", border: "none", borderRadius: 10 },

  /* ── 실패 · 재시도 ──────────────────────────────────── */
  errorBlock: { alignSelf: "stretch", display: "flex", flexDirection: "column", gap: 10, background: "#FFF6F5", borderRadius: 16, padding: "13px 14px", boxShadow: "0 3px 0 #F6DEDC" },
  retryBtn: { alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 46, fontSize: 13, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 999, padding: "9px 16px", boxShadow: `0 3px 0 ${MINT_STRONG}` },

  /* ── 내보내기 · 인라인 편집 ─────────────────────────── */
  exportBar: { display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" },
  editHint: { fontSize: 11, color: "#A9C3B9", marginBottom: 10 },
  editable: { position: "relative", padding: "2px 3px", margin: "-2px -3px" },
  editPen: { display: "inline", verticalAlign: "middle", marginLeft: 5, opacity: 0, color: "#7A9A90", transition: "opacity .12s ease" },
  editWrap: { display: "flex", flexDirection: "column", gap: 7 },
  editArea: { width: "100%", minHeight: 60, fontSize: 13.5, lineHeight: 1.6, padding: "10px 12px", borderRadius: 12, border: "1.5px solid #7FD8C4", background: "#fff", color: INK, outline: "none", resize: "vertical" },
  editBtns: { display: "flex", gap: 7, alignItems: "center" },
  editSave: { display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12, fontWeight: 800, color: "#fff", background: MINT, border: "none", borderRadius: 999, padding: "7px 14px", boxShadow: `0 2px 0 ${MINT_STRONG}` },
  editCancel: { fontSize: 12, fontWeight: 700, color: "#7A9A90", background: "#EEF7F3", border: "none", borderRadius: 999, padding: "7px 13px" },
  stepText: { margin: 0, flex: 1, fontSize: 13.5, lineHeight: 1.55, color: "#48564F" },
  readItemText: { margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#48564F" },
  homeTipWrap: { display: "flex", alignItems: "flex-start", gap: 6, marginTop: 10, background: "#FFF3E0", padding: "10px 13px", borderRadius: 14 },
  homeTipIcon: { flexShrink: 0, fontSize: 13 },

  /* ── 랜딩 추가 요소 ─────────────────────────────────── */
  featLock: { display: "inline-flex", alignItems: "center", gap: 3, fontSize: 10, fontWeight: 800, color: "#B08900", background: "#FFF3D1", padding: "2px 8px", borderRadius: 999 },
  featFree: { fontSize: 10, fontWeight: 800, color: "#1F6B5A", background: "#CDEEDD", padding: "2px 8px", borderRadius: 999 },
  sampleWrap: { padding: "26px 20px 6px" },
  sampleSub: { fontSize: 12.5, color: "#7A9A90", textAlign: "center", marginTop: -8, marginBottom: 16, lineHeight: 1.6 },
  sampleCard: { position: "relative", maxHeight: 430, overflow: "hidden", borderRadius: 22, WebkitMaskImage: "linear-gradient(#000 74%, transparent 100%)", maskImage: "linear-gradient(#000 74%, transparent 100%)" },
  sampleCta: { display: "block", width: "100%", maxWidth: 300, margin: "-6px auto 0", fontSize: 14.5, fontWeight: 800, color: "#1F6B5A", background: "#E5F7F0", border: "none", borderRadius: 16, padding: "13px", boxShadow: "0 3px 0 #CDEEDD" },
  footLinks: { display: "flex", justifyContent: "center", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
  footLink: { fontSize: 12, color: "#7A9A90", background: "transparent", border: "none", padding: 0, textDecoration: "underline", fontFamily: "inherit" },
  footDot: { color: "#C3D9D0", fontSize: 12 },
  authLegal: { marginTop: 16, fontSize: 11.5, color: "#8AA79D", lineHeight: 1.6 },
  authLegalLink: { fontSize: 11.5, color: "#2E9E86", fontWeight: 700, background: "transparent", border: "none", padding: 0, textDecoration: "underline", fontFamily: "inherit" },

  /* ── 약관 · 개인정보처리방침 ────────────────────────── */
  legalWrap: { padding: "12px 18px 40px", display: "flex", flexDirection: "column", gap: 14, alignItems: "center" },
  legalTabs: { display: "flex", gap: 7, alignSelf: "center" },
  legalTab: { fontSize: 13, fontWeight: 700, color: "#7A9A90", background: "#fff", border: "none", borderRadius: 999, padding: "9px 16px", boxShadow: `0 2px 0 ${SH}` },
  legalTabOn: { background: "#CDEEDD", color: "#1F6B5A", fontWeight: 800 },
  legalCard: { width: "100%", background: "#fff", borderRadius: 20, padding: "22px 20px", boxShadow: `0 4px 0 ${SH}`, textAlign: "left" },
  legalH: { fontFamily: DISPLAY, fontSize: 21, color: "#2E4A42", margin: "0 0 4px" },
  legalH3: { fontSize: 14, fontWeight: 800, color: "#1F6B5A", margin: "18px 0 6px" },
  legalP: { margin: 0, fontSize: 13, lineHeight: 1.75, color: "#48564F" },
  legalLink: { color: "#2E9E86", fontWeight: 700 },
  legalTodo: { marginTop: 22, fontSize: 11.5, color: "#B08900", background: "#FFF8E1", borderRadius: 12, padding: "11px 13px", lineHeight: 1.6 },

  headRight: { display: "flex", alignItems: "center", gap: 8 },
  planPro: { fontSize: 12.5, fontWeight: 800, color: "#7A5A00", background: "#FFE9A8", padding: "7px 12px", borderRadius: 999, boxShadow: "0 2px 0 #F0D480" },
  // 업그레이드 유도 버튼 — 민트색 배경에 묻히지 않도록 산뜻한 연노랑으로 대비를 줌
  planFree: { fontSize: 12, fontWeight: 800, color: "#7A5A00", background: "#FFF3B0", border: "none", padding: "8px 12px", borderRadius: 999, boxShadow: "0 2px 0 #EFD26A" },

  // 내부 스크롤 컨테이너로 두면 모바일 주소창이 접힐 때 100vh 가 흔들려 스크롤이 어색해집니다.
  // 페이지(body) 스크롤에 맡기고 높이는 dvh 로 잡습니다.
  landing: { fontFamily: BODY, color: INK, background: PAPER, minHeight: "100dvh", maxWidth: 760, margin: "0 auto", backgroundImage: "radial-gradient(#CDEBDF 1.2px, transparent 1.2px)", backgroundSize: "22px 22px" },
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
  featCard: { background: "#fff", border: "none", borderRadius: 16, padding: "16px 12px", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, boxShadow: `0 3px 0 ${SH}` },
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
  modalSub: { fontSize: 13.5, color: "#5E7168", lineHeight: 1.7, marginTop: 8, marginBottom: 18, whiteSpace: "pre-line" },
  paywallFeats: { display: "inline-flex", flexDirection: "column", gap: 8, textAlign: "left", background: "#fff", borderRadius: 16, padding: "14px 18px", margin: "4px auto 18px", boxShadow: `0 3px 0 ${SH}` },
  textBtn: { display: "block", width: "100%", marginTop: 10, fontSize: 13, fontWeight: 700, color: "#7A9A90", background: "transparent", border: "none", padding: "8px" },
};
