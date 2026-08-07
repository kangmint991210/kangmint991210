// 결제와 요금제를 잇는 규칙.
//
// 화면(결제창을 열 때)과 서버(웹훅이 요금제를 반영할 때)가 같은 파일을 봅니다.
// 예전에 한도가 클라이언트와 서버에 따로 적혀 있어 한쪽만 고치면 어긋났던 일이
// 있어서(plans.js 참고), 결제도 처음부터 한 곳에 둡니다.

import { normalizePlan, DEFAULT_PLAN } from "./plans.js";

/**
 * 구독이 살아 있다고 보는 상태.
 *
 * ⚠ past_due(결제 실패)를 포함합니다. Paddle 은 며칠에 걸쳐 다시 시도하는데,
 *    카드 한도 초과처럼 곧 풀릴 일로 선생님이 쓰던 문서를 못 열면 곤란합니다.
 *    재시도가 모두 실패하면 Paddle 이 구독을 canceled 로 바꾸고, 그때 내려갑니다.
 */
export const LIVE_STATUSES = ["active", "trialing", "past_due"];

/** 해지·정지된 구독 */
export const DEAD_STATUSES = ["canceled", "paused"];

/** 이 구독이 지금 요금제를 열어 주고 있는가 */
export const isLive = (status) => LIVE_STATUSES.includes(status);

/**
 * 구독 목록에서 지금 적용할 요금제를 정합니다.
 *
 * 여러 구독이 살아 있을 수 있습니다 — 업그레이드 직후 잠깐 겹치거나,
 * 해지 예약된 구독이 만료 전까지 남아 있는 경우입니다. 그때는 높은 쪽을 줍니다.
 * (낮은 쪽을 주면 돈을 낸 선생님이 갑자기 문서를 못 열게 됩니다)
 *
 * @param {Array<{status:string, plan:string}>} subscriptions
 * @returns {"free"|"basic"|"pro"}
 */
export function planFromSubscriptions(subscriptions) {
  const RANK = { free: 0, basic: 1, pro: 2 };
  let best = DEFAULT_PLAN;
  for (const sub of subscriptions || []) {
    if (!isLive(sub?.status)) continue;
    const plan = normalizePlan(sub.plan);
    if (RANK[plan] > RANK[best]) best = plan;
  }
  return best;
}

/**
 * Paddle 가격 ID → 우리 요금제.
 * @param {string} priceId          Paddle 의 pri_xxx
 * @param {Record<string,string>} priceMap  { basic: "pri_a", pro: "pri_b" }
 */
export function planForPrice(priceId, priceMap) {
  if (!priceId) return null;
  const hit = Object.entries(priceMap || {}).find(([, id]) => id && id === priceId);
  return hit ? hit[0] : null;
}

/**
 * 결제 알림 하나에 들어 있는 여러 상품 중 우리 요금제에 해당하는 것.
 * 부가 상품이 섞여 와도 요금제를 놓치지 않게 전부 훑습니다.
 */
export function planForItems(items, priceMap) {
  for (const item of items || []) {
    const plan = planForPrice(item?.price?.id || item?.price_id, priceMap);
    if (plan) return plan;
  }
  return null;
}

/** 사람이 읽는 금액. Paddle 은 최소 단위(원은 1원, 달러는 센트)로 줍니다. */
export function formatAmount(minorUnits, currency) {
  // ⚠ Number(null) 과 Number("") 은 0 입니다. 그대로 두면 금액이 없을 때
  //    "₩0" 이라고 적어, 무료로 결제된 것처럼 보입니다.
  if (minorUnits === null || minorUnits === undefined || minorUnits === "") return null;
  const n = Number(minorUnits);
  if (!Number.isFinite(n) || !currency) return null;
  // 원·엔처럼 소수점을 쓰지 않는 통화는 그대로, 나머지는 100 으로 나눕니다
  const whole = ["KRW", "JPY"].includes(currency) ? n : n / 100;
  try {
    return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(whole);
  } catch {
    return `${whole.toLocaleString()} ${currency}`;
  }
}
