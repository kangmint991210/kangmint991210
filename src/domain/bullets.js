// 한 줄에 뭉쳐 온 목록을 줄마다 하나씩으로 폅니다.
//
// 왜 필요한가 — 프롬프트로 "· 항목마다 줄바꿈" 을 아무리 못박아도 모델은 가끔
// "· 첫째임. · 둘째임. · 셋째임." 처럼 한 줄에 붙여 보냅니다. 실제로 선생님 화면에서
// 배움읽기와 가정-기관 연계 방안이 그렇게 나왔습니다.
// 프롬프트는 확률을 낮출 뿐이라, 화면에 보이는 모양은 여기서 확정합니다.
//
// 이미 저장된 문서도 함께 고쳐집니다 — 뭉친 채로 저장된 옛 문서를 다시 만들 필요가 없습니다.

/**
 * ⚠ 가운뎃점은 한국어에서 "식사·수면·배변" 처럼 낱말을 잇는 데도 씁니다.
 *    그건 붙여 쓰고(공백 없음), 목록 기호는 "· " 처럼 뒤에 공백이 옵니다.
 *    그래서 "앞뒤가 모두 공백인 가운뎃점"만 줄바꿈으로 봅니다.
 */
const SEPARATOR = /\s+·[ \t]+/g;

/** 한 줄에 목록 기호가 두 번 이상 있으면 뭉친 것으로 봅니다 */
const isGlued = (line) => (line.match(/·[ \t]/g) || []).length >= 2;

/**
 * @param {string} text
 * @returns {string} 목록이 뭉쳐 있지 않으면 원래 값 그대로
 */
export function splitBullets(text) {
  if (typeof text !== "string" || !text.includes("·")) return text;

  return text
    .split("\n")
    .map((line) => (isGlued(line) ? line.replace(SEPARATOR, "\n· ").trimEnd() : line))
    .join("\n");
}

/**
 * 객체·배열 안의 모든 문자열에 적용합니다 (모델이 돌려준 문서 전체).
 * 값을 바꾼 곳이 없으면 원래 객체를 그대로 돌려줍니다.
 */
export function splitBulletsDeep(value) {
  if (typeof value === "string") return splitBullets(value);
  if (Array.isArray(value)) return value.map(splitBulletsDeep);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, splitBulletsDeep(v)]));
  }
  return value;
}
