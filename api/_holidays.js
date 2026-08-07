// 대한민국 공휴일을 바깥에서 받아 옵니다.
//
// 왜 서버를 거치나요 — 구글 공개 캘린더는 CORS 헤더를 주지 않아서
// 브라우저에서 직접 부를 수 없습니다. 여기서 받아 정리한 뒤 넘겨 줍니다.
//
// 왜 구글 공개 캘린더인가요 — 후보를 실제로 불러 비교했습니다.
//   · Nager.Date : 대체공휴일이 있으면 원래 공휴일을 빼 버리고(3·1절, 광복절, 개천절이
//                  통째로 사라짐) 공휴일이 아닌 날을 넣습니다. 쓸 수 없습니다.
//   · 공공데이터포털(한국천문연구원) : 가장 권위 있지만 신청·승인받은 인증키가 필요하고,
//                  키가 만료되면 조용히 빈 값이 옵니다.
//   · 구글 공개 캘린더 : 키가 필요 없고, 2021~2031년을 담고 있으며,
//                  대체공휴일과 원래 공휴일이 "둘 다" 들어 있고,
//                  DESCRIPTION 이 공휴일/기념일을 구분해 줍니다. ← 이걸 씁니다.
//
// 법이 바뀌어도 따라옵니다. 실제로 제헌절이 2026-05-11 부터 공휴일로 되살아났는데
// (대통령령 제36290호) 이 피드에는 반영돼 있었고, 손으로 적어 둔 표에는 빠져 있었습니다.

const ICS_URL =
  "https://calendar.google.com/calendar/ical/" +
  "ko.south_korea%23holiday%40group.v.calendar.google.com/public/basic.ics";

/** 이 피드가 "공휴일"이라고 표시한 것만 씁니다 (식목일·스승의날 같은 기념일은 뺍니다) */
const PUBLIC_HOLIDAY = "공휴일";

/**
 * 이 피드가 공휴일로 분류하지만 달력에 빨갛게 칠하지 않는 날.
 *
 * 근로자의 날은 관공서 공휴일이 아니라서 어린이집은 대개 정상 운영합니다.
 * 빨간 날로 보여 주면 "쉬는 날"로 오해하게 되므로 뺍니다.
 * (인쇄된 달력에서도 이 날은 빨갛지 않습니다)
 */
const NOT_RED = new Set(["노동절", "근로자의 날"]);

/** 피드마다 부르는 이름이 조금씩 다릅니다 — 앱에서 쓰는 말로 맞춥니다. */
const RENAME = { 새해첫날: "새해", 크리스마스: "성탄절" };

/**
 * ICS 는 75바이트가 넘으면 줄을 접고, 이어지는 줄을 공백/탭으로 시작합니다.
 * 먼저 펴 놓지 않으면 긴 SUMMARY 가 중간에서 잘립니다.
 */
const unfold = (text) => text.replace(/\r?\n[ \t]/g, "");

/** ICS 는 쉼표·세미콜론·역슬래시를 이스케이프합니다. */
const unescapeIcs = (value) =>
  value.replace(/\\n/gi, " ").replace(/\\([,;\\])/g, "$1").trim();

/**
 * ICS 원문에서 그 해의 공휴일만 뽑아 { "MM-DD": 이름 } 으로 돌려줍니다.
 * (테스트에서 직접 부를 수 있도록 통신과 분리해 둡니다)
 */
export function parseHolidays(ics, year) {
  const days = {};
  const prefix = String(year);

  for (const block of unfold(ics).split("BEGIN:VEVENT").slice(1)) {
    const body = block.split("END:VEVENT")[0];
    const date = /^DTSTART;VALUE=DATE:(\d{8})$/m.exec(body)?.[1];
    if (!date || !date.startsWith(prefix)) continue;

    // DESCRIPTION 첫 줄이 분류입니다 ("공휴일" / "기념일 …")
    const kind = unescapeIcs(/^DESCRIPTION:(.*)$/m.exec(body)?.[1] || "").split(" ")[0];
    if (kind !== PUBLIC_HOLIDAY) continue;

    const summary = unescapeIcs(/^SUMMARY:(.*)$/m.exec(body)?.[1] || "");
    if (!summary) continue;

    // "쉬는 날 삼일절" 처럼 대체공휴일은 원래 공휴일 이름을 달고 옵니다.
    // ⚠ 먼저 벗겨 내고 걸러야 합니다 — 이 피드에는 "쉬는 날 노동절"(2027-05-03)이
    //    들어 있는데, 근로자의 날은 대체공휴일 대상이 아닙니다.
    const substitute = summary.startsWith("쉬는 날");
    const base = substitute ? summary.replace(/^쉬는 날\s*/, "") : summary;
    if (NOT_RED.has(base)) continue;

    const name = substitute ? "대체공휴일" : RENAME[base] || base;

    // 개천절과 추석이 겹치는 해(2028-10-03)가 있습니다 — 덮어쓰지 않고 나란히 적습니다
    const md = `${date.slice(4, 6)}-${date.slice(6)}`;
    days[md] = days[md] ? `${days[md]}·${name}` : name;
  }
  return days;
}

/** 같은 인스턴스가 살아 있는 동안은 다시 받아오지 않습니다 */
const memory = new Map();

/**
 * 그 해의 공휴일. 받아오지 못하면 null — 부르는 쪽이 내장 표로 되돌아갑니다.
 * @returns {Promise<Record<string,string>|null>}
 */
export async function fetchHolidays(year) {
  if (memory.has(year)) return memory.get(year);

  try {
    const res = await fetch(ICS_URL, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) {
      console.warn(`[holidays] 공휴일 달력 응답 ${res.status} — 내장 표로 대신합니다.`);
      return null;
    }
    const days = parseHolidays(await res.text(), year);
    // 빈 결과를 캐시하면 그 해 내내 공휴일이 사라집니다 — 성공했을 때만 담습니다
    if (!Object.keys(days).length) return null;
    memory.set(year, days);
    return days;
  } catch (err) {
    console.warn(`[holidays] 공휴일 달력을 받지 못했습니다 (${err.message}) — 내장 표로 대신합니다.`);
    return null;
  }
}

/** 요청받은 해가 쓸 만한 값인지 (엉뚱한 값으로 바깥을 계속 두드리지 않게) */
export function validYear(raw) {
  const year = Number(raw);
  return Number.isInteger(year) && year >= 2021 && year <= 2031 ? year : null;
}
