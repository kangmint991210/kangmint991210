// Paddle 결제창.
//
// 결제 자체는 Paddle 이 띄우는 창에서 이뤄지고, 우리 화면은 카드 번호를 만지지 않습니다.
// 요금제는 결제가 끝난 뒤 Paddle → /api/paddle-webhook → DB 로 반영됩니다.
//
// ⚠ 결제창이 닫혔다고 바로 Pro 가 되는 것이 아닙니다.
//    알림이 서버에 닿기까지 보통 1~3초 걸리므로, 화면은 잠깐 기다렸다가
//    서버에 저장된 요금제를 다시 읽어야 합니다(waitForPlan).
//    닫히자마자 화면에서 올려 버리면, 결제가 실패했는데도 Pro 로 보입니다.

import { paddle as cfg } from "../config.js";
import { transactionIdFrom } from "../domain/billing.js";

const SDK_URL = "https://cdn.paddle.com/paddle/v2/paddle.js";

let loading = null;

/** 설정이 갖춰졌는가 (하나라도 비면 결제 버튼을 감춥니다) */
export const isPaddleReady = () => Boolean(cfg.token && (cfg.prices.basic || cfg.prices.pro));

/** Paddle.js 를 한 번만 읽어 옵니다. */
function loadSdk() {
  if (window.Paddle) return Promise.resolve(window.Paddle);
  if (loading) return loading;

  loading = new Promise((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SDK_URL;
    el.async = true;
    el.onload = () => (window.Paddle ? resolve(window.Paddle) : reject(new Error("Paddle 을 불러오지 못했어요.")));
    el.onerror = () => reject(new Error("결제 모듈을 불러오지 못했어요. 잠시 후 다시 시도해 주세요."));
    document.head.appendChild(el);
  }).catch((err) => { loading = null; throw err; });

  return loading;
}

let initialized = false;

async function paddle(onEvent) {
  const sdk = await loadSdk();
  if (!initialized) {
    sdk.Initialize({ token: cfg.token, eventCallback: (e) => onEvent?.(e) });
    initialized = true;
  }
  return sdk;
}

/**
 * 결제창을 엽니다.
 *
 * @param {object} p
 * @param {"basic"|"pro"} p.plan
 * @param {{id:string, email?:string}} p.user  결제와 계정을 잇는 데 씁니다
 * @param {(event:object)=>void} [p.onEvent]   checkout.completed / checkout.closed 등
 */
export async function openCheckout({ plan, user, onEvent }) {
  const priceId = cfg.prices[plan];
  if (!priceId) throw new Error(`${plan} 요금제의 가격이 설정되지 않았어요.`);
  if (!user?.id) throw new Error("로그인한 뒤에 결제할 수 있어요.");

  const sdk = await paddle(onEvent);
  sdk.Checkout.open({
    items: [{ priceId, quantity: 1 }],
    // ⚠ 이 값이 결제와 계정을 잇는 유일한 끈입니다.
    //    빠지면 웹훅이 "누가 낸 돈인지" 몰라 요금제를 못 올립니다(이메일로 한 번 더 찾긴 합니다).
    customData: { user_id: user.id },
    ...(user.email ? { customer: { email: user.email } } : {}),
    settings: {
      displayMode: "overlay",
      theme: "light",
      locale: "ko",
      allowLogout: false,   // 로그인한 회원의 결제라 계정을 바꾸지 못하게
    },
  });
}

/**
 * Paddle 이 보낸 결제 이어가기 링크인가.
 *
 * Paddle 은 "기본 결제 링크(Default payment link)" 로 등록한 주소에
 * `?_ptxn=txn_xxx` 를 붙여 고객을 보냅니다. 이런 때 쓰입니다.
 *   · 카드 결제가 실패해 다시 시도해 달라는 메일
 *   · 결제수단 변경 링크
 *   · 대시보드에서 사람이 직접 만든 청구서
 *
 * ⚠ 이 값을 처리하지 않으면 링크를 눌러도 그냥 첫 화면만 뜹니다.
 *    결제하러 온 분이 아무 안내도 못 받고 되돌아가게 됩니다.
 *
 * @returns {string|null} 이어서 열 결제 건 id
 */
export function pendingTransactionId() {
  try {
    return transactionIdFrom(window.location.search);
  } catch {
    return null;
  }
}

/** 주소에서 _ptxn 을 지웁니다 (새로고침할 때마다 결제창이 다시 뜨지 않게) */
export function clearTransactionParam() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("_ptxn")) return;
    url.searchParams.delete("_ptxn");
    window.history.replaceState({}, "", url.pathname + url.search + url.hash);
  } catch { /* 주소를 못 고쳐도 흐름은 이어감 */ }
}

/**
 * 이미 만들어진 결제 건을 이어서 엽니다.
 *
 * 로그인하지 않았어도 열립니다 — 결제 건 자체가 누구 것인지 이미 알고 있고,
 * 카드가 막혀 급히 들어온 분에게 로그인부터 시키면 그대로 떠납니다.
 */
export async function openTransaction(transactionId, onEvent) {
  const sdk = await paddle(onEvent);
  sdk.Checkout.open({
    transactionId,
    settings: { displayMode: "overlay", theme: "light", locale: "ko" },
  });
}

/**
 * 결제가 서버에 반영될 때까지 기다립니다.
 *
 * 웹훅은 결제창이 닫히는 것과 따로 움직여서, 언제 도착할지 알 수 없습니다.
 * 짧게 여러 번 확인하고, 그래도 안 오면 "곧 반영된다"고 알려 줍니다
 * (실제로는 조금 뒤 도착하며, 새로고침하면 보입니다).
 *
 * @param {() => Promise<string>} reload  서버에서 요금제를 다시 읽는 함수
 * @param {string} was                    결제 전 요금제
 * @returns {Promise<string|null>}        바뀐 요금제. 시간 안에 안 바뀌면 null
 */
export async function waitForPlan(reload, was, { tries = 8, gapMs = 1500 } = {}) {
  for (let i = 0; i < tries; i++) {
    await new Promise((r) => setTimeout(r, gapMs));
    const now = await reload();
    if (now && now !== was) return now;
  }
  return null;
}
