// 생성된 문서를 "밖으로 꺼내는" 유틸.
//
// 보육교사의 실제 업무 흐름은 [생성 → 한글(HWP)/워드 양식에 붙여넣기 → 제출] 이라,
// 플레인 텍스트 복사만으로는 표 양식이 무너집니다. 그래서 두 가지를 제공합니다.
//   1) copyDoc()     — 클립보드에 text/plain + text/html 을 함께 넣습니다.
//                      한글·워드·구글독스에 붙여넣으면 "표 그대로" 들어갑니다.
//   2) downloadDoc() — Word 가 읽는 HTML(.doc)로 저장합니다. 한글에서도 그대로 열립니다.
//                      (진짜 OOXML .docx 가 아니라, 워드/한글이 표준으로 지원하는 HTML 문서형식입니다.
//                       외부 라이브러리 없이 표 서식을 100% 유지할 수 있는 방법이라 이 방식을 씁니다.)
//
// buildDoc(kind, payload) 이 {title, plain, html} 을 만들고 위 두 함수가 이를 사용합니다.

import { arr, stripLeadingNumber as stripNum } from "../lib/utils.js";
import { TRIP_STEPS, EVENT_ROWS } from "./documents.js";

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// 줄바꿈을 살려서 표 칸 안에 넣기
const rich = (s) => esc(s).replace(/\n/g, "<br />");

/* ---------- 표 조각 ---------- */
const TD = "border:1px solid #999;padding:6px 8px;vertical-align:top;font-size:10pt;";
const TH = TD + "background:#EAF7F1;font-weight:bold;text-align:center;white-space:nowrap;";
const TABLE = 'style="border-collapse:collapse;width:100%;margin:6px 0 14px;" border="1" cellspacing="0"';

const h2 = (t) => `<h2 style="font-size:12pt;margin:18px 0 6px;">■ ${esc(t)}</h2>`;

// [["항목","값"], ...] → 2열 표
const kvTable = (rows) => {
  const body = rows
    .filter(([, v]) => v != null && v !== "")
    .map(([k, v]) => `<tr><th style="${TH}width:120px;">${esc(k)}</th><td style="${TD}">${rich(v)}</td></tr>`)
    .join("");
  return body ? `<table ${TABLE}><tbody>${body}</tbody></table>` : "";
};

// 헤더 배열 + 행 배열 → 격자 표
const gridTable = (heads, rows) => {
  if (!rows.length) return "";
  const thead = `<tr>${heads.map((h) => `<th style="${TH}">${esc(h)}</th>`).join("")}</tr>`;
  const tbody = rows
    .map((r) => `<tr>${r.map((c) => `<td style="${TD}">${rich(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<table ${TABLE}><thead>${thead}</thead><tbody>${tbody}</tbody></table>`;
};

/* ---------- 문서 종류별 → {title, plain, html} ---------- */

function buildPlay(p) {
  const list = arr(p.activities);
  const title = list[0]?.title ? `놀이활동 - ${list[0].title}` : "놀이활동";
  const plain = list
    .map(
      (a) =>
        `[놀이활동] ${a.title || ""}\n대상:${a.age || ""} · 장소:${a.place || ""} · 시간:${a.duration || ""}\n목표:${a.goal || ""}\n준비물:${arr(a.materials).join(", ")}\n진행:\n${arr(a.steps).map((s, i) => `${i + 1}. ${stripNum(s)}`).join("\n")}${a.extension ? `\n확장:${a.extension}` : ""}${a.safety ? `\n안전:${a.safety}` : ""}`
    )
    .join("\n\n");
  const html = list
    .map(
      (a) =>
        `<h1 style="font-size:14pt;margin:0 0 8px;">${esc(a.title || "놀이활동")}</h1>` +
        kvTable([
          ["대상 연령", a.age],
          ["장소", a.place],
          ["소요 시간", a.duration],
          ["관련 영역", arr(a.domains).join(", ")],
          ["활동 목표", a.goal],
          ["준비물", arr(a.materials).join(", ")],
          ["진행 방법", arr(a.steps).map((s, i) => `${i + 1}. ${stripNum(s)}`).join("\n")],
          ["확장 활동", a.extension],
          ["안전 유의사항", a.safety],
        ])
    )
    .join("");
  return { title, plain, html };
}

function buildDaily(d) {
  const sched = arr(d.schedule);
  const areas = arr(d.areas);
  const days = arr(d.days);
  const dayCell = (x) => {
    const read = arr(x.reading).filter(Boolean);
    if (!(x.playEval || x.supportPlan || read.length)) return [x.day || "", x.record || "", "", ""];
    return [x.day || "", x.playEval || "", x.supportPlan || "", read.map((r) => `• ${r}`).join("\n")];
  };

  const plain =
    `[주간 보육일지] ${d.week || ""}  ${d.klass || ""} ${d.age || ""}\n주제: ${d.theme || ""}${d.nextTheme ? "  (다음: " + d.nextTheme + ")" : ""}\n\n■ 하루 일과\n` +
    sched.map((s) => `· ${s.name}${s.time ? " (" + s.time + ")" : ""}: ${s.content || ""}`).join("\n") +
    `\n· 오전 실내놀이 (09:40~10:40)\n` + areas.map((a) => `  - ${a.area}: ${a.content}`).join("\n") +
    `\n· 실외놀이 (10:50~11:30): ${d.outdoor || ""}\n\n■ 실행 놀이 평가 및 지원계획\n` +
    days.map((x) => {
      const [day, ev, sp, rd] = dayCell(x);
      return `· ${day}\n${[ev && `  [놀이평가(배움읽기)]\n  ${ev}`, sp && `  [놀이와 배움지원계획]\n  ${sp}`, rd && `  [배움읽기]\n${rd.split("\n").map((r) => "  " + r).join("\n")}`].filter(Boolean).join("\n")}`;
    }).join("\n\n") +
    `\n\n■ 주간 보육 평가\n${d.weekEval || ""}\n\n■ 안전교육\n${d.safety || ""}${d.special ? "\n\n■ 반 운영 특이사항\n" + d.special : ""}`;

  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">주간 보육일지</h1>` +
    kvTable([["주간", d.week], ["반", d.klass], ["연령", d.age], ["주제", d.theme], ["다음 주제", d.nextTheme]]) +
    h2("하루 일과") +
    gridTable(["시간", "일과", "내용"], sched.map((s) => [s.time || "", s.name || "", s.content || ""])) +
    h2("오전 실내놀이 (09:40~10:40)") +
    gridTable(["영역", "내용"], areas.map((a) => [a.area || "", a.content || ""])) +
    (d.outdoor ? h2("실외놀이 (10:50~11:30)") + `<p style="font-size:10pt;">${rich(d.outdoor)}</p>` : "") +
    h2("실행 놀이 평가 및 지원계획") +
    gridTable(["요일", "놀이평가(배움읽기)", "놀이와 배움지원계획", "배움읽기"], days.map(dayCell)) +
    (d.weekEval ? h2("주간 보육 평가") + `<p style="font-size:10pt;line-height:1.7;">${rich(d.weekEval)}</p>` : "") +
    kvTable([["안전교육", d.safety], ["반 운영 특이사항", d.special]]);

  return { title: `주간보육일지 ${d.week || ""}`.trim(), plain, html };
}

// 관찰기록 한 영역의 항목 — 화면(Card.jsx 의 OBS_FIELDS)과 같은 순서·이름을 씁니다.
const OBS_COLUMNS = [
  ["datePlace", "관찰 일시 및 장소"],
  ["record", "관찰내용"],
  ["interpretation", "해석 및 평가"],
  ["learning", "배움읽기"],
  ["homeConnection", "가정-기관 연계 방안"],
];

function buildObs(o) {
  const areas = arr(o.areas);
  // 예전에 저장한 문서에는 배움읽기·가정연계가 없으므로, 실제로 값이 있는 항목만 표에 넣습니다.
  const columns = OBS_COLUMNS.filter(([key]) => areas.some((a) => a[key]));

  const plain =
    `[영유아 관찰기록] ${o.child || ""} (${o.gender || ""})\n생년월일/월령: ${o.birth || ""}   관찰기간: ${o.period || ""}   기록자: ${o.recorder || ""}\n\n` +
    areas.map((a) =>
      `■ ${a.area || ""}\n` +
      columns.filter(([key]) => a[key]).map(([key, label]) => `[${label}] ${a[key]}`).join("\n")
    ).join("\n\n") +
    `\n\n■ 종합 해석(비고)\n${o.summary || ""}`;

  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">영유아 관찰기록</h1>` +
    kvTable([["아동", o.child], ["성별", o.gender], ["생년월일·월령", o.birth], ["관찰기간", o.period], ["기록자", o.recorder]]) +
    h2("발달 영역별 관찰") +
    // 항목마다 글이 길어(250~500자) 가로 표로 만들면 칸이 눌립니다.
    // 영역별로 세로 표를 하나씩 두어 한글·워드에서 읽기 좋게 합니다.
    areas.map((a) =>
      `<h3 style="font-size:11pt;margin:14px 0 4px;">${esc(a.area || "")}</h3>` +
      kvTable(columns.map(([key, label]) => [label, a[key]]))
    ).join("") +
    (o.summary ? h2("종합 해석 (비고)") + `<p style="font-size:10pt;line-height:1.7;">${rich(o.summary)}</p>` : "");

  return { title: `관찰기록 ${o.child || ""}`.trim(), plain, html };
}

function buildNote(n) {
  const plain = `${n.message || ""}${n.homeTip ? `\n\n💛 ${n.homeTip}` : ""}`;
  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">알림장</h1>` +
    `<p style="font-size:11pt;line-height:1.8;">${rich(n.message)}</p>` +
    (n.homeTip ? kvTable([["가정 연계", n.homeTip]]) : "");
  return { title: "알림장", plain, html };
}

// 적응일지 한 일차의 본문 항목 — 화면(Card.jsx 의 ADAPT_FIELDS)과 같은 순서·이름.
const ADAPT_COLUMNS = [
  ["record", "관찰내용"],
  ["interpretation", "해석 및 교사지원"],
  ["homeConnection", "가정과의 연계"],
];

function buildAdapt(a) {
  const days = arr(a.days);
  // 예전에 저장한 문서에는 record 만 있으므로, 실제로 값이 있는 항목만 넣습니다.
  const columns = ADAPT_COLUMNS.filter(([key]) => days.some((x) => x[key]));

  const head = (x) =>
    `■ ${x.day || ""}${x.date ? " (" + x.date + ")" : ""}${x.level ? " · 적응정도:" + x.level : ""}${x.note ? " · 비고:" + x.note : ""}\n` +
    `등원 ${x.arrive || "-"} / 하원 ${x.leave || "-"}${x.health && x.health !== "-" ? " / 건강·투약 " + x.health : ""}`;

  const plain =
    `[신입원아 적응일지] ${a.child || ""} (${a.age || ""})${a.klass ? "  " + a.klass : ""}\n생년월일: ${a.birth || ""}   적응기간: ${a.period || ""}\n\n` +
    days.map((x) =>
      head(x) + "\n" +
      columns.filter(([key]) => x[key]).map(([key, label]) => `[${label}] ${x[key]}`).join("\n")
    ).join("\n\n") +
    `\n\n■ 종합 의견 및 적응 계획\n${a.summary || ""}`;

  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">신입원아 적응일지</h1>` +
    kvTable([["아동", a.child], ["연령", a.age], ["반", a.klass], ["생년월일", a.birth], ["적응기간", a.period]]) +
    h2("일차별 적응 기록") +
    // 항목마다 글이 길어(280~550자) 가로 표로 만들면 칸이 눌립니다.
    // 일차별로 세로 표를 하나씩 두어 한글·워드에서 읽기 좋게 합니다.
    days.map((x) =>
      `<h3 style="font-size:11pt;margin:14px 0 4px;">${esc(x.day || "")}${x.date ? ` (${esc(x.date)})` : ""}</h3>` +
      kvTable([
        ["날짜", x.date], ["등원", x.arrive], ["하원", x.leave],
        ["적응정도", x.level], ["건강·투약", x.health], ["비고", x.note],
        ...columns.map(([key, label]) => [label, x[key]]),
      ])
    ).join("") +
    (a.summary ? h2("종합 의견 및 적응 계획") + `<p style="font-size:10pt;line-height:1.7;">${rich(a.summary)}</p>` : "");

  return { title: `적응일지 ${a.child || ""}`.trim(), plain, html };
}

function buildCounsel(c) {
  const domains = arr(c.domains);
  const plain =
    `[학부모 상담일지] ${c.child || ""}${c.klass ? "  " + c.klass : ""}\n생년월일: ${c.birth || ""}   면담일: ${c.date || ""}   형태: ${c.method || ""}   보호자: ${c.guardian || ""}   교사: ${c.teacher || ""}\n\n[현행수준]\n` +
    domains.map((d) => `■ ${d.area || ""}\n${d.content || ""}`).join("\n\n") +
    (c.parentNote ? `\n\n■ 부모 의견\n${c.parentNote}` : "") +
    (c.homeConnection ? `\n\n■ 가정-기관 연계 지원 방안\n${c.homeConnection}` : "") +
    `\n\n■ 면담내용 및 종합의견\n${c.summary || ""}`;

  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">학부모 상담일지</h1>` +
    kvTable([["원아", c.child], ["반", c.klass], ["생년월일", c.birth], ["면담일", c.date], ["면담형태", c.method], ["보호자", c.guardian], ["면담교사", c.teacher]]) +
    h2("발달 영역별 현행수준") +
    gridTable(["영역", "현행수준"], domains.map((d) => [d.area || "", d.content || ""])) +
    // 항목마다 글이 길어(200~450자) 세로 표로 둡니다. 없는 항목은 kvTable 이 알아서 걸러 냅니다.
    kvTable([
      ["부모 의견", c.parentNote],
      ["가정-기관 연계 지원 방안", c.homeConnection],
      ["면담내용 및 종합의견", c.summary],
    ]);

  return { title: `상담일지 ${c.child || ""}`.trim(), plain, html };
}

// 생활기록부의 수준 — 화면(domain/documents.js 의 LIFE_LEVELS)과 같은 순서·이름.
const LIFE_ROWS = [["high", "상"], ["mid", "중"], ["low", "하"]];

function buildLife(l) {
  const items = arr(l.items);
  const rows = items.map((it) => [it.area || "", it.high || "", it.mid || "", it.low || ""]);

  const plain =
    `[생활기록부 — 기본생활습관 및 활동발달상황] ${l.child || ""}${l.klass ? "  " + l.klass : ""}\n연령: ${l.age || ""}   기록일: ${l.date || ""}\n\n` +
    items.map((it) =>
      `■ ${it.area || ""}\n` +
      LIFE_ROWS.filter(([key]) => it[key]).map(([key, label]) => `  · ${label}: ${it[key]}`).join("\n")
    ).join("\n\n");

  // 한 칸이 25~60자로 짧아, 다른 문서와 달리 가로 표가 눌리지 않습니다.
  // 실제 생활기록부 양식도 「영역 | 상 | 중 | 하」 4열이라 그대로 붙습니다.
  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">생활기록부 — 기본생활습관 및 활동발달상황</h1>` +
    kvTable([["원아", l.child], ["반", l.klass], ["연령", l.age], ["기록일", l.date]]) +
    gridTable(["영역", "상", "중", "하"], rows);

  return { title: `생활기록부 ${l.child || ""}`.trim(), plain, html };
}

function buildAssess(a) {
  const areas = arr(a.areas);
  const plain =
    `[영유아 발달평가 총평] ${a.child || ""}${a.klass ? "  " + a.klass : ""}\n연령: ${a.age || ""}   평가기간: ${a.period || ""}\n\n` +
    areas.map((x) => `■ ${x.area || ""}\n${x.content || ""}`).join("\n\n") +
    (a.supportPlan ? `\n\n■ 맞춤형 지원 계획\n${a.supportPlan}` : "") +
    (a.parentMeeting ? `\n\n■ 부모 면담 활용 내용\n${a.parentMeeting}` : "");

  // 문단마다 글이 길어(320~450자) 가로 표로 만들면 칸이 눌립니다.
  // 관찰기록과 같은 방식으로 세로 2열 표에 담아 한글·워드에서 읽기 좋게 합니다.
  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">영유아 발달평가 총평</h1>` +
    kvTable([["원아", a.child], ["반", a.klass], ["연령", a.age], ["평가기간", a.period]]) +
    h2("영역별 총평") +
    kvTable(areas.map((x) => [x.area || "", x.content])) +
    kvTable([
      ["맞춤형 지원 계획", a.supportPlan],
      ["부모 면담 활용 내용", a.parentMeeting],
    ]);

  return { title: `발달평가 총평 ${a.child || ""}`.trim(), plain, html };
}

// 월간 평가의 문단 — 화면(Card.jsx 의 MONTHLY_PARTS)과 같은 순서·이름.
const MONTHLY_COLUMNS = [
  ["flow", "이번 달 놀이 흐름"], ["expansion", "자발적으로 확장된 놀이"],
  ["support", "환경 구성과 교사 지원"], ["expression", "놀이 속 표현과 상호작용"],
  ["parentNote", "부모면담 반영"], ["nextMonth", "다음 달 계획"],
];

function buildMonthly(m) {
  const rows = MONTHLY_COLUMNS.filter(([key]) => m[key]);
  const plain =
    `[월간 놀이 평가] ${m.month || ""}  ${m.age || ""}\n주제: ${m.theme || ""}\n\n` +
    rows.map(([key, label]) => `■ ${label}\n${m[key]}`).join("\n\n");
  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">월간 놀이 평가</h1>` +
    kvTable([["평가 월", m.month], ["연령", m.age], ["보육 주제", m.theme]]) +
    kvTable(rows.map(([key, label]) => [label, m[key]]));
  return { title: `월간평가 ${m.month || ""}`.trim(), plain, html };
}

function buildSafety(s) {
  const plain =
    `[안전교육 실행 및 평가] ${s.topic || ""}${s.subtopic ? " - " + s.subtopic : ""}\n연령: ${s.age || ""}\n\n${s.record || ""}`;
  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">안전교육 실행 및 평가</h1>` +
    kvTable([["연령", s.age], ["안전교육 주제", s.topic], ["소주제 및 활동내용", s.subtopic], ["실행 및 평가", s.record]]);
  return { title: `안전교육일지 ${s.topic || ""}`.trim(), plain, html };
}

// 목록을 "· 항목" 줄로 (플레인 텍스트용)
const bullets = (list) => arr(list).filter(Boolean).map((v) => `· ${v}`).join("\n");

function buildTrip(t) {
  const steps = TRIP_STEPS.map(({ key, label }) => [label, bullets(t.activity?.[key])]).filter(([, v]) => v);
  const plain =
    `[견학 계획안] ${t.place || ""}\n연령 및 인원: ${t.age || ""} ${t.count || ""}` +
    `${t.form ? "   형태: " + t.form : ""}${t.transport ? "   이동: " + t.transport : ""}${t.date ? "   견학일: " + t.date : ""}\n\n` +
    `■ 견학 목표\n${bullets(t.goals)}\n\n■ 사전 준비\n${bullets(t.prepare)}\n\n■ 사전 활동\n${bullets(t.preActivity)}\n\n` +
    `■ 견학 활동\n${steps.map(([label, v]) => `[${label}]\n${v}`).join("\n")}\n\n` +
    `■ 사후 활동\n${bullets(t.postActivity)}\n\n■ 활동 평가\n${t.review || ""}`;
  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">견학 계획안</h1>` +
    kvTable([["장소", t.place], ["견학 형태", t.form], ["이동 수단", t.transport],
             ["연령 및 인원", [t.age, t.count].filter(Boolean).join(" ")], ["견학일", t.date]]) +
    h2("견학 목표") + kvTable(arr(t.goals).map((v, i) => [`목표 ${i + 1}`, v])) +
    h2("사전 준비") + kvTable([["준비 사항", bullets(t.prepare)]]) +
    h2("사전 활동") + kvTable([["활동", bullets(t.preActivity)]]) +
    h2("견학 활동") + gridTable(["단계", "내용"], steps) +
    h2("사후 활동") + kvTable([["활동", bullets(t.postActivity)]]) +
    (t.review ? h2("활동 평가") + `<p style="font-size:10pt;line-height:1.7;">${rich(t.review)}</p>` : "");
  return { title: `견학계획안 ${t.place || ""}`.trim(), plain, html };
}

function buildEvent(e) {
  const rows = EVENT_ROWS.filter(([key]) => e[key]);
  const plain =
    `[행사 계획안] ${e.name || ""}\n\n` +
    rows.map(([key, label]) => `■ ${label}\n${e[key]}`).join("\n\n");
  // 실제 계획안이 "구분 | 내용" 2열 표라 그 형태 그대로 내보냅니다.
  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">${esc(e.name || "행사")} 계획안</h1>` +
    gridTable(["구분", "내용"], rows.map(([key, label]) => [label, e[key]]));
  return { title: `행사계획안 ${e.name || ""}`.trim(), plain, html };
}

/** 문서 payload → {title, plain, html}. 알 수 없는 형식이면 null */
export function buildDoc(kind, p) {
  if (!p) return null;
  if (kind === "play" && p.activities) return buildPlay(p);
  if (kind === "daily" && p.daily) return buildDaily(p.daily);
  if (kind === "obs" && p.observation) return buildObs(p.observation);
  if (kind === "note" && p.note) return buildNote(p.note);
  if (kind === "adapt" && p.adapt) return buildAdapt(p.adapt);
  if (kind === "counsel" && p.counsel) return buildCounsel(p.counsel);
  if (kind === "life" && p.life) return buildLife(p.life);
  if (kind === "assess" && p.assess) return buildAssess(p.assess);
  if (kind === "monthly" && p.monthly) return buildMonthly(p.monthly);
  if (kind === "safety" && p.safety) return buildSafety(p.safety);
  if (kind === "trip" && p.trip) return buildTrip(p.trip);
  if (kind === "event" && p.event) return buildEvent(p.event);
  return null;
}

/** 플레인 텍스트만 필요할 때 (기존 복사 동작 호환) */
export function docPlain(kind, p) {
  return buildDoc(kind, p)?.plain || "";
}

const PAGE = (title, body) =>
  `<!doctype html><html><head><meta charset="utf-8" /><title>${esc(title)}</title></head>` +
  `<body style="font-family:'맑은 고딕','Malgun Gothic',sans-serif;color:#111;word-break:keep-all;overflow-wrap:break-word;">${body}</body></html>`;

/**
 * 클립보드에 표 서식(text/html)과 플레인 텍스트를 동시에 넣습니다.
 * 한글·워드에 붙이면 표로, 메모장·카톡에 붙이면 글자로 들어갑니다.
 * ClipboardItem 미지원 브라우저에서는 플레인 텍스트로 자동 폴백합니다.
 */
export async function copyDoc(kind, payload, { rich: wantRich = true } = {}) {
  const doc = buildDoc(kind, payload);
  if (!doc) return false;
  if (wantRich && typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([PAGE(doc.title, doc.html)], { type: "text/html" }),
          "text/plain": new Blob([doc.plain], { type: "text/plain" }),
        }),
      ]);
      return true;
    } catch { /* 권한·미지원 시 아래 폴백 */ }
  }
  try {
    await navigator.clipboard.writeText(doc.plain);
    return true;
  } catch {
    return false;
  }
}

/** 워드·한글에서 열리는 .doc 파일로 내려받습니다. */
export function downloadDoc(kind, payload) {
  const doc = buildDoc(kind, payload);
  if (!doc) return false;
  // ﻿(BOM) 를 붙여야 한글 윈도우 워드에서 인코딩이 깨지지 않습니다.
  const blob = new Blob(["﻿", PAGE(doc.title, doc.html)], { type: "application/msword" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.title.replace(/[\\/:*?"<>|]/g, "_") || "민트쌤 문서"}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
