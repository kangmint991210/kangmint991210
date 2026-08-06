// 생성 기록을 다루는 규칙.
// 화면은 "요청 1건 + 결과 1건"을 한 묶음(turn)으로 보여 주므로, 그 변환을 여기서 맡습니다.

import { arr } from "../lib/utils.js";
import { labelOf } from "./documents.js";

/**
 * 메시지 목록을 (요청, 결과) 묶음으로 그룹핑합니다.
 * 생성 중이라 결과가 아직 없거나, 불러온 문서에 요청문이 없는 경우도 각각 처리됩니다.
 */
export function toTurns(messages) {
  const turns = [];
  for (const m of messages) {
    const last = turns[turns.length - 1];
    if (m.role === "user") turns.push({ user: m, bot: null, no: turns.length });
    else if (last && !last.bot) last.bot = m;
    else turns.push({ user: null, bot: m, no: turns.length });
  }
  return turns;
}

/**
 * 보관함 거르기 — 검색어와 즐겨찾기를 함께 겁니다.
 * 검색은 제목뿐 아니라 본문까지 훑습니다(아이 이름·주차로 찾는 경우가 대부분).
 */
export function filterTurns(turns, query, favOnly = false) {
  const q = String(query || "").trim().toLowerCase();
  if (!q && !favOnly) return turns;
  return turns.filter((t) => {
    if (!t.bot) return false;
    if (favOnly && !t.bot.favorite) return false;
    if (!q) return true;
    const hay = `${docTitle(t.bot)} ${t.user?.text || ""} ${JSON.stringify(t.bot.payload || "")}`.toLowerCase();
    return hay.includes(q);
  });
}

/**
 * 접힌 목록에서 어떤 문서인지 알아볼 한 줄 요약.
 * payload 의 루트 키마다 "무엇을 덧붙일지"만 표로 두어, 문서가 늘어도 분기가 늘지 않습니다.
 */
const DETAIL_OF = {
  daily: (d) => d.week || "",
  observation: (o) => [o.child, o.period].filter(Boolean).join(" · "),
  adapt: (a) => [a.child, a.period].filter(Boolean).join(" · "),
  counsel: (c) => [c.child, c.date].filter(Boolean).join(" · "),
  life: (l) => [l.child, l.date].filter(Boolean).join(" · "),
  assess: (a) => [a.child, a.period].filter(Boolean).join(" · "),
  monthly: (m) => [m.month, m.theme].filter(Boolean).join(" · "),
  safety: (s) => [s.topic, s.subtopic].filter(Boolean).join(" · "),
  trip: (t) => [t.place, t.date].filter(Boolean).join(" · "),
  event: (e) => [e.name, e.date].filter(Boolean).join(" · "),
  activities: (list) => arr(list)[0]?.title || "",
};

export function docTitle(bot) {
  const label = labelOf(bot.kind);
  const payload = bot.payload;
  if (!payload) return label;
  const hit = Object.keys(DETAIL_OF).find((k) => payload[k]);
  const detail = hit ? DETAIL_OF[hit](payload[hit]) : "";
  return detail ? `${label} · ${detail}` : label;
}

/** 대화 이력을 모델이 이해하는 형태로. 결과는 길이를 줄여 토큰을 아낍니다. */
export const toHistory = (messages) =>
  messages.map((m) =>
    m.role === "user"
      ? { role: "user", text: m.text }
      : { role: "model", text: JSON.stringify(m.payload || {}).slice(0, 900) }
  );

/**
 * 새 결과 쪽으로 화면을 따라 내려보낼 것인가.
 *
 * ⚠ "메시지가 바뀌면 무조건 끝으로" 로 두면, 화면에 들어서거나 메뉴를 바꾸는 순간
 *    저장된 문서가 복원되면서 곧바로 맨 아래로 끌려갑니다. 그러면 입력 폼 대신
 *    지난 문서의 끝이 먼저 보입니다. 실제로 그 버그가 났습니다.
 *    같은 메뉴에서 메시지가 "늘어났을 때"(= 방금 보냈을 때)만 따라갑니다.
 */
export const shouldFollowNewest = (prev, next) =>
  Boolean(prev && next && prev.mode === next.mode && next.count > prev.count);
