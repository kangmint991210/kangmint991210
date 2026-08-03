// Vercel 서버리스 함수 — 프로덕션에서 POST /api/gemini 요청을 받아
// 서버 쪽에서 GEMINI_API_KEY 를 붙여 Google Gemini API 로 전달합니다.
// (vite.config.js 의 개발 미들웨어와 동일 동작. 개발 프록시는 배포본에 없으므로 이 함수가 대신함)
//
// 요청 본문: { model, systemInstruction, contents, generationConfig }
//   → https://generativelanguage.googleapis.com/v1beta/models/<model>:generateContent 로 전달
// URL 에 콜론(:generateContent)을 넣지 않으려고 모델을 body 로 받습니다. (Vercel 라우팅 안정화)
//
// Vercel 대시보드 → Settings → Environment Variables 에 GEMINI_API_KEY 설정 필요.

import { guardRequest, clientIp } from "./_guard.js";

const UPSTREAM = "https://generativelanguage.googleapis.com";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "POST 요청만 지원합니다." } });
    return;
  }

  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    res.status(500).json({
      error: { message: "서버에 GEMINI_API_KEY 환경변수가 설정되지 않았습니다. (Vercel → Settings → Environment Variables)" },
    });
    return;
  }

  try {
    const payload = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const { model, kind, ...rest } = payload;
    if (!model) {
      res.status(400).json({ error: { message: "요청 본문에 model 필드가 필요합니다." } });
      return;
    }

    // 남용 방어 + 요금제 월 한도 검증 (게스트는 IP 레이트리밋)
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    const gate = await guardRequest({ token, ip: clientIp(req), kind });
    if (!gate.ok) {
      res.status(gate.status).json({ error: { message: gate.message, code: "quota" } });
      return;
    }

    const upstream = await fetch(`${UPSTREAM}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify(rest),
    });
    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader("Content-Type", upstream.headers.get("content-type") || "application/json");
    // 서버가 사용량을 기록했으면 클라이언트는 중복 기록하지 않습니다.
    res.setHeader("X-Usage-Counted", gate.counted ? "1" : "0");
    res.send(text);
  } catch (e) {
    res.status(502).json({ error: { message: "Gemini 프록시 요청 실패: " + (e?.message || String(e)) } });
  }
}
