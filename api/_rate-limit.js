// 비로그인 체험 남용 방어용 IP 레이트리밋.
//
// ⚠ 서버리스는 인스턴스마다 메모리가 따로라 이 카운터는 근사치입니다.
//    "한 사람이 연타하는" 경우를 걸러내는 용도이며, 정밀 과금 수단이 아닙니다.
//    정밀 차단이 필요해지면 이 파일만 Upstash Redis 등으로 갈아끼우면 됩니다.

const buckets = new Map(); // ip -> number[] (요청 시각 ms)
const MAX_TRACKED_IPS = 5000;

/**
 * 요청을 기록하고, 넘어선 한도의 이름을 돌려줍니다. (넘지 않았으면 null)
 * @param {string} key 보통 IP
 * @param {Array<{label:string, windowMs:number, max:number}>} limits
 */
export function hit(key, limits) {
  const now = Date.now();
  const longest = Math.max(...limits.map((l) => l.windowMs));
  const times = (buckets.get(key) || []).filter((t) => now - t < longest);
  times.push(now);
  buckets.set(key, times);
  if (buckets.size > MAX_TRACKED_IPS) buckets.clear(); // 메모리 폭주 방지

  for (const { label, windowMs, max } of limits) {
    if (times.filter((t) => now - t < windowMs).length > max) return label;
  }
  return null;
}

/** 프록시를 거쳐 오는 실제 클라이언트 IP */
export function clientIp(req) {
  const fwd = req.headers?.["x-forwarded-for"] || req.headers?.get?.("x-forwarded-for");
  return String(fwd || "").split(",")[0].trim() || req.socket?.remoteAddress || "unknown";
}
