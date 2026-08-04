// 어디에도 속하지 않는 아주 작은 범용 도구들.
// 도메인 지식(보육·요금제·화면)이 들어가면 안 되는 자리입니다.

/** 값을 항상 배열로. null/빈문자열은 빈 배열로 취급합니다. */
export const arr = (x) => (Array.isArray(x) ? x : x == null || x === "" ? [] : [x]);

/** 화면 안에서만 쓰는 가벼운 식별자 (DB id 와는 무관) */
let seq = 0;
export const uid = () => `m${++seq}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * 중첩 객체/배열의 한 지점을 불변으로 교체합니다.
 * setPath(payload, ["daily", "days", 0, "playEval"], "새 문장")
 */
export function setPath(obj, path, value) {
  if (!path.length) return value;
  const [head, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...(obj || {}) };
  copy[head] = setPath(copy[head], rest, value);
  return copy;
}

/** 모델이 목록 앞에 붙여 주는 "1." 같은 번호 제거 (화면·문서가 번호를 따로 매기므로) */
export const stripLeadingNumber = (s) => String(s ?? "").replace(/^\s*\d+\s*[.)]\s*/, "");
