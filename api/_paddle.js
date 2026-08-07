// Paddle 알림(웹훅) 처리 — 서명 확인과 DB 반영.
// HTTP 형식 맞추기는 api/paddle-webhook.js 가 합니다.
//
// ⚠ 이 파일이 하는 일은 "돈을 낸 사람에게만 요금제를 열어 주는 것"입니다.
//    서명 확인이 뚫리면 아무나 자기를 Pro 로 만들 수 있으므로, 확인에 실패하면
//    무조건 거부하고 아무것도 쓰지 않습니다.

import crypto from "node:crypto";
import { planForItems, planFromSubscriptions } from "../src/domain/billing.js";
import * as db from "./_supabase-admin.js";

const env = (k) => process.env[k] || "";

/** 가격 ID ↔ 요금제. Vercel 환경변수에서 옵니다. */
export const priceMap = () => ({
  basic: env("VITE_PADDLE_PRICE_BASIC"),
  pro: env("VITE_PADDLE_PRICE_PRO"),
});

/** 알림이 너무 오래된 것이면 거부합니다 (가로챈 요청을 다시 보내는 공격 방지) */
const MAX_AGE_SECONDS = 5 * 60;

/**
 * Paddle-Signature 헤더를 확인합니다.
 *
 * 형식: `ts=1671552777;h1=eb4d0dc885...`
 * 서명 대상은 `${ts}:${본문 원본}` 이고, HMAC-SHA256 입니다.
 *
 * ⚠ 본문은 반드시 "받은 바이트 그대로"여야 합니다.
 *    JSON 으로 파싱했다가 다시 문자열로 만들면 공백·키 순서가 달라져 서명이 어긋납니다.
 *
 * @returns {{ok:true} | {ok:false, reason:string}}
 */
export function verifySignature({ header, rawBody, secret, nowSeconds }) {
  if (!secret) return { ok: false, reason: "PADDLE_WEBHOOK_SECRET 이 설정되지 않았습니다" };
  if (!header) return { ok: false, reason: "Paddle-Signature 헤더가 없습니다" };

  const parts = Object.fromEntries(
    String(header).split(";").map((p) => {
      const at = p.indexOf("=");
      return at < 0 ? [p, ""] : [p.slice(0, at).trim(), p.slice(at + 1).trim()];
    })
  );
  const ts = parts.ts;
  const given = parts.h1;
  if (!ts || !given) return { ok: false, reason: "서명 형식을 알 수 없습니다" };

  const age = Math.abs((nowSeconds ?? Math.floor(Date.now() / 1000)) - Number(ts));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) {
    return { ok: false, reason: `알림이 너무 오래되었습니다 (${age}초)` };
  }

  const expected = crypto.createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  // 길이가 다르면 timingSafeEqual 이 예외를 던지므로 먼저 거릅니다
  if (given.length !== expected.length) return { ok: false, reason: "서명이 맞지 않습니다" };
  const same = crypto.timingSafeEqual(Buffer.from(given, "utf8"), Buffer.from(expected, "utf8"));
  return same ? { ok: true } : { ok: false, reason: "서명이 맞지 않습니다" };
}

/**
 * 결제와 계정을 잇습니다.
 *
 * 결제창을 열 때 custom_data 에 회원 id 를 실어 보내므로 보통은 그 값을 씁니다.
 * 그게 없을 때(예: Paddle 대시보드에서 사람이 직접 만든 구독)를 대비해
 * 이메일로도 찾아봅니다. 둘 다 없으면 누구 것인지 알 수 없어 건너뜁니다.
 */
async function findUserId(data) {
  const fromCustom = data?.custom_data?.user_id || data?.custom_data?.userId;
  if (fromCustom) return fromCustom;
  return db.userIdByEmail(data?.customer?.email || data?.billing_details?.email || null);
}

const iso = (v) => (v ? new Date(v).toISOString() : null);

/** 구독 알림 → subscriptions 저장 + 요금제 반영 */
async function handleSubscription(data) {
  const userId = await findUserId(data);
  if (!userId) return { skipped: "회원을 찾지 못했습니다" };

  const plan = planForItems(data?.items, priceMap());
  if (!plan) return { skipped: `모르는 가격입니다 (${data?.items?.[0]?.price?.id || "없음"})` };

  await db.upsert("subscriptions", {
    user_id: userId,
    paddle_id: data.id,
    paddle_customer_id: data.customer_id || null,
    plan,
    status: data.status,
    price_id: data?.items?.[0]?.price?.id || null,
    started_at: iso(data.started_at),
    current_period_end: iso(data?.current_billing_period?.ends_at),
    // 해지를 예약하면 scheduled_change 에 들어옵니다 (그 날까지는 계속 쓸 수 있음)
    cancel_at: data?.scheduled_change?.action === "cancel" ? iso(data.scheduled_change.effective_at) : null,
    canceled_at: iso(data.canceled_at),
    raw: data,
    updated_at: new Date().toISOString(),
  }, "paddle_id");

  return applyPlan(userId);
}

/** 결제 알림 → payments 저장 (내역은 남기되 요금제는 구독 쪽에서 정합니다) */
async function handleTransaction(data) {
  const userId = await findUserId(data);
  if (!userId) return { skipped: "회원을 찾지 못했습니다" };

  const totals = data?.details?.totals || {};
  const toInt = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

  await db.upsert("payments", {
    user_id: userId,
    paddle_id: data.id,
    subscription_id: data.subscription_id || null,
    status: data.status,
    total: toInt(totals.grand_total ?? totals.total),
    tax: toInt(totals.tax),
    currency: totals.currency_code || data.currency_code || null,
    billed_at: iso(data.billed_at || data.created_at),
    invoice_number: data.invoice_number || null,
    raw: data,
    updated_at: new Date().toISOString(),
  }, "paddle_id");

  return { ok: true };
}

/**
 * 그 회원의 살아 있는 구독을 모두 보고 요금제를 다시 정합니다.
 *
 * ⚠ 알림 하나만 보고 정하면 안 됩니다 — 업그레이드하면 옛 구독의 "해지" 알림과
 *    새 구독의 "생성" 알림이 함께 오는데, 도착 순서가 뒤집히면 방금 결제한
 *    선생님이 무료로 떨어집니다. 그래서 매번 전체를 보고 판단합니다.
 */
async function applyPlan(userId) {
  const subs = await db.listSubscriptions(userId);
  const plan = planFromSubscriptions(subs);
  await db.setPlan(userId, plan);
  return { ok: true, userId, plan };
}

/**
 * 알림 하나를 처리합니다. 같은 알림이 두 번 와도 한 번만 반영됩니다.
 * @returns {Promise<{status:number, body:object}>}
 */
export async function handleEvent(event) {
  const type = event?.event_type || "";
  const id = event?.event_id || event?.notification_id;
  if (!id) return { status: 400, body: { error: "event_id 가 없습니다" } };

  // 먼저 자리를 잡습니다 — 이 뒤에서 실패하면 Paddle 이 다시 보내는데,
  // 그때는 이미 기록돼 있어 건너뜁니다. 중복 처리보다 누락이 낫습니다
  // (누락은 아래 '구독 다시 읽기'로 복구되지만, 이중 환불은 되돌릴 수 없습니다).
  if (!(await db.claimEvent(id, type, event))) {
    return { status: 200, body: { ok: true, duplicate: true } };
  }

  if (type.startsWith("subscription.")) return { status: 200, body: await handleSubscription(event.data) };
  if (type.startsWith("transaction.")) return { status: 200, body: await handleTransaction(event.data) };

  // 모르는 알림도 200 으로 답합니다 — 400 을 주면 Paddle 이 계속 다시 보냅니다
  return { status: 200, body: { ok: true, ignored: type } };
}
