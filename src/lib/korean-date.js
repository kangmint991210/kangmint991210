// 보육 서식에 들어가는 한국식 날짜 표기 계산.
// 브라우저 <input type="week|month|date"> 값을 사람이 읽는 문자열로 바꿉니다.
//
// ⚠ 모든 계산은 UTC 기준으로 합니다. 로컬 타임존을 쓰면 자정 부근에서 날짜가 하루 밀립니다.

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

const fmt = (d) => `${d.getUTCMonth() + 1}/${d.getUTCDate()}(${DOW[d.getUTCDay()]})`;

/**
 * 주차 선택값("2026-W11") → { label: "2026년 3월 2주", days: ["3/9(월)", …] }
 * days 는 월요일부터 지정한 일수만큼. 형식이 맞지 않으면 null.
 */
export function weekInfo(weekStr, dayCount = 6) {
  if (!weekStr || !/^\d{4}-W\d{2}$/.test(weekStr)) return null;
  const [y, w] = weekStr.split("-W");
  const year = +y, week = +w;

  // ISO 주차: 그 해 1월 4일이 반드시 1주차에 들어간다는 규칙으로 월요일을 찾습니다.
  const simple = new Date(Date.UTC(year, 0, 1 + (week - 1) * 7));
  const day = simple.getUTCDay();
  const monday = new Date(simple);
  if (day <= 4) monday.setUTCDate(simple.getUTCDate() - day + 1);
  else monday.setUTCDate(simple.getUTCDate() + 8 - day);

  const days = [];
  for (let i = 0; i < dayCount; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    days.push(fmt(d));
  }
  return {
    label: `${year}년 ${monday.getUTCMonth() + 1}월 ${Math.ceil(monday.getUTCDate() / 7)}주`,
    days,
  };
}

/** 월 선택값("2026-03") → "2026년 3월 1일 ~ 3월 31일". 형식이 맞지 않으면 null. */
export function monthRange(monthStr) {
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) return null;
  const [y, m] = monthStr.split("-").map(Number);
  const last = new Date(y, m, 0).getDate(); // 다음 달 0일 = 이번 달 마지막 날
  return `${y}년 ${m}월 1일 ~ ${m}월 ${last}일`;
}

/**
 * 월령(개월). 선생님이 손으로 세지 않도록 생년월일에서 계산합니다.
 *
 * 생일이 그 달에 아직 지나지 않았으면 한 달을 빼는, 나이를 세는 방식 그대로입니다.
 * (2020-02-20 생 → 2022-01-15 기준이면 23개월이 아니라 22개월)
 *
 * @param {string} birth "YYYY-MM-DD"
 * @param {string} at    "YYYY-MM-DD" 또는 "YYYY-MM"(그 달 1일로 봅니다)
 * @returns {number|null} 개월 수. 형식이 어긋나거나 기준일이 태어나기 전이면 null.
 */
export function monthsOld(birth, at) {
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birth || "");
  const a = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(at || "");
  if (!b || !a) return null;

  const months = (+a[1] - +b[1]) * 12 + (+a[2] - +b[2]);
  const dayOfMonth = a[3] ? +a[3] : 1;
  const passed = dayOfMonth < +b[3] ? months - 1 : months;
  return passed >= 0 ? passed : null;
}

/** 시작일("2026-03-04")부터 연속 평일 n개 → ["3/4(월)", …]. 형식이 맞지 않으면 null. */
export function weekdaysFrom(startStr, n) {
  if (!startStr || !/^\d{4}-\d{2}-\d{2}$/.test(startStr)) return null;
  const [y, m, d] = startStr.split("-").map(Number);
  const cursor = new Date(Date.UTC(y, m - 1, d));
  const out = [];
  while (out.length < n) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(fmt(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return out;
}
