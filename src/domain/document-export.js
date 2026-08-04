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

/* ---------- 문서 6종 → {title, plain, html} ---------- */

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

function buildObs(o) {
  const areas = arr(o.areas);
  const plain =
    `[영유아 관찰기록] ${o.child || ""} (${o.gender || ""})\n생년월일/월령: ${o.birth || ""}   관찰기간: ${o.period || ""}   기록자: ${o.recorder || ""}\n\n` +
    areas.map((a) => `■ ${a.area || ""}${a.datePlace ? " (" + a.datePlace + ")" : ""}\n[관찰] ${a.record || ""}${a.interpretation ? "\n[해석] " + a.interpretation : ""}`).join("\n\n") +
    `\n\n■ 종합 해석(비고)\n${o.summary || ""}`;

  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">영유아 관찰기록</h1>` +
    kvTable([["아동", o.child], ["성별", o.gender], ["생년월일·월령", o.birth], ["관찰기간", o.period], ["기록자", o.recorder]]) +
    h2("발달 영역별 관찰") +
    gridTable(["영역", "관찰 일시 및 장소", "관찰 상황", "해석 및 평가"],
      areas.map((a) => [a.area || "", a.datePlace || "", a.record || "", a.interpretation || ""])) +
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

function buildAdapt(a) {
  const days = arr(a.days);
  const plain =
    `[신입원아 적응일지] ${a.child || ""} (${a.age || ""})${a.klass ? "  " + a.klass : ""}\n생년월일: ${a.birth || ""}   적응기간: ${a.period || ""}\n\n` +
    days.map((x) => `■ ${x.day || ""}${x.date ? " (" + x.date + ")" : ""}${x.level ? " · 적응정도:" + x.level : ""}${x.note ? " · 비고:" + x.note : ""}\n등원 ${x.arrive || "-"} / 하원 ${x.leave || "-"}${x.health && x.health !== "-" ? " / 건강·투약 " + x.health : ""}\n${x.record || ""}`).join("\n\n") +
    `\n\n■ 종합 의견 및 적응 계획\n${a.summary || ""}`;

  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">신입원아 적응일지</h1>` +
    kvTable([["아동", a.child], ["연령", a.age], ["반", a.klass], ["생년월일", a.birth], ["적응기간", a.period]]) +
    h2("일차별 적응 기록") +
    gridTable(["일차", "날짜", "등원", "하원", "적응정도", "건강·투약", "비고", "관찰내용"],
      days.map((x) => [x.day || "", x.date || "", x.arrive || "-", x.leave || "-", x.level || "", x.health || "-", x.note || "", x.record || ""])) +
    (a.summary ? h2("종합 의견 및 적응 계획") + `<p style="font-size:10pt;line-height:1.7;">${rich(a.summary)}</p>` : "");

  return { title: `적응일지 ${a.child || ""}`.trim(), plain, html };
}

function buildCounsel(c) {
  const domains = arr(c.domains);
  const plain =
    `[학부모 상담일지] ${c.child || ""}${c.klass ? "  " + c.klass : ""}\n생년월일: ${c.birth || ""}   면담일: ${c.date || ""}   형태: ${c.method || ""}   보호자: ${c.guardian || ""}   교사: ${c.teacher || ""}\n\n[현행수준]\n` +
    domains.map((d) => `■ ${d.area || ""}\n${d.content || ""}`).join("\n\n") +
    (c.parentNote ? `\n\n■ 부모 의견\n${c.parentNote}` : "") +
    `\n\n■ 면담내용 및 종합의견\n${c.summary || ""}`;

  const html =
    `<h1 style="font-size:14pt;margin:0 0 8px;">학부모 상담일지</h1>` +
    kvTable([["원아", c.child], ["반", c.klass], ["생년월일", c.birth], ["면담일", c.date], ["면담형태", c.method], ["보호자", c.guardian], ["면담교사", c.teacher]]) +
    h2("발달 영역별 현행수준") +
    gridTable(["영역", "현행수준"], domains.map((d) => [d.area || "", d.content || ""])) +
    kvTable([["부모 의견", c.parentNote], ["면담내용 및 종합의견", c.summary]]);

  return { title: `상담일지 ${c.child || ""}`.trim(), plain, html };
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
