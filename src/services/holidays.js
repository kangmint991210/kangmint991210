// 공휴일을 받아 옵니다 — 화면은 "몇 년도"만 알려주면 됩니다.
//
// 세 겹으로 둡니다. 하나가 안 되면 다음으로 내려가고, 마지막에는 내장 표가 있습니다.
//   1) 저장해 둔 값이 아직 싱싱하면 그대로 (통신 없음)
//   2) /api/holidays 로 새로 받아 옴
//   3) 실패하면 저장해 둔 낡은 값이라도 (비행기 모드·서버 장애)
//   → 그래도 없으면 null 을 돌려주고, 부르는 쪽이 domain 의 내장 표를 씁니다.
//
// 틀린 날짜를 보여 주느니 아무것도 안 보여 주는 게 낫다는 원칙은 그대로입니다 —
// 여기서는 "빈 목록"을 성공으로 치지 않습니다.

import { storage, KEYS } from "../lib/storage.js";

/** 이만큼 지나면 다시 받아 옵니다. 정부가 대체공휴일을 뒤늦게 확정하는 경우가 있습니다. */
const FRESH_FOR = 7 * 24 * 3600e3;

const keyFor = (year) => `${KEYS.holidays}${year}`;

/** 같은 해를 동시에 여러 번 부르지 않게 (화면이 두 번 그려져도 요청은 한 번) */
const inFlight = new Map();

function cached(year) {
  const saved = storage.getJSON(keyFor(year));
  return saved?.days && Object.keys(saved.days).length ? saved : null;
}

/**
 * 그 해의 공휴일 { "MM-DD": 이름 }. 끝내 못 구하면 null.
 * @param {number} year
 */
export function loadHolidays(year) {
  const saved = cached(year);
  if (saved && Date.now() - (saved.at || 0) < FRESH_FOR) {
    return Promise.resolve(saved.days);
  }
  if (inFlight.has(year)) return inFlight.get(year);

  const request = fetchYear(year, saved).finally(() => inFlight.delete(year));
  inFlight.set(year, request);
  return request;
}

async function fetchYear(year, saved) {
  try {
    const res = await fetch(`/api/holidays?year=${year}`);
    if (!res.ok) throw new Error(`응답 ${res.status}`);

    const { days } = await res.json();
    if (!days || !Object.keys(days).length) throw new Error("빈 목록");

    storage.setJSON(keyFor(year), { at: Date.now(), days });
    return days;
  } catch (err) {
    // 화면은 내장 표로 이어집니다 — 선생님께 보일 오류는 아닙니다
    console.warn(`[holidays] ${year}년 공휴일을 받지 못했습니다 (${err.message}).`);
    return saved?.days || null;
  }
}
