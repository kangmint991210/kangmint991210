// 결제 규칙의 회귀 테스트.
//
// 여기 걸리는 것들은 "고장 나면 돈이 새거나, 낸 돈이 반영되지 않는" 규칙입니다.
// 서명 검증이 뚫리면 아무나 자기를 Pro 로 만들 수 있고,
// 요금제 계산이 틀리면 결제한 선생님이 갑자기 문서를 못 엽니다.

import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

import { verifySignature } from "../api/_paddle.js";
import {
  planFromSubscriptions, planForPrice, planForItems, isLive, formatAmount,
} from "../src/domain/billing.js";

/* ─────────────── 서명 검증 ─────────────── */

const SECRET = "pdl_ntfset_테스트용비밀키";
const BODY = '{"event_id":"evt_1","event_type":"subscription.created"}';

/** Paddle 이 붙여 보내는 헤더를 그대로 만듭니다 */
const signed = (body, ts, secret = SECRET) => {
  const h1 = crypto.createHmac("sha256", secret).update(`${ts}:${body}`).digest("hex");
  return `ts=${ts};h1=${h1}`;
};

test("바르게 서명된 알림만 통과시킨다", () => {
  const now = 1_800_000_000;
  const ok = verifySignature({ header: signed(BODY, now), rawBody: BODY, secret: SECRET, nowSeconds: now });
  assert.equal(ok.ok, true);
});

test("본문이 한 글자라도 다르면 거부한다", () => {
  // 중간에서 금액이나 회원 id 를 바꿔치기하는 것을 막는 자리입니다.
  const now = 1_800_000_000;
  const header = signed(BODY, now);
  const tampered = BODY.replace("evt_1", "evt_2");
  const r = verifySignature({ header, rawBody: tampered, secret: SECRET, nowSeconds: now });
  assert.equal(r.ok, false);
});

test("다른 비밀키로 만든 서명은 거부한다", () => {
  const now = 1_800_000_000;
  const header = signed(BODY, now, "훔친키가아닌다른키");
  const r = verifySignature({ header, rawBody: BODY, secret: SECRET, nowSeconds: now });
  assert.equal(r.ok, false);
});

test("오래된 알림은 거부한다 — 가로챈 요청을 다시 보내는 공격 방지", () => {
  const now = 1_800_000_000;
  const old = now - 3600;                    // 1시간 전 서명
  const r = verifySignature({ header: signed(BODY, old), rawBody: BODY, secret: SECRET, nowSeconds: now });
  assert.equal(r.ok, false);
  // 5분 안쪽은 통과 (서버 시계가 조금 어긋나도 정상 알림을 버리지 않게)
  const fresh = now - 120;
  assert.equal(verifySignature({ header: signed(BODY, fresh), rawBody: BODY, secret: SECRET, nowSeconds: now }).ok, true);
});

test("비밀키가 없거나 헤더가 이상하면 거부한다", () => {
  const now = 1_800_000_000;
  // ⚠ 키를 설정하지 않았을 때 '통과'시키면 결제 없이 Pro 가 되는 문이 열립니다
  assert.equal(verifySignature({ header: signed(BODY, now), rawBody: BODY, secret: "", nowSeconds: now }).ok, false);
  assert.equal(verifySignature({ header: "", rawBody: BODY, secret: SECRET, nowSeconds: now }).ok, false);
  assert.equal(verifySignature({ header: "ts=1;h1=", rawBody: BODY, secret: SECRET, nowSeconds: now }).ok, false);
  assert.equal(verifySignature({ header: "그냥문자열", rawBody: BODY, secret: SECRET, nowSeconds: now }).ok, false);
  // 길이가 다른 서명에도 예외를 던지지 않아야 합니다 (timingSafeEqual 은 길이가 다르면 throw)
  assert.equal(verifySignature({ header: "ts=1800000000;h1=abc", rawBody: BODY, secret: SECRET, nowSeconds: now }).ok, false);
});

/* ─────────────── 요금제 판단 ─────────────── */

test("결제 실패(past_due) 중에도 문서는 계속 열어 준다", () => {
  // Paddle 이 며칠 동안 다시 시도합니다. 카드 한도처럼 곧 풀릴 일로
  // 쓰던 문서를 못 열면 곤란합니다. 끝내 실패하면 canceled 가 되고 그때 내려갑니다.
  assert.equal(isLive("active"), true);
  assert.equal(isLive("trialing"), true);
  assert.equal(isLive("past_due"), true);
  assert.equal(isLive("canceled"), false);
  assert.equal(isLive("paused"), false);
});

test("살아 있는 구독 중 높은 요금제를 적용한다", () => {
  // 업그레이드 직후에는 옛 구독과 새 구독이 잠깐 함께 있습니다.
  // 낮은 쪽을 고르면 방금 결제한 선생님이 갑자기 막힙니다.
  assert.equal(planFromSubscriptions([
    { status: "canceled", plan: "pro" },
    { status: "active", plan: "basic" },
  ]), "basic");

  assert.equal(planFromSubscriptions([
    { status: "active", plan: "basic" },
    { status: "active", plan: "pro" },
  ]), "pro");

  // 해지된 구독만 남으면 무료로 내려갑니다
  assert.equal(planFromSubscriptions([{ status: "canceled", plan: "pro" }]), "free");
  assert.equal(planFromSubscriptions([]), "free");
  assert.equal(planFromSubscriptions(null), "free");
});

test("모르는 가격은 요금제를 올리지 않는다", () => {
  const prices = { basic: "pri_basic", pro: "pri_pro" };
  assert.equal(planForPrice("pri_pro", prices), "pro");
  assert.equal(planForPrice("pri_basic", prices), "basic");
  // ⚠ 다른 상품이나 오타 난 가격으로 요금제가 올라가면 안 됩니다
  assert.equal(planForPrice("pri_남의상품", prices), null);
  assert.equal(planForPrice("", prices), null);
  assert.equal(planForPrice(null, prices), null);
  // 환경변수를 설정하지 않아 빈 문자열일 때, 빈 가격 ID 가 우연히 맞아떨어지면 안 됩니다
  assert.equal(planForPrice("", { basic: "", pro: "" }), null);
});

test("여러 상품이 섞여 와도 요금제를 찾아낸다", () => {
  const prices = { basic: "pri_basic", pro: "pri_pro" };
  assert.equal(planForItems([{ price: { id: "pri_기타" } }, { price: { id: "pri_pro" } }], prices), "pro");
  assert.equal(planForItems([{ price_id: "pri_basic" }], prices), "basic");
  assert.equal(planForItems([], prices), null);
  assert.equal(planForItems(undefined, prices), null);
});

test("금액은 통화의 최소 단위를 보고 읽는다", () => {
  // 원은 최소 단위가 1원이고 달러는 센트입니다. 100 으로 나누는 규칙을
  // 원에 그대로 적용하면 9,900원이 99원으로 보입니다.
  assert.ok(formatAmount("9900", "KRW").includes("9,900"));
  assert.ok(formatAmount("990", "USD").includes("9.90"));
  assert.equal(formatAmount(null, "KRW"), null);
  assert.equal(formatAmount("9900", ""), null);
});
