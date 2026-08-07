// Vercel 서버리스 함수 — POST /api/paddle-webhook 의 HTTP 어댑터.
// 실제 처리는 _paddle.js 가 합니다.
//
// ⚠ 본문 파싱을 끕니다. 서명은 "받은 바이트 그대로"에 대해 계산되므로,
//    Vercel 이 JSON 으로 파싱한 값을 다시 문자열로 만들면 서명이 어긋납니다.
//
// ⚠ 개발 서버(vite.config.js)에는 이 경로를 두지 않았습니다.
//    Paddle 은 localhost 로 알림을 보낼 수 없어 흉내 내 봐야 의미가 없고,
//    가짜 결제를 넣는 통로만 하나 더 생깁니다.
//
// 필요한 환경변수: PADDLE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { verifySignature, handleEvent } from "./_paddle.js";
import { isConfigured } from "./_supabase-admin.js";

export const config = { api: { bodyParser: false } };

/**
 * 받은 바이트 그대로의 본문.
 *
 * ⚠ 위의 config 로 파서를 껐지만, 실행 환경이 그 설정을 무시하면 req.body 에
 *    "이미 파싱된 객체"가 들어옵니다. 그러면 원본을 되살릴 수 없어 서명이 반드시
 *    어긋나는데, 겉으로는 "서명이 맞지 않습니다" 로만 보여 원인을 찾기 어렵습니다.
 *    그 경우를 따로 잡아 무엇이 문제인지 말해 줍니다.
 */
function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return Promise.resolve(req.body.toString("utf8"));
  if (typeof req.body === "string") return Promise.resolve(req.body);
  if (req.body && typeof req.body === "object") {
    return Promise.reject(new Error(
      "본문이 이미 파싱되어 원본을 확인할 수 없습니다. " +
      "api/paddle-webhook.js 의 `export const config = { api: { bodyParser: false } }` 가 적용됐는지 확인하세요."
    ));
  }
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "POST 요청만 지원합니다." });
    return;
  }
  if (!isConfigured()) {
    // 500 으로 답해야 Paddle 이 다시 보냅니다 — 환경변수를 고치면 저절로 복구됩니다
    console.error("[paddle] SUPABASE_SERVICE_ROLE_KEY 가 없어 결제를 반영할 수 없습니다.");
    res.status(500).json({ error: "server not configured" });
    return;
  }

  let rawBody;
  try {
    rawBody = await readRawBody(req);
  } catch (err) {
    // 500 이라 Paddle 이 다시 보냅니다 — 설정을 고치면 밀린 알림이 저절로 들어옵니다
    console.error(`[paddle] 본문을 읽지 못했습니다 — ${err.message}`);
    res.status(500).json({ error: "cannot read body" });
    return;
  }

  const check = verifySignature({
    header: req.headers["paddle-signature"],
    rawBody,
    secret: process.env.PADDLE_WEBHOOK_SECRET,
  });
  if (!check.ok) {
    // 서명이 맞지 않으면 아무것도 하지 않습니다. 400 이라 Paddle 도 다시 보내지 않습니다.
    console.warn(`[paddle] 서명 거부 — ${check.reason}`);
    res.status(400).json({ error: "invalid signature" });
    return;
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    res.status(400).json({ error: "본문이 JSON 이 아닙니다" });
    return;
  }

  try {
    const { status, body } = await handleEvent(event);
    if (body?.skipped) console.warn(`[paddle] ${event.event_type} 건너뜀 — ${body.skipped}`);
    res.status(status).json(body);
  } catch (err) {
    // 500 으로 답하면 Paddle 이 다시 보냅니다. 일시적인 DB 오류는 그렇게 복구됩니다.
    console.error(`[paddle] ${event?.event_type} 처리 실패`, err);
    res.status(500).json({ error: "처리 중 오류" });
  }
}
