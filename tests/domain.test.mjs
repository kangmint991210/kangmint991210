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
} from "../src/domain/plans.js";
import { MODE_KEYS, missingFields, createEmptyForm, labelOf } from "../src/domain/documents.js";
import { weekInfo, monthRange, weekdaysFrom } from "../src/lib/korean-date.js";
import { arr, setPath, stripLeadingNumber } from "../src/lib/utils.js";
import { toTurns, filterTurns, docTitle } from "../src/domain/threads.js";
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

test("문서 개방 범위와 월 한도", () => {
  assert.deepEqual(docsOf("free"), ["play"]);
  assert.deepEqual(docsOf("basic"), ["play", "daily", "obs"]);
  assert.deepEqual(docsOf("pro"), MODE_KEYS);
  assert.equal(quotaOf("free"), 3);
  assert.equal(quotaOf("basic"), 500);
  assert.equal(quotaOf("pro"), 2000);
});

test("문서마다 필요한 최소 플랜", () => {
  assert.equal(minPlanFor("play"), "free");
  assert.equal(minPlanFor("daily"), "basic");
  assert.equal(minPlanFor("obs"), "basic");
  assert.equal(minPlanFor("note"), "pro");
  assert.equal(minPlanFor("counsel"), "pro");
});

test("플랜을 올리면 새로 열리는 문서만 안내한다", () => {
  assert.deepEqual(newDocsIn("basic"), [labelOf("daily"), labelOf("obs")]);
  assert.deepEqual(newDocsIn("pro"), [labelOf("note"), labelOf("adapt"), labelOf("counsel")]);
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

test("접힌 목록의 한 줄 요약", () => {
  assert.equal(docTitle(toTurns(msgs)[0].bot), "관찰일지 · ○○ · 3월");
  assert.equal(docTitle({ kind: "note", payload: null }), "알림장");
});

/* ─────────────── 내보내기 ─────────────── */

test("문서 6종 모두 내보낼 수 있고, 양식 문서는 표를 갖는다", () => {
  const samples = {
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
  assert.equal(buildDoc("play", null), null);
  assert.equal(buildDoc("모르는종류", {}), null);
});

test("내보내기 HTML 은 사용자 입력을 이스케이프한다", () => {
  const doc = buildDoc("note", { note: { message: "<script>나쁜코드</script>", homeTip: "" } });
  assert.ok(!doc.html.includes("<script>"), "태그가 그대로 들어가면 안 됨");
  assert.ok(doc.html.includes("&lt;script&gt;"));
});

/* ─────────────── 프롬프트 ─────────────── */

test("문서 6종의 프롬프트가 모두 갖춰져 있다", () => {
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
