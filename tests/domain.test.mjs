// 화면 없이 확인할 수 있는 규칙들의 회귀 테스트.
// 의존성 없이 Node 내장 러너로 돕니다.  실행: npm test
//
// 여기 걸리는 것들은 "고장 나면 조용히 돈이나 데이터가 새는" 규칙들입니다.
// 요금제 범위, 필수 입력, 날짜 계산, 문서 내보내기 형식.

import test from "node:test";
import assert from "node:assert/strict";

import {
  PLANS, PLAN_KEYS, DEFAULT_PLAN, planName, quotaOf, docsOf,
  planIncludes, minPlanFor, newDocsIn, higherPlan, normalizePlan, canExportFiles,
  upgradeCopy, planBenefits, canJudgePlan,
} from "../src/domain/plans.js";
import {
  MODE_KEYS, DEFAULT_MODE, missingFields, createEmptyForm, labelOf,
  LIFE_AREAS, LIFE_LEVELS, ASSESS_AREAS, restoreMode,
} from "../src/domain/documents.js";
import { restoreView, isRestorableView } from "../src/lib/storage.js";
import {
  MAX_PENDING, addPending, removePending, pendingFor, withoutUser,
} from "../src/domain/pending-docs.js";
import { weekInfo, monthRange, weekdaysFrom } from "../src/lib/korean-date.js";
import { arr, setPath, stripLeadingNumber } from "../src/lib/utils.js";
import { toTurns, filterTurns, docTitle, shouldFollowNewest } from "../src/domain/threads.js";
import { buildDoc } from "../src/domain/document-export.js";
import { promptFor, PROMPTS } from "../src/prompts/index.js";

/* ─────────────── 요금제 ─────────────── */

test("요금제는 무료 → Basic → Pro 순서이고 상위가 하위를 포함한다", () => {
  assert.deepEqual(PLAN_KEYS, ["free", "basic", "pro"]);
  for (let i = 1; i < PLAN_KEYS.length; i++) {
    const lower = docsOf(PLAN_KEYS[i - 1]);
    const upper = docsOf(PLAN_KEYS[i]);
    for (const doc of lower) assert.ok(upper.includes(doc), `${PLAN_KEYS[i]} 가 ${doc} 를 잃어버림`);
    assert.ok(quotaOf(PLAN_KEYS[i]) > quotaOf(PLAN_KEYS[i - 1]), "상위 플랜의 한도가 더 커야 함");
  }
});

test("유료 플랜은 문서 전체가 열리고, 둘의 차이는 월 한도뿐이다", () => {
  assert.deepEqual(docsOf("free"), ["play"]);
  assert.deepEqual(docsOf("basic"), MODE_KEYS);
  assert.deepEqual(docsOf("pro"), MODE_KEYS);
  assert.equal(quotaOf("free"), 3);
  assert.equal(quotaOf("basic"), 500);
  assert.equal(quotaOf("pro"), 2000);
});

test("문서마다 필요한 최소 플랜", () => {
  assert.equal(minPlanFor("play"), "free");
  // 놀이 활동 외에는 모두 유료지만, Basic 이면 충분합니다.
  for (const key of MODE_KEYS.filter((k) => k !== "play")) {
    assert.equal(minPlanFor(key), "basic", `${key} 는 Basic 부터 열려야 함`);
  }
});

test("플랜을 올리면 새로 열리는 문서만 안내한다", () => {
  assert.deepEqual(newDocsIn("basic"), MODE_KEYS.filter((k) => k !== "play").map(labelOf));
  assert.deepEqual(newDocsIn("pro"), [], "Pro 에서 새로 열리는 문서는 없다 — 한도만 늘어남");
});

test("업그레이드 안내는 어느 플랜에서도 빈 문장이 되지 않는다", () => {
  // newDocsIn("pro") 가 비어 있어서, 문서 이름만 늘어놓으면 Pro 안내가 빈 문장이 됩니다.
  for (const key of PLAN_KEYS.slice(1)) {
    const copy = upgradeCopy(key);
    assert.ok(copy.trim().length > 5, `${key} 안내가 비었음`);
    assert.ok(copy.includes(quotaOf(key).toLocaleString()), `${key} 안내에 실제 한도가 없음`);
  }
  assert.ok(upgradeCopy("basic").includes("전체"), "무료 → Basic 은 문서가 열린다는 걸 알려야 함");
  assert.ok(!upgradeCopy("pro").includes("전체가 열리고"), "Pro 는 이미 전체라 다시 안내하지 않음");
});

test("페이월 혜택 목록의 숫자는 실제 한도·문서 수에서 나온다", () => {
  const feats = planBenefits("basic");
  assert.ok(feats.some((f) => f.includes(`${MODE_KEYS.length}종`)));
  assert.ok(feats.some((f) => f.includes(quotaOf("basic").toLocaleString())));
});

test("무료 플랜은 파일 내려받기가 잠겨 있다", () => {
  assert.equal(canExportFiles("free"), false);
  assert.equal(canExportFiles("basic"), true);
  assert.equal(canExportFiles("pro"), true);
});

test("옛 요금제 이름과 잘못된 값을 안전하게 정리한다", () => {
  assert.equal(normalizePlan("max"), "pro");   // 구 최상위 → 신 Pro
  assert.equal(normalizePlan("basic"), "basic");
  assert.equal(normalizePlan(null), DEFAULT_PLAN);
  assert.equal(normalizePlan("무엇인가"), DEFAULT_PLAN);
});

test("두 플랜 중 상위를 고른다", () => {
  assert.equal(higherPlan("free", "pro"), "pro");
  assert.equal(higherPlan("basic", "free"), "basic");
});

test("요금제 안내 문구의 숫자는 실제 한도에서 나온다", () => {
  for (const p of PLANS) {
    const line = p.features.find((f) => f.includes("생성"));
    assert.ok(line.includes(quotaOf(p.key).toLocaleString()), `${p.key} 안내 문구와 한도 불일치`);
  }
  assert.equal(planName("basic"), "Basic");
});

test("요금제를 알기 전에는 요금제로 막지 않는다", () => {
  // 새로고침하면 세션은 즉시 되살아나지만 profiles.plan 조회는 한 박자 뒤입니다.
  // 그 사이에 판단하면 Pro 회원에게 "이 문서는 Basic 플랜부터예요" 가 뜹니다.
  assert.equal(canJudgePlan({ authReady: true, signedIn: true, planLoaded: false }), false);
  assert.equal(canJudgePlan({ authReady: true, signedIn: true, planLoaded: true }), true);
  // 세션 자체를 아직 모를 때도 판단하면 안 됩니다.
  assert.equal(canJudgePlan({ authReady: false, signedIn: false, planLoaded: true }), false);
  // 로그인하지 않았다면 기다릴 요금제가 없으므로 바로 판단할 수 있습니다.
  assert.equal(canJudgePlan({ authReady: true, signedIn: false, planLoaded: false }), true);
});

/* ─────────────── 필수 입력 ─────────────── */

test("빈 폼에서 문서별로 무엇이 부족한지 알려준다", () => {
  const empty = createEmptyForm();
  assert.deepEqual(missingFields("play", empty), []);           // 기본값만으로 생성 가능
  assert.deepEqual(missingFields("daily", empty), ["주차", "이번 주 놀이·활동 메모"]);
  assert.equal(missingFields("obs", empty).length, 3);
  assert.equal(missingFields("counsel", empty).length, 2);
});

test("공백만 넣은 값은 채운 것으로 보지 않는다", () => {
  const form = { ...createEmptyForm(), child: "   ", counselMemo: "메모" };
  assert.deepEqual(missingFields("counsel", form), ["원아명"]);
});

test("생활기록부는 아이의 특징만 채우면 만들 수 있다", () => {
  const empty = createEmptyForm();
  // 연령은 기본값이 들어 있으므로, 빈 폼에서 부족한 것은 특징뿐입니다.
  assert.deepEqual(missingFields("life", empty), ["아이의 특징"]);
  assert.deepEqual(missingFields("life", { ...empty, lifeMemo: "“물”, “안아” 라고 표현함" }), []);
  // 아동명·반·기록일은 선택이라 비어 있어도 막지 않습니다.
  assert.deepEqual(missingFields("life", { ...empty, lifeMemo: "메모", child: "", lifeDate: "" }), []);
  // 연령을 지우면 다시 막힙니다.
  assert.deepEqual(missingFields("life", { ...empty, lifeMemo: "메모", age: "" }), ["연령"]);
});

test("생활기록부는 항목 8개와 상·중·하 세 수준이 고정이다", () => {
  assert.deepEqual(LIFE_AREAS, ["수면", "배변", "식사", "신체운동", "사회관계", "의사소통", "자연탐구", "예술경험"]);
  assert.deepEqual(LIFE_LEVELS.map((l) => l.key), ["high", "mid", "low"]);
  assert.deepEqual(LIFE_LEVELS.map((l) => l.label), ["상", "중", "하"]);
  // 프롬프트의 JSON 스키마가 항목 8개를 그대로 담고 있어야 모델이 빠뜨리지 않습니다.
  const { system } = promptFor("life");
  for (const area of LIFE_AREAS) assert.ok(system.includes(`"area":"${area}"`), `${area} 가 스키마에 없음`);
});

test("발달평가 총평은 연령과 여섯 영역을 모두 받아야 만들 수 있다", () => {
  const empty = createEmptyForm();
  // 연령은 기본값이 있으므로 빈 폼에서 부족한 것은 여섯 영역입니다.
  assert.deepEqual(missingFields("assess", empty), ASSESS_AREAS.map((a) => a.input));

  const filled = { ...empty, ...Object.fromEntries(ASSESS_AREAS.map((a) => [a.form, "관찰"])) };
  assert.deepEqual(missingFields("assess", filled), []);
  // 한 칸이라도 비면 막습니다 — 비워 두면 그 영역을 AI 가 통째로 지어냅니다.
  assert.deepEqual(missingFields("assess", { ...filled, assessArt: "" }), ["예술경험"]);
});

test("발달평가 총평의 영역 정의는 입력칸·프롬프트·결과가 같은 표를 본다", () => {
  assert.equal(ASSESS_AREAS.length, 6);
  const { system } = promptFor("assess");
  for (const a of ASSESS_AREAS) {
    // 결과 스키마에는 교육과정 영역명(신체운동·건강)이 들어가야 합니다.
    assert.ok(system.includes(`"area":"${a.label}"`), `${a.label} 가 스키마에 없음`);
    // 폼 키가 createEmptyForm 에 실제로 있어야 입력이 저장됩니다.
    assert.ok(a.form in createEmptyForm(), `${a.form} 이 폼 초기값에 없음`);
  }
  assert.ok(system.includes("supportPlan") && system.includes("parentMeeting"));
});

/* ─────────────── 새로고침 복원 ─────────────── */
// 새로고침하면 랜딩으로 튕기고, 돌아와 보면 고른 문서 종류도 초기화되던 문제의 회귀 테스트.

test("새로고침하면 보던 작업 화면으로 돌아온다", () => {
  assert.equal(restoreView("app"), "app");
  assert.equal(restoreView("landing"), "landing");
  // 로그인·약관 화면을 되살리면 새로고침했더니 로그인 폼에 갇힙니다.
  assert.equal(restoreView("auth"), "landing");
  assert.equal(restoreView("legal"), "landing");
  assert.equal(restoreView(null), "landing");
  assert.equal(restoreView("이상한값"), "landing");
});

test("되살릴 값으로 남기는 화면은 작업·랜딩뿐이다", () => {
  assert.equal(isRestorableView("app"), true);
  assert.equal(isRestorableView("landing"), true);
  assert.equal(isRestorableView("auth"), false);
  assert.equal(isRestorableView("legal"), false);
});

test("새로고침하면 보던 문서 종류로 돌아온다", () => {
  for (const key of MODE_KEYS) assert.equal(restoreMode(key), key);
  assert.equal(restoreMode("사라진문서"), DEFAULT_MODE); // 옛 버전 키가 남아 있어도 안전
  assert.equal(restoreMode(null), DEFAULT_MODE);
});

/* ─────────────── 못 넣은 문서 대기줄 ─────────────── */
// 서버나 설정이 어긋나 저장이 거부되면, 만든 문서가 조용히 사라지던 문제를 막는 장치.

const doc = (id, userId, kind = "play") => ({ id, userId, kind, payload: {} });

test("대기줄은 같은 문서를 두 번 담지 않는다", () => {
  const one = addPending([], doc("a", "u1"));
  const again = addPending(one, { ...doc("a", "u1"), payload: { v: 2 } });
  assert.equal(again.length, 1);
  assert.deepEqual(again[0].payload, { v: 2 }, "나중 것으로 갈아 끼워야 함");
});

test("대기줄은 무한정 쌓이지 않고 오래된 것부터 버린다", () => {
  // 저장소가 가득 차면 체험 기록·로그인 정보 저장까지 함께 실패합니다.
  let list = [];
  for (let i = 0; i < MAX_PENDING + 5; i++) list = addPending(list, doc(`d${i}`, "u1"));
  assert.equal(list.length, MAX_PENDING);
  assert.equal(list[0].id, "d5", "가장 오래된 것부터 밀려나야 함");
  assert.equal(list.at(-1).id, `d${MAX_PENDING + 4}`, "가장 최근 것은 남아 있어야 함");
});

test("남의 계정 문서를 내 계정에 넣지 않는다", () => {
  // 한 브라우저를 여러 계정이 나눠 쓰는 경우가 있습니다.
  const list = [doc("a", "u1"), doc("b", "u2"), doc("c", "u1")];
  assert.deepEqual(pendingFor(list, "u1").map((d) => d.id), ["a", "c"]);
  assert.deepEqual(withoutUser(list, "u1").map((d) => d.id), ["b"], "남의 것은 남겨 둬야 함");
  assert.deepEqual(pendingFor(list, "없는사람"), []);
});

test("저장에 성공한 문서는 대기줄에서 빠진다", () => {
  const list = [doc("a", "u1"), doc("b", "u1")];
  assert.deepEqual(removePending(list, "a").map((d) => d.id), ["b"]);
  assert.deepEqual(removePending(list, "없음").map((d) => d.id), ["a", "b"]);
});

test("망가진 값이 섞여 있어도 죽지 않는다", () => {
  // localStorage 는 사용자가 손으로 고칠 수 있고, 옛 버전의 값이 남기도 합니다.
  const list = [null, doc("a", "u1"), { id: "b" }];
  assert.deepEqual(pendingFor(list, "u1").map((d) => d.id), ["a"]);
  assert.deepEqual(removePending(list, "a").length, 2);
  assert.deepEqual(pendingFor(null, "u1"), []);
});

/* ─────────────── 날짜 ─────────────── */

test("주차 값을 한국식 라벨과 날짜 목록으로 바꾼다", () => {
  const w = weekInfo("2026-W11");
  assert.equal(w.label, "2026년 3월 2주");
  assert.equal(w.days.length, 6);
  assert.equal(w.days[0], "3/9(월)");
  assert.equal(w.days[5], "3/14(토)");
  assert.equal(weekInfo("이상한 값"), null);
});

test("관찰 월을 기간 문자열로 바꾼다", () => {
  assert.equal(monthRange("2026-02"), "2026년 2월 1일 ~ 2월 28일"); // 평년
  assert.equal(monthRange("2024-02"), "2024년 2월 1일 ~ 2월 29일"); // 윤년
  assert.equal(monthRange(""), null);
});

test("적응 일차는 주말을 건너뛴다", () => {
  const days = weekdaysFrom("2026-03-06", 5); // 금요일 시작
  assert.deepEqual(days, ["3/6(금)", "3/9(월)", "3/10(화)", "3/11(수)", "3/12(목)"]);
  assert.equal(weekdaysFrom("2026-3-6", 5), null); // 형식이 어긋나면 null
});

/* ─────────────── 작은 도구 ─────────────── */

test("arr 은 어떤 값이든 배열로 만든다", () => {
  assert.deepEqual(arr(null), []);
  assert.deepEqual(arr(""), []);
  assert.deepEqual(arr("하나"), ["하나"]);
  assert.deepEqual(arr(["a", "b"]), ["a", "b"]);
});

test("setPath 는 원본을 건드리지 않고 깊은 값을 바꾼다", () => {
  const before = { daily: { days: [{ playEval: "이전" }, { playEval: "그대로" }] } };
  const after = setPath(before, ["daily", "days", 0, "playEval"], "이후");
  assert.equal(after.daily.days[0].playEval, "이후");
  assert.equal(before.daily.days[0].playEval, "이전", "원본이 바뀌면 안 됨");
  assert.equal(after.daily.days[1], before.daily.days[1], "건드리지 않은 가지는 그대로 재사용");
});

test("모델이 붙인 번호를 걷어낸다", () => {
  assert.equal(stripLeadingNumber("1. 바닥에 놓아요."), "바닥에 놓아요.");
  assert.equal(stripLeadingNumber("2) 건너요."), "건너요.");
  assert.equal(stripLeadingNumber("바닥에 놓아요."), "바닥에 놓아요.");
});

/* ─────────────── 생성 기록 ─────────────── */

const msgs = [
  { role: "user", uid: "u1", text: "관찰일지 작성" },
  { role: "bot", uid: "b1", kind: "obs", payload: { observation: { child: "○○", period: "3월" } } },
  { role: "user", uid: "u2", text: "해석 보강" },
];

test("요청과 결과를 한 묶음으로 짝짓는다", () => {
  const turns = toTurns(msgs);
  assert.equal(turns.length, 2);
  assert.equal(turns[0].user.uid, "u1");
  assert.equal(turns[0].bot.uid, "b1");
  assert.equal(turns[1].bot, null, "아직 결과가 없는 요청은 결과 없이 남는다");
});

test("검색은 결과가 있는 묶음만, 본문까지 훑는다", () => {
  const turns = toTurns(msgs);
  assert.equal(filterTurns(turns, "").length, 2);
  assert.equal(filterTurns(turns, "○○").length, 1);
  assert.equal(filterTurns(turns, "없는말").length, 0);
});

test("즐겨찾기 거르기는 검색과 함께 걸린다", () => {
  const withFav = [
    { role: "bot", uid: "b1", kind: "obs", favorite: true, payload: { observation: { child: "가온" } } },
    { role: "bot", uid: "b2", kind: "obs", favorite: false, payload: { observation: { child: "나온" } } },
  ];
  const turns = toTurns(withFav);
  assert.equal(filterTurns(turns, "", false).length, 2);
  assert.equal(filterTurns(turns, "", true).length, 1, "별표한 것만 남아야 함");
  assert.equal(filterTurns(turns, "가온", true).length, 1);
  assert.equal(filterTurns(turns, "나온", true).length, 0, "별표 안 한 문서는 검색어가 맞아도 빠짐");
});

test("접힌 목록의 한 줄 요약", () => {
  assert.equal(docTitle(toTurns(msgs)[0].bot), "관찰일지 · ○○ · 3월");
  assert.equal(docTitle({ kind: "note", payload: null }), "알림장");
});

test("화면에 들어설 때가 아니라 방금 보냈을 때만 새 결과를 따라간다", () => {
  // 저장된 문서가 복원되며 개수가 0 → 5 로 늘어나는 상황(화면 진입)
  assert.equal(shouldFollowNewest({ mode: null, count: 0 }, { mode: "life", count: 5 }), false);
  // 메뉴를 바꿔 다른 문서 목록이 들어온 상황
  assert.equal(shouldFollowNewest({ mode: "obs", count: 2 }, { mode: "life", count: 9 }), false);
  // 같은 메뉴에서 방금 보내 메시지가 늘어난 상황 — 이때만 따라갑니다
  assert.equal(shouldFollowNewest({ mode: "life", count: 2 }, { mode: "life", count: 3 }), true);
  // 지워서 줄어든 경우
  assert.equal(shouldFollowNewest({ mode: "life", count: 3 }, { mode: "life", count: 1 }), false);
  assert.equal(shouldFollowNewest(null, { mode: "life", count: 1 }), false);
});

/* ─────────────── 내보내기 ─────────────── */

test("문서 종류 모두 내보낼 수 있고, 양식 문서는 표를 갖는다", () => {
  const samples = {
    monthly: { monthly: { month: "7월", theme: "여름", flow: "놀이가 이루어졌음.", nextMonth: "이어 갈 계획임." } },
    safety: { safety: { topic: "교통안전", subtopic: "횡단보도", record: "알아보았음." } },
    trip: { trip: { place: "○○관", goals: ["기른다."], prepare: ["안내"], preActivity: ["알아보기"],
                    activity: { check: ["확인"], move: ["이동"], onsite: ["체험"], back: ["점검"] },
                    postActivity: ["회상하기"], review: "나타났음." } },
    event: { event: { name: "여름 축제", goals: "즐거움을 경험한다.", safety: "사전 점검", review: "참여했음." } },
    assess: { assess: { child: "○○", areas: [{ area: "의사소통", content: "표현이 늘었음." }], supportPlan: "지원할 계획임.", parentMeeting: "안내하고자 함." } },
    life: { life: { child: "○○", items: [{ area: "수면", high: "스스로 잠듦.", mid: "도움받아 잠듦.", low: "시도함." }] } },
    play: { activities: [{ title: "풍선놀이", steps: ["놓아요"], materials: ["풍선"] }] },
    daily: { daily: { week: "3월 2주", schedule: [{ time: "09:00", name: "등원", content: "인사함" }], days: [] } },
    obs: { observation: { child: "○○", areas: [{ area: "사회관계", record: "관찰" }] } },
    note: { note: { message: "안녕하세요", homeTip: "" } },
    adapt: { adapt: { child: "○○", days: [{ day: "1일차", record: "적응" }] } },
    counsel: { counsel: { child: "○○", domains: [{ area: "기본생활", content: "현행수준" }] } },
  };
  for (const [kind, payload] of Object.entries(samples)) {
    const doc = buildDoc(kind, payload);
    assert.ok(doc, `${kind} 내보내기 실패`);
    assert.ok(doc.title.length > 0, `${kind} 제목 없음`);
    assert.ok(doc.plain.length > 0, `${kind} 본문 없음`);
    // 알림장은 학부모에게 그대로 보내는 문단 글이라 표가 없습니다. 나머지는 제출 양식이라 표가 필수.
    if (kind !== "note") {
      assert.ok(doc.html.includes("<table"), `${kind} 표 없음 — 한글·워드에 붙일 때 서식이 깨짐`);
    }
  }
  // 어느 문서도 빠뜨리지 않도록, 표본이 문서 종류 전체를 덮는지 확인합니다.
  assert.deepEqual(Object.keys(samples).sort(), [...MODE_KEYS].sort());
  assert.equal(buildDoc("play", null), null);
  assert.equal(buildDoc("모르는종류", {}), null);
});

test("생활기록부는 「영역 | 상 | 중 | 하」 4열 표로 나간다", () => {
  const doc = buildDoc("life", {
    life: {
      child: "○○", age: "만 0세",
      items: [
        { area: "수면", high: "스스로 잠듦.", mid: "도움받아 잠듦.", low: "수면을 시도함." },
        { area: "배변", high: "신호를 표현함.", mid: "도움받아 참여함.", low: "익숙해져 감." },
      ],
    },
  });
  for (const head of ["영역", "상", "중", "하"]) {
    assert.ok(doc.html.includes(`>${head}<`), `${head} 열이 없음`);
  }
  assert.ok(doc.plain.includes("· 상: 스스로 잠듦."), "개조식 줄이 그대로 나가야 함");
  assert.ok(doc.title.includes("○○"));
});

test("내보내기 HTML 은 사용자 입력을 이스케이프한다", () => {
  const doc = buildDoc("note", { note: { message: "<script>나쁜코드</script>", homeTip: "" } });
  assert.ok(!doc.html.includes("<script>"), "태그가 그대로 들어가면 안 됨");
  assert.ok(doc.html.includes("&lt;script&gt;"));
});

/* ─────────────── 프롬프트 ─────────────── */

test("문서 종류마다 프롬프트가 갖춰져 있다", () => {
  for (const key of MODE_KEYS) {
    const p = promptFor(key);
    assert.ok(p, `${key} 프롬프트 없음`);
    for (const field of ["btn", "free", "system", "label"]) {
      assert.ok(p[field], `${key}.${field} 없음`);
    }
    assert.equal(typeof p.buildUserMessage, "function");
    assert.ok(p.system.includes("JSON"), `${key} 는 JSON 출력을 요구해야 함`);
  }
  assert.equal(Object.keys(PROMPTS).length, MODE_KEYS.length);
});

test("분량 규정이 큰 문서는 출력 상한도 크게 잡는다", () => {
  // 상한이 모자라면 JSON 이 중간에 잘려 파싱에 실패합니다.
  assert.ok(promptFor("daily").tokens >= 16000);
  assert.ok(promptFor("note").tokens >= 4000);
});

test("사용자 지시문에 설정과 메모가 함께 담긴다", () => {
  const form = { ...createEmptyForm(), dailyWeek: "2026-W11", dailyMemo: "블록놀이" };
  const msg = promptFor("daily").buildUserMessage(form, "");
  assert.ok(msg.includes("2026년 3월 2주"), "주간 라벨이 들어가야 임의 날짜를 지어내지 않음");
  assert.ok(msg.includes("블록놀이"));
});

/* ─────────────── 모델 응답 파싱 ─────────────── */
// 실제로 관측된 실패: 모델이 응답 끝을 반복 출력해 JSON 뒤에 군더더기가 붙는 경우.
// 정규식으로 가장 바깥 중괄호를 잡으면 뒤쪽까지 삼켜 통째로 깨집니다.

test("JSON 뒤에 군더더기가 붙어도 첫 객체만 꺼낸다", async () => {
  const { extractFirstJsonObject } = await import("../src/services/gemini.js");
  const good = '{"counsel":{"summary":"부탁드립니다."}}';
  assert.equal(extractFirstJsonObject(good + '\n부탁드립니다."}}\n탁드립니다."}}'), good);
  assert.equal(extractFirstJsonObject("설명 " + good + " 뒤에도 설명"), good);
});

test("문자열 안의 중괄호와 이스케이프를 건너뛴다", async () => {
  const { extractFirstJsonObject } = await import("../src/services/gemini.js");
  const tricky = '{"note":{"message":"괄호 { 와 따옴표 \\" 가 든 문장"}}';
  assert.equal(extractFirstJsonObject(tricky + "군더더기"), tricky);
  assert.deepEqual(JSON.parse(extractFirstJsonObject(tricky)).note.message, '괄호 { 와 따옴표 " 가 든 문장');
});

test("닫히지 않은(잘린) 응답은 null 로 돌려준다", async () => {
  const { extractFirstJsonObject } = await import("../src/services/gemini.js");
  assert.equal(extractFirstJsonObject('{"a":{"b":"잘림'), null);
  assert.equal(extractFirstJsonObject("중괄호가 없음"), null);
});
