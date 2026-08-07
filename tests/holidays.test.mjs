// 바깥 달력에서 받아 온 ICS 를 읽는 규칙.
//
// 아래 함정들은 전부 실제 피드에서 나온 것입니다 — 상상해서 만든 경우가 아닙니다.
// 통신은 하지 않고, 그때 받은 모양 그대로를 붙여 두고 검사합니다.

import test from "node:test";
import assert from "node:assert/strict";
import { parseHolidays, validYear } from "../api/_holidays.js";

/** ICS 한 덩어리를 만드는 도우미 */
const event = (date, summary, kind) =>
  `BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:${date}\r\nDTEND;VALUE=DATE:${date}\r\n` +
  `SUMMARY:${summary}\r\nDESCRIPTION:${kind}\r\nEND:VEVENT\r\n`;

const FEED =
  "BEGIN:VCALENDAR\r\n" +
  event("20260101", "새해첫날", "공휴일") +
  event("20260301", "삼일절", "공휴일") +
  event("20260302", "쉬는 날 삼일절", "공휴일") +
  event("20260603", "지방선거일", "공휴일") +
  event("20260717", "제헌절", "공휴일") +
  event("20261225", "크리스마스", "공휴일") +
  // 기념일 — 쉬는 날이 아닙니다
  event("20260405", "식목일", "기념일\\n기념일을 숨기려면 Google Calendar 설정으로 이동하세요.") +
  event("20260515", "스승의날", "기념일") +
  // 다른 해 — 섞여 들어오면 안 됩니다
  event("20270101", "새해첫날", "공휴일") +
  "END:VCALENDAR\r\n";

test("공휴일만 골라 내고 기념일과 다른 해는 버린다", () => {
  const days = parseHolidays(FEED, 2026);

  assert.equal(days["01-01"], "새해", "피드가 부르는 이름을 앱의 말로 바꿉니다");
  assert.equal(days["12-25"], "성탄절");
  assert.equal(days["03-01"], "삼일절");
  assert.equal(days["03-02"], "대체공휴일", "'쉬는 날 X' 는 대체공휴일입니다");
  assert.equal(days["06-03"], "지방선거일", "선거일도 법정공휴일");
  assert.equal(days["07-17"], "제헌절", "2026-05-11 부터 다시 공휴일");

  assert.equal(days["04-05"], undefined, "식목일은 쉬는 날이 아님");
  assert.equal(days["05-15"], undefined, "스승의날은 쉬는 날이 아님");
  assert.equal(Object.keys(days).length, 6, "2027년 것이 섞이면 안 됨");
});

test("근로자의 날은 빨간 날로 치지 않는다 — 대체휴일까지", () => {
  // 관공서 공휴일이 아니라서 어린이집은 대개 정상 운영합니다.
  // 이 피드는 '노동절'을 공휴일로 분류하고, 2027년에는 '쉬는 날 노동절'까지 넣어 둡니다.
  const feed = event("20270501", "노동절", "공휴일") + event("20270503", "쉬는 날 노동절", "공휴일");
  assert.deepEqual(parseHolidays(feed, 2027), {});
});

test("공휴일이 겹치는 날은 덮어쓰지 않고 나란히 적는다", () => {
  // 2028-10-03 은 개천절이자 추석입니다. 하나만 남기면 달력에서 사라집니다.
  const feed = event("20281003", "개천절", "공휴일") + event("20281003", "추석", "공휴일");
  assert.equal(parseHolidays(feed, 2028)["10-03"], "개천절·추석");
});

test("75바이트에서 접힌 줄을 펴서 읽는다", () => {
  // ICS 는 긴 줄을 접고 다음 줄을 공백으로 시작합니다. 그 공백은 표시일 뿐 내용이 아닙니다.
  // 펴지 않으면 이름이 "설날 연" 에서 잘립니다.
  const feed = "BEGIN:VEVENT\r\nDTSTART;VALUE=DATE:20260217\r\nSUMMARY:설날 연\r\n 휴\r\nDESCRIPTION:공휴일\r\nEND:VEVENT";
  assert.equal(parseHolidays(feed, 2026)["02-17"], "설날 연휴");
});

test("읽을 게 없으면 빈 목록 — 던지지 않는다", () => {
  // 피드 모양이 바뀌어도 달력이 죽지 않고, 부르는 쪽이 내장 표로 되돌아갑니다.
  assert.deepEqual(parseHolidays("", 2026), {});
  assert.deepEqual(parseHolidays("BEGIN:VCALENDAR\r\nEND:VCALENDAR", 2026), {});
  assert.deepEqual(parseHolidays(event("20260101", "", "공휴일"), 2026), {});
});

test("엉뚱한 연도로 바깥을 두드리지 않는다", () => {
  assert.equal(validYear("2026"), 2026);
  assert.equal(validYear(2031), 2031);
  assert.equal(validYear(2020), null, "피드가 담고 있지 않은 해");
  assert.equal(validYear(2032), null);
  assert.equal(validYear("2026; DROP"), null);
  assert.equal(validYear(undefined), null);
  assert.equal(validYear(2026.5), null);
});
