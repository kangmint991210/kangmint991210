// Vercel 서버리스 함수 — POST /api/gemini 의 HTTP 어댑터.
// 실제 처리는 _gemini-proxy.js 가 하고, 여기서는 요청/응답 형식만 맞춥니다.
// (개발 서버는 vite.config.js 가 같은 모듈을 씁니다)
//
// 필요한 환경변수: GEMINI_API_KEY, (권장) SUPABASE_SERVICE_ROLE_KEY — README 참고

import { handleGeminiRequest, bearerToken } from "./_gemini-proxy.js";
import { clientIp } from "./_guard.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: { message: "POST 요청만 지원합니다." } });
    return;
  }

  const result = await handleGeminiRequest({
    rawBody: req.body,
    apiKey: process.env.GEMINI_API_KEY,
    token: bearerToken(req),
    ip: clientIp(req),
  });

  res.status(result.status);
  res.setHeader("Content-Type", result.contentType);
  for (const [k, v] of Object.entries(result.headers)) res.setHeader(k, v);
  res.send(result.body);
}
