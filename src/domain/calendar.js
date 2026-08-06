// 작업 달력의 규칙 — "며칠에 무엇을 만들었는지".
//
// 화면을 모르는 순수 계산만 둡니다. 날짜 계산은 눈으로 검토하기 어렵고
// (월말·윤년·시간대) 한 번 어긋나면 조용히 틀린 날에 표시되므로, 여기서만 다루고
// 테스트로 묶어 둡니다.
//
// ⚠ 시간대 — 문서의 created_at 은 UTC 로 저장됩니다. 그대로 UTC 로 날짜를 뽑으면
//    한국에서 밤 9시 이후에 만든 문서가 "다음 날"로 표시됩니다. 반드시 현지 시각으로 봅니다.

/** 요일 머리글 (일요일 시작 — 한국 달력 관습) */
export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** Date → "YYYY-MM-DD" (현지 시각 기준) */
export function dayKey(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** {year, month(1~12)} 를 앞뒤로 옮기기 — 12월 다음은 다음 해 1월 */
export function shiftMonth({ year, month }, step) {
  const m = month - 1 + step;
  return { year: year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 + 1 };
}

export const monthLabel = ({ year, month }) => `${year}년 ${month}월`;

/** 오늘이 속한 달 */
export const monthOf = (date) => ({ year: date.getFullYear(), month: date.getMonth() + 1 });

/**
 * 달력에 그릴 칸들. 앞뒤로 빈 칸을 채워 항상 7의 배수가 됩니다.
 * @returns {Array<{key:string, day:number}|null>} null 은 빈 칸
 */
export function monthGrid({ year, month }) {
  const first = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0).getDate();
  const cells = Array.from({ length: first.getDay() }, () => null);
  for (let d = 1; d <= lastDay; d++) {
    cells.push({ key: dayKey(new Date(year, month - 1, d)), day: d });
  }
  while (cells.length % 7) cells.push(null);
  return cells;
}

/**
 * 문서들을 날짜별로 묶습니다.
 * @param {Array<{createdAt:string}>} docs
 * @returns {Record<string, Array>} "YYYY-MM-DD" → 그날 만든 문서들 (만든 순서)
 */
export function groupByDay(docs) {
  const out = {};
  for (const doc of docs || []) {
    if (!doc?.createdAt) continue;      // 날짜를 모르는 문서는 달력에 세지 않습니다
    const key = dayKey(doc.createdAt);
    if (!key) continue;                 // 깨진 날짜 값이 들어와도 달력이 죽지 않게
    (out[key] ||= []).push(doc);
  }
  return out;
}

/** 그 달에 만든 문서 수 (달 이동 버튼 옆 요약에 씁니다) */
export const countInMonth = (byDay, { year, month }) =>
  Object.entries(byDay)
    .filter(([key]) => key.startsWith(`${year}-${String(month).padStart(2, "0")}-`))
    .reduce((n, [, list]) => n + list.length, 0);
